import { useState, KeyboardEvent } from 'react';
import { MessageList } from './MessageList';
import type { Message } from '../hooks/useChat';

interface Props {
  messages: Message[];
  isAgentReady: boolean;
  hasPermissionRequest: boolean;
  onSend: (content: string) => void;
}

export function ChatPanel({ messages, isAgentReady, hasPermissionRequest, onSend }: Props) {
  const [input, setInput] = useState('');
  const isDisabled = !isAgentReady || hasPermissionRequest;

  const handleSend = () => {
    const content = input.trim();
    if (!content || isDisabled) return;
    onSend(content);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <MessageList messages={messages} />
      <div style={{ padding: '12px', borderTop: '1px solid #334155', display: 'flex', gap: '8px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={isAgentReady ? '메시지를 입력하세요 (Enter 전송)' : '에이전트 연결 중...'}
          rows={3}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '10px',
            resize: 'none',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={isDisabled || !input.trim()}
          style={{
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0 20px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.5 : 1,
            fontWeight: 600,
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
