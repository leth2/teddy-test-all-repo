import type { ToolCall } from '../hooks/useChat';

interface Props {
  toolCalls: ToolCall[];
}

const STATUS_ICONS: Record<string, string> = {
  running: '⏳',
  done: '✅',
  error: '❌',
};

const STATUS_LABELS: Record<string, string> = {
  running: '실행 중',
  done: '완료',
  error: '오류',
};

export function ToolCallLog({ toolCalls }: Props) {
  if (toolCalls.length === 0) {
    return (
      <div className="tool-call-log empty">
        <p className="empty-hint">툴콜 로그가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="tool-call-log">
      <h3 className="tool-log-title">🔧 툴콜 로그</h3>
      <ul className="tool-list">
        {toolCalls.map((tc) => (
          <li key={tc.id} className={`tool-item tool-item--${tc.status}`}>
            <div className="tool-header">
              <span className="tool-status-icon">{STATUS_ICONS[tc.status] ?? '❓'}</span>
              <span className="tool-name">{tc.name || '(이름 없음)'}</span>
              <span className="tool-status">{STATUS_LABELS[tc.status] ?? tc.status}</span>
              <span className="tool-time">
                {new Date(tc.timestamp).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
            {Object.keys(tc.args).length > 0 && (
              <details className="tool-args">
                <summary>인자 보기</summary>
                <pre>{JSON.stringify(tc.args, null, 2)}</pre>
              </details>
            )}
            {tc.result && (
              <div className="tool-result">
                <span className="tool-result-label">결과:</span>
                <span className="tool-result-value">
                  {tc.result.length > 200
                    ? tc.result.substring(0, 200) + '...'
                    : tc.result}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
