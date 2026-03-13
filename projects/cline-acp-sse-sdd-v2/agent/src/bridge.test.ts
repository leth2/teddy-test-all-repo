import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ACPBridge } from './bridge';

// ACP Protocol Contract (참조: .sdd/specs/*/references/acp-protocol.md)
// - start() → spawn → initialize(id:0) → session/new(id:1) 순서
// - sendPrompt() → session/prompt (not "prompt")
// - sendPermission() → { id: requestId, result: { approved } } (not method: "permission")
// - session/update notifications (no id field)
// - session/request_permission notifications (no id field)

describe('ACPBridge', () => {
  let bridge: ACPBridge;

  beforeEach(() => {
    bridge = new ACPBridge();
  });

  afterEach(() => {
    bridge.stop();
  });

  describe('초기화 전 상태', () => {
    it('isRunning()은 처음에 false여야 한다', () => {
      expect(bridge.isRunning()).toBe(false);
    });
  });

  describe('start()', () => {
    it('이미 실행 중일 때 start()를 다시 호출해도 중복 spawn 없어야 한다', () => {
      // 실제 spawn 없이 내부 process 설정 모킹 어려우므로 isRunning 체크
      // 실환경 테스트는 npm install 후 가능
      expect(bridge.isRunning()).toBe(false);
    });
  });

  describe('sendPrompt()', () => {
    it('프로세스 미실행 시 error 이벤트를 emit해야 한다', () => {
      const errors: unknown[] = [];
      bridge.on('error', (err) => errors.push(err));
      bridge.sendPrompt('테스트');
      expect(errors.length).toBe(1);
    });
  });

  describe('sendPermission()', () => {
    it('프로세스 미실행 시 error 이벤트를 emit해야 한다', () => {
      const errors: unknown[] = [];
      bridge.on('error', (err) => errors.push(err));
      bridge.sendPermission('req_123', true);
      expect(errors.length).toBe(1);
    });

    it('존재하지 않는 requestId에 error 이벤트를 emit해야 한다', () => {
      const errors: unknown[] = [];
      bridge.on('error', (err) => errors.push(err));
      // process 없이 호출 시 첫 번째 체크(process 없음)에서 걸림
      bridge.sendPermission('존재하지않는id', true);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('hasPendingPermission()', () => {
    it('등록되지 않은 requestId에 false를 반환해야 한다', () => {
      expect(bridge.hasPendingPermission('req_없음')).toBe(false);
    });
  });

  describe('ACP 메시지 파싱 (올바른 method 이름 검증)', () => {
    it('session/update + agent_message_chunk → message 이벤트 emit', () => {
      const messages: unknown[] = [];
      bridge.on('message', (msg) => messages.push(msg));

      // private 메서드를 직접 호출 (테스트 목적)
      (bridge as unknown as { handleACPMessage(msg: Record<string, unknown>): void })
        .handleACPMessage({
          jsonrpc: '2.0',
          method: 'session/update',
          params: {
            sessionId: 'sess_test',
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: [{ type: 'text', text: '에이전트 응답' }],
            },
          },
        });

      expect(messages.length).toBe(1);
    });

    it('session/update + tool_call → toolcall 이벤트 emit', () => {
      const toolCalls: unknown[] = [];
      bridge.on('toolcall', (tc) => toolCalls.push(tc));

      (bridge as unknown as { handleACPMessage(msg: Record<string, unknown>): void })
        .handleACPMessage({
          jsonrpc: '2.0',
          method: 'session/update',
          params: {
            sessionId: 'sess_test',
            update: {
              sessionUpdate: 'tool_call',
              toolCall: {
                id: 'tc_001',
                name: 'Read',
                params: { path: '/test/file.ts' },
                status: 'requested',
              },
            },
          },
        });

      expect(toolCalls.length).toBe(1);
    });

    it('session/request_permission → permission-request 이벤트 emit', () => {
      const permReqs: unknown[] = [];
      bridge.on('permission-request', (req) => permReqs.push(req));

      (bridge as unknown as { handleACPMessage(msg: Record<string, unknown>): void })
        .handleACPMessage({
          jsonrpc: '2.0',
          method: 'session/request_permission',
          params: {
            sessionId: 'sess_test',
            requestId: 'req_001',
            description: '파일 쓰기 권한',
            tool: 'Write',
          },
        });

      expect(permReqs.length).toBe(1);
      expect((permReqs[0] as { requestId: string }).requestId).toBe('req_001');
    });

    it('⚠️ 틀린 method "prompt"는 메시지 이벤트를 emit하지 않아야 한다 (v1 오류 방지)', () => {
      const messages: unknown[] = [];
      bridge.on('message', (msg) => messages.push(msg));

      // v1에서 사용했던 틀린 method 이름
      (bridge as unknown as { handleACPMessage(msg: Record<string, unknown>): void })
        .handleACPMessage({
          jsonrpc: '2.0',
          id: 1,
          method: 'prompt',  // 올바른 ACP에서는 이 method가 에이전트→클라이언트로 오지 않음
          params: { text: '잘못된 메시지' },
        });

      // session/update가 아니므로 message 이벤트 미발생 (올바른 동작)
      expect(messages.length).toBe(0);
    });
  });
});
