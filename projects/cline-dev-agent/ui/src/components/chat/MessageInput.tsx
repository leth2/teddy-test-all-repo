import React, { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 p-3 border-t border-gray-700 bg-gray-900">
      <textarea
        className="flex-1 resize-none bg-gray-800 text-gray-100 rounded-xl px-4 py-2.5 text-sm
          placeholder-gray-500 outline-none border border-gray-700 focus:border-blue-500
          transition-colors min-h-[44px] max-h-32"
        placeholder={disabled ? '에이전트 연결 대기 중…' : 'Cline에게 메시지 (Enter 전송, Shift+Enter 줄바꿈)'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40
          disabled:cursor-not-allowed text-white transition-colors"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
