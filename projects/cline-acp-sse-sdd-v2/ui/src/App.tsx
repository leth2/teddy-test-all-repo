import { useChat } from './hooks/useChat';
import { MessageList } from './components/MessageList';
import { ChatPanel } from './components/ChatPanel';
import { PermissionDialog } from './components/PermissionDialog';
import { ToolCallLog } from './components/ToolCallLog';

export default function App() {
  const { messages, toolCalls, permissionRequest, connected, sendPrompt, respondPermission } = useChat();

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#111827',
        color: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* 메인 채팅 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 헤더 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🤖</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Claude Agent ACP — SSE 브릿지
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
              HTTP SSE + JSON-RPC stdio (ACP 프로토콜)
            </p>
          </div>
        </div>

        {/* 채팅 메시지 목록 */}
        <MessageList messages={messages} />

        {/* 입력 패널 */}
        <ChatPanel connected={connected} onSend={sendPrompt} />
      </div>

      {/* 사이드바: 툴콜 로그 */}
      <div
        style={{
          width: '280px',
          borderLeft: '1px solid #374151',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #374151',
            fontSize: '13px',
            fontWeight: '600',
            color: '#9ca3af',
          }}
        >
          🔧 툴콜 로그 ({toolCalls.length})
        </div>
        <ToolCallLog toolCalls={toolCalls} />
      </div>

      {/* 권한 승인 다이얼로그 */}
      {permissionRequest && (
        <PermissionDialog
          request={permissionRequest}
          onRespond={respondPermission}
        />
      )}
    </div>
  );
}
