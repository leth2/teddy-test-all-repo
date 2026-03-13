# Cline ACP + React UI PoC — SSE 버전

**ACP(Agent Client Protocol) 기반 개발 에이전트**와 커스텀 React 채팅 UI의 PoC(개념 증명) 프로젝트입니다.  
[WebSocket 버전](../cline-acp-poc/)과 동일한 기능을 **HTTP SSE + HTTP POST** 방식으로 구현한 비교용 버전입니다.

---

## 아키텍처

```
React UI (포트 5174) — Vite 개발 서버
    ↕ GET  /events     → SSE 스트림 (서버 → 클라이언트)
    ↕ POST /prompt     → 사용자 메시지 전송 (클라이언트 → 서버)
    ↕ POST /permission → 권한 응답 (클라이언트 → 서버)
Express 브릿지 서버 (포트 3002)
    ↕ ACP 프로토콜 (stdio JSON-RPC)
claude-agent-acp 프로세스 (ANTHROPIC_API_KEY 주입됨)
    ↕
Anthropic API
```

### 구성 요소

| 경로 | 설명 |
|------|------|
| `agent/` | Node.js Express SSE 브릿지 서버 (Docker 빌드 대상) |
| `agent/src/server.ts` | Express 서버 — SSE 스트림 + POST 엔드포인트 |
| `agent/src/bridge.ts` | ACP 에이전트 프로세스 관리 및 JSON-RPC 핸들링 |
| `ui/` | React + TypeScript 채팅 UI |
| `ui/src/hooks/useChat.ts` | EventSource(SSE) 연결 관리 훅 |
| `ui/src/components/` | MessageList, ChatPanel, PermissionDialog, ToolCallLog |
| `workspace/` | 에이전트가 읽고 쓸 수 있는 공유 작업 디렉터리 |

---

## SSE vs WebSocket 비교

| 항목 | WebSocket 버전 | SSE 버전 (이 프로젝트) |
|------|--------------|-------------------|
| **포트** | 3001 / 5173 | 3002 / 5174 |
| **라이브러리** | `ws` | `express` + `cors` |
| **서버→클라이언트** | WebSocket 메시지 | GET `/events` SSE 스트림 |
| **클라이언트→서버** | WebSocket 메시지 | POST `/prompt`, POST `/permission` |
| **브라우저 API** | `new WebSocket(url)` | `new EventSource(url)` |
| **재연결** | 수동 구현 필요 (3초 타이머) | **브라우저 자동 재연결** |
| **HTTP 호환성** | Upgrade 핸들셰이크 필요 | 일반 HTTP — 프록시 통과 쉬움 |
| **양방향성** | 완전 양방향 | 단방향 스트림 + 별도 POST |
| **이벤트 타입** | `type` 필드로 구분 | SSE `event:` 필드로 구분 |

### SSE 방식의 장점

- **자동 재연결**: `EventSource`는 브라우저가 내장 재연결을 처리 — 코드 불필요
- **HTTP 프록시 친화적**: 일반 HTTP이므로 Nginx, CDN 등을 통과하기 쉬움
- **단순한 서버**: 웹소켓 업그레이드 핸들링 없이 Express 미들웨어만으로 충분
- **디버깅 용이**: `curl -N http://localhost:3002/events` 로 바로 확인 가능

### SSE 방식의 단점

- 클라이언트 → 서버 전송이 별도 HTTP 요청 필요
- 연결당 하나의 서버 세션만 유지 (이 PoC의 단순화된 구현)
- HTTP/1.1에서는 브라우저 연결 수 제한(도메인당 6개)에 포함됨

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/events` | SSE 스트림 — 에이전트 세션 생성 및 이벤트 수신 |
| `POST` | `/prompt` | `{ text: string }` — 사용자 메시지 전송 |
| `POST` | `/permission` | `{ approved: boolean, requestId: string }` — 권한 응답 |
| `GET` | `/health` | `{ status: "ok" }` — 헬스체크 |

### SSE 이벤트 형식

```
event: connected
data: {}

event: agent_message_chunk
data: {"id":"abc123","content":"안녕하세요"}

event: tool_call
data: {"toolName":"bash","status":"running"}

event: permission_request
data: {"permissionId":"perm-1","toolName":"bash","description":"ls -la 실행"}

event: session_end
data: {}
```

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

### 3. 브라우저 접속

```
http://localhost:5174
```

---

## 로컬 개발 (Docker 없이)

### Agent 서버

```bash
cd agent
npm install
npm run dev
# → http://localhost:3002 에서 실행
```

### UI

```bash
cd ui
npm install
npm run dev
# → http://localhost:5174 에서 실행
```

### SSE 스트림 디버깅 (curl)

```bash
# SSE 스트림 직접 확인
curl -N http://localhost:3002/events

# 프롬프트 전송
curl -X POST http://localhost:3002/prompt \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요"}'
```

---

## 프로젝트 구조

```
cline-acp-sse-poc/
├── agent/
│   ├── src/
│   │   ├── bridge.ts      # ACP 프로세스 관리 (WebSocket 버전과 동일)
│   │   └── server.ts      # Express SSE 서버 ← 핵심 변경점
│   ├── package.json       # express + cors (ws 제거)
│   ├── tsconfig.json
│   └── Dockerfile
├── ui/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useChat.ts # EventSource 사용 ← 핵심 변경점
│   │   ├── components/
│   │   │   ├── App.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── PermissionDialog.tsx
│   │   │   └── ToolCallLog.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts     # port 5174
│   └── package.json
├── workspace/             # 에이전트 공유 작업 디렉터리
├── docker-compose.yml     # ports 3002/5174
└── README.md
```
