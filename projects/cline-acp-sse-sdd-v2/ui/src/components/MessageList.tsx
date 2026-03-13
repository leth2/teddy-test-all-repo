import { useEffect, useRef } from 'react';
import type { Message } from '../hooks/useChat';

interface Props {
  messages: Message[];
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 메시지 수신 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {messages.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
          에이전트에게 메시지를 보내세요
        </p>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#888',
              marginBottom: '2px',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}
          >
            {msg.role === 'user' ? '나' : '에이전트'}
          </div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              backgroundColor: msg.role === 'user' ? '#3b82f6' : '#374151',
              color: '#f9fafb',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
          >
            {msg.content}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
