import { useState, KeyboardEvent } from 'react';
import { MessageList } from './MessageList';
import type { Message } from '../hooks/useChat';

interface Props {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  isAgentReady: boolean;
  hasPermissionRequest: boolean;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isConnected,
  isAgentReady,
  hasPermissionRequest,
}: Props) {
  const [input, setInput] = useState('');

  const canSend = isConnected && isAgentReady && !hasPermissionRequest && input.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusText = () => {
    if (!isConnected) return '연결 끊김';
    if (!isAgentReady) return '에이전트 초기화 중...';
    if (hasPermissionRequest) return '권한 승인 대기 중...';
    return '메시지를 입력하세요 (Enter로 전송, Shift+Enter로 줄바꿈)';
  };

  return (
    <div className="chat-panel">
      <MessageList messages={messages} />
      <div className="chat-input-area">
        <div className="chat-status">{getStatusText()}</div>
        <div className="chat-input-row">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력..."
            disabled={!isConnected || !isAgentReady || hasPermissionRequest}
            rows={3}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!canSend}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
