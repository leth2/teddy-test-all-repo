import { useState } from 'react';
import type { ToolCall } from '../hooks/useChat';

interface Props {
  toolCalls: ToolCall[];
}

export function ToolCallLog({ toolCalls }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (toolCalls.length === 0) {
    return (
      <aside className="tool-log">
        <h3 className="tool-log__title">도구 로그</h3>
        <p className="tool-log__empty">아직 도구가 사용되지 않았습니다.</p>
      </aside>
    );
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="tool-log">
      <h3 className="tool-log__title">도구 로그</h3>
      <ul className="tool-log__list">
        {toolCalls.map((tool) => (
          <li key={tool.id} className={`tool-log__item tool-log__item--${tool.status}`}>
            <button
              className="tool-log__header"
              onClick={() => toggleExpand(tool.id)}
              aria-expanded={expanded.has(tool.id)}
            >
              <span className="tool-log__status-icon">{statusIcon(tool.status)}</span>
              <span className="tool-log__name">{tool.toolName}</span>
              <span className="tool-log__badge">{statusLabel(tool.status)}</span>
              <span className="tool-log__chevron">{expanded.has(tool.id) ? '▲' : '▼'}</span>
            </button>

            {expanded.has(tool.id) && tool.details && (
              <pre className="tool-log__details">
                {typeof tool.details === 'string'
                  ? tool.details
                  : JSON.stringify(tool.details, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function statusIcon(status: ToolCall['status']): string {
  switch (status) {
    case 'running': return '⏳';
    case 'done':    return '✅';
    case 'denied':  return '🚫';
    case 'error':   return '❌';
  }
}

function statusLabel(status: ToolCall['status']): string {
  switch (status) {
    case 'running': return '실행 중';
    case 'done':    return '완료';
    case 'denied':  return '거부됨';
    case 'error':   return '오류';
  }
}
