import type { PermissionRequest } from '../hooks/useChat';

interface Props {
  request: PermissionRequest;
  onRespond: (approved: boolean) => void;
}

const OPERATION_LABELS: Record<string, string> = {
  write: '파일 쓰기',
  delete: '파일 삭제',
};

const OPERATION_ICONS: Record<string, string> = {
  write: '✏️',
  delete: '🗑️',
};

export function PermissionDialog({ request, onRespond }: Props) {
  return (
    <div className="permission-overlay">
      <div className="permission-dialog">
        <div className="permission-header">
          <span className="permission-icon">
            {OPERATION_ICONS[request.operation] ?? '⚠️'}
          </span>
          <h2>권한 승인 요청</h2>
        </div>

        <div className="permission-body">
          <p className="permission-op">
            에이전트가 다음 작업을 수행하려 합니다:
          </p>
          <div className="permission-detail">
            <span className="permission-label">작업</span>
            <span className="permission-value">
              {OPERATION_LABELS[request.operation] ?? request.operation}
            </span>
          </div>
          <div className="permission-detail">
            <span className="permission-label">파일 경로</span>
            <code className="permission-path">{request.filePath}</code>
          </div>
        </div>

        <div className="permission-actions">
          <button
            className="btn btn--deny"
            onClick={() => onRespond(false)}
          >
            ❌ 거부
          </button>
          <button
            className="btn btn--approve"
            onClick={() => onRespond(true)}
          >
            ✅ 승인
          </button>
        </div>
      </div>
    </div>
  );
}
