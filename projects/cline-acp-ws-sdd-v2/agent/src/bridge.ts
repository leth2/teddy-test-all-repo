/**
 * ACP Bridge — ACP 에이전트 프로세스 관리 및 stdio 통신
 *
 * ACP 스펙 참조: .sdd/specs/1773368794-cline-acp-ws-v2/references/acp-protocol.md
 *
 * 메서드명 (실제 ACP 스펙):
 *   - initialize (id:0) — 프로토콜 버전 협상
 *   - session/new (id:1) — 세션 생성
 *   - session/prompt (id:N++) — 사용자 메시지 전달
 *   - session/update (notification, id 없음) — 에이전트 응답/툴콜
 *   - session/request_permission (request, id 있음) — 권한 요청
 *
 * Notification 판별: id 필드 없음 (JSON-RPC 2.0 표준)
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';

export interface PermissionOption {
  optionId: string;
  name: string;
  kind: 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always';
}

export interface PermissionEvent {
  requestId: number;
  toolCallId: string;
  options: PermissionOption[];
}

export interface ToolCallEvent {
  id: string;
  name: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface MessageEvent {
  type: 'text' | 'stream';
  content: string;
  done?: boolean;
}

export declare interface AcpBridge {
  on(event: 'ready', listener: () => void): this;
  on(event: 'message', listener: (data: MessageEvent) => void): this;
  on(event: 'toolcall', listener: (data: ToolCallEvent) => void): this;
  on(event: 'permission', listener: (data: PermissionEvent) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'exit', listener: (data: { code: number }) => void): this;
}

export class AcpBridge extends EventEmitter {
  private workDir: string;
  private process: ChildProcess | null = null;
  private sessionId: string | null = null;
  private requestIdCounter = 0;
  private pendingRequests = new Map<number, (result: unknown) => void>();
  private isReady = false;

  constructor(workDir: string) {
    super();
    this.workDir = workDir;
  }

  /**
   * ACP 에이전트 프로세스 시작 및 핸드셰이크
   * 시퀀스: initialize → session/new → 'ready' 이벤트 emit
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('npx', ['-y', '@zed-industries/claude-agent-acp'], {
        cwd: this.workDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('프로세스 stdio 초기화 실패'));
        return;
      }

      // readline으로 stdout 줄 단위 파싱 (ACP over stdio = 줄 단위 JSON-RPC)
      const rl = readline.createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        if (!line.trim()) return;
        try {
          const msg = JSON.parse(line);
          this.handleMessage(msg);
        } catch {
          // 파싱 실패는 무시 (에이전트 로그 등 비-JSON 출력)
        }
      });

      this.process.stderr?.on('data', (data) => {
        console.error('[ACP stderr]', data.toString());
      });

      this.process.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });

      this.process.on('exit', (code) => {
        this.emit('exit', { code: code ?? -1 });
        this.isReady = false;
      });

      // 핸드셰이크 시작
      this.performHandshake()
        .then(() => {
          this.isReady = true;
          this.emit('ready');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * ACP 핸드셰이크: initialize → session/new
   * 스펙: Client MUST initialize before creating session
   */
  private async performHandshake(): Promise<void> {
    // Step 1: initialize
    const initResult = await this.sendRequest('initialize', {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: true,
      },
      clientInfo: {
        name: 'cline-acp-ws',
        title: 'Cline ACP WebSocket Bridge',
        version: '1.0.0',
      },
    });

    console.log('[ACP] initialize 완료:', JSON.stringify(initResult));

    // Step 2: session/new
    const sessionResult = await this.sendRequest('session/new', {
      cwd: this.workDir,
      mcpServers: [],
    }) as { sessionId: string };

    this.sessionId = sessionResult.sessionId;
    console.log('[ACP] session/new 완료, sessionId:', this.sessionId);
  }

  /**
   * 사용자 메시지를 ACP session/prompt로 전송
   * 스펙: session/prompt method (not "message")
   */
  sendPrompt(content: string): void {
    if (!this.isReady || !this.sessionId) {
      this.emit('error', new Error('에이전트가 준비되지 않았습니다'));
      return;
    }

    this.sendRequest('session/prompt', {
      sessionId: this.sessionId,
      prompt: [{ type: 'text', text: content }],
    }).then(() => {
      // session/prompt 완료 (stopReason 포함)
    }).catch((err) => {
      this.emit('error', err);
    });
  }

  /**
   * session/request_permission 응답 전송
   * 스펙: id 있는 Request에 대한 응답 (requestId 매칭)
   */
  respondPermission(requestId: number, optionId: string): void {
    const resolve = this.pendingRequests.get(requestId);
    if (resolve) {
      this.pendingRequests.delete(requestId);
      const response = {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          outcome: {
            outcome: 'selected',
            optionId,
          },
        },
      };
      this.writeToStdin(JSON.stringify(response));
    }
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    this.process.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
        resolve();
      }, 3000);
    });
    this.process = null;
    this.sessionId = null;
    this.isReady = false;
  }

  /**
   * JSON-RPC 메시지 처리
   * 판별 규칙:
   *   - id 없음 + method 있음 → Notification (session/update, session/cancel)
   *   - id 있음 + method 있음 → Request (session/request_permission)
   *   - id 있음 + result/error → Response (initialize, session/new, session/prompt 응답)
   */
  private handleMessage(msg: Record<string, unknown>): void {
    const hasId = 'id' in msg && msg.id !== undefined && msg.id !== null;
    const hasMethod = 'method' in msg;
    const hasResult = 'result' in msg;
    const hasError = 'error' in msg;

    if (!hasId && hasMethod) {
      // Notification (id 없음)
      this.handleNotification(msg);
    } else if (hasId && hasMethod) {
      // Incoming Request from Agent (session/request_permission)
      this.handleIncomingRequest(msg);
    } else if (hasId && (hasResult || hasError)) {
      // Response to our request
      const id = msg.id as number;
      const resolver = this.pendingRequests.get(id);
      if (resolver) {
        this.pendingRequests.delete(id);
        if (hasError) {
          this.emit('error', new Error(JSON.stringify(msg.error)));
        } else {
          resolver(msg.result);
        }
      }
    }
  }

  /**
   * Notification 처리 (id 없음)
   * session/update: agent_message_chunk, tool_call, tool_call_update
   */
  private handleNotification(msg: Record<string, unknown>): void {
    if (msg.method !== 'session/update') return;

    const params = msg.params as Record<string, unknown>;
    const update = params?.update as Record<string, unknown>;
    if (!update) return;

    const updateType = update.sessionUpdate as string;

    switch (updateType) {
      case 'agent_message_chunk': {
        const content = update.content as { type: string; text: string };
        this.emit('message', {
          type: 'stream',
          content: content?.text ?? '',
          done: false,
        });
        break;
      }

      case 'tool_call': {
        this.emit('toolcall', {
          id: update.toolCallId as string,
          name: update.title as string,
          kind: (update.kind as string) ?? 'other',
          status: (update.status as 'pending' | 'in_progress' | 'completed' | 'failed') ?? 'pending',
        });
        break;
      }

      case 'tool_call_update': {
        this.emit('toolcall', {
          id: update.toolCallId as string,
          name: '',
          kind: 'other',
          status: (update.status as 'pending' | 'in_progress' | 'completed' | 'failed') ?? 'in_progress',
        });
        break;
      }
    }
  }

  /**
   * 에이전트로부터 오는 Request 처리
   * session/request_permission: 파일 쓰기/삭제 등 권한 요청
   */
  private handleIncomingRequest(msg: Record<string, unknown>): void {
    if (msg.method !== 'session/request_permission') return;

    const id = msg.id as number;
    const params = msg.params as Record<string, unknown>;
    const toolCall = params?.toolCall as Record<string, unknown>;
    const options = (params?.options as PermissionOption[]) ?? [];

    // pendingRequests에 저장 (respondPermission에서 응답)
    this.pendingRequests.set(id, () => {});

    this.emit('permission', {
      requestId: id,
      toolCallId: toolCall?.toolCallId as string,
      options,
    });
  }

  /**
   * JSON-RPC Request 전송 (id 있음)
   */
  private sendRequest(method: string, params: unknown): Promise<unknown> {
    const id = this.requestIdCounter++;
    const msg = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, resolve as (result: unknown) => void);
      // 타임아웃 30초
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method} (id:${id})`));
        }
      }, 30000);
      this.writeToStdin(JSON.stringify(msg));
    });
  }

  private writeToStdin(data: string): void {
    if (this.process?.stdin) {
      this.process.stdin.write(data + '\n');
    }
  }
}
