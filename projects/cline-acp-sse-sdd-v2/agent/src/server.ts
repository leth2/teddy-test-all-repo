/**
 * Express SSE 서버
 *
 * 참조: .sdd/specs/1773368822-cline-acp-sse-v2/references/sse-format.md
 *
 * SSE 이벤트 형식:
 *   event: [type]\n
 *   data: [JSON]\n
 *   \n
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { bridge } from './bridge';

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(cors());
app.use(express.json());

// SSE 구독자 목록
const clients = new Set<Response>();

// SSE 이벤트 전송 함수 (올바른 SSE 형식 준수)
function sendSSEEvent(res: Response, eventType: string, data: unknown): void {
  res.write(`event: ${eventType}\n`);
  res.write(`data: ${JSON.stringify(data)}\n`);
  res.write('\n');
}

// 모든 클라이언트에게 브로드캐스트
function broadcast(eventType: string, data: unknown): void {
  for (const client of clients) {
    sendSSEEvent(client, eventType, data);
  }
}

// ACP 브릿지 이벤트 → SSE 브로드캐스트
bridge.on('message', (msg) => broadcast('message', msg));
bridge.on('toolcall', (tc) => broadcast('toolcall', tc));
bridge.on('permission-request', (req) => broadcast('permission-request', req));
bridge.on('error', (err) => broadcast('error', err));
bridge.on('exit', (info) => broadcast('agent-exit', info));

// GET /events — SSE 스트림
app.get('/events', (req: Request, res: Response) => {
  // 올바른 SSE 헤더 설정 (참조: sse-format.md)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.add(res);

  // 연결 확인 이벤트
  sendSSEEvent(res, 'connected', { message: 'SSE 연결됨' });

  // 15초마다 keepalive (참조: requirements 3.2)
  const keepaliveInterval = setInterval(() => {
    sendSSEEvent(res, 'keepalive', {});
  }, 15000);

  // 클라이언트 연결 해제 처리
  req.on('close', () => {
    clearInterval(keepaliveInterval);
    clients.delete(res);
  });
});

// POST /prompt — 사용자 프롬프트 전달
app.post('/prompt', (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== 'string' || text.trim() === '') {
    res.status(400).json({ error: 'text 필드가 필요합니다' });
    return;
  }

  if (!bridge.isRunning()) {
    res.status(503).json({ error: '에이전트가 초기화되지 않았습니다' });
    return;
  }

  bridge.sendPrompt(text);
  res.json({ success: true });
});

// POST /permission — Human-in-the-Loop 응답
app.post('/permission', (req: Request, res: Response) => {
  const { approved, requestId } = req.body as { approved?: boolean; requestId?: string };

  if (approved === undefined || !requestId) {
    res.status(400).json({ error: 'approved와 requestId 필드가 필요합니다' });
    return;
  }

  if (!bridge.hasPendingPermission(requestId)) {
    res.status(404).json({ error: `requestId를 찾을 수 없습니다: ${requestId}` });
    return;
  }

  bridge.sendPermission(requestId, approved);
  res.json({ success: true });
});

// GET /health — 상태 확인 (agentRunning 필드 포함)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', agentRunning: bridge.isRunning() });
});

// 서버 시작
const server = app.listen(PORT, () => {
  console.log(`🚀 ACP SSE 서버 시작: http://localhost:${PORT}`);
  console.log('📡 ACP 에이전트 초기화 중...');
  bridge.start();
});

bridge.on('started', () => {
  console.log('✅ ACP 에이전트 준비 완료 (핸드셰이크 완료)');
  broadcast('agent-ready', { message: 'ACP 에이전트가 준비됐습니다' });
});

bridge.on('log', (log: { level: string; message: string }) => {
  if (log.level !== 'debug') {
    console.log(`[ACP] ${log.message}`);
  }
});

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...');
  bridge.stop();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  bridge.stop();
  server.close(() => process.exit(0));
});

export { app };
