import { EventEmitter } from 'events';

export type ACPBridgeEvent =
  | 'ready'
  | 'message'
  | 'tool-call'
  | 'permission'
  | 'exit'
  | 'error';

// DIP: 상위 레이어는 이 인터페이스에 의존 (구현체 아님)
// OCP: 다른 ACP 에이전트(e.g. claude-agent-acp)로 교체 가능
export interface IACPBridge extends EventEmitter {
  start(): Promise<void>;
  stop(): void;
  sendPrompt(sessionId: string, content: string): void;
  respondPermission(requestId: string, approved: boolean): void;
  isReady(): boolean;
  getSessionId(): string | null;
}
