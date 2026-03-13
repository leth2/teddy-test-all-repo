/**
 * useChat 훅 — WebSocket 클라이언트, 메시지 상태 관리
 *
 * Design 계약 (design.md):
 *   - respondPermission(requestId: number, optionId: string) — ACP 스펙 맞는 인터페이스
 *   - PermissionRequest: { requestId: number, toolCallId: string, options: PermissionOption[] }
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streaming?: boolean;
  timestamp: number;
}

export interface PermissionOption {
  optionId: string;
  name: string;
  kind: 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always';
}

export interface ToolCall {
  id: string;
  name: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: number;
}

export interface PermissionRequest {
  requestId: number;
  toolCallId: string;
  options: PermissionOption[];
}

export interface UseChatReturn {
  messages: Message[];
  toolCalls: ToolCall[];
  permissionRequest: PermissionRequest | null;
  isConnected: boolean;
  isAgentReady: boolean;
  sendMessage(content: string): void;
  respondPermission(requestId: number, optionId: string): void;
}

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentReady, setIsAgentReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      setIsAgentReady(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch {
        console.error('메시지 파싱 실패:', event.data);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  function handleServerMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'agent_ready':
        setIsAgentReady(true);
        break;

      case 'stream': {
        const content = msg.content as string;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.streaming && last.role === 'agent') {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + content },
            ];
          }
          return [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'agent',
              content,
              streaming: true,
              timestamp: Date.now(),
            },
          ];
        });
        if (msg.done) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [...prev.slice(0, -1), { ...last, streaming: false }];
            }
            return prev;
          });
        }
        break;
      }

      case 'toolcall': {
        const tc: ToolCall = {
          id: msg.id as string,
          name: msg.name as string,
          kind: (msg.kind as string) ?? 'other',
          status: msg.status as ToolCall['status'],
          timestamp: Date.now(),
        };
        setToolCalls((prev) => {
          const idx = prev.findIndex((t) => t.id === tc.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...tc };
            return updated;
          }
          return [...prev, tc];
        });
        break;
      }

      case 'permission_request':
        setPermissionRequest({
          requestId: msg.requestId as number,
          toolCallId: msg.toolCallId as string,
          options: (msg.options as PermissionOption[]) ?? [],
        });
        break;

      case 'agent_exit':
        setIsAgentReady(false);
        break;

      case 'error':
        console.error('[Server error]', msg.message);
        break;
    }
  }

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', content }));
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const respondPermission = useCallback((requestId: number, optionId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({ type: 'permission_response', requestId, optionId })
    );
    setPermissionRequest(null);
  }, []);

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
