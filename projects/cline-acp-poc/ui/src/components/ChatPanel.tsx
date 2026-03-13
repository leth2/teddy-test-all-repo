import { KeyboardEvent, useRef, useState } from 'react';

interface Props {
  isConnected: boolean;
  isThinking: boolean;
  onSend: (text: string) => void;
}

export function ChatPanel({ isConnected, isThinking, onSend }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const disabled = !isConnected || isThinking;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      {/* Connection status indicator */}
      <div className="chat-panel__status">
        <span className={`status-dot status-dot--${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {!isConnected
            ? '연결 중...'
            : isThinking
            ? '에이전트 응답 중...'
            : '연결됨'}
        </span>
        {isThinking && <span className="thinking-indicator">●●●</span>}
      </div>

      {/* Input area */}
      <div className="chat-panel__input-row">
        <textarea
          ref={textareaRef}
          className="chat-panel__textarea"
          placeholder={
            !isConnected
              ? '연결 중...'
              : isThinking
              ? '에이전트가 응답하는 중입니다...'
              : '메시지를 입력하세요 (Enter로 전송, Shift+Enter로 줄바꿈)'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={3}
        />
        <button
          className="chat-panel__send-btn"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          aria-label="전송"
        >
          {isThinking ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}
