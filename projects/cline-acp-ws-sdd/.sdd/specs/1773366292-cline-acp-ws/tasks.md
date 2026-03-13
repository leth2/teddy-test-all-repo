# Tasks: cline-acp-ws

> 요구사항 매핑 검증: 1.1~5.2 전체 매핑 완료 ✅

---

## 1. Agent - 프로젝트 초기 설정
> 요구사항: 5.1 | 예상: ~1h

- [x] 1.1 `agent/package.json` 작성 — ws, @agentclientprotocol/sdk 의존성 포함
- [x] 1.2 `agent/tsconfig.json` 작성 — Node.js TypeScript 설정
- [x] 1.3 `agent/Dockerfile` 작성 — node:20-alpine 기반

## 2. Agent - ACP Bridge 구현 (P)
> 요구사항: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2 | 예상: ~3h

- [x] 2.1 `agent/src/bridge.ts` 테스트 작성 — 프로세스 spawn, 메시지 변환, 이벤트 emit
- [x] 2.2 `agent/src/bridge.ts` 구현 — AcpBridge EventEmitter 클래스
- [x] 2.3 에러/종료 처리 구현 — 에이전트 비정상 종료 처리

## 3. Agent - WebSocket 서버 구현 (P)
> 요구사항: 1.3, 5.1 | 예상: ~2h

- [x] 3.1 `agent/src/server.ts` 구현 — ws 라이브러리 WebSocket 서버
- [x] 3.2 단일 세션 제한 구현 — 두 번째 연결 거부 로직
- [x] 3.3 Bridge 이벤트 → WebSocket 메시지 변환 구현

## 4. UI - 프로젝트 초기 설정 (P)
> 요구사항: 5.2 | 예상: ~1h

- [x] 4.1 `ui/package.json` 작성 — React 19, Vite, TypeScript
- [x] 4.2 `ui/vite.config.ts` 작성 — 포트 5173 설정
- [x] 4.3 `ui/tsconfig.json` 작성

## 5. UI - 훅 및 상태 관리 (requires: 3 완료)
> 요구사항: 4.1, 4.2 | 예상: ~2h

- [x] 5.1 `ui/src/hooks/useChat.ts` 구현 — WebSocket 클라이언트, 메시지 상태 관리
- [x] 5.2 메시지 스트리밍 상태 관리 구현

## 6. UI - 컴포넌트 구현 (requires: 5 완료)
> 요구사항: 4.2, 4.3, 4.4 | 예상: ~3h

- [x] 6.1 `ui/src/components/MessageList.tsx` 구현
- [x] 6.2 `ui/src/components/ChatPanel.tsx` 구현
- [x] 6.3 `ui/src/components/PermissionDialog.tsx` 구현
- [x] 6.4 `ui/src/components/ToolCallLog.tsx` 구현
- [x] 6.5 `ui/src/App.tsx` 구현 — 다크 테마, 한국어 UI
- [x] 6.6 `ui/src/index.css`, `ui/src/main.tsx` 작성

## 7. Docker Compose 및 README (requires: 1, 4 완료)
> 요구사항: 5.2 | 예상: ~1h

- [x] 7.1 `docker-compose.yml` 작성
- [x] 7.2 `README.md` 작성 (한국어)
