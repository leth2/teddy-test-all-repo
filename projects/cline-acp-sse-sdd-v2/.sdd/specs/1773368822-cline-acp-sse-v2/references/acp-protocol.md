# ACP (Agent Client Protocol) — JSON-RPC Spec Reference

> 출처: https://agentclientprotocol.com/
> 수집일: 2026-03-13

## 핵심 개요

ACP는 JSON-RPC 2.0 기반 프로토콜. 로컬 에이전트는 stdio를 통해 통신.

두 가지 메시지 유형:
- **Methods**: Request-response 쌍 (id 필드 포함)
- **Notifications**: 단방향 메시지, 응답 없음 (**id 필드 없음**)

## 연결 수순 (MUST 따를 것)

### 1단계: Initialization

Client → Agent: `initialize`
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": 1,
    "clientCapabilities": {
      "fs": { "readTextFile": true, "writeTextFile": true },
      "terminal": true
    },
    "clientInfo": {
      "name": "cline-acp-sse-bridge",
      "title": "Cline ACP SSE Bridge",
      "version": "1.0.0"
    }
  }
}
```

Agent → Client: `initialize` response
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": 1,
    "agentCapabilities": { ... },
    "agentInfo": { "name": "...", "version": "..." }
  }
}
```

### 2단계: Session Setup

Client → Agent: `session/new`
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "session/new",
  "params": {}
}
```

Agent → Client: `session/new` response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "sessionId": "sess_abc123def456"
  }
}
```

### 3단계: Prompt Turn

Client → Agent: `session/prompt`
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_abc123def456",
    "prompt": [
      { "type": "text", "text": "유저 메시지" }
    ]
  }
}
```

Agent → Client: `session/update` notifications (id 없음! notification)
```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "agent_message_chunk",
      "content": [{ "type": "text", "text": "에이전트 응답 텍스트" }]
    }
  }
}
```

툴콜 알림:
```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "update": {
      "sessionUpdate": "tool_call",
      "toolCall": {
        "id": "tc_xxx",
        "name": "Read",
        "params": { "path": "/some/file" },
        "status": "requested"
      }
    }
  }
}
```

권한 요청:
```json
{
  "jsonrpc": "2.0",
  "method": "session/request_permission",
  "params": {
    "sessionId": "sess_abc123def456",
    "requestId": "req_yyy",
    "description": "파일 쓰기 권한 요청",
    "tool": "Write"
  }
}
```

권한 응답 (Client → Agent):
```json
{
  "jsonrpc": "2.0",
  "id": "req_yyy",
  "result": { "approved": true }
}
```

Agent → Client: `session/prompt` 최종 응답
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "stopReason": "end_turn"
  }
}
```

## ⚠️ v1 대비 수정 필요 사항

| v1 (틀림) | v2 (올바름) |
|-----------|-------------|
| `method: "prompt"` | `method: "session/prompt"` |
| `method: "permission"` | `id: requestId, result: { approved }` |
| `method === "message"` 파싱 | `method === "session/update"` 파싱 |
| `method === "toolcall"` 파싱 | `update.sessionUpdate === "tool_call"` 파싱 |
| `method === "permission-request"` | `method === "session/request_permission"` |
| 초기화 없이 바로 prompt | initialize → session/new → session/prompt 순서 |
| notification에 id 포함 | notification에 id 없음 |

## 중요 규칙

- **Notifications에는 id 필드 없음** — id 없는 메시지 = notification
- `session/update`는 notification (응답 없음)
- `session/request_permission`은 notification (Client가 별도 응답 전송)
- 모든 method calls에는 고유한 증가 id 사용
