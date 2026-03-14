export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'tool-call' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: Date;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  toolStatus?: 'running' | 'done' | 'error';
}
