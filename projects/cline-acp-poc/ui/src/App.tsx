import { useChat } from './hooks/useChat';
import { MessageList } from './components/MessageList';
import { ChatPanel } from './components/ChatPanel';
import { PermissionDialog } from './components/PermissionDialog';
import { ToolCallLog } from './components/ToolCallLog';

export default function App() {
  const {
    messages,
    toolCalls,
    isConnected,
    isThinking,
    pendingPermission,
    sendMessage,
    respondToPermission,
  } = useChat('ws://localhost:3001');

  return (
    <div className="app">
      {/* Header */}
      <header className="app__header">
        <h1 className="app__title">Dev Agent Chat</h1>
        <span className="app__subtitle">ACP · Claude Agent</span>
      </header>

      {/* Main content */}
      <div className="app__body">
        {/* Chat area */}
        <main className="app__main">
          {!isConnected && (
            <div className="connection-banner">
              <span className="spinner" />
              연결 중... (ACP 브릿지 서버: ws://localhost:3001)
            </div>
          )}

          <MessageList messages={messages} />

          <ChatPanel
            isConnected={isConnected}
            isThinking={isThinking}
            onSend={sendMessage}
          />
        </main>

        {/* Tool call sidebar */}
        {toolCalls.length > 0 && (
          <ToolCallLog toolCalls={toolCalls} />
        )}
      </div>

      {/* Permission dialog overlay */}
      {pendingPermission && (
        <PermissionDialog
          permission={pendingPermission}
          onRespond={respondToPermission}
        />
      )}
    </div>
  );
}
