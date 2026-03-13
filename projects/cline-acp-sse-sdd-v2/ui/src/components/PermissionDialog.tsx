import type { PermissionRequest } from '../hooks/useChat';

interface Props {
  request: PermissionRequest;
  onRespond: (requestId: string, approved: boolean) => Promise<void>;
}

export function PermissionDialog({ request, onRespond }: Props) {
  const handleApprove = () => { void onRespond(request.requestId, true); };
  const handleDeny = () => { void onRespond(request.requestId, false); };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          border: '1px solid #374151',
        }}
      >
        <h3 style={{ color: '#f9fafb', marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>
          🔒 권한 요청
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>도구</div>
          <code
            style={{
              backgroundColor: '#374151',
              padding: '4px 8px',
              borderRadius: '4px',
              color: '#f59e0b',
              fontSize: '13px',
            }}
          >
            {request.tool}
          </code>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>설명</div>
          <p style={{ color: '#e5e7eb', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
            {request.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDeny}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: '1px solid #6b7280',
              backgroundColor: 'transparent',
              color: '#d1d5db',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            거부
          </button>
          <button
            onClick={handleApprove}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#22c55e',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            승인
          </button>
        </div>
      </div>
    </div>
  );
}
