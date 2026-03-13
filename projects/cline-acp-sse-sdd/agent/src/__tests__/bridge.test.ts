import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ACPBridge } from '../bridge';

describe('ACPBridge', () => {
  let bridge: ACPBridge;

  beforeEach(() => {
    bridge = new ACPBridge();
  });

  it('초기 상태에서 프로세스가 실행 중이지 않아야 함', () => {
    expect(bridge.isRunning()).toBe(false);
  });

  it('stop() 호출 시 프로세스가 없어도 오류가 발생하지 않아야 함', () => {
    expect(() => bridge.stop()).not.toThrow();
  });

  it('sendPrompt() 호출 시 프로세스가 없으면 error 이벤트를 emit해야 함', () => {
    const errorSpy = vi.fn();
    bridge.on('error', errorSpy);
    bridge.sendPrompt('안녕하세요');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('실행 중이지 않습니다') })
    );
  });

  it('sendPermission() 호출 시 프로세스가 없으면 error 이벤트를 emit해야 함', () => {
    const errorSpy = vi.fn();
    bridge.on('error', errorSpy);
    bridge.sendPermission('req-1', true);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('실행 중이지 않습니다') })
    );
  });

  it('존재하지 않는 requestId로 hasPendingPermission() 시 false를 반환해야 함', () => {
    expect(bridge.hasPendingPermission('non-existent')).toBe(false);
  });

  it('message 타입 ACP 메시지를 수신하면 message 이벤트를 emit해야 함', () => {
    const messageSpy = vi.fn();
    bridge.on('message', messageSpy);

    // private 메서드를 테스트하기 위해 접근
    (bridge as unknown as { handleACPMessage: (msg: unknown) => void }).handleACPMessage({
      jsonrpc: '2.0',
      method: 'message',
      params: { text: '테스트 메시지' },
      id: 1,
    });

    expect(messageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'agent',
        content: '테스트 메시지',
      })
    );
  });

  it('toolcall 타입 ACP 메시지를 수신하면 toolcall 이벤트를 emit해야 함', () => {
    const toolcallSpy = vi.fn();
    bridge.on('toolcall', toolcallSpy);

    (bridge as unknown as { handleACPMessage: (msg: unknown) => void }).handleACPMessage({
      jsonrpc: '2.0',
      method: 'toolcall',
      params: { name: 'read_file', args: { path: '/tmp/test.txt' } },
      id: 2,
    });

    expect(toolcallSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'read_file',
        params: { path: '/tmp/test.txt' },
      })
    );
  });

  it('permission-request 타입 ACP 메시지를 수신하면 permission-request 이벤트를 emit해야 함', () => {
    const permSpy = vi.fn();
    bridge.on('permission-request', permSpy);

    (bridge as unknown as { handleACPMessage: (msg: unknown) => void }).handleACPMessage({
      jsonrpc: '2.0',
      method: 'permission-request',
      params: { requestId: 'req-123', description: '파일 쓰기 권한', tool: 'write_file' },
      id: 3,
    });

    expect(permSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        description: '파일 쓰기 권한',
        tool: 'write_file',
      })
    );
    expect(bridge.hasPendingPermission('req-123')).toBe(true);
  });

  it('error 타입 ACP 메시지를 수신하면 error 이벤트를 emit해야 함', () => {
    const errorSpy = vi.fn();
    bridge.on('error', errorSpy);

    (bridge as unknown as { handleACPMessage: (msg: unknown) => void }).handleACPMessage({
      jsonrpc: '2.0',
      error: { code: -32600, message: '잘못된 요청' },
      id: 4,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: '잘못된 요청' })
    );
  });
});
