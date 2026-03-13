/**
 * 파일 권한 승인 모달
 * ACP 스펙: options 배열 (optionId, name, kind) 기반 버튼 표시
 * design.md: respondPermission(requestId: number, optionId: string)
 */

import type { PermissionRequest, PermissionOption } from '../hooks/useChat';

interface Props {
  request: PermissionRequest;
  onRespond: (requestId: number, optionId: string) => void;
}

const kindStyle: Record<string, { bg: string; text: string }> = {
  allow_once: { bg: '#16a34a', text: '#fff' },
  allow_always: { bg: '#065f46', text: '#fff' },
  reject_once: { bg: '#dc2626', text: '#fff' },
  reject_always: { bg: '#7f1d1d', text: '#fff' },
};

export function PermissionDialog({ request, onRespond }: Props) {
  const handleOption = (option: PermissionOption) => {
    onRespond(request.requestId, option.optionId);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '560px',
          border: '1px solid #334155',
        }}
      >
        <h3 style={{ color: '#f1f5f9', margin: '0 0 8px', fontSize: '18px' }}>
          🔐 권한 요청
        </h3>
        <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: '14px' }}>
          툴콜 ID: <code style={{ color: '#fbbf24' }}>{request.toolCallId}</code>
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {request.options.map((option) => {
            const style = kindStyle[option.kind] ?? { bg: '#475569', text: '#fff' };
            return (
              <button
                key={option.optionId}
                onClick={() => handleOption(option)}
                style={{
                  backgroundColor: style.bg,
                  color: style.text,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
