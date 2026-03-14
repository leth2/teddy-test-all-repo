import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { Writable, Readable } from 'stream';
import * as acp from '@agentclientprotocol/sdk';
import { IACPBridge } from '../../domain/ports/IACPBridge';

// OCP: IACPBridge 구현체 — 다른 ACP 에이전트로 교체 시 이 파일만 변경
// @agentclientprotocol/sdk ClientSideConnection 사용 (Lesson A04: SDK 사용, 수동 JSON-RPC 금지)
export class ClineACPBridge extends EventEmitter implements IACPBridge {
  private process: ChildProcess | null = null;
  private connection: acp.ClientSideConnection | null = null;
  private sessionId: string | null = null;
  private ready = false;
  private readonly cwd: string;

  constructor(cwd: string = process.cwd()) {
    super();
    this.cwd = cwd;
  }

  isReady(): boolean {
    return this.ready;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async start(): Promise<void> {
    // Lesson A01: cline 직접 실행 (npm i -g cline으로 PATH에 있음)
    this.process = spawn('cline', ['--acp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error('cline --acp 프로세스 stdio 초기화 실패');
    }

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('[cline stderr]', data.toString().trim());
    });

    this.process.on('exit', (code) => {
      this.ready = false;
      this.emit('exit', code);
    });

    // ACP SDK: ndJsonStream + ClientSideConnection
    const input = Writable.toWeb(this.process.stdin) as WritableStream<Uint8Array>;
    const output = Readable.toWeb(this.process.stdout) as ReadableStream<Uint8Array>;
    const stream = acp.ndJsonStream(input, output);

    // ACP Client — agent에서 오는 요청 처리
    const self = this;
    const client: acp.Client = {
      async requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse> {
        return new Promise((resolve) => {
          const requestId = params.toolCall.toolCallId ?? `perm-${Date.now()}`;
          self.emit('permission', { requestId, toolCall: params.toolCall, options: params.options });
          self.once(`permission-response:${requestId}`, (approved: boolean) => {
            const selectedOption = approved ? params.options[0] : params.options[params.options.length - 1];
            resolve({ outcome: { outcome: 'selected', optionId: selectedOption.optionId } });
          });
        });
      },
      async sessionUpdate(params: acp.SessionNotification): Promise<void> {
        const update = params.update;
        console.log('[bridge] sessionUpdate:', update.sessionUpdate, JSON.stringify(update).slice(0, 200));
        switch (update.sessionUpdate) {
          case 'agent_message_chunk':
            if (update.content.type === 'text') {
              self.emit('message', { content: update.content.text, isStreaming: true });
            }
            break;
          case 'tool_call':
            self.emit('tool-call', {
              name: update.title ?? 'unknown',
              input: (update as Record<string, unknown>)['toolUse'] ?? {},
              status: update.status,
            });
            break;
          case 'tool_call_update':
            self.emit('tool-call', {
              toolCallId: update.toolCallId,
              status: update.status,
            });
            break;
          default:
            console.log('[bridge] unhandled sessionUpdate:', JSON.stringify(update));
            break;
        }
      },
      async writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
        console.log('[bridge] writeTextFile:', params.path);
        return {};
      },
      async readTextFile(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse> {
        console.log('[bridge] readTextFile:', params.path);
        return { content: '' };
      },
    };

    this.connection = new acp.ClientSideConnection((_agent) => client, stream);

    // 1. initialize
    const initResult = await this.connection.initialize({
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
      },
    });
    console.log('[bridge] initialized, protocol:', initResult.protocolVersion);

    // 2. session/new — Lesson A02: cwd 필수
    const sessionResult = await this.connection.newSession({
      cwd: this.cwd,
      mcpServers: [],
    });
    this.sessionId = sessionResult.sessionId;
    this.ready = true;
    console.log('[bridge] session ready:', this.sessionId);
    this.emit('ready');
  }

  sendPrompt(sessionId: string, content: string): void {
    if (!this.connection || !this.sessionId) return;
    const sid = sessionId || this.sessionId;
    console.log('[bridge] sendPrompt →', sid, content.slice(0, 50));
    this.connection.prompt({
      sessionId: sid,
      prompt: [{ type: 'text', text: content }],
    }).then((result) => {
      console.log('[bridge] prompt done:', JSON.stringify(result));
      this.emit('message', { content: '', isStreaming: false }); // 완료 시그널
    }).catch((err: unknown) => {
      console.error('[bridge] prompt error:', err);
      this.emit('error', err);
    });
  }

  respondPermission(requestId: string, approved: boolean): void {
    this.emit(`permission-response:${requestId}`, approved);
  }

  stop(): void {
    this.process?.kill();
    this.ready = false;
    this.sessionId = null;
    this.connection = null;
  }
}
