# Cline ACP + React UI PoC

**ACP(Agent Client Protocol) 기반 개발 에이전트**와 커스텀 React 채팅 UI의 PoC(개념 증명) 프로젝트입니다.

---

## 아키텍처

```
React UI (포트 5173) — Vite 개발 서버
    ↕ WebSocket ws://localhost:3001
Node.js 브릿지 서버 (포트 3001)
    ↕ ACP 프로토콜 (stdio JSON-RPC)
claude-agent-acp 프로세스 (ANTHROPIC_API_KEY 주입됨)
    ↕
Anthropic API
```

### 구성 요소

| 경로 | 설명 |
|------|------|
| `agent/` | Node.js WebSocket 브릿지 서버 (Docker 빌드 대상) |
| `agent/src/server.ts` | WebSocket 서버 — UI ↔ ACP 메시지 변환 |
| `agent/src/bridge.ts` | ACP 에이전트 프로세스 관리 및 JSON-RPC 핸들링 |
| `ui/` | React + TypeScript 채팅 UI |
| `ui/src/hooks/useChat.ts` | WebSocket 연결 관리 훅 |
| `ui/src/components/` | MessageList, ChatPanel, PermissionDialog, ToolCallLog |
| `workspace/` | 에이전트가 읽고 쓸 수 있는 공유 작업 디렉터리 |

---

## 사전 요구 사항

- Docker & Docker Compose
- Anthropic API 키 (`ANTHROPIC_API_KEY`)

---

## 실행 방법

### 1. 환경 변수 설정

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxx...
```

또는 `.env` 파일 생성:

```env
ANTHROPIC_API_KEY=sk-ant-xxxx...
```

### 2. Docker Compose로 실행

```bash
docker-compose up --build
```

### 3. UI 접속

브라우저에서 [http://localhost:5173](http://localhost:5173) 열기

---

## 개발 모드 (Docker 없이)

### 브릿지 서버

```bash
cd agent
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

### UI

```bash
cd ui
npm install
npm run dev
```

---

## ACP 메시지 흐름

```
UI → 브릿지: { type: 'prompt', text: '코드 작성해줘' }
브릿지 → ACP: { jsonrpc: '2.0', method: 'prompt', params: { sessionId, text } }

ACP → 브릿지: { jsonrpc: '2.0', method: 'agent_message_chunk', params: { chunk: '...' } }
브릿지 → UI: { type: 'agent_message_chunk', content: '...' }

ACP → 브릿지: { jsonrpc: '2.0', method: 'permission_request', params: { permissionId, toolName, description } }
브릿지 → UI: { type: 'permission_request', permissionId, toolName, description }

UI → 브릿지: { type: 'permission_response', permissionId, approved: true }
브릿지 → ACP: { jsonrpc: '2.0', method: 'permission_response', params: { sessionId, permissionId, approved: true } }
```

---

## UI 메시지 타입

| UI에서 받는 타입 | 설명 |
|-----------------|------|
| `connected` | ACP 핸드셰이크 완료, 대화 가능 |
| `agent_message_chunk` | 에이전트 응답 스트리밍 |
| `agent_thought_chunk` | 에이전트 내부 사고 과정 |
| `tool_call` | 도구 사용 이벤트 (running / done / error) |
| `permission_request` | 도구 사용 권한 요청 |
| `session_end` | 에이전트 응답 완료 |
| `error` | 오류 메시지 |

---

## 주의 사항

- 이 PoC는 **단일 WebSocket 클라이언트 = 단일 에이전트 세션**으로 동작합니다.
- 클라이언트가 연결을 끊으면 에이전트 프로세스가 종료됩니다.
- `@zed-industries/claude-agent-acp` 패키지는 실행 시 `npx -y`로 자동 설치됩니다.
- Docker 컨테이너 내부에서 `npx` 실행이 가능해야 합니다 (node:20-alpine 포함).
