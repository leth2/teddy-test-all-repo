/**
 * ACP Bridge 테스트
 * ACP 스펙: initialize → session/new → session/prompt
 * Notification: id 없음 / Request: id 있음
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AcpBridge } from './bridge';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';

// child_process.spawn mock
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdin: { write: ReturnType<typeof vi.fn> };
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdin = { write: vi.fn() };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn();
  return proc;
}

describe('AcpBridge', () => {
  let bridge: AcpBridge;
  let mockProcess: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    mockProcess = createMockProcess();
    vi.mocked(child_process.spawn).mockReturnValue(mockProcess as unknown as child_process.ChildProcess);
    bridge = new AcpBridge('/test/workdir');
  });

  it('핸드셰이크: initialize → session/new 순서로 전송', async () => {
    const startPromise = bridge.start();

    // initialize 응답 시뮬레이션
    const initResponseLine = JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      result: {
        protocolVersion: 1,
        agentCapabilities: { loadSession: false },
        agentInfo: { name: 'claude-agent-acp', version: '1.0.0' },
        authMethods: [],
      },
    });

    // session/new 응답 시뮬레이션
    const sessionResponseLine = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { sessionId: 'sess_test123' },
    });

    // readline 이벤트 트리거 (줄 단위 파싱)
    setTimeout(() => {
      mockProcess.stdout.emit('data', Buffer.from(initResponseLine + '\n'));
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from(sessionResponseLine + '\n'));
      }, 10);
    }, 10);

    await startPromise;

    // stdin에 쓴 내용 확인
    const calls = mockProcess.stdin.write.mock.calls.map((c: unknown[]) =>
      JSON.parse((c[0] as string).trim())
    );

    // 첫 번째 호출이 initialize이어야 함
    expect(calls[0].method).toBe('initialize');
    expect(calls[0].id).toBe(0);
    expect(calls[0].params.protocolVersion).toBe(1);

    // 두 번째 호출이 session/new이어야 함 (newSession NOT allowed)
    expect(calls[1].method).toBe('session/new');
    expect(calls[1].id).toBe(1);
    expect(calls[1].params.cwd).toBe('/test/workdir');
  });

  it('sendPrompt: session/prompt 메서드로 전송 (message NOT allowed)', async () => {
    // 핸드셰이크 완료 상태 설정 (내부 상태 직접 설정)
    // @ts-ignore
    bridge['isReady'] = true;
    // @ts-ignore
    bridge['sessionId'] = 'sess_test123';
    // @ts-ignore
    bridge['requestIdCounter'] = 2;

    bridge.sendPrompt('안녕하세요');

    const lastCall = mockProcess.stdin.write.mock.calls[
      mockProcess.stdin.write.mock.calls.length - 1
    ];
    const msg = JSON.parse((lastCall[0] as string).trim());

    expect(msg.method).toBe('session/prompt');
    expect(msg.params.sessionId).toBe('sess_test123');
    expect(msg.params.prompt[0].type).toBe('text');
    expect(msg.params.prompt[0].text).toBe('안녕하세요');
  });

  it('session/update notification (id 없음) → message 이벤트 emit', () => {
    const messageHandler = vi.fn();
    bridge.on('message', messageHandler);

    // id 없는 notification 시뮬레이션
    const notification = JSON.stringify({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'sess_test123',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: '응답 텍스트' },
        },
      },
    });

    // @ts-ignore
    bridge['handleMessage'](JSON.parse(notification));

    expect(messageHandler).toHaveBeenCalledWith({
      type: 'stream',
      content: '응답 텍스트',
      done: false,
    });
  });

  it('session/request_permission (id 있음) → permission 이벤트 emit', () => {
    const permissionHandler = vi.fn();
    bridge.on('permission', permissionHandler);

    const permRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'session/request_permission',
      params: {
        sessionId: 'sess_test123',
        toolCall: { toolCallId: 'call_001' },
        options: [
          { optionId: 'allow-once', name: '허용', kind: 'allow_once' },
          { optionId: 'reject-once', name: '거부', kind: 'reject_once' },
        ],
      },
    };

    // @ts-ignore
    bridge['handleMessage'](permRequest);

    expect(permissionHandler).toHaveBeenCalledWith({
      requestId: 5,
      toolCallId: 'call_001',
      options: permRequest.params.options,
    });
  });

  it('respondPermission: requestId 매칭하여 응답 전송', () => {
    // 권한 요청 처리 (pending에 등록)
    const permRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'session/request_permission',
      params: {
        sessionId: 'sess_test123',
        toolCall: { toolCallId: 'call_001' },
        options: [],
      },
    };
    // @ts-ignore
    bridge['handleMessage'](permRequest);

    // 응답 전송
    bridge.respondPermission(5, 'allow-once');

    const lastCall = mockProcess.stdin.write.mock.calls[
      mockProcess.stdin.write.mock.calls.length - 1
    ];
    const response = JSON.parse((lastCall[0] as string).trim());

    expect(response.id).toBe(5);
    expect(response.result.outcome.outcome).toBe('selected');
    expect(response.result.outcome.optionId).toBe('allow-once');
  });
});
