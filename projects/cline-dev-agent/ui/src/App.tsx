import React from 'react';
import { SessionProvider } from './contexts/SessionContext';
import { AgentStatusBar } from './components/layout/AgentStatusBar';
import { ChatPanel } from './components/chat/ChatPanel';

export default function App() {
  return (
    <SessionProvider>
      <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
        <AgentStatusBar />
        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      </div>
    </SessionProvider>
  );
}
