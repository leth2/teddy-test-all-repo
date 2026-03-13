import express, { Request, Response } from 'express';
import cors from 'cors';
import { bridge } from './bridge';

const app = express();

app.use(cors());
app.use(express.json());

// SSE 클라이언트 목록
const sseClients = new Set<Response>();

// ACP 브릿지 이벤트 → SSE 브로드캐스트
function broadcastSSE(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

bridge.on('message', (msg) => broadcastSSE('message', msg));
bridge.on('toolcall', (tc) => broadcastSSE('toolcall', tc));
bridge.on('permission-request', (req) => broadcastSSE('permission-request', req));
bridge.on('error', (err) => broadcastSSE('error', err));
bridge.on('exit', (info) => broadcastSSE('agent-exit', info));
bridge.on('started', () => broadcastSSE('agent-started', { status: 'started' }));

// GET /events — SSE 스트림
app.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  sseClients.add(res);

  // 연결 확인 이벤트
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);

  // Keepalive 15초마다
  const keepalive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepalive);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepalive);
    sseClients.delete(res);
  });
});

// POST /prompt
app.post('/prompt', (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text 필드가 필요합니다' });
    return;
  }

  bridge.sendPrompt(text);
  res.json({ ok: true });
});

// POST /permission
app.post('/permission', (req: Request, res: Response) => {
  const { approved, requestId } = req.body as { approved?: boolean; requestId?: string };
  if (typeof approved !== 'boolean' || !requestId || typeof requestId !== 'string') {
    res.status(400).json({ error: 'approved(boolean)와 requestId(string)가 필요합니다' });
    return;
  }

  if (!bridge.hasPendingPermission(requestId)) {
    res.status(404).json({ error: `requestId를 찾을 수 없습니다: ${requestId}` });
    return;
  }

  bridge.sendPermission(requestId, approved);
  res.json({ ok: true });
});

// GET /health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const PORT = Number(process.env.PORT ?? 3002);

if (process.env.NODE_ENV !== 'test') {
  bridge.start();
  app.listen(PORT, () => {
    console.log(`🚀 ACP SSE 서버가 포트 ${PORT}에서 실행 중`);
  });
}

export { app, sseClients };
