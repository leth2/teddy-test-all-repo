/**
 * bridge.ts — ACP Agent Process Manager
 *
 * Spawns `npx -y @zed-industries/claude-agent-acp` as a child process and
 * communicates with it via the ACP protocol (JSON-RPC 2.0 over stdio).
 *
 * ACP message flow:
 *   1. Process starts → send `initialize` request
 *   2. Receive `initialize` response → send `newSession` request
 *   3. Receive `newSession` response → ready for prompts
 *   4. Send `prompt` request with user message
 *   5. Receive streaming notifications: agent_message_chunk, tool_call, permission_request, etc.
 *   6. Receive `session_end` notification when agent is done
 */

import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

/** Events emitted by the Bridge */
export interface BridgeEvents {
  message: [msg: JsonRpcMessage];
  error: [err: Error];
  exit: [code: number | null];
}

// ─── Bridge Class ─────────────────────────────────────────────────────────────

export class AcpBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 1;
  private sessionId: string | null = null;
  private pendingRequests = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor() {
    super();
  }

  /** Start the ACP agent process and perform the handshake */
  async start(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    console.log('[Bridge] Spawning claude-agent-acp process...');

    this.process = spawn('npx', ['-y', '@zed-industries/claude-agent-acp'], {
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: apiKey,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Pipe stderr to our stderr for debugging
    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('[Agent STDERR]', data.toString().trim());
    });

    // Parse stdout line-by-line as JSON-RPC messages
    const rl = createInterface({ input: this.process.stdout! });
    rl.on('line', (line: string) => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line) as JsonRpcMessage;
        console.log('[Bridge ← Agent]', JSON.stringify(msg));
        this.handleIncomingMessage(msg);
      } catch (err) {
        console.error('[Bridge] Failed to parse agent message:', line, err);
      }
    });

    this.process.on('exit', (code) => {
      console.log('[Bridge] Agent process exited with code', code);
      this.emit('exit', code);
    });

    this.process.on('error', (err) => {
      console.error('[Bridge] Agent process error:', err);
      this.emit('error', err);
    });

    // Perform ACP handshake
    await this.initialize();
    await this.newSession();
    console.log('[Bridge] ACP handshake complete. Session ID:', this.sessionId);
  }

  /** Send `initialize` and wait for response */
  private async initialize(): Promise<void> {
    const result = await this.sendRequest('initialize', {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: true,
      },
    });
    console.log('[Bridge] initialize result:', result);
  }

  /** Send `newSession` and store session ID */
  private async newSession(): Promise<void> {
    const result = await this.sendRequest('newSession', {}) as { sessionId?: string };
    this.sessionId = result?.sessionId ?? 'default-session';
    console.log('[Bridge] newSession result, sessionId:', this.sessionId);
  }

  /** Send a user prompt to the agent */
  sendPrompt(text: string): void {
    if (!this.sessionId) {
      throw new Error('Session not initialized');
    }
    // prompt is a notification (no id), not a request — agent just starts responding
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'prompt',
      params: {
        sessionId: this.sessionId,
        text,
      },
    };
    this.writeToProcess(notification);
  }

  /** Send a permission response back to the agent */
  sendPermissionResponse(permissionId: string, approved: boolean): void {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'permission_response',
      params: {
        sessionId: this.sessionId,
        permissionId,
        approved,
      },
    };
    this.writeToProcess(notification);
  }

  /** Cancel the current agent action */
  sendCancel(): void {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'cancel',
      params: { sessionId: this.sessionId },
    };
    this.writeToProcess(notification);
  }

  /** Kill the agent process */
  kill(): void {
    if (this.process) {
      console.log('[Bridge] Killing agent process');
      this.process.kill();
      this.process = null;
    }
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────

  /** Send a JSON-RPC request and await its response */
  private sendRequest(method: string, params: unknown): Promise<unknown> {
    const id = this.requestId++;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.writeToProcess(request);
    });
  }

  /** Write a JSON-RPC message to the agent's stdin */
  private writeToProcess(msg: JsonRpcMessage): void {
    if (!this.process?.stdin) {
      console.error('[Bridge] Cannot write — no process stdin');
      return;
    }
    const line = JSON.stringify(msg) + '\n';
    console.log('[Bridge → Agent]', JSON.stringify(msg));
    this.process.stdin.write(line);
  }

  /** Route incoming messages: responses go to pending requests, notifications bubble up */
  private handleIncomingMessage(msg: JsonRpcMessage): void {
    if ('id' in msg && 'result' in msg || ('id' in msg && 'error' in msg)) {
      // It's a response to one of our requests
      const response = msg as JsonRpcResponse;
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        this.pendingRequests.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
    } else {
      // It's a notification from the agent — forward to listeners
      this.emit('message', msg);
    }
  }
}
