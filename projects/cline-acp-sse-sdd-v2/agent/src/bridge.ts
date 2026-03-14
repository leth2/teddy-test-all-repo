/**
 * ACPBridge — ACP Agent Client Protocol JSON-RPC Bridge
 *
 * 참조: .sdd/specs/1773368822-cline-acp-sse-v2/references/acp-protocol.md
 *
 * ACP 핸드셰이크 순서:
 * 1. spawn claude-agent-acp
 * 2. initialize (id: 0) → 응답 수신
 * 3. session/new (id: 1) → sessionId 획득
 * 4. sendPrompt() → session/prompt (id: N)
 * 5. 수신: session/update notifications (id 없음)
 * 6. 수신: session/request_permission notifications (id 없음)
 * 7. sendPermission() → { id: requestId, result: { approved } }
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

export interface PermissionRequest {
  requestId: string;
  description: string;
  tool: string;
}

export interface ToolCall {
  id: string;
  name: string;
  params: Record<string, unknown>;
  status: 'requested' | 'in_progress' | 'completed';
  timestamp: number;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

// ACP 핸드셰이크 상태
type HandshakeState = 'idle' | 'initializing' | 'creating-session' | 'ready';

export class ACPBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = '';
  private pendingPermissions = new Map<string, PermissionRequest>();
  private sessionId: string | null = null;
  private handshakeState: HandshakeState = 'idle';
  private requestIdCounter = 2; // 0=initialize, 1=session/new, 2+ = prompts

  start(): void {
    if (this.process) {
      return; // 중복 spawn 방지
    }

    this.handshakeState = 'idle';
    this.sessionId = null;

    try {
      // npx 래퍼 우회 — node_modules/.bin 직접 실행 (stdin pipe 정상 전달)
      const agentBin = resolve(__dirname, '../node_modules/.bin/claude-agent-acp');
      this.process = spawn(agentBin, [], {
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
        this.handshakeState = 'idle';
        this.sessionId = null;
        this.emit('exit', { code });
      });

      // ACP 핸드셰이크 시작: initialize
      this.sendInitialize();

    } catch (err) {
      this.emit('error', { message: (err as Error).message });
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.handshakeState = 'idle';
      this.sessionId = null;
    }
  }

  sendPrompt(text: string): void {
    if (!this.process?.stdin) {
      this.emit('error', { message: '에이전트 프로세스가 실행 중이지 않습니다' });
      return;
    }

    if (!this.sessionId) {
      this.emit('error', { message: 'ACP 세션이 초기화되지 않았습니다. 잠시 후 다시 시도하세요.' });
      return;
    }

    // 올바른 ACP method: session/prompt (v1에서는 "prompt"로 잘못 사용)
    const message = {
      jsonrpc: '2.0',
      id: this.requestIdCounter++,
      method: 'session/prompt',
      params: {
        sessionId: this.sessionId,
        prompt: [{ type: 'text', text }],
      },
    };

    this.writeToStdin(message);
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

    // 올바른 ACP 권한 응답: id = requestId, result = { approved }
    // v1에서는 method: "permission"으로 잘못 사용
    const message = {
      jsonrpc: '2.0',
      id: requestId,
      result: { approved },
    };

    this.writeToStdin(message);
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  isReady(): boolean {
    return this.handshakeState === 'ready';
  }

  hasPendingPermission(requestId: string): boolean {
    return this.pendingPermissions.has(requestId);
  }

  private sendInitialize(): void {
    this.handshakeState = 'initializing';
    const message = {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: 1,
        clientCapabilities: {
          fs: { readTextFile: true, writeTextFile: true },
          terminal: false,
        },
        clientInfo: {
          name: 'cline-acp-sse-bridge',
          title: 'Cline ACP SSE Bridge',
          version: '1.0.0',
        },
      },
    };
    this.writeToStdin(message);
  }

  private sendSessionNew(): void {
    this.handshakeState = 'creating-session';
    const message = {
      jsonrpc: '2.0',
      id: 1,
      method: 'session/new',
      params: {},
    };
    this.writeToStdin(message);
  }

  private writeToStdin(message: unknown): void {
    if (this.process?.stdin) {
      this.process.stdin.write(JSON.stringify(message) + '\n');
    }
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        this.handleACPMessage(parsed);
      } catch {
        // JSON 파싱 실패 시 로그 처리, 브릿지 계속 동작
        this.emit('log', { level: 'debug', message: line });
      }
    }
  }

  // public으로 선언하여 테스트에서 직접 접근 가능
  public handleACPMessage(msg: Record<string, unknown>): void {
    // 핸드셰이크 응답 처리
    if (msg.id === 0 && msg.result !== undefined) {
      // initialize 응답 → session/new 전송
      this.sendSessionNew();
      return;
    }

    if (msg.id === 1 && msg.result !== undefined) {
      // session/new 응답 → sessionId 저장
      const result = msg.result as Record<string, unknown>;
      this.sessionId = String(result.sessionId ?? '');
      this.handshakeState = 'ready';
      this.emit('started');
      return;
    }

    // session/prompt 응답 (턴 완료)
    if (typeof msg.id === 'number' && msg.id >= 2 && msg.result !== undefined) {
      const result = msg.result as Record<string, unknown>;
      this.emit('log', { level: 'info', message: `프롬프트 턴 완료: stopReason=${result.stopReason}` });
      return;
    }

    // 에러 응답
    if (msg.error !== undefined) {
      const err = msg.error as Record<string, unknown>;
      this.emit('error', { message: String(err.message ?? JSON.stringify(err)) });
      return;
    }

    // Notifications (id 없음)
    if (msg.id === undefined && msg.method !== undefined) {
      const method = String(msg.method);
      const params = (msg.params ?? {}) as Record<string, unknown>;

      if (method === 'session/update') {
        // 올바른 ACP method: session/update (v1에서는 "message", "toolcall"로 잘못 파싱)
        const update = (params.update ?? {}) as Record<string, unknown>;
        const updateType = String(update.sessionUpdate ?? '');

        if (updateType === 'agent_message_chunk') {
          const contentBlocks = (update.content ?? []) as Array<Record<string, unknown>>;
          const textContent = contentBlocks
            .filter((b) => b.type === 'text')
            .map((b) => String(b.text ?? ''))
            .join('');

          const message: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: 'agent',
            content: textContent,
            timestamp: Date.now(),
          };
          this.emit('message', message);

        } else if (updateType === 'tool_call') {
          const tc = (update.toolCall ?? {}) as Record<string, unknown>;
          const toolCall: ToolCall = {
            id: String(tc.id ?? `tc_${Date.now()}`),
            name: String(tc.name ?? 'unknown'),
            params: (tc.params ?? {}) as Record<string, unknown>,
            status: (tc.status as ToolCall['status']) ?? 'requested',
            timestamp: Date.now(),
          };
          this.emit('toolcall', toolCall);
        }

      } else if (method === 'session/request_permission') {
        // 올바른 ACP method: session/request_permission (v1에서는 "permission-request"로 잘못 파싱)
        const requestId = String(params.requestId ?? `req_${Date.now()}`);
        const permReq: PermissionRequest = {
          requestId,
          description: String(params.description ?? ''),
          tool: String(params.tool ?? ''),
        };
        this.pendingPermissions.set(requestId, permReq);
        this.emit('permission-request', permReq);
      }
    }
  }
}

export const bridge = new ACPBridge();
