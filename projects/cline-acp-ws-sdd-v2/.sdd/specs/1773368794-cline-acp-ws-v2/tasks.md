# Tasks: cline-acp-ws-v2

> 요구사항 매핑 검증: 1.1~5.2 전체 매핑 완료 ✅
> ACP 스펙 참조: references/acp-protocol.md
> ⚠️ 테스트 미실행: npm install 없어서 [~] 상태로 표시

---

## 1. Agent - 프로젝트 초기 설정
> 요구사항: 5.1 | 예상: ~1h

- [~] 1.1 `agent/package.json` 작성 — ws, vitest 의존성 포함 (ACP SDK 포함 확인)
- [~] 1.2 `agent/tsconfig.json` 작성 — Node.js TypeScript 설정
- [~] 1.3 `agent/Dockerfile` 작성 — node:20-alpine 기반

## 2. Agent - ACP Bridge 구현 (P)
> 요구사항: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2 | 예상: ~4h
> ACP 스펙: references/acp-protocol.md 기반 구현

- [~] 2.1 `agent/src/bridge.test.ts` 테스트 작성 — spawn, 핸드셰이크, 이벤트 emit
- [~] 2.2 `agent/src/bridge.ts` 구현 — AcpBridge EventEmitter 클래스
  - spawn 후 readline으로 stdout 줄 단위 파싱
  - initialize (id:0) → session/new (id:1) 핸드셰이크
  - session/update 처리 (notification, id 없음)
  - session/request_permission 처리 (request, id 있음)
  - sendPrompt(): session/prompt 전송
  - respondPermission(requestId, optionId): 응답 전송
- [~] 2.3 에러/종료 처리 구현 — 에이전트 비정상 종료 처리

## 3. Agent - WebSocket 서버 구현 (P)
> 요구사항: 1.3, 5.1 | 예상: ~2h

- [~] 3.1 `agent/src/server.ts` 구현 — ws 라이브러리 WebSocket 서버
- [~] 3.2 단일 세션 제한 구현 — 두 번째 연결 거부 로직
- [~] 3.3 Bridge 이벤트 → WebSocket 메시지 변환 구현
  - 'ready' → { type: 'agent_ready' }
  - 'message' → { type: 'stream', ... }
  - 'toolcall' → { type: 'toolcall', ... }
  - 'permission' → { type: 'permission_request', requestId, options }

## 4. UI - 프로젝트 초기 설정 (P)
> 요구사항: 5.2 | 예상: ~1h

- [~] 4.1 `ui/package.json` 작성 — React 19, Vite, TypeScript
- [~] 4.2 `ui/vite.config.ts` 작성 — 포트 5173 설정
- [~] 4.3 `ui/tsconfig.json` 작성

## 5. UI - 훅 및 상태 관리 (requires: 3 완료)
> 요구사항: 4.1, 4.2 | 예상: ~2h

- [~] 5.1 `ui/src/hooks/useChat.ts` 구현 — WebSocket 클라이언트, 메시지 상태 관리
  - respondPermission(requestId: number, optionId: string) — 스펙 맞는 인터페이스
- [~] 5.2 메시지 스트리밍 상태 관리 구현

## 6. UI - 컴포넌트 구현 (requires: 5 완료)
> 요구사항: 4.2, 4.3, 4.4 | 예상: ~3h

- [~] 6.1 `ui/src/components/MessageList.tsx` 구현
- [~] 6.2 `ui/src/components/ChatPanel.tsx` 구현
- [~] 6.3 `ui/src/components/PermissionDialog.tsx` 구현
  - options 배열 표시 (allow_once/reject_once 등 PermissionOption 기반)
- [~] 6.4 `ui/src/components/ToolCallLog.tsx` 구현
  - kind 필드 표시 (read/edit/delete/execute/other)
- [~] 6.5 `ui/src/App.tsx` 구현 — 다크 테마, 한국어 UI
- [~] 6.6 `ui/src/index.css`, `ui/src/main.tsx` 작성

## 7. Docker Compose 및 README (requires: 1, 4 완료)
> 요구사항: 5.2 | 예상: ~1h

- [~] 7.1 `docker-compose.yml` 작성
- [~] 7.2 `README.md` 작성 (한국어)

⚠️ 테스트 미실행: 모든 태스크 [~] 상태 — npm install 환경 없어서 테스트 실행 불가
