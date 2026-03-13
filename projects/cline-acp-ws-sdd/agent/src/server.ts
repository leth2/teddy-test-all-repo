import { WebSocketServer, WebSocket } from 'ws';
import { AcpBridge } from './bridge.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

interface ClientMessage {
  type: 'message' | 'permission_response';
  content?: string;
  requestId?: string;
  approved?: boolean;
}

interface ServerMessage {
  type: string;
  [key: string]: unknown;
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

const wss = new WebSocketServer({ port: PORT });
let activeClient: WebSocket | null = null;
let activeBridge: AcpBridge | null = null;

wss.on('connection', async (ws) => {
  // Single session enforcement
  if (activeClient !== null && activeClient.readyState === WebSocket.OPEN) {
    send(ws, {
      type: 'error',
      message: '이미 세션이 진행 중입니다. 하나의 WebSocket 연결만 허용됩니다.',
    });
    ws.close();
    return;
  }

  activeClient = ws;
  console.log('[Server] 클라이언트 연결됨');

  // Create and start bridge
  const bridge = new AcpBridge(process.cwd());
  activeBridge = bridge;

  // Wire bridge events → WebSocket messages
  bridge.on('message', (msg) => {
    send(ws, { type: msg.type, content: msg.content, done: msg.done });
  });

  bridge.on('toolcall', (event) => {
    send(ws, {
      type: 'toolcall',
      id: event.id,
      name: event.name,
      args: event.args,
      status: event.status,
      result: event.result,
    });
  });

  bridge.on('permission', (event) => {
    send(ws, {
      type: 'permission_request',
      requestId: event.requestId,
      filePath: event.filePath,
      operation: event.operation,
    });
  });

  bridge.on('error', (err: Error) => {
    console.error('[Bridge] 오류:', err);
    send(ws, { type: 'error', message: err.message });
  });

  bridge.on('exit', ({ code }: { code: number }) => {
    console.log(`[Bridge] 에이전트 종료 (code: ${code})`);
    send(ws, { type: 'agent_exit', code });
  });

  // Start the ACP agent
  try {
    await bridge.start();
    send(ws, { type: 'agent_ready' });
    console.log('[Server] ACP 에이전트 준비됨');
  } catch (err) {
    send(ws, {
      type: 'error',
      message: `에이전트 시작 실패: ${(err as Error).message}`,
    });
    ws.close();
    return;
  }

  // Handle incoming messages from client
  ws.on('message', (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      send(ws, { type: 'error', message: '잘못된 메시지 형식' });
      return;
    }

    switch (msg.type) {
      case 'message':
        if (typeof msg.content === 'string' && msg.content.trim()) {
          bridge.sendMessage(msg.content);
        }
        break;

      case 'permission_response':
        if (typeof msg.requestId === 'string' && typeof msg.approved === 'boolean') {
          bridge.sendPermissionResponse(msg.approved, msg.requestId);
        }
        break;

      default:
        send(ws, { type: 'error', message: `알 수 없는 메시지 타입: ${msg.type}` });
    }
  });

  // Handle client disconnect
  ws.on('close', async () => {
    console.log('[Server] 클라이언트 연결 해제됨');
    if (activeBridge) {
      await activeBridge.stop();
      activeBridge = null;
    }
    activeClient = null;
  });

  ws.on('error', (err) => {
    console.error('[Server] WebSocket 오류:', err);
  });
});

wss.on('listening', () => {
  console.log(`[Server] WebSocket 서버 시작 - ws://localhost:${PORT}`);
});

wss.on('error', (err) => {
  console.error('[Server] 서버 오류:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] 종료 중...');
  if (activeBridge) {
    await activeBridge.stop();
  }
  wss.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('[Server] 종료 중...');
  if (activeBridge) {
    await activeBridge.stop();
  }
  wss.close(() => process.exit(0));
});
