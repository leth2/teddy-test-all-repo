import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { useSession } from '../../contexts/SessionContext';
import { useSSE } from '../../hooks/useSSE';
import { AgentAPI } from '../../services/AgentAPI';
import { ChatMessage } from '../../types/messages';
import { AgentReadyData, AgentMessageData, ToolCallData, PermissionRequestData } from '../../types/events';
import { PermissionDialog } from '../permission/PermissionDialog';

export function ChatPanel() {
  const { sessionId, status, setSessionId, setStatus } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingPermission, setPendingPermission] = useState<PermissionRequestData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: uuidv4(), timestamp: new Date() },
    ]);
  };

  useSSE(AgentAPI.getEventsUrl(), {
    'agent-ready': (e) => {
      const data = e.data as AgentReadyData;
      setSessionId(data.sessionId);
      setStatus('ready');
    },
    'agent-message': (e) => {
      const data = e.data as AgentMessageData;
      addMessage({ role: 'assistant', type: 'text', content: data.content });
      setStatus('ready');
    },
    'agent-tool-call': (e) => {
      const data = e.data as ToolCallData;
      addMessage({
        role: 'assistant',
        type: 'tool-call',
        content: '',
        toolName: data.name,
        toolInput: data.input,
        toolResult: data.result,
        toolStatus: data.status,
      });
    },
    'permission-request': (e) => {
      setPendingPermission(e.data as PermissionRequestData);
    },
    'agent-exit': () => {
      setStatus('disconnected');
      addMessage({ role: 'assistant', type: 'error', content: '에이전트가 종료되었습니다.' });
    },
    'agent-error': (e) => {
      const data = e.data as { message: string };
      addMessage({ role: 'assistant', type: 'error', content: `오류: ${data.message}` });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    addMessage({ role: 'user', type: 'text', content });
    setStatus('busy');
    await AgentAPI.sendPrompt(content, sessionId ?? '');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 mt-20 text-sm">
            {status === 'connecting' ? '에이전트에 연결 중…' : 'Cline에게 메시지를 보내보세요'}
          </div>
        )}
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        <div ref={scrollRef} />
      </div>

      <MessageInput onSend={handleSend} disabled={status !== 'ready'} />

      {pendingPermission && (
        <PermissionDialog
          request={pendingPermission}
          onResolved={() => setPendingPermission(null)}
        />
      )}
    </div>
  );
}
