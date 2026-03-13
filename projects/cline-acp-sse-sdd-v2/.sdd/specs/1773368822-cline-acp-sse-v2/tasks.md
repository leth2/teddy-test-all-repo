# Tasks: cline-acp-sse-v2

⚠️ 테스트 미실행: npm 패키지 미설치 환경. 코드 작성 완료 태스크는 `[~]` 표시.

## 1. Agent 프로젝트 초기화 (P)
> 요구사항: 7.1 | 예상: ~1h

- [~] 1.1 agent/package.json 생성 — express, cors, @agentclientprotocol/sdk 의존성 포함, 완료 기준: 파일 존재 + 유효한 JSON
- [~] 1.2 agent/tsconfig.json 생성 — TypeScript strict 설정, 완료 기준: 파일 존재
- [~] 1.3 agent/Dockerfile 생성 — node:20-alpine 기반, 완료 기준: 파일 존재

## 2. UI 프로젝트 초기화 (P)
> 요구사항: 7.1 | 예상: ~1h

- [~] 2.1 ui/package.json 생성 — React 19, Vite, TypeScript 의존성, 완료 기준: 파일 존재
- [~] 2.2 ui/vite.config.ts 생성 — 포트 5174, proxy 설정 (:3002), 완료 기준: 파일 존재
- [~] 2.3 ui/tsconfig.json, ui/tsconfig.node.json 생성

## 3. ACPBridge 구현 (requires: 1 완료)
> 요구사항: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3 | 예상: ~2.5h

- [~] 3.1 agent/src/bridge.test.ts 테스트 작성 — spawn/kill/ACP 핸드셰이크/sendPrompt/sendPermission/이벤트 emit, 완료 기준: 테스트 파일 존재
- [~] 3.2 agent/src/bridge.ts 구현 — 올바른 ACP 핸드셰이크 (initialize→session/new→session/prompt), 완료 기준: 코드 작성
- [~] 3.3 bridge.ts 리팩토링 — 핸드셰이크 상태 머신, 코드 정리

## 4. Express SSE 서버 구현 (requires: 3 완료)
> 요구사항: 3.1, 3.2, 3.3, 4.1, 4.2, 5.1 | 예상: ~2h

- [~] 4.1 agent/src/server.test.ts 테스트 작성 — /events SSE 헤더/형식, /prompt 400/503, /permission 400/404, /health agentRunning 필드, 완료 기준: 테스트 파일 존재
- [~] 4.2 agent/src/server.ts 구현 — Express + SSE (올바른 이벤트 형식) + keepalive 15s, 완료 기준: 코드 작성
- [~] 4.3 server.ts 리팩토링 — 구독자 관리, keepalive 타이머 정리

## 5. React UI 구현 (P, requires: 2 완료)
> 요구사항: 6.1, 6.2, 6.3, 6.4 | 예상: ~3h

- [~] 5.1 ui/src/hooks/useChat.ts 구현 — EventSource + fetch POST, connected 상태 관리, 완료 기준: 코드 작성
- [~] 5.2 ui/src/components/MessageList.tsx 구현 — 메시지 렌더링, user/agent 구분, 자동 스크롤, 완료 기준: 코드 작성
- [~] 5.3 ui/src/components/ChatPanel.tsx 구현 — 입력창, "SSE 연결됨/안됨" 상태 표시, 완료 기준: 코드 작성
- [~] 5.4 ui/src/components/PermissionDialog.tsx 구현 — 모달, 승인/거부 버튼, 완료 기준: 코드 작성
- [~] 5.5 ui/src/components/ToolCallLog.tsx 구현 — 툴 이름/파라미터 표시, 완료 기준: 코드 작성
- [~] 5.6 ui/src/App.tsx 구현 — 다크 테마, 한국어 레이블, 완료 기준: 코드 작성
- [~] 5.7 ui/src/index.css, ui/src/main.tsx 생성 — 다크 테마 기본 스타일, 완료 기준: 파일 존재

## 6. Docker Compose 및 문서화 (requires: 1, 2 완료)
> 요구사항: 7.1 | 예상: ~1h

- [~] 6.1 docker-compose.yml 생성 — agent(3002), ui(5174) 서비스, 네트워크 연결, 완료 기준: 파일 존재
- [~] 6.2 README.md 작성 — 한국어, 실행 방법, SSE 방식 설명, ACP 프로토콜 설명, 완료 기준: 파일 존재

---

## 요구사항 매핑 검증

| 요구사항 | 태스크 |
|---------|--------|
| 1.1 (프로세스 시작) | 3.2 (bridge.ts start()) |
| 1.2 (프로세스 종료) | 3.2 (bridge.ts stop()) |
| 1.3 (비정상 종료 이벤트) | 3.2 (exit/error 이벤트) |
| 2.1 (JSON-RPC stdin/stdout) | 3.2 (ACP 핸드셰이크) |
| 2.2 (메시지 타입 구분) | 3.2 (handleACPMessage) |
| 2.3 (권한 응답) | 3.2 (sendPermission) |
| 3.1 (SSE /events) | 4.2 |
| 3.2 (keepalive 15s) | 4.2 |
| 3.3 (브로드캐스트) | 4.2 |
| 4.1 (POST /prompt) | 4.2 |
| 4.2 (POST /permission) | 4.2 |
| 5.1 (GET /health) | 4.2 |
| 6.1 (SSE 연결 상태) | 5.1, 5.3 |
| 6.2 (채팅 메시지) | 5.1, 5.2 |
| 6.3 (툴콜 로그) | 5.1, 5.5 |
| 6.4 (권한 다이얼로그) | 5.1, 5.4 |
| 7.1 (Docker Compose) | 1.3, 6.1 |
