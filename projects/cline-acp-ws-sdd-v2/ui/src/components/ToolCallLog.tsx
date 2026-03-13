/**
 * 툴콜 실행 로그
 * ACP 스펙: kind 필드 (read/edit/delete/execute/other) 표시
 */

import type { ToolCall } from '../hooks/useChat';

interface Props {
  toolCalls: ToolCall[];
}

const statusIcon: Record<string, string> = {
  pending: '⏳',
  in_progress: '🔄',
  completed: '✅',
  failed: '❌',
};

const kindIcon: Record<string, string> = {
  read: '📖',
  edit: '✏️',
  delete: '🗑️',
  execute: '▶️',
  search: '🔍',
  fetch: '🌐',
  think: '💭',
  move: '📦',
  other: '🔧',
};

export function ToolCallLog({ toolCalls }: Props) {
  if (toolCalls.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
        툴콜 없음
      </div>
    );
  }

  return (
    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
      <h4 style={{ color: '#94a3b8', margin: '0 0 8px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
        툴콜 로그
      </h4>
      {toolCalls.map((tc) => (
        <div
          key={`${tc.id}-${tc.timestamp}`}
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '6px',
            padding: '8px 10px',
            border: '1px solid #1e293b',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span>{statusIcon[tc.status] ?? '⏳'}</span>
            <span>{kindIcon[tc.kind] ?? '🔧'}</span>
            <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{tc.name || tc.id}</span>
            <span style={{ marginLeft: 'auto', color: '#64748b' }}>{tc.kind}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
