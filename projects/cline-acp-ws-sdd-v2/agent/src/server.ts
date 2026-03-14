/**
 * WebSocket 서버 + HTTP health endpoint
 * Bridge 이벤트 → WebSocket 메시지 변환
 * 단일 세션 제한 (두 번째 연결 거부)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AcpBridge } from './bridge';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const WORK_DIR = process.env.WORK_DIR ?? process.cwd();

// HTTP 서버 — /health 엔드포인트 제공
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocketServer({ server: httpServer });

let activeClient: WebSocket | null = null;
let activeBridge: AcpBridge | null = null;

function send(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', async (ws) => {
  // 단일 세션 제한: 두 번째 연결 거부
  if (activeClient && activeClient.readyState === WebSocket.OPEN) {
    send(ws, { type: 'error', message: '이미 세션이 진행 중입니다' });
    ws.close();
    return;
  }

  activeClient = ws;
  const bridge = new AcpBridge(WORK_DIR);
  activeBridge = bridge;

  // Bridge 이벤트 → WebSocket 메시지 매핑
  bridge.on('ready', () => {
    send(ws, { type: 'agent_ready' });
  });

  bridge.on('message', (data) => {
    send(ws, {
      type: 'stream',
      content: data.content,
      done: data.done ?? false,
    });
  });

  bridge.on('toolcall', (data) => {
    send(ws, {
      type: 'toolcall',
      id: data.id,
      name: data.name,
      kind: data.kind,
      status: data.status,
    });
  });

  bridge.on('permission', (data) => {
    send(ws, {
      type: 'permission_request',
      requestId: data.requestId,
      toolCallId: data.toolCallId,
      options: data.options,
    });
  });

  bridge.on('error', (err) => {
    send(ws, { type: 'error', message: err.message });
  });

  bridge.on('exit', ({ code }) => {
    send(ws, { type: 'agent_exit', code });
  });

  // 에이전트 시작
  try {
    await bridge.start();
  } catch (err) {
    send(ws, {
      type: 'error',
      message: `에이전트 시작 실패: ${(err as Error).message}`,
    });
    ws.close();
    return;
  }

  // 클라이언트 메시지 처리
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'message') {
        // 사용자 텍스트 → session/prompt
        bridge.sendPrompt(msg.content);
      } else if (msg.type === 'permission_response') {
        // 권한 승인/거부 응답
        bridge.respondPermission(msg.requestId, msg.optionId);
      }
    } catch {
      send(ws, { type: 'error', message: '잘못된 메시지 형식' });
    }
  });

  ws.on('close', async () => {
    activeClient = null;
    activeBridge = null;
    await bridge.stop();
  });

  ws.on('error', (err) => {
    console.error('[WS] 오류:', err.message);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Server] HTTP+WebSocket 서버 시작: http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] WebSocket: ws://localhost:${PORT}`);
});
