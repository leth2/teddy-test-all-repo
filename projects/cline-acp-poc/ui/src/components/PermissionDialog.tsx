import type { PendingPermission } from '../hooks/useChat';

interface Props {
  permission: PendingPermission;
  onRespond: (approved: boolean) => void;
}

export function PermissionDialog({ permission, onRespond }: Props) {
  return (
    <div className="permission-overlay">
      <div className="permission-dialog">
        <div className="permission-dialog__header">
          <span className="permission-dialog__icon">🔐</span>
          <h2>권한 요청</h2>
        </div>

        <div className="permission-dialog__body">
          <div className="permission-dialog__tool">
            <span className="permission-dialog__label">도구</span>
            <code className="permission-dialog__tool-name">{permission.toolName}</code>
          </div>

          {permission.description && (
            <div className="permission-dialog__desc">
              <span className="permission-dialog__label">설명</span>
              <p>{permission.description}</p>
            </div>
          )}

          <p className="permission-dialog__question">
            이 작업을 허용하시겠습니까?
          </p>
        </div>

        <div className="permission-dialog__actions">
          <button
            className="btn btn--deny"
            onClick={() => onRespond(false)}
          >
            거부
          </button>
          <button
            className="btn btn--approve"
            onClick={() => onRespond(true)}
          >
            허용
          </button>
        </div>
      </div>
    </div>
  );
}
