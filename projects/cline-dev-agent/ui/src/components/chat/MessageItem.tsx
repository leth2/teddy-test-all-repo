import React from 'react';
import { ChatMessage } from '../../types/messages';
import { ToolCallCard } from '../tools/ToolCallCard';

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  if (message.type === 'tool-call') {
    return (
      <ToolCallCard
        name={message.toolName ?? 'unknown'}
        input={message.toolInput ?? {}}
        result={message.toolResult}
        status={message.toolStatus ?? 'done'}
      />
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : message.type === 'error'
            ? 'bg-red-900 text-red-100'
            : 'bg-gray-700 text-gray-100'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
