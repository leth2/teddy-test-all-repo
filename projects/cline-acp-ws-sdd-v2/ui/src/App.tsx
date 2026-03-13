/**
 * App.tsx — 메인 앱
 * 다크 테마, 한국어 UI
 */

import { useChat } from './hooks/useChat';
import { ChatPanel } from './components/ChatPanel';
import { ToolCallLog } from './components/ToolCallLog';
import { PermissionDialog } from './components/PermissionDialog';

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
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        color: '#f1f5f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* 헤더 */}
      <header
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
          🤖 Cline ACP 채팅
        </h1>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '12px',
            backgroundColor: isAgentReady ? '#16a34a20' : isConnected ? '#ca8a0420' : '#dc262620',
            color: isAgentReady ? '#4ade80' : isConnected ? '#fbbf24' : '#f87171',
            border: `1px solid ${isAgentReady ? '#16a34a40' : isConnected ? '#ca8a0440' : '#dc262640'}`,
          }}
        >
          {isAgentReady ? '● 에이전트 준비됨' : isConnected ? '● 연결됨 (에이전트 시작 중...)' : '● 연결 안됨'}
        </span>
      </header>

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 채팅 패널 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatPanel
            messages={messages}
            isAgentReady={isAgentReady}
            hasPermissionRequest={permissionRequest !== null}
            onSend={sendMessage}
          />
        </div>

        {/* 툴콜 로그 패널 */}
        <div
          style={{
            width: '280px',
            borderLeft: '1px solid #1e293b',
            overflowY: 'auto',
            backgroundColor: '#0a1628',
          }}
        >
          <ToolCallLog toolCalls={toolCalls} />
        </div>
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
