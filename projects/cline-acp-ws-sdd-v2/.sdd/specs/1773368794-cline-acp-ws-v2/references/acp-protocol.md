# ACP (Agent Client Protocol) 스펙 참조

> 출처: https://agentclientprotocol.com/
> 저장일: 2026-03-13

---

## 프로토콜 개요

ACP는 코드 에디터/IDE와 코딩 에이전트 간 통신을 표준화한 프로토콜.  
로컬 에이전트는 **JSON-RPC over stdio** (stdin/stdout)로 통신.  
원격 에이전트는 HTTP 또는 WebSocket 사용.

---

## 연결 시퀀스 (필수)

```
1. Client → Agent: initialize         (프로토콜 버전 협상)
2. Agent → Client: initialize 응답    (agentCapabilities)
3. Client → Agent: session/new        (세션 생성, cwd 포함)
4. Agent → Client: session/new 응답   (sessionId)
5. Client → Agent: session/prompt     (사용자 메시지)
```

---

## 메서드 이름 (정확한 이름)

| 방향 | 메서드 | 타입 |
|------|--------|------|
| Client→Agent | `initialize` | Request (id 있음) |
| Client→Agent | `session/new` | Request (id 있음) |
| Client→Agent | `session/prompt` | Request (id 있음) |
| Client→Agent | `session/cancel` | Notification (id 없음) |
| Agent→Client | `session/update` | Notification (id 없음) ← 중요! |
| Agent→Client | `session/request_permission` | Request (id 있음) |

---

## initialize 요청 형식

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": 1,
    "clientCapabilities": {
      "fs": {
        "readTextFile": true,
        "writeTextFile": true
      },
      "terminal": true
    },
    "clientInfo": {
      "name": "cline-acp-ws",
      "title": "Cline ACP WebSocket Bridge",
      "version": "1.0.0"
    }
  }
}
```

## initialize 응답 형식

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "loadSession": true,
      "promptCapabilities": {
        "image": true,
        "audio": true,
        "embeddedContext": true
      }
    },
    "agentInfo": {
      "name": "claude-agent-acp",
      "version": "1.0.0"
    },
    "authMethods": []
  }
}
```

---

## session/new 요청 형식

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "session/new",
  "params": {
    "cwd": "/home/user/project",
    "mcpServers": []
  }
}
```

## session/new 응답 형식

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "sessionId": "sess_abc123def456"
  }
}
```

---

## session/prompt 요청 형식

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_abc123def456",
    "prompt": [
      {
        "type": "text",
        "text": "사용자 메시지"
      }
    ]
  }
}
```

## session/prompt 응답 형식

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "stopReason": "end_turn"
  }
}
```

---

## session/update 알림 형식 (Notification — id 없음!)

에이전트 텍스트 응답 (스트리밍):
```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "agent_message_chunk",
      "content": {
        "type": "text",
        "text": "응답 텍스트 청크"
      }
    }
  }
}
```

툴콜 보고:
```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "tool_call",
      "toolCallId": "call_001",
      "title": "파일 읽기",
      "kind": "read",
      "status": "pending"
    }
  }
}
```

툴콜 상태 업데이트:
```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "tool_call_update",
      "toolCallId": "call_001",
      "status": "completed",
      "content": [
        {
          "type": "content",
          "content": { "type": "text", "text": "결과 내용" }
        }
      ]
    }
  }
}
```

---

## session/request_permission (권한 요청 — Request, id 있음)

에이전트 → 클라이언트:
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "session/request_permission",
  "params": {
    "sessionId": "sess_abc123def456",
    "toolCall": {
      "toolCallId": "call_001"
    },
    "options": [
      {
        "optionId": "allow-once",
        "name": "허용",
        "kind": "allow_once"
      },
      {
        "optionId": "reject-once",
        "name": "거부",
        "kind": "reject_once"
      }
    ]
  }
}
```

클라이언트 응답:
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "outcome": {
      "outcome": "selected",
      "optionId": "allow-once"
    }
  }
}
```

거부 응답:
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "outcome": {
      "outcome": "selected",
      "optionId": "reject-once"
    }
  }
}
```

---

## ⚠️ v1 대비 핵심 수정사항

| v1 (잘못된 추정) | v2 (실제 스펙) |
|-----------------|----------------|
| `newSession` | `session/new` |
| `message` | `session/prompt` |
| 알림 형식 불명확 | `session/update` (id 없음!) |
| 핸드셰이크 순서 불명확 | `initialize` → `session/new` → `session/prompt` |
| 권한 요청 형식 불명확 | `session/request_permission` (id 있는 Request) |

---

## readline 파싱 (구현 권장사항)

- stdout 파싱: readline으로 줄 단위로 읽어야 함
- 각 줄이 하나의 JSON-RPC 메시지
- `JSON.parse(line)` 후 `.method` / `.result` / `.error` 분기 처리
- Notification 판별: `id` 필드 없음 (또는 undefined)
- Request 판별: `id` 필드 있음 + `method` 있음
- Response 판별: `id` 필드 있음 + `result`/`error` 있음
