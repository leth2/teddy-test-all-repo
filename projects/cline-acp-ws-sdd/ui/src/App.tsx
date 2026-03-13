import { useChat } from './hooks/useChat';
import { ChatPanel } from './components/ChatPanel';
import { ToolCallLog } from './components/ToolCallLog';
import { PermissionDialog } from './components/PermissionDialog';

function ConnectionStatus({ isConnected, isAgentReady }: { isConnected: boolean; isAgentReady: boolean }) {
  const status = !isConnected
    ? { label: '연결 끊김', cls: 'status--disconnected' }
    : !isAgentReady
    ? { label: '에이전트 초기화 중', cls: 'status--initializing' }
    : { label: '준비됨', cls: 'status--ready' };

  return (
    <div className={`connection-status ${status.cls}`}>
      <span className="status-dot" />
      <span>{status.label}</span>
    </div>
  );
}

export default function App() {
  const {
    messages,
    toolCalls,
    permissionRequest,
    isConnected,
    isAgentReady,
    sendMessage,
    respondPermission,
  } = useChat();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🤖 ACP 에이전트 채팅</h1>
        <ConnectionStatus isConnected={isConnected} isAgentReady={isAgentReady} />
      </header>

      <main className="app-main">
        <section className="chat-section">
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
            isConnected={isConnected}
            isAgentReady={isAgentReady}
            hasPermissionRequest={permissionRequest !== null}
          />
        </section>

        <aside className="sidebar">
          <ToolCallLog toolCalls={toolCalls} />
        </aside>
      </main>

      {permissionRequest && (
        <PermissionDialog
          request={permissionRequest}
          onRespond={respondPermission}
        />
      )}
    </div>
  );
}
