# ACP 에이전트 채팅 UI (cline-acp-ws)

> **claude-agent-acp**를 WebSocket으로 연결하는 개발 에이전트 플랫폼 PoC

---

## 개요

이 프로젝트는 ACP(Agent Communication Protocol) 기반의 코딩 에이전트와 사용자가 실시간으로 상호작용할 수 있는 웹 UI를 제공합니다.

```
사용자 <──> React UI (5173) <──> WS 서버 (3001) <──> claude-agent-acp
```

## 주요 기능

- 🤖 **ACP 에이전트 프로세스 관리** - WebSocket 연결 시 자동 시작/종료
- 🌉 **WebSocket ↔ ACP stdio 브릿지** - 실시간 양방향 통신
- 💬 **실시간 스트리밍 채팅 UI** - 에이전트 응답을 스트리밍으로 표시
- 🔒 **Human-in-the-Loop** - 파일 쓰기/삭제 전 사용자 승인 요청
- 🔧 **툴콜 로그** - 에이전트가 사용하는 툴 실행 현황 표시

## 기술 스택

| 구성 요소 | 기술 |
|-----------|------|
| 백엔드 서버 | Node.js + TypeScript, ws 라이브러리 |
| ACP 에이전트 | claude-agent-acp (npx로 실행) |
| 프론트엔드 | React 19 + TypeScript + Vite |
| 컨테이너 | Docker + Docker Compose |
| 테스트 | Vitest |

## 빠른 시작

### Docker Compose (권장)

```bash
# 전체 시스템 시작
docker-compose up --build

# 백그라운드 실행
docker-compose up --build -d
```

- UI: http://localhost:5173
- WS 서버: ws://localhost:3001

### 로컬 개발

**백엔드 서버**:
```bash
cd agent
npm install
npm run dev
```

**프론트엔드 UI** (별도 터미널):
```bash
cd ui
npm install
npm run dev
```

## 프로젝트 구조

```
cline-acp-ws/
├── agent/                  # Node.js 브릿지 서버
│   ├── src/
│   │   ├── bridge.ts       # ACP 프로세스 관리 (EventEmitter)
│   │   ├── bridge.test.ts  # 브릿지 유닛 테스트
│   │   └── server.ts       # WebSocket 서버
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── ui/                     # React 채팅 UI
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useChat.ts  # WebSocket 클라이언트 훅
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── PermissionDialog.tsx
│   │   │   └── ToolCallLog.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── .sdd/                   # SDD 스티어링 및 스펙
├── docker-compose.yml
└── README.md
```

## WebSocket 메시지 프로토콜

### 클라이언트 → 서버

```json
// 메시지 전송
{ "type": "message", "content": "파일 목록을 보여줘" }

// 권한 응답
{ "type": "permission_response", "requestId": "uuid", "approved": true }
```

### 서버 → 클라이언트

```json
// 에이전트 준비
{ "type": "agent_ready" }

// 텍스트 응답
{ "type": "text", "content": "안녕하세요!" }

// 스트리밍 응답
{ "type": "stream", "content": "안녕", "done": false }

// 툴콜
{ "type": "toolcall", "id": "uuid", "name": "read_file", "args": {}, "status": "start" }

// 파일 권한 요청
{ "type": "permission_request", "requestId": "uuid", "filePath": "src/main.ts", "operation": "write" }
```

## 테스트 실행

```bash
cd agent
npm test
```

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3001` | WS 서버 포트 |
| `VITE_WS_URL` | `ws://localhost:3001` | UI에서 연결할 WS 서버 주소 |

## 개발 배경

[SDD (Spec-Driven Development)](https://github.com/leth2/teddy-test-all-repo) 워크플로우를 사용하여 개발되었습니다.

- 스티어링 → 요구사항 → 설계 → 태스크 → 구현 순서로 진행
- 모든 결정 사항은 `.sdd/` 디렉토리에 기록됨

## 라이선스

MIT
