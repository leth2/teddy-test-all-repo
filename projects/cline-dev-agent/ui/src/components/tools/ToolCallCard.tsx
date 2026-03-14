import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal, FileText, Edit } from 'lucide-react';

interface ToolCallCardProps {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  status: 'running' | 'done' | 'error';
}

const toolIcons: Record<string, React.ReactNode> = {
  execute_command: <Terminal className="w-4 h-4" />,
  read_file: <FileText className="w-4 h-4" />,
  write_to_file: <Edit className="w-4 h-4" />,
};

const statusStyles = {
  running: 'border-blue-500 bg-blue-950',
  done: 'border-green-500 bg-green-950',
  error: 'border-red-500 bg-red-950',
};

export function ToolCallCard({ name, input, result, status }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = toolIcons[name] ?? <Terminal className="w-4 h-4" />;

  return (
    <div className={`rounded-lg border ${statusStyles[status]} p-3 my-2 font-mono text-xs`}>
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400">{icon}</span>
        <span className="text-blue-300 font-semibold">{name}</span>
        {status === 'running' && (
          <span className="ml-auto text-blue-400 animate-pulse">실행 중…</span>
        )}
        {status === 'done' && <span className="ml-auto text-green-400">완료</span>}
        {status === 'error' && <span className="ml-auto text-red-400">오류</span>}
        <span className="text-gray-500">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div>
            <div className="text-gray-500 mb-1">입력</div>
            <pre className="text-gray-300 overflow-auto max-h-40 bg-black/30 rounded p-2">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <div className="text-gray-500 mb-1">결과</div>
              <pre className="text-gray-300 overflow-auto max-h-40 bg-black/30 rounded p-2">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
