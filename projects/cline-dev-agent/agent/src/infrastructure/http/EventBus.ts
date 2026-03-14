import { IEventBus, SSEEvent } from '../../domain/ports/IEventBus';

// S: 이벤트 발행/구독 단일 책임
export class EventBus implements IEventBus {
  private handlers: Set<(event: SSEEvent) => void> = new Set();

  publish(event: SSEEvent): void {
    this.handlers.forEach((h) => h(event));
  }

  subscribe(handler: (event: SSEEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
