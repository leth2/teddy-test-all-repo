import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';

export interface ACPMessage {
  type: 'message' | 'toolcall' | 'permission-request' | 'error';
  data: unknown;
}

export interface PermissionRequest {
  requestId: string;
  description: string;
  tool: string;
}

export interface ToolCall {
  id: string;
  name: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export class ACPBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = '';
  private pendingPermissions = new Map<string, PermissionRequest>();

  start(): void {
    if (this.process) {
      return;
    }

    try {
      this.process = spawn('npx', ['-y', '@zed-industries/claude-agent-acp'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      this.process.stdout?.on('data', (chunk: Buffer) => {
        this.buffer += chunk.toString();
        this.processBuffer();
      });

      this.process.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        this.emit('log', { level: 'debug', message: text });
      });

      this.process.on('error', (err: Error) => {
        this.emit('error', { message: err.message });
      });

      this.process.on('exit', (code: number | null) => {
        this.process = null;
        this.emit('exit', { code });
      });

      this.emit('started');
    } catch (err) {
      this.emit('error', { message: (err as Error).message });
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  sendPrompt(text: string): void {
    if (!this.process?.stdin) {
      this.emit('error', { message: '에이전트 프로세스가 실행 중이지 않습니다' });
      return;
    }

    const message = {
      jsonrpc: '2.0',
      method: 'prompt',
      params: { text },
      id: Date.now(),
    };

    this.process.stdin.write(JSON.stringify(message) + '\n');
  }

  sendPermission(requestId: string, approved: boolean): void {
    if (!this.process?.stdin) {
      this.emit('error', { message: '에이전트 프로세스가 실행 중이지 않습니다' });
      return;
    }

    const pending = this.pendingPermissions.get(requestId);
    if (!pending) {
      this.emit('error', { message: `알 수 없는 requestId: ${requestId}` });
      return;
    }

    this.pendingPermissions.delete(requestId);

    const message = {
      jsonrpc: '2.0',
      method: 'permission',
      params: { requestId, approved },
      id: Date.now(),
    };

    this.process.stdin.write(JSON.stringify(message) + '\n');
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  hasPendingPermission(requestId: string): boolean {
    return this.pendingPermissions.has(requestId);
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        this.handleACPMessage(parsed);
      } catch {
        // 파싱 실패한 줄은 로그로 처리
        this.emit('log', { level: 'debug', message: line });
      }
    }
  }

  private handleACPMessage(msg: Record<string, unknown>): void {
    if (msg.method === 'message' || msg.result) {
      this.emit('message', {
        id: String(msg.id ?? Date.now()),
        role: 'agent',
        content: String((msg.params as Record<string, unknown>)?.text ?? (msg.result as Record<string, unknown>)?.text ?? JSON.stringify(msg)),
        timestamp: Date.now(),
      });
    } else if (msg.method === 'toolcall') {
      const params = (msg.params ?? {}) as Record<string, unknown>;
      const toolCall: ToolCall = {
        id: String(msg.id ?? Date.now()),
        name: String(params.name ?? 'unknown'),
        params: (params.args ?? {}) as Record<string, unknown>,
        timestamp: Date.now(),
      };
      this.emit('toolcall', toolCall);
    } else if (msg.method === 'permission-request') {
      const params = (msg.params ?? {}) as Record<string, unknown>;
      const requestId = String(params.requestId ?? msg.id ?? Date.now());
      const permReq: PermissionRequest = {
        requestId,
        description: String(params.description ?? ''),
        tool: String(params.tool ?? ''),
      };
      this.pendingPermissions.set(requestId, permReq);
      this.emit('permission-request', permReq);
    } else if (msg.error) {
      this.emit('error', { message: String((msg.error as Record<string, unknown>)?.message ?? JSON.stringify(msg.error)) });
    }
  }
}

export const bridge = new ACPBridge();
