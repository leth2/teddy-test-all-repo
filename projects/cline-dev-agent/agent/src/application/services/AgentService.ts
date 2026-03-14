import { IACPBridge } from '../../domain/ports/IACPBridge';
import { IEventBus } from '../../domain/ports/IEventBus';

// S: 에이전트 상태 관리 + 브릿지→이벤트 변환 단일 책임
export class AgentService {
  constructor(
    private readonly bridge: IACPBridge,
    private readonly eventBus: IEventBus,
  ) {
    this.wireEvents();
  }

  private wireEvents(): void {
    this.bridge.on('ready', () => {
      this.eventBus.publish({
        type: 'agent-ready',
        data: { sessionId: this.bridge.getSessionId() },
        timestamp: new Date(),
      });
    });

    this.bridge.on('message', (data: unknown) => {
      this.eventBus.publish({
        type: 'agent-message',
        data,
        timestamp: new Date(),
      });
    });

    this.bridge.on('tool-call', (data: unknown) => {
      this.eventBus.publish({
        type: 'agent-tool-call',
        data,
        timestamp: new Date(),
      });
    });

    this.bridge.on('permission', (data: unknown) => {
      this.eventBus.publish({
        type: 'permission-request',
        data,
        timestamp: new Date(),
      });
    });

    this.bridge.on('exit', (code: unknown) => {
      this.eventBus.publish({
        type: 'agent-exit',
        data: { code },
        timestamp: new Date(),
      });
    });

    this.bridge.on('error', (err: unknown) => {
      this.eventBus.publish({
        type: 'agent-error',
        data: { message: String(err) },
        timestamp: new Date(),
      });
    });
  }

  isReady(): boolean {
    return this.bridge.isReady();
  }

  getSessionId(): string | null {
    return this.bridge.getSessionId();
  }

  async start(): Promise<void> {
    await this.bridge.start();
  }

  stop(): void {
    this.bridge.stop();
  }
}
