import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import { IACPBridge } from '../../domain/ports/IACPBridge';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  result?: unknown;
  error?: { code: number; message: string };
  params?: unknown;
}

// OCP: IACPBridge 구현체 — 다른 에이전트로 교체 시 이 파일만 변경
export class ClineACPBridge extends EventEmitter implements IACPBridge {
  private process: ChildProcess | null = null;
  private msgId = 0;
  private sessionId: string | null = null;
  private ready = false;
  private readonly cwd: string;
  private pendingRequests = new Map<number, (res: JsonRpcResponse) => void>();

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
    // Lesson A01: npx 우회 — cline 직접 실행 (npm i -g cline으로 PATH에 있음)
    this.process = spawn('cline', ['--acp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error('cline --acp 프로세스 stdio 초기화 실패');
    }

    const rl = readline.createInterface({ input: this.process.stdout });
    rl.on('line', (line) => this.handleLine(line));

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('[cline stderr]', data.toString().trim());
    });

    this.process.on('exit', (code) => {
      this.ready = false;
      this.emit('exit', code);
    });

    await this.initialize();
  }

  private async initialize(): Promise<void> {
    // 1. initialize
    const initRes = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'cline-dev-agent', version: '1.0.0' },
    });
    console.log('[bridge] initialized:', JSON.stringify(initRes));

    // 2. initialized 알림 (ACP 프로토콜 필수)
    this.write({ jsonrpc: '2.0', method: 'initialized', params: {} });

    // 3. session/new — Lesson A02: cwd + mcpServers 필수
    const sessionRes = await this.request('session/new', {
      cwd: this.cwd,
      mcpServers: [],
    }) as { sessionId?: string };

    this.sessionId = sessionRes?.sessionId ?? `session-${Date.now()}`;
    this.ready = true;
    this.emit('ready');
  }

  private request(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      const payload: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

      this.pendingRequests.set(id, (res) => {
        if (res.error) reject(new Error(res.error.message));
        else resolve(res.result);
      });

      this.write(payload);
    });
  }

  private write(payload: unknown): void {
    const line = JSON.stringify(payload) + '\n';
    console.log('[bridge →]', line.trim());
    this.process?.stdin?.write(line);
  }

  private handleLine(line: string): void {
    if (!line.trim()) return;
    console.log('[bridge ←]', line.trim());
    let msg: JsonRpcResponse;
    try {
      msg = JSON.parse(line) as JsonRpcResponse;
    } catch {
      console.warn('[bridge] JSON 파싱 실패:', line);
      return;
    }

    // 응답 처리
    if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const handler = this.pendingRequests.get(msg.id)!;
      this.pendingRequests.delete(msg.id);
      handler(msg);
      return;
    }

    // 서버 푸시 (알림)
    if (msg.method) {
      this.handleNotification(msg);
    }
  }

  private handleNotification(msg: JsonRpcResponse): void {
    const params = msg.params as Record<string, unknown> | undefined;
    switch (msg.method) {
      case 'message':
      case 'assistant/message':
        this.emit('message', params);
        break;
      case 'tool/call':
        this.emit('tool-call', params);
        break;
      case 'permission/request':
        this.emit('permission', params);
        break;
      default:
        console.log('[bridge] unknown notification:', msg.method);
    }
  }

  sendPrompt(sessionId: string, content: string): void {
    this.write({
      jsonrpc: '2.0',
      id: ++this.msgId,
      method: 'session/prompt',
      params: { sessionId, content },
    });
  }

  respondPermission(requestId: string, approved: boolean): void {
    this.write({
      jsonrpc: '2.0',
      id: ++this.msgId,
      method: 'permission/respond',
      params: { requestId, approved },
    });
  }

  stop(): void {
    this.process?.kill();
    this.ready = false;
    this.sessionId = null;
  }
}
