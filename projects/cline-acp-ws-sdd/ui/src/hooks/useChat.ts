import { useState, useEffect, useRef, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streaming?: boolean;
  timestamp: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
  result?: string;
  timestamp: number;
}

export interface PermissionRequest {
  requestId: string;
  filePath: string;
  operation: 'write' | 'delete';
}

export interface UseChatReturn {
  messages: Message[];
  toolCalls: ToolCall[];
  permissionRequest: PermissionRequest | null;
  isConnected: boolean;
  isAgentReady: boolean;
  sendMessage: (content: string) => void;
  respondPermission: (approved: boolean) => void;
}

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

let idCounter = 0;
function nextId(): string {
  return `${Date.now()}-${++idCounter}`;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentReady, setIsAgentReady] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsAgentReady(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event: MessageEvent) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const type = msg['type'] as string;

      switch (type) {
        case 'agent_ready':
          setIsAgentReady(true);
          break;

        case 'agent_exit':
          setIsAgentReady(false);
          break;

        case 'text': {
          const content = msg['content'] as string;
          if (streamingIdRef.current) {
            // Finalize streaming message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current
                  ? { ...m, content: m.content + (content ?? ''), streaming: false }
                  : m
              )
            );
            streamingIdRef.current = null;
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'agent',
                content: content ?? '',
                streaming: false,
                timestamp: Date.now(),
              },
            ]);
          }
          break;
        }

        case 'stream': {
          const content = msg['content'] as string;
          const done = Boolean(msg['done']);

          if (!streamingIdRef.current) {
            const id = nextId();
            streamingIdRef.current = id;
            setMessages((prev) => [
              ...prev,
              {
                id,
                role: 'agent',
                content: content ?? '',
                streaming: !done,
                timestamp: Date.now(),
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current
                  ? { ...m, content: m.content + (content ?? ''), streaming: !done }
                  : m
              )
            );
          }

          if (done) {
            streamingIdRef.current = null;
          }
          break;
        }

        case 'toolcall': {
          const id = msg['id'] as string;
          const name = msg['name'] as string;
          const args = (msg['args'] as Record<string, unknown>) ?? {};
          const status = msg['status'] as 'start' | 'done' | 'error';
          const result = msg['result'] as string | undefined;

          setToolCalls((prev) => {
            const existing = prev.find((t) => t.id === id);
            if (existing) {
              return prev.map((t) =>
                t.id === id
                  ? { ...t, status: status === 'start' ? 'running' : status, result }
                  : t
              );
            }
            return [
              ...prev,
              {
                id,
                name,
                args,
                status: 'running',
                timestamp: Date.now(),
              },
            ];
          });
          break;
        }

        case 'permission_request': {
          setPermissionRequest({
            requestId: msg['requestId'] as string,
            filePath: msg['filePath'] as string,
            operation: msg['operation'] as 'write' | 'delete',
          });
          break;
        }

        case 'error': {
          const errorContent = `⚠️ 오류: ${msg['message'] as string}`;
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'agent',
              content: errorContent,
              streaming: false,
              timestamp: Date.now(),
            },
          ]);
          break;
        }
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: 'user',
        content,
        timestamp: Date.now(),
      },
    ]);

    wsRef.current.send(JSON.stringify({ type: 'message', content }));
  }, []);

  const respondPermission = useCallback((approved: boolean) => {
    if (!wsRef.current || !permissionRequest) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'permission_response',
        requestId: permissionRequest.requestId,
        approved,
      })
    );
    setPermissionRequest(null);
  }, [permissionRequest]);

  return {
    messages,
    toolCalls,
    permissionRequest,
    isConnected,
    isAgentReady,
    sendMessage,
    respondPermission,
  };
}
