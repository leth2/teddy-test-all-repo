/**
 * useChat.ts — SSE bridge hook
 *
 * Manages the SSE connection to the ACP bridge server (http://localhost:3002/events).
 * Uses native browser EventSource API instead of WebSocket.
 *
 * Transport differences from WebSocket version:
 *   - Server → Client: GET /events (EventSource / SSE)
 *   - Client → Server: POST /prompt, POST /permission (fetch)
 *   - EventSource auto-reconnects — no manual reconnect logic needed
 *
 * SSE event types from bridge:
 *   connected              → isConnected = true
 *   agent_message_chunk    → append to current agent message
 *   agent_thought_chunk    → append to current thought message
 *   tool_call              → add/update tool log entry
 *   permission_request     → set pendingPermission
 *   session_end            → isThinking = false, flush pending message
 *   error                  → show error message
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'agent' | 'thought' | 'tool';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface ToolCall {
  id: string;
  toolName: string;
  status: 'running' | 'done' | 'denied' | 'error';
  details?: unknown;
}

export interface PendingPermission {
  permissionId: string;
  toolName: string;
  description: string;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  isConnected: boolean;
  isThinking: boolean;
  pendingPermission: PendingPermission | null;
  sendMessage: (text: string) => void;
  respondToPermission: (approved: boolean) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(baseUrl = 'http://localhost:3002'): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);

  // SSE connection ref
  const esRef = useRef<EventSource | null>(null);
  // Track the ID of the current in-progress agent message (for streaming append)
  const currentAgentMsgIdRef = useRef<string | null>(null);
  const currentThoughtMsgIdRef = useRef<string | null>(null);
  // Store pendingPermission in a ref so callbacks can access the latest value
  const pendingPermissionRef = useRef<PendingPermission | null>(null);

  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  /** Append content to an existing message or create a new one */
  const appendOrCreate = useCallback(
    (role: MessageRole, content: string, idRef: React.MutableRefObject<string | null>) => {
      setMessages((prev) => {
        if (idRef.current) {
          return prev.map((m) =>
            m.id === idRef.current ? { ...m, content: m.content + content } : m
          );
        }
        // Create new message
        const newMsg: ChatMessage = { id: genId(), role, content, timestamp: Date.now() };
        idRef.current = newMsg.id;
        return [...prev, newMsg];
      });
    },
    []
  );

  /** Flush in-progress message IDs when a session ends */
  const flushCurrentMessages = useCallback(() => {
    currentAgentMsgIdRef.current = null;
    currentThoughtMsgIdRef.current = null;
  }, []);

  // ── SSE lifecycle ──────────────────────────────────────────────────────────
  // EventSource auto-reconnects — no manual reconnect logic needed

  useEffect(() => {
    const eventsUrl = `${baseUrl}/events`;
    console.log('[useChat] Connecting to SSE stream:', eventsUrl);

    const es = new EventSource(eventsUrl);
    esRef.current = es;

    // ── connected ────────────────────────────────────────────────────────────
    es.addEventListener('connected', () => {
      console.log('[useChat] SSE: agent session ready (connected event)');
      setIsConnected(true);
    });

    // ── agent_message_chunk ──────────────────────────────────────────────────
    es.addEventListener('agent_message_chunk', (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as { id?: string; content?: string };
      const chunk = String(data.content ?? '');
      console.log('[useChat ← SSE] agent_message_chunk', chunk.slice(0, 60));
      appendOrCreate('agent', chunk, currentAgentMsgIdRef);
      setIsThinking(true);
    });

    // ── agent_thought_chunk ──────────────────────────────────────────────────
    es.addEventListener('agent_thought_chunk', (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as { id?: string; content?: string };
      const chunk = String(data.content ?? '');
      appendOrCreate('thought', chunk, currentThoughtMsgIdRef);
    });

    // ── tool_call ────────────────────────────────────────────────────────────
    es.addEventListener('tool_call', (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as {
        toolName?: string;
        status?: ToolCall['status'];
        details?: unknown;
      };
      const toolName = String(data.toolName ?? 'unknown');
      const status = data.status ?? 'running';
      const details = data.details;

      console.log('[useChat ← SSE] tool_call', toolName, status);

      // Add tool message to chat
      const toolMsg: ChatMessage = {
        id: genId(),
        role: 'tool',
        content: `🔧 ${toolName} [${status}]`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, toolMsg]);
      // Update tool call log
      setToolCalls((prev) => {
        const existing = prev.find((t) => t.toolName === toolName && t.status === 'running');
        if (existing && status !== 'running') {
          return prev.map((t) => (t.id === existing.id ? { ...t, status, details } : t));
        }
        return [...prev, { id: genId(), toolName, status, details }];
      });
    });

    // ── permission_request ───────────────────────────────────────────────────
    es.addEventListener('permission_request', (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as {
        permissionId?: string;
        toolName?: string;
        description?: string;
      };
      const perm: PendingPermission = {
        permissionId: String(data.permissionId ?? ''),
        toolName: String(data.toolName ?? 'unknown'),
        description: String(data.description ?? ''),
      };
      console.log('[useChat ← SSE] permission_request', perm.toolName);
      pendingPermissionRef.current = perm;
      setPendingPermission(perm);
      setIsThinking(false);
    });

    // ── session_end ──────────────────────────────────────────────────────────
    es.addEventListener('session_end', () => {
      console.log('[useChat ← SSE] session_end');
      setIsThinking(false);
      flushCurrentMessages();
    });

    // ── error event ──────────────────────────────────────────────────────────
    es.addEventListener('error', (e: Event) => {
      // Named 'error' SSE event (from server) vs connection error
      if (e instanceof MessageEvent) {
        const data = JSON.parse((e as MessageEvent<string>).data) as { message?: string };
        const errMsg: ChatMessage = {
          id: genId(),
          role: 'agent',
          content: `❌ Error: ${data.message}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        setIsThinking(false);
      }
    });

    // ── raw_notification (debug) ─────────────────────────────────────────────
    es.addEventListener('raw_notification', (e: MessageEvent<string>) => {
      console.log('[useChat ← SSE] raw_notification', e.data);
    });

    // ── Connection-level error (network error / server down) ─────────────────
    es.onerror = () => {
      console.warn('[useChat] SSE connection error — EventSource will auto-reconnect');
      setIsConnected(false);
      setIsThinking(false);
      flushCurrentMessages();
      // Note: EventSource auto-reconnects — no manual reconnect logic needed
    };

    return () => {
      console.log('[useChat] Closing SSE connection');
      es.close();
      esRef.current = null;
    };
  }, [baseUrl, appendOrCreate, flushCurrentMessages]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    (text: string) => {
      if (!isConnected) {
        console.warn('[useChat] Cannot send — not connected');
        return;
      }
      // Add user message to local state immediately
      setMessages((prev) => [
        ...prev,
        { id: genId(), role: 'user', content: text, timestamp: Date.now() },
      ]);
      setIsThinking(true);
      // Reset in-progress agent message trackers for new response
      currentAgentMsgIdRef.current = null;
      currentThoughtMsgIdRef.current = null;

      // POST to server
      fetch(`${baseUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).catch((err) => {
        console.error('[useChat] POST /prompt failed:', err);
        setIsThinking(false);
      });
    },
    [baseUrl, isConnected]
  );

  const respondToPermission = useCallback(
    (approved: boolean) => {
      const perm = pendingPermissionRef.current;
      if (!perm) return;

      // POST permission response
      fetch(`${baseUrl}/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, requestId: perm.permissionId }),
      }).catch((err) => {
        console.error('[useChat] POST /permission failed:', err);
      });

      // Update tool call status
      setToolCalls((prev) =>
        prev.map((t) =>
          t.toolName === perm.toolName && t.status === 'running'
            ? { ...t, status: approved ? 'running' : 'denied' }
            : t
        )
      );
      pendingPermissionRef.current = null;
      setPendingPermission(null);
      if (approved) setIsThinking(true);
    },
    [baseUrl]
  );

  return { messages, toolCalls, isConnected, isThinking, pendingPermission, sendMessage, respondToPermission };
}
