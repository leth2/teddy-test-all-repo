export type SSEEventType =
  | 'agent-ready'
  | 'agent-message'
  | 'agent-tool-call'
  | 'permission-request'
  | 'agent-exit'
  | 'agent-error';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: Date;
}

// ISP: 이벤트 발행/구독 인터페이스 분리
export interface IEventBus {
  publish(event: SSEEvent): void;
  subscribe(handler: (event: SSEEvent) => void): () => void;
}
