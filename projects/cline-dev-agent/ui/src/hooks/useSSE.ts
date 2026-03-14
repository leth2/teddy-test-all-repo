import { useEffect, useRef, useCallback } from 'react';
import { SSEEvent, SSEEventType } from '../types/events';

type SSEHandler = (event: SSEEvent) => void;

export function useSSE(url: string, handlers: Partial<Record<SSEEventType, SSEHandler>>) {
  const esRef = useRef<EventSource | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(url);
    esRef.current = es;

    const eventTypes: SSEEventType[] = [
      'agent-ready',
      'agent-message',
      'agent-tool-call',
      'permission-request',
      'agent-exit',
      'agent-error',
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, (e: MessageEvent) => {
        const handler = handlersRef.current[type];
        if (handler) {
          handler({ type, data: JSON.parse(e.data) });
        }
      });
    });

    es.onerror = () => {
      console.warn('[useSSE] 연결 오류 — 재연결 시도');
      es.close();
      setTimeout(connect, 3000); // 3초 후 재연결
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);
}
