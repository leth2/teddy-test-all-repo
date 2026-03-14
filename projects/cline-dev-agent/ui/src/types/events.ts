export type SSEEventType =
  | 'agent-ready'
  | 'agent-message'
  | 'agent-tool-call'
  | 'permission-request'
  | 'agent-exit'
  | 'agent-error';

export interface AgentReadyData {
  sessionId: string;
}

export interface AgentMessageData {
  content: string;
  isStreaming?: boolean;
}

export interface ToolCallData {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  status: 'running' | 'done' | 'error';
}

export interface PermissionRequestData {
  requestId: string;
  type: string;
  description: string;
  details: unknown;
}

export interface AgentExitData {
  code: number | null;
}

export type SSEEventData =
  | AgentReadyData
  | AgentMessageData
  | ToolCallData
  | PermissionRequestData
  | AgentExitData;

export interface SSEEvent {
  type: SSEEventType;
  data: SSEEventData;
}
