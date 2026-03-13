/**
 * server.ts — Express SSE Bridge Server
 *
 * Listens on port 3002 for SSE connections from the React UI.
 * For each connected client (GET /events), spawns a new ACP agent session.
 *
 * Transport: HTTP SSE (server → client) + HTTP POST (client → server)
 *
 * Routes:
 *   GET  /events     → SSE stream — opens agent session, streams events to UI
 *   POST /prompt     → { text: string } — send user message to agent
 *   POST /permission → { approved: boolean, requestId: string } — permission response
 *   GET  /health     → { status: "ok" }
 *
 * SSE event format:
 *   event: agent_message_chunk
 *   data: {"id":"...","content":"..."}
 *
 *   event: permission_request
 *   data: {"permissionId":"...","toolName":"...","description":"..."}
 *
 *   event: session_end
 *   data: {}
 *
 *   event: connected
 *   data: {}
 *
 *   event: error
 *   data: {"message":"..."}
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { AcpBridge, JsonRpcMessage } from './bridge.js';

const PORT = 3002;
const app = express();

app.use(cors());
app.use(express.json());

// ─── Active session store ─────────────────────────────────────────────────────
// One SSE connection = one agent session.
// We keep a reference to the bridge per SSE response object (keyed by a simple ID).

let activeBridge: AcpBridge | null = null;
let activeRes: Response | null = null;

// ─── GET /health ──────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ─── GET /events — SSE stream ─────────────────────────────────────────────────

app.get('/events', async (req: Request, res: Response) => {
  console.log('[Server] UI client connected via SSE');

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // If there's an existing session, kill it first
  if (activeBridge) {
    console.log('[Server] Replacing existing bridge session');
    activeBridge.kill();
    activeBridge = null;
  }

  const bridge = new AcpBridge();
  activeBridge = bridge;
  activeRes = res;

  // ── Keepalive comment every 15s ────────────────────────────────────────────
  const keepaliveTimer = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15_000);

  // ── Helper: send SSE event ─────────────────────────────────────────────────
  const sendEvent = (eventName: string, data: Record<string, unknown>) => {
    const payload = JSON.stringify(data);
    console.log(`[Server → UI] event: ${eventName}`, payload);
    res.write(`event: ${eventName}\ndata: ${payload}\n\n`);
  };

  // ── Forward ACP agent notifications → SSE events ──────────────────────────

  bridge.on('message', (msg: JsonRpcMessage) => {
    if (!('method' in msg)) return; // ignore unexpected responses

    const notification = msg as { method: string; params?: unknown };
    const params = (notification.params ?? {}) as Record<string, unknown>;

    switch (notification.method) {
      case 'agent_message_chunk':
        sendEvent('agent_message_chunk', {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          content: params['chunk'] ?? params['content'] ?? '',
        });
        break;

      case 'agent_thought_chunk':
        sendEvent('agent_thought_chunk', {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          content: params['chunk'] ?? params['content'] ?? '',
        });
        break;

      case 'tool_call':
        sendEvent('tool_call', {
          toolName: params['name'] ?? params['toolName'] ?? 'unknown',
          status: params['status'] ?? 'running',
          details: params['details'] ?? params['arguments'] ?? undefined,
        });
        break;

      case 'permission_request':
        sendEvent('permission_request', {
          permissionId: params['permissionId'] ?? params['id'] ?? '',
          toolName: params['toolName'] ?? params['name'] ?? 'unknown',
          description: params['description'] ?? '',
        });
        break;

      case 'session_end':
        sendEvent('session_end', {});
        break;

      default:
        console.log('[Server] Unknown ACP notification:', notification.method, params);
        sendEvent('raw_notification', { method: notification.method, params });
        break;
    }
  });

  bridge.on('error', (err: Error) => {
    console.error('[Server] Bridge error:', err.message);
    sendEvent('error', { message: err.message });
  });

  bridge.on('exit', (code: number | null) => {
    console.log('[Server] Agent exited, code:', code);
    sendEvent('session_end', {});
  });

  // ── Start ACP agent ───────────────────────────────────────────────────────

  try {
    await bridge.start();
    sendEvent('connected', {});
    console.log('[Server] ACP bridge ready, notified UI via SSE');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Server] Failed to start bridge:', message);
    sendEvent('error', { message: `Failed to start agent: ${message}` });
    res.end();
    activeBridge = null;
    activeRes = null;
    clearInterval(keepaliveTimer);
    return;
  }

  // ── Cleanup on client disconnect ───────────────────────────────────────────

  req.on('close', () => {
    console.log('[Server] SSE client disconnected, killing agent process');
    clearInterval(keepaliveTimer);
    bridge.kill();
    if (activeBridge === bridge) {
      activeBridge = null;
      activeRes = null;
    }
  });
});

// ─── POST /prompt — receive user message ──────────────────────────────────────

app.post('/prompt', (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  console.log('[Server ← UI] POST /prompt', { text });

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing required field: text' });
    return;
  }

  if (!activeBridge) {
    res.status(503).json({ error: 'No active agent session. Open /events first.' });
    return;
  }

  try {
    activeBridge.sendPrompt(text);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// ─── POST /permission — receive permission response ───────────────────────────

app.post('/permission', (req: Request, res: Response) => {
  const { approved, requestId } = req.body as { approved?: boolean; requestId?: string };
  console.log('[Server ← UI] POST /permission', { approved, requestId });

  if (typeof approved !== 'boolean' || !requestId) {
    res.status(400).json({ error: 'Missing required fields: approved (boolean), requestId (string)' });
    return;
  }

  if (!activeBridge) {
    res.status(503).json({ error: 'No active agent session.' });
    return;
  }

  try {
    activeBridge.sendPermissionResponse(requestId, approved);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[Server] Express SSE bridge listening on http://localhost:${PORT}`);
  console.log(`[Server]   GET  /events     → SSE stream`);
  console.log(`[Server]   POST /prompt     → send user message`);
  console.log(`[Server]   POST /permission → permission response`);
  console.log(`[Server]   GET  /health     → health check`);
});
