import type { ToolCall } from '../hooks/useChat';

interface Props {
  toolCalls: ToolCall[];
}

export function ToolCallLog({ toolCalls }: Props) {
  return (
    <div className="toolcall-log">
      <h3 className="toolcall-log-title">🔧 툴콜 로그</h3>
      {toolCalls.length === 0 ? (
        <div className="toolcall-empty">툴콜 없음</div>
      ) : (
        <div className="toolcall-list">
          {toolCalls.map((tc) => (
            <div key={tc.id} className="toolcall-item">
              <div className="toolcall-header">
                <span className="toolcall-name">{tc.name}</span>
                <span className="toolcall-time">
                  {new Date(tc.timestamp).toLocaleTimeString('ko-KR')}
                </span>
              </div>
              <pre className="toolcall-params">
                {JSON.stringify(tc.params, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
