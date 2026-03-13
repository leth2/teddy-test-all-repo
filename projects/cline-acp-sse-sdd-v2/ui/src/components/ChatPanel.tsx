import { useState, type FormEvent } from 'react';

interface Props {
  connected: boolean;
  onSend: (text: string) => Promise<void>;
}

export function ChatPanel({ connected, onSend }: Props) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setInputText('');

    try {
      await onSend(text);
    } catch (err) {
      setError((err as Error).message ?? '전송 실패');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ borderTop: '1px solid #374151', padding: '16px' }}>
      {/* SSE 연결 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: connected ? '#22c55e' : '#ef4444',
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '12px', color: connected ? '#22c55e' : '#ef4444' }}>
          {connected ? 'SSE 연결됨' : 'SSE 연결 안됨'}
        </span>
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>
          오류: {error}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={connected ? '에이전트에게 메시지 입력...' : 'SSE 연결 대기 중...'}
          disabled={!connected || sending}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #374151',
            backgroundColor: '#1f2937',
            color: '#f9fafb',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!connected || sending || !inputText.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: connected && !sending ? '#3b82f6' : '#374151',
            color: '#f9fafb',
            fontSize: '14px',
            cursor: connected && !sending ? 'pointer' : 'not-allowed',
          }}
        >
          {sending ? '전송 중...' : '전송'}
        </button>
      </form>
    </div>
  );
}
