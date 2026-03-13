import { useEffect, useRef } from 'react';
import type { Message } from '../hooks/useChat';

interface Props {
  messages: Message[];
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <p className="empty-hint">에이전트에게 메시지를 보내보세요 👋</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div key={msg.id} className={`message message--${msg.role}`}>
          <div className="message-header">
            <span className="message-role">
              {msg.role === 'user' ? '👤 나' : '🤖 에이전트'}
            </span>
            <span className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
          <div className="message-content">
            <pre>{msg.content}</pre>
            {msg.streaming && <span className="streaming-cursor">▋</span>}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
