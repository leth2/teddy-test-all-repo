import { useState, useEffect, useRef, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

export interface ToolCall {
  id: string;
  name: string;
  params: Record<string, unknown>;
  status: 'requested' | 'in_progress' | 'completed';
  timestamp: number;
}

export interface PermissionRequest {
  requestId: string;
  description: string;
  tool: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3002';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // EventSource 연결
    const evtSource = new EventSource(`${SERVER_URL}/events`);
    eventSourceRef.current = evtSource;

    evtSource.addEventListener('connected', () => {
      setConnected(true);
    });

    evtSource.addEventListener('message', (event: MessageEvent) => {
      const msg = JSON.parse(event.data) as Message;
      setMessages((prev) => [...prev, msg]);
    });

    evtSource.addEventListener('toolcall', (event: MessageEvent) => {
      const tc = JSON.parse(event.data) as ToolCall;
      setToolCalls((prev) => {
        const idx = prev.findIndex((t) => t.id === tc.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = tc;
          return updated;
        }
        return [...prev, tc];
      });
    });

    evtSource.addEventListener('permission-request', (event: MessageEvent) => {
      const req = JSON.parse(event.data) as PermissionRequest;
      setPermissionRequest(req);
    });

    evtSource.addEventListener('keepalive', () => {
      // keepalive 수신 — 연결 유지 확인
    });

    evtSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      evtSource.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, []);

  const sendPrompt = useCallback(async (text: string): Promise<void> => {
    // 낙관적 업데이트: 사용자 메시지 즉시 표시
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const response = await fetch(`${SERVER_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const err = await response.json() as { error: string };
      throw new Error(err.error ?? '프롬프트 전송 실패');
    }
  }, []);

  const respondPermission = useCallback(
    async (requestId: string, approved: boolean): Promise<void> => {
      setPermissionRequest(null);

      const response = await fetch(`${SERVER_URL}/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, approved }),
      });

      if (!response.ok) {
        const err = await response.json() as { error: string };
        throw new Error(err.error ?? '권한 응답 전송 실패');
      }
    },
    []
  );

  return {
    messages,
    toolCalls,
    permissionRequest,
    connected,
    sendPrompt,
    respondPermission,
  };
}
