# Tasks: cline-acp-sse

## 1. Agent 프로젝트 초기화 (P)
> 요구사항: 6.1 | 예상: ~1h

- [x] 1.1 agent/package.json 생성 — express, cors, @agentclientprotocol/sdk 의존성 포함
- [x] 1.2 agent/tsconfig.json 생성 — TypeScript 설정 완료
- [x] 1.3 agent/Dockerfile 생성 — node:20-alpine 기반

## 2. UI 프로젝트 초기화 (P)
> 요구사항: 6.1 | 예상: ~1h

- [x] 2.1 ui/package.json 생성 — React 19, Vite, TypeScript 의존성
- [x] 2.2 ui/vite.config.ts 생성 — 포트 5174 설정
- [x] 2.3 ui/tsconfig.json 생성

## 3. ACPBridge 구현
> 요구사항: 1.1, 1.2 | 예상: ~2h

- [x] 3.1 agent/src/bridge.ts 테스트 작성 — spawn/kill, sendPrompt, sendPermission, event emit
- [x] 3.2 agent/src/bridge.ts 구현 — ACPBridge 클래스, stdio JSON-RPC, EventEmitter
- [x] 3.3 bridge.ts 리팩토링

## 4. Express SSE 서버 구현
> 요구사항: 2.1, 2.2, 3.1, 3.2, 4.1 | 예상: ~2h (requires: 3 완료)

- [x] 4.1 agent/src/server.ts 테스트 작성 — /events SSE, /prompt, /permission, /health
- [x] 4.2 agent/src/server.ts 구현 — Express + SSE + keepalive
- [x] 4.3 server.ts 리팩토링

## 5. React UI 구현 (P, requires: 2 완료)
> 요구사항: 5.1, 5.2, 5.3 | 예상: ~3h

- [x] 5.1 ui/src/hooks/useChat.ts 구현 — EventSource + fetch POST
- [x] 5.2 ui/src/components/MessageList.tsx 구현
- [x] 5.3 ui/src/components/ChatPanel.tsx 구현 — "SSE 연결됨" 상태 표시
- [x] 5.4 ui/src/components/PermissionDialog.tsx 구현
- [x] 5.5 ui/src/components/ToolCallLog.tsx 구현
- [x] 5.6 ui/src/App.tsx 구현 — 다크 테마, 한국어
- [x] 5.7 ui/src/index.css, ui/src/main.tsx 생성

## 6. Docker Compose 및 문서화
> 요구사항: 6.1 | 예상: ~1h (requires: 1, 2 완료)

- [x] 6.1 docker-compose.yml 생성 — 포트 3002/5174
- [x] 6.2 README.md 작성 — 한국어, SSE 방식 설명
