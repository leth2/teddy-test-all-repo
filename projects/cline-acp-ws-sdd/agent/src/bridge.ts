import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';

export interface BridgeMessage {
  type: 'text' | 'stream';
  content: string;
  done?: boolean;
}

export interface ToolCallEvent {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'start' | 'done' | 'error';
  result?: string;
}

export interface PermissionEvent {
  requestId: string;
  filePath: string;
  operation: 'write' | 'delete';
}

// File operations that require permission
const PERMISSION_REQUIRED_TOOLS = new Set([
  'write_file',
  'create_file',
  'delete_file',
  'remove_file',
  'str_replace_editor',
]);

export class AcpBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = '';
  private pendingPermissions = new Map<string, (approved: boolean) => void>();
  private workDir: string;

  constructor(workDir: string = process.cwd()) {
    super();
    this.workDir = workDir;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn('npx', ['-y', '@zed-industries/claude-agent-acp'], {
          cwd: this.workDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        });

        this.process.stdout?.on('data', (data: Buffer) => {
          this.buffer += data.toString();
          this.processBuffer();
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          // ACP agent may write startup messages to stderr
          if (text.includes('ready') || text.includes('started') || text.includes('listening')) {
            resolve();
          }
        });

        this.process.on('error', (err: Error) => {
          this.emit('error', err);
          reject(err);
        });

        this.process.on('exit', (code: number | null) => {
          this.emit('exit', { code: code ?? -1 });
        });

        // Give the process 2 seconds to start
        setTimeout(() => resolve(), 2000);
      } catch (err) {
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.process) return;

    return new Promise((resolve) => {
      const proc = this.process!;

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, 5000);

      proc.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      proc.kill('SIGTERM');
      this.process = null;
    });
  }

  sendMessage(content: string): void {
    if (!this.process?.stdin) {
      this.emit('error', new Error('에이전트 프로세스가 실행 중이 아닙니다'));
      return;
    }

    const message = JSON.stringify({
      jsonrpc: '2.0',
      method: 'message',
      params: {
        content: [{ type: 'text', text: content }],
      },
      id: randomUUID(),
    });

    this.process.stdin.write(message + '\n');
  }

  sendPermissionResponse(approved: boolean, requestId: string): void {
    const resolver = this.pendingPermissions.get(requestId);
    if (resolver) {
      resolver(approved);
      this.pendingPermissions.delete(requestId);
    }

    if (!this.process?.stdin) return;

    const response = JSON.stringify({
      jsonrpc: '2.0',
      method: 'permission_response',
      params: {
        requestId,
        approved,
      },
      id: randomUUID(),
    });

    this.process.stdin.write(response + '\n');
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed);
        this.handleAcpMessage(msg);
      } catch {
        // Non-JSON output from agent, treat as text
        if (trimmed) {
          this.emit('message', { type: 'text', content: trimmed });
        }
      }
    }
  }

  private handleAcpMessage(msg: Record<string, unknown>): void {
    const method = msg['method'] as string | undefined;
    const params = msg['params'] as Record<string, unknown> | undefined;

    if (!method || !params) return;

    switch (method) {
      case 'message':
      case 'agent_message': {
        const content = params['content'];
        if (Array.isArray(content)) {
          for (const block of content) {
            const b = block as Record<string, unknown>;
            if (b['type'] === 'text') {
              this.emit('message', {
                type: 'text',
                content: b['text'] as string,
                done: true,
              });
            }
          }
        }
        break;
      }

      case 'stream':
      case 'stream_delta': {
        const delta = (params['delta'] as Record<string, unknown>) || params;
        const text = (delta['text'] as string) || (params['content'] as string) || '';
        const done = Boolean(params['done']);
        if (text) {
          this.emit('message', { type: 'stream', content: text, done });
        }
        break;
      }

      case 'tool_use':
      case 'tool_call': {
        const toolName = (params['name'] as string) || '';
        const toolId = (params['id'] as string) || randomUUID();
        const args = (params['input'] as Record<string, unknown>) ||
                     (params['args'] as Record<string, unknown>) || {};

        this.emit('toolcall', {
          id: toolId,
          name: toolName,
          args,
          status: 'start',
        } as ToolCallEvent);

        // Check if this tool requires permission
        if (PERMISSION_REQUIRED_TOOLS.has(toolName)) {
          const filePath = (args['path'] as string) ||
                           (args['file_path'] as string) ||
                           (args['filename'] as string) || 'unknown';
          const operation: 'write' | 'delete' = toolName.includes('delete') || toolName.includes('remove')
            ? 'delete'
            : 'write';

          const requestId = randomUUID();
          this.emit('permission', {
            requestId,
            filePath,
            operation,
          } as PermissionEvent);
        }
        break;
      }

      case 'tool_result': {
        const toolId = (params['tool_use_id'] as string) || (params['id'] as string) || '';
        const isError = Boolean(params['is_error']);
        const content = params['content'];
        let result = '';
        if (Array.isArray(content)) {
          result = content
            .filter((b: unknown) => (b as Record<string, unknown>)['type'] === 'text')
            .map((b: unknown) => (b as Record<string, unknown>)['text'] as string)
            .join('');
        } else if (typeof content === 'string') {
          result = content;
        }

        this.emit('toolcall', {
          id: toolId,
          name: '',
          args: {},
          status: isError ? 'error' : 'done',
          result,
        } as ToolCallEvent);
        break;
      }

      default:
        // Unknown method - ignore silently
        break;
    }
  }

  get isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
