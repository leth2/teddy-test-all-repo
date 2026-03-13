import { useState, useEffect, useCallback, useRef } from 'react';

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
  timestamp: number;
}

export interface PermissionRequest {
  requestId: string;
  description: string;
  tool: string;
}

const SSE_URL = '/events';
const PROMPT_URL = '/prompt';
const PERMISSION_URL = '/permission';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(SSE_URL);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
    });

    es.addEventListener('message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data) as Message;
        setMessages((prev) => [...prev, msg]);
      } catch {
        // 파싱 실패 무시
      }
    });

    es.addEventListener('toolcall', (e: MessageEvent) => {
      try {
        const tc = JSON.parse(e.data) as ToolCall;
        setToolCalls((prev) => [...prev, tc]);
      } catch {
        // 파싱 실패 무시
      }
    });

    es.addEventListener('permission-request', (e: MessageEvent) => {
      try {
        const req = JSON.parse(e.data) as PermissionRequest;
        setPermissionRequest(req);
      } catch {
        // 파싱 실패 무시
      }
    });

    es.addEventListener('agent-exit', () => {
      setConnected(false);
    });

    es.onerror = () => {
      setConnected(false);
    };

    es.onopen = () => {
      setConnected(true);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  const sendPrompt = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    await fetch(PROMPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  }, []);

  const respondPermission = useCallback(async (requestId: string, approved: boolean) => {
    setPermissionRequest(null);
    await fetch(PERMISSION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, approved }),
    });
  }, []);

  return {
    messages,
    toolCalls,
    permissionRequest,
    connected,
    sendPrompt,
    respondPermission,
  };
}
