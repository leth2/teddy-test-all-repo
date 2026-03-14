export type MessageRole = 'user' | 'assistant' | 'tool';
export type MessageType = 'text' | 'tool-call' | 'tool-result' | 'error';

export interface Message {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: Date;
  toolName?: string;
  toolInput?: unknown;
  toolResult?: unknown;
}
