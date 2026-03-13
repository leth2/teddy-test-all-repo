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

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="message-empty">
          메시지가 없습니다. 에이전트에게 말을 걸어보세요.
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message message--${msg.role}`}
        >
          <div className="message-role">
            {msg.role === 'user' ? '👤 사용자' : '🤖 에이전트'}
          </div>
          <div className="message-content">{msg.content}</div>
          <div className="message-time">
            {new Date(msg.timestamp).toLocaleTimeString('ko-KR')}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
