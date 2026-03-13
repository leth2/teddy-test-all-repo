import { useState, type FormEvent } from 'react';
import type { Message } from '../hooks/useChat';
import { MessageList } from './MessageList';

interface Props {
  messages: Message[];
  connected: boolean;
  onSendPrompt: (text: string) => Promise<void>;
}

export function ChatPanel({ messages, connected, onSendPrompt }: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await onSendPrompt(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>채팅</h2>
        <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 SSE 연결됨' : '🔴 연결 끊김'}
        </span>
      </div>
      <MessageList messages={messages} />
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="에이전트에게 메시지를 입력하세요..."
          disabled={!connected || sending}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!connected || sending || !input.trim()}
        >
          {sending ? '전송 중...' : '전송'}
        </button>
      </form>
    </div>
  );
}
