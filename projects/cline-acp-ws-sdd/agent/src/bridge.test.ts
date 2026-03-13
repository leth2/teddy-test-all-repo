import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { AcpBridge } from './bridge.js';

// Mock child_process
vi.mock('child_process', () => {
  const MockProcess = class extends EventEmitter {
    stdin = {
      write: vi.fn(),
    };
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    killed = false;
    kill(signal?: string) {
      this.killed = true;
      setTimeout(() => this.emit('exit', 0), 10);
    }
  };

  return {
    spawn: vi.fn(() => new MockProcess()),
  };
});

import { spawn } from 'child_process';

describe('AcpBridge', () => {
  let bridge: AcpBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new AcpBridge('/tmp/test-workdir');
  });

  afterEach(async () => {
    if (bridge.isRunning) {
      await bridge.stop();
    }
  });

  describe('start()', () => {
    it('ACP 에이전트 프로세스를 spawn해야 한다', async () => {
      await bridge.start();
      expect(spawn).toHaveBeenCalledWith(
        'npx',
        ['-y', '@zed-industries/claude-agent-acp'],
        expect.objectContaining({ cwd: '/tmp/test-workdir' })
      );
    });

    it('start() 후 isRunning이 true여야 한다', async () => {
      await bridge.start();
      expect(bridge.isRunning).toBe(true);
    });
  });

  describe('stop()', () => {
    it('에이전트 프로세스를 종료해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;
      const killSpy = vi.spyOn(mockProc, 'kill');

      await bridge.stop();

      expect(killSpy).toHaveBeenCalledWith('SIGTERM');
    });

    it('stop() 후 isRunning이 false여야 한다', async () => {
      await bridge.start();
      await bridge.stop();
      expect(bridge.isRunning).toBe(false);
    });
  });

  describe('sendMessage()', () => {
    it('ACP JSON-RPC 형식으로 stdin에 메시지를 전송해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      bridge.sendMessage('안녕하세요');

      expect(mockProc.stdin.write).toHaveBeenCalledTimes(1);
      const written = mockProc.stdin.write.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());

      expect(parsed.jsonrpc).toBe('2.0');
      expect(parsed.method).toBe('message');
      expect(parsed.params.content[0].type).toBe('text');
      expect(parsed.params.content[0].text).toBe('안녕하세요');
    });

    it('프로세스가 없으면 error 이벤트를 emit해야 한다', () => {
      const errorSpy = vi.fn();
      bridge.on('error', errorSpy);

      bridge.sendMessage('test');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('실행 중이 아닙니다') })
      );
    });
  });

  describe('stdout 메시지 처리', () => {
    it('ACP text 메시지를 파싱하여 message 이벤트를 emit해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      const messageSpy = vi.fn();
      bridge.on('message', messageSpy);

      const acpMsg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'agent_message',
        params: {
          content: [{ type: 'text', text: '안녕하세요!' }],
        },
      });
      mockProc.stdout.emit('data', Buffer.from(acpMsg + '\n'));

      expect(messageSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'text', content: '안녕하세요!' })
      );
    });

    it('스트리밍 응답을 처리하여 stream 이벤트를 emit해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      const messageSpy = vi.fn();
      bridge.on('message', messageSpy);

      const streamMsg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'stream_delta',
        params: { delta: { text: '안' }, done: false },
      });
      mockProc.stdout.emit('data', Buffer.from(streamMsg + '\n'));

      expect(messageSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'stream', content: '안', done: false })
      );
    });

    it('툴콜 이벤트를 처리하여 toolcall 이벤트를 emit해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      const toolSpy = vi.fn();
      bridge.on('toolcall', toolSpy);

      const toolMsg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tool_use',
        params: {
          id: 'tool-123',
          name: 'read_file',
          input: { path: 'test.ts' },
        },
      });
      mockProc.stdout.emit('data', Buffer.from(toolMsg + '\n'));

      expect(toolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tool-123',
          name: 'read_file',
          status: 'start',
        })
      );
    });

    it('파일 쓰기 툴콜은 permission 이벤트를 emit해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      const permSpy = vi.fn();
      bridge.on('permission', permSpy);

      const toolMsg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tool_use',
        params: {
          id: 'tool-456',
          name: 'write_file',
          input: { path: 'output.ts' },
        },
      });
      mockProc.stdout.emit('data', Buffer.from(toolMsg + '\n'));

      expect(permSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: 'output.ts',
          operation: 'write',
        })
      );
    });

    it('파일 삭제 툴콜은 operation이 delete여야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      const permSpy = vi.fn();
      bridge.on('permission', permSpy);

      const toolMsg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tool_use',
        params: {
          id: 'tool-789',
          name: 'delete_file',
          input: { path: 'old.ts' },
        },
      });
      mockProc.stdout.emit('data', Buffer.from(toolMsg + '\n'));

      expect(permSpy).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'delete' })
      );
    });

    it('JSON이 아닌 출력은 text 메시지로 처리해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      const messageSpy = vi.fn();
      bridge.on('message', messageSpy);

      mockProc.stdout.emit('data', Buffer.from('plain text output\n'));

      expect(messageSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'text', content: 'plain text output' })
      );
    });
  });

  describe('sendPermissionResponse()', () => {
    it('승인 응답을 ACP stdin에 전송해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      bridge.sendPermissionResponse(true, 'req-001');

      const written = mockProc.stdin.write.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.method).toBe('permission_response');
      expect(parsed.params.approved).toBe(true);
      expect(parsed.params.requestId).toBe('req-001');
    });

    it('거부 응답을 ACP stdin에 전송해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      bridge.sendPermissionResponse(false, 'req-002');

      const written = mockProc.stdin.write.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.params.approved).toBe(false);
    });
  });

  describe('에이전트 프로세스 종료 처리', () => {
    it('프로세스 종료 시 exit 이벤트를 emit해야 한다', async () => {
      await bridge.start();
      const mockProc = (spawn as ReturnType<typeof vi.fn>).mock.results[0].value;

      const exitSpy = vi.fn();
      bridge.on('exit', exitSpy);

      mockProc.emit('exit', 0);

      expect(exitSpy).toHaveBeenCalledWith({ code: 0 });
    });
  });
});
