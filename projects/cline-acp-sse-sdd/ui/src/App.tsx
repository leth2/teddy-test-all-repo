import { useChat } from './hooks/useChat';
import { ChatPanel } from './components/ChatPanel';
import { PermissionDialog } from './components/PermissionDialog';
import { ToolCallLog } from './components/ToolCallLog';

function App() {
  const { messages, toolCalls, permissionRequest, connected, sendPrompt, respondPermission } =
    useChat();

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 Dev Agent Chat (SSE)</h1>
        <span className="app-subtitle">ACP 브릿지 · HTTP SSE</span>
      </header>

      <main className="app-main">
        <div className="app-chat">
          <ChatPanel
            messages={messages}
            connected={connected}
            onSendPrompt={sendPrompt}
          />
        </div>
        <aside className="app-sidebar">
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

export default App;
