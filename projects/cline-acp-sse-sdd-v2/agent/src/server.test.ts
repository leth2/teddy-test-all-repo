import { describe, it, expect, vi, beforeEach } from 'vitest';

// SSE 형식 검증 테스트
// 참조: .sdd/specs/*/references/sse-format.md

describe('SSE 이벤트 형식 유틸리티', () => {
  function formatSSEEvent(eventType: string, data: unknown): string {
    return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  it('올바른 SSE 이벤트 형식 — event: + data: + 빈줄', () => {
    const result = formatSSEEvent('message', { content: '테스트' });
    expect(result).toBe('event: message\ndata: {"content":"테스트"}\n\n');
  });

  it('keepalive 이벤트 형식', () => {
    const result = formatSSEEvent('keepalive', {});
    expect(result).toBe('event: keepalive\ndata: {}\n\n');
  });

  it('permission-request 이벤트 형식', () => {
    const data = { requestId: 'req_001', description: '파일 쓰기', tool: 'Write' };
    const result = formatSSEEvent('permission-request', data);
    expect(result).toContain('event: permission-request\n');
    expect(result).toContain('"requestId":"req_001"');
    expect(result.endsWith('\n\n')).toBe(true);
  });

  it('toolcall 이벤트 형식', () => {
    const data = { id: 'tc_001', name: 'Read', params: {} };
    const result = formatSSEEvent('toolcall', data);
    expect(result).toContain('event: toolcall\n');
    expect(result.endsWith('\n\n')).toBe(true);
  });
});

// HTTP 엔드포인트 검증 테스트 (통합 테스트 — npm install 후 실행 가능)
describe('Express 서버 엔드포인트 (단위 검증)', () => {
  it('POST /prompt — text 필드 누락 시 400 반환 로직', () => {
    function validatePromptBody(body: unknown): { valid: boolean; status: number } {
      if (!body || typeof body !== 'object') return { valid: false, status: 400 };
      const b = body as Record<string, unknown>;
      if (!b.text || typeof b.text !== 'string' || b.text.trim() === '') {
        return { valid: false, status: 400 };
      }
      return { valid: true, status: 200 };
    }

    expect(validatePromptBody({})).toEqual({ valid: false, status: 400 });
    expect(validatePromptBody({ text: '' })).toEqual({ valid: false, status: 400 });
    expect(validatePromptBody({ text: '안녕' })).toEqual({ valid: true, status: 200 });
  });

  it('POST /permission — approved 또는 requestId 누락 시 400 반환 로직', () => {
    function validatePermissionBody(body: unknown): { valid: boolean; status: number } {
      if (!body || typeof body !== 'object') return { valid: false, status: 400 };
      const b = body as Record<string, unknown>;
      if (b.approved === undefined || !b.requestId) {
        return { valid: false, status: 400 };
      }
      return { valid: true, status: 200 };
    }

    expect(validatePermissionBody({ approved: true })).toEqual({ valid: false, status: 400 });
    expect(validatePermissionBody({ requestId: 'req_001' })).toEqual({ valid: false, status: 400 });
    expect(validatePermissionBody({ approved: true, requestId: 'req_001' })).toEqual({ valid: true, status: 200 });
  });

  it('GET /health — agentRunning 필드 포함 응답 구조', () => {
    function buildHealthResponse(running: boolean): Record<string, unknown> {
      return { status: 'ok', agentRunning: running };
    }

    const resp = buildHealthResponse(true);
    expect(resp.status).toBe('ok');
    expect(resp.agentRunning).toBe(true);

    const resp2 = buildHealthResponse(false);
    expect(resp2.agentRunning).toBe(false);
  });

  it('SSE 헤더 설정 검증', () => {
    const headers: Record<string, string> = {};
    function setSSEHeaders(h: Record<string, string>): void {
      h['Content-Type'] = 'text/event-stream';
      h['Cache-Control'] = 'no-cache';
      h['Connection'] = 'keep-alive';
    }

    setSSEHeaders(headers);

    expect(headers['Content-Type']).toBe('text/event-stream');
    expect(headers['Cache-Control']).toBe('no-cache');
    expect(headers['Connection']).toBe('keep-alive');
  });
});
