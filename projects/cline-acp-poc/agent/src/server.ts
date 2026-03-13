/**
 * server.ts — WebSocket Bridge Server
 *
 * Listens on port 3001 for WebSocket connections from the React UI.
 * For each connected client, spawns a new ACP agent session.
 *
 * Message flow:
 *   UI → Bridge → ACP Agent (stdio JSON-RPC)
 *   ACP Agent → Bridge → UI (WebSocket JSON)
 *
 * UI sends:
 *   { type: 'prompt', text: string }
 *   { type: 'permission_response', permissionId: string, approved: boolean }
 *   { type: 'cancel' }
 *
 * UI receives:
 *   { type: 'agent_message_chunk', content: string }
 *   { type: 'agent_thought_chunk', content: string }
 *   { type: 'tool_call', toolName: string, status: 'running'|'done'|'error', details?: string }
 *   { type: 'permission_request', permissionId: string, toolName: string, description: string }
 *   { type: 'session_end' }
 *   { type: 'error', message: string }
 *   { type: 'connected' }  — sent on successful ACP handshake
 */

import { WebSocketServer, WebSocket } from 'ws';
import { AcpBridge, JsonRpcMessage } from './bridge.js';

const PORT = 3001;

const wss = new WebSocketServer({ port: PORT });
console.log(`[Server] WebSocket bridge listening on ws://localhost:${PORT}`);

// ─── Per-client session handler ───────────────────────────────────────────────

wss.on('connection', async (ws: WebSocket) => {
  console.log('[Server] UI client connected');

  const bridge = new AcpBridge();

  // ── Forward ACP agent notifications → UI ─────────────────────────────────

  bridge.on('message', (msg: JsonRpcMessage) => {
    if (!('method' in msg)) return; // ignore unexpected responses

    const notification = msg as { method: string; params?: unknown };
    const params = (notification.params ?? {}) as Record<string, unknown>;

    // Map ACP notification methods to UI-friendly message types
    switch (notification.method) {
      case 'agent_message_chunk':
        sendToUI(ws, {
          type: 'agent_message_chunk',
          content: params['chunk'] ?? params['content'] ?? '',
        });
        break;

      case 'agent_thought_chunk':
        sendToUI(ws, {
          type: 'agent_thought_chunk',
          content: params['chunk'] ?? params['content'] ?? '',
        });
        break;

      case 'tool_call':
        sendToUI(ws, {
          type: 'tool_call',
          toolName: params['name'] ?? params['toolName'] ?? 'unknown',
          status: params['status'] ?? 'running',
          details: params['details'] ?? params['arguments'] ?? undefined,
        });
        break;

      case 'permission_request':
        sendToUI(ws, {
          type: 'permission_request',
          permissionId: params['permissionId'] ?? params['id'] ?? '',
          toolName: params['toolName'] ?? params['name'] ?? 'unknown',
          description: params['description'] ?? '',
        });
        break;

      case 'session_end':
        sendToUI(ws, { type: 'session_end' });
        break;

      default:
        // Forward unknown notifications as-is for debugging
        console.log('[Server] Unknown ACP notification:', notification.method, params);
        sendToUI(ws, { type: 'raw_notification', method: notification.method, params });
        break;
    }
  });

  bridge.on('error', (err: Error) => {
    console.error('[Server] Bridge error:', err.message);
    sendToUI(ws, { type: 'error', message: err.message });
  });

  bridge.on('exit', (code: number | null) => {
    console.log('[Server] Agent exited, code:', code);
    sendToUI(ws, { type: 'session_end' });
  });

  // ── Start ACP agent ───────────────────────────────────────────────────────

  try {
    await bridge.start();
    sendToUI(ws, { type: 'connected' });
    console.log('[Server] ACP bridge ready, notified UI');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Server] Failed to start bridge:', message);
    sendToUI(ws, { type: 'error', message: `Failed to start agent: ${message}` });
    ws.close();
    return;
  }

  // ── Handle incoming messages from UI ─────────────────────────────────────

  ws.on('message', (data: Buffer) => {
    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(data.toString());
    } catch {
      console.error('[Server] Invalid JSON from UI:', data.toString());
      return;
    }

    console.log('[Server ← UI]', JSON.stringify(msg));

    switch (msg.type) {
      case 'prompt':
        bridge.sendPrompt(String(msg['text'] ?? ''));
        break;

      case 'permission_response':
        bridge.sendPermissionResponse(
          String(msg['permissionId'] ?? ''),
          Boolean(msg['approved'])
        );
        break;

      case 'cancel':
        bridge.sendCancel();
        break;

      default:
        console.warn('[Server] Unknown message type from UI:', msg.type);
    }
  });

  // ── Cleanup on disconnect ─────────────────────────────────────────────────

  ws.on('close', () => {
    console.log('[Server] UI client disconnected, killing agent process');
    bridge.kill();
  });

  ws.on('error', (err: Error) => {
    console.error('[Server] WebSocket error:', err.message);
    bridge.kill();
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendToUI(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    const json = JSON.stringify(payload);
    console.log('[Server → UI]', json);
    ws.send(json);
  }
}
