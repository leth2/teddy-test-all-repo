import type { PermissionRequest } from '../hooks/useChat';

interface Props {
  request: PermissionRequest;
  onRespond: (requestId: string, approved: boolean) => Promise<void>;
}

export function PermissionDialog({ request, onRespond }: Props) {
  return (
    <div className="permission-overlay">
      <div className="permission-dialog">
        <h3 className="permission-title">⚠️ 권한 요청</h3>
        <div className="permission-info">
          <div className="permission-field">
            <span className="permission-label">도구:</span>
            <code className="permission-value">{request.tool}</code>
          </div>
          <div className="permission-field">
            <span className="permission-label">설명:</span>
            <p className="permission-value">{request.description}</p>
          </div>
        </div>
        <p className="permission-question">이 작업을 허용하시겠습니까?</p>
        <div className="permission-actions">
          <button
            className="permission-btn permission-btn--approve"
            onClick={() => onRespond(request.requestId, true)}
          >
            ✅ 승인
          </button>
          <button
            className="permission-btn permission-btn--deny"
            onClick={() => onRespond(request.requestId, false)}
          >
            ❌ 거부
          </button>
        </div>
      </div>
    </div>
  );
}
