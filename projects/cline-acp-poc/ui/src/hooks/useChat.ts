/**
 * useChat.ts — WebSocket bridge hook
 *
 * Manages the WebSocket connection to the ACP bridge server (ws://localhost:3001).
 * Translates bridge messages into UI-friendly state.
 *
 * Message types from bridge:
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

export function useChat(url = 'ws://localhost:3001'): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  // Accumulate streaming chunks before flushing as a complete message
  const agentBufferRef = useRef('');
  const thoughtBufferRef = useRef('');
  // Track the ID of the current in-progress agent message (for streaming append)
  const currentAgentMsgIdRef = useRef<string | null>(null);
  const currentThoughtMsgIdRef = useRef<string | null>(null);

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
    agentBufferRef.current = '';
    thoughtBufferRef.current = '';
  }, []);

  // ── WebSocket lifecycle ────────────────────────────────────────────────────

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      console.log('[useChat] Connecting to', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useChat] WebSocket connected');
        // Wait for 'connected' message from bridge (after ACP handshake)
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data);
        } catch {
          console.error('[useChat] Invalid JSON from bridge:', event.data);
          return;
        }

        console.log('[useChat ← Bridge]', data);

        switch (data['type']) {
          case 'connected':
            setIsConnected(true);
            break;

          case 'agent_message_chunk': {
            const chunk = String(data['content'] ?? '');
            appendOrCreate('agent', chunk, currentAgentMsgIdRef);
            setIsThinking(true);
            break;
          }

          case 'agent_thought_chunk': {
            const chunk = String(data['content'] ?? '');
            appendOrCreate('thought', chunk, currentThoughtMsgIdRef);
            break;
          }

          case 'tool_call': {
            const toolName = String(data['toolName'] ?? 'unknown');
            const status = (data['status'] as ToolCall['status']) ?? 'running';
            const details = data['details'];
            // Add tool message to chat
            const toolMsg: ChatMessage = {
              id: genId(),
              role: 'tool',
              content: `🔧 ${toolName} [${status}]`,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, toolMsg]);
            // Also update tool call log
            setToolCalls((prev) => {
              const existing = prev.find((t) => t.toolName === toolName && t.status === 'running');
              if (existing && status !== 'running') {
                return prev.map((t) => (t.id === existing.id ? { ...t, status, details } : t));
              }
              return [...prev, { id: genId(), toolName, status, details }];
            });
            break;
          }

          case 'permission_request':
            setPendingPermission({
              permissionId: String(data['permissionId'] ?? ''),
              toolName: String(data['toolName'] ?? 'unknown'),
              description: String(data['description'] ?? ''),
            });
            setIsThinking(false);
            break;

          case 'session_end':
            setIsThinking(false);
            flushCurrentMessages();
            break;

          case 'error': {
            const errMsg: ChatMessage = {
              id: genId(),
              role: 'agent',
              content: `❌ Error: ${data['message']}`,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errMsg]);
            setIsThinking(false);
            break;
          }

          default:
            console.log('[useChat] Unhandled message type:', data['type']);
        }
      };

      ws.onclose = () => {
        console.log('[useChat] WebSocket closed, reconnecting in 3s...');
        setIsConnected(false);
        setIsThinking(false);
        flushCurrentMessages();
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[useChat] WebSocket error:', err);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [url, appendOrCreate, flushCurrentMessages]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendMessage = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
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

    ws.send(JSON.stringify({ type: 'prompt', text }));
  }, []);

  const respondToPermission = useCallback((approved: boolean) => {
    const ws = wsRef.current;
    const perm = pendingPermission;
    if (!ws || ws.readyState !== WebSocket.OPEN || !perm) return;

    ws.send(JSON.stringify({ type: 'permission_response', permissionId: perm.permissionId, approved }));
    // Update tool call status
    setToolCalls((prev) =>
      prev.map((t) =>
        t.toolName === perm.toolName && t.status === 'running'
          ? { ...t, status: approved ? 'running' : 'denied' }
          : t
      )
    );
    setPendingPermission(null);
    if (approved) setIsThinking(true);
  }, [pendingPermission]);

  return { messages, toolCalls, isConnected, isThinking, pendingPermission, sendMessage, respondToPermission };
}
