import type { ToolCall } from '../hooks/useChat';

interface Props {
  toolCalls: ToolCall[];
}

const statusColors: Record<ToolCall['status'], string> = {
  requested: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#22c55e',
};

const statusLabels: Record<ToolCall['status'], string> = {
  requested: '요청됨',
  in_progress: '실행 중',
  completed: '완료',
};

export function ToolCallLog({ toolCalls }: Props) {
  if (toolCalls.length === 0) {
    return (
      <div style={{ padding: '12px', color: '#6b7280', fontSize: '12px' }}>
        툴 호출 없음
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', maxHeight: '100%' }}>
      {toolCalls.map((tc) => (
        <div
          key={tc.id}
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid #1f2937',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: statusColors[tc.status],
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <code style={{ color: '#f59e0b', fontWeight: 'bold' }}>{tc.name}</code>
            <span style={{ color: statusColors[tc.status], marginLeft: 'auto' }}>
              {statusLabels[tc.status]}
            </span>
          </div>
          {Object.keys(tc.params).length > 0 && (
            <pre
              style={{
                margin: 0,
                color: '#9ca3af',
                fontSize: '11px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {JSON.stringify(tc.params)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
