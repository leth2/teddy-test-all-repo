# Tasks: Cline Dev Agent

## Phase 1 — 백엔드 기반 (agent/)

### T1.1 프로젝트 초기화
- [ ] `agent/package.json` (TypeScript, Express, 의존성)
- [ ] `agent/tsconfig.json` (strict mode)
- [ ] `agent/Dockerfile` (npm ci + build + prune 패턴 — Lesson D01)
- [ ] `agent/package-lock.json` 생성 (Lesson D02)

### T1.2 Domain Layer
- [ ] `domain/entities/Message.ts`
- [ ] `domain/entities/Session.ts`
- [ ] `domain/entities/ToolCall.ts`
- [ ] `domain/entities/Permission.ts`
- [ ] `domain/ports/IACPBridge.ts`
- [ ] `domain/ports/IEventBus.ts`

### T1.3 Infrastructure — ClineACPBridge
- [ ] `infrastructure/acp/ClineACPBridge.ts`
  - spawn('cline', ['--acp']) — 직접 실행 (Lesson A01)
  - JSON-RPC 파싱 (readline)
  - initialize → session/new (cwd — Lesson A02)
  - isReady() 메서드
  - 이벤트: ready, message, tool-call, permission, exit

### T1.4 Application Layer
- [ ] `application/services/AgentService.ts`
- [ ] `application/usecases/SendPrompt.ts`
- [ ] `application/usecases/HandlePermission.ts`

### T1.5 Infrastructure — HTTP/SSE Server
- [ ] `infrastructure/http/SSEController.ts` (race condition 방지 — Lesson A03)
- [ ] `infrastructure/http/routes.ts`
- [ ] `infrastructure/http/ExpressServer.ts`
- [ ] `container/DIContainer.ts`
- [ ] `index.ts` (진입점)

## Phase 2 — 프론트엔드 기반 (ui/)

### T2.1 프로젝트 초기화
- [ ] React + Vite + TypeScript 설정
- [ ] shadcn/ui 설치 및 설정 (`npx shadcn@latest init`)
- [ ] 필요한 shadcn 컴포넌트 추가 (Button, Input, Card, Dialog, ScrollArea 등)

### T2.2 타입 + 서비스
- [ ] `types/events.ts` (SSE 이벤트 타입)
- [ ] `types/messages.ts` (메시지 타입)
- [ ] `services/AgentAPI.ts` (HTTP 클라이언트)

### T2.3 커스텀 훅
- [ ] `hooks/useSSE.ts` — EventSource + 자동 재연결
- [ ] `hooks/useAgent.ts` — 에이전트 상태 관리
- [ ] `contexts/SessionContext.tsx`

### T2.4 UI 컴포넌트
- [ ] `components/chat/ChatPanel.tsx`
- [ ] `components/chat/MessageItem.tsx` (텍스트, 툴호출, 에러 구분)
- [ ] `components/chat/MessageInput.tsx`
- [ ] `components/tools/ToolCallCard.tsx` (read/write/exec 시각화)
- [ ] `components/permission/PermissionDialog.tsx`
- [ ] `components/layout/AgentStatusBar.tsx`
- [ ] `App.tsx` (레이아웃 조합)

## Phase 3 — Docker + 통합

### T3.1 Docker 구성
- [ ] `docker-compose.yml` (agent + ui)
- [ ] `.env.example`
- [ ] `workspace/` 디렉토리 (cline 작업 공간)

### T3.2 통합 검증
- [ ] 컨테이너 시작 → `/health` 200 확인
- [ ] SSE 연결 → `agent-ready` 수신 확인
- [ ] 메시지 전송 → Cline 응답 수신 확인

## 우선순위

T1.1 → T1.2 → T1.3 → T1.4 → T1.5 → T2.1 → T2.2+T2.3 → T2.4 → T3.1 → T3.2

## 완료 기준

- [ ] `/health` HTTP 200
- [ ] `agent-ready` SSE 수신
- [ ] 텍스트 메시지 전송 후 Cline 응답 수신
- [ ] ToolCall 이벤트 UI 표시
- [ ] PermissionDialog 팝업 + 응답
