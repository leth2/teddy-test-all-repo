import React from 'react';
import { useSession } from '../../contexts/SessionContext';

const statusConfig = {
  connecting: { color: 'bg-yellow-400', label: '연결 중' },
  ready: { color: 'bg-green-400', label: '준비됨' },
  busy: { color: 'bg-blue-400', label: '처리 중' },
  error: { color: 'bg-red-400', label: '오류' },
  disconnected: { color: 'bg-gray-400', label: '연결 끊김' },
};

export function AgentStatusBar() {
  const { status, sessionId } = useSession();
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-gray-300">{config.label}</span>
      </div>
      {sessionId && (
        <span className="text-gray-500 font-mono text-xs">
          session: {sessionId.slice(0, 8)}…
        </span>
      )}
      <span className="ml-auto text-gray-500 text-xs">Cline Dev Agent</span>
    </div>
  );
}
