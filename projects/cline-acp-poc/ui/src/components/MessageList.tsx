import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../hooks/useChat';

interface Props {
  messages: ChatMessage[];
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <p>에이전트에게 메시지를 보내세요...</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div key={msg.id} className={`message message--${msg.role}`}>
          <div className="message__bubble">
            {msg.role === 'tool' ? (
              <pre className="message__tool-content">{msg.content}</pre>
            ) : (
              <span className="message__text">{msg.content}</span>
            )}
          </div>
          <div className="message__meta">
            <span className="message__role">{roleLabel(msg.role)}</span>
            <span className="message__time">{formatTime(msg.timestamp)}</span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function roleLabel(role: ChatMessage['role']): string {
  switch (role) {
    case 'user':    return '나';
    case 'agent':   return '에이전트';
    case 'thought': return '생각 중';
    case 'tool':    return '도구';
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
