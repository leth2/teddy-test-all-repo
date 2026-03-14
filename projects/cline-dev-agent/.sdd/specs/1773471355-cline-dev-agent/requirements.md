# Requirements: Cline Dev Agent

## 목적

Cline CLI를 ACP 모드로 동작시키는 도커화된 개발 에이전트. HTTP + SSE 트랜스포트, React + shadcn UI로 Cline의 모든 기능을 웹에서 사용한다.

## 핵심 목표

1. `cline --acp`를 Docker 컨테이너 내에서 실행
2. HTTP + SSE로 웹 클라이언트와 통신
3. React + shadcn UI로 Cline 전체 기능 노출
4. Clean Architecture + SOLID 준수
5. **스펙당 1:1 에이전트 라이프사이클** — 스펙 시작 시 컨테이너 기동, 완료 후 종료
6. **Git Worktree 격리** — 스펙별 독립 브랜치에서 작업, main 오염 없음
7. **Dev Agent Registry** — 실행 중인 에이전트 목록 관리 (v1: 파일 기반)

---

## FR-1: 백엔드 — HTTP + SSE 서버

### FR-1.1 SSE 스트림 (서버→클라이언트)
- `GET /events` — SSE 연결
- 이벤트 타입: `agent-ready`, `agent-message`, `agent-tool-call`, `permission-request`, `agent-exit`
- 클라이언트 연결 시 bridge가 이미 ready면 즉시 `agent-ready` 전송 (race condition 방지, **Lesson A03**)

### FR-1.2 HTTP 엔드포인트 (클라이언트→서버)
- `POST /prompt` — 사용자 메시지 전달 `{ content: string, sessionId: string }`
- `POST /permission` — 권한 응답 `{ requestId: string, approved: boolean }`
- `GET /health` — 헬스체크 `{ status, uptime, agentReady }`
- `GET /session` — 현재 세션 정보

### FR-1.3 브릿지
- `cline --acp` 프로세스 spawn — **직접 바이너리 실행** (npx 우회, **Lesson A01**)
- ACP JSON-RPC 2.0 via stdio
- initialize → session/new (cwd 포함, **Lesson A02**) → session/prompt

---

## FR-2: 백엔드 아키텍처 — Clean Architecture

```
infrastructure/
  acp/ClineACPBridge.ts     # IACPBridge 구현체
  http/SSEController.ts     # HTTP/SSE 핸들러
  http/ExpressServer.ts     # 서버 설정
domain/
  entities/Message.ts       # 메시지 엔티티
  entities/Session.ts       # 세션 엔티티
  entities/Tool.ts          # 툴 엔티티
  ports/IACPBridge.ts       # 브릿지 인터페이스 (DIP)
  ports/IEventBus.ts        # 이벤트 버스 인터페이스
application/
  usecases/SendPrompt.ts    # 프롬프트 전송 유스케이스
  usecases/HandlePermission.ts
  services/AgentService.ts  # 에이전트 상태 관리
container/DIContainer.ts    # 의존성 주입
```

### SOLID 적용
- **S**: 각 클래스는 단일 책임 (Bridge=ACP통신, Controller=HTTP처리, AgentService=상태관리)
- **O**: IACPBridge 인터페이스 — Cline 외 다른 ACP 에이전트로 교체 가능
- **L**: 구현체는 인터페이스 계약을 완전히 이행
- **I**: IACPBridge, IEventBus, ISessionRepository 각각 분리
- **D**: 상위 레이어는 하위 구현이 아닌 인터페이스에 의존

---

## FR-3: 프론트엔드 — React + shadcn

### FR-3.1 UI 구성요소
- **ChatPanel**: 대화 히스토리, 스크롤, 타임스탬프
- **MessageInput**: 텍스트 입력, 파일 첨부, 전송
- **ToolCallCard**: 도구 호출 시각화 (파일 읽기/쓰기/실행 등)
- **PermissionDialog**: 권한 요청 팝업 (approve/deny)
- **AgentStatusBar**: 연결 상태, 토큰 사용량, 세션 ID
- **SidePanel**: 파일 트리, MCP 서버 목록 (확장용)

### FR-3.2 shadcn 컴포넌트 활용
- `Button`, `Input`, `Textarea` — 입력 요소
- `Card`, `Badge` — 툴 호출 표시
- `Dialog` — 권한 요청
- `ScrollArea` — 채팅 영역
- `Separator`, `Skeleton` — 레이아웃

### FR-3.3 상태 관리
- 전역: `SessionContext` (연결 상태, 세션 ID)
- 로컬: 각 컴포넌트 내 useState
- SSE: `useSSE` 커스텀 훅 — EventSource 연결 + 재연결

### FR-3.4 Cline 기능 100% 활용
- 텍스트 메시지 전송
- 툴 호출 시각화 (read_file, write_file, execute_command 등)
- 권한 요청/응답
- MCP 툴 결과 표시
- 스트리밍 응답 표시

---

## FR-4: Docker 구성

```yaml
services:
  agent:
    build: ./agent
    ports: ["3002:3002"]
    volumes:
      - ~/.cline:/root/.cline:ro    # Cline 인증
      - ./workspace:/workspace       # 작업 디렉토리
    environment:
      - PORT=3002
      - WORKSPACE=/workspace

  ui:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./ui:/app
    ports: ["5174:5174"]
    command: sh -c "npm install && npm run dev -- --host"
    environment:
      - VITE_AGENT_URL=http://localhost:3002
```

---

---

## FR-5: 스펙 라이프사이클 관리

### FR-5.1 spec-start (에이전트 기동)
```bash
spec-start <SPEC_ID>
```
1. `git worktree add .worktrees/<SPEC_ID> feature/<SPEC_ID>`
2. 포트 할당: 3100부터 순번 (registry.json 참조)
3. `docker compose -p cline-<SPEC_ID> up -d` (worktree + 포트 env 주입)
4. `registry.json` 업데이트

### FR-5.2 spec-finish (에이전트 종료)
```bash
spec-finish <SPEC_ID>
```
1. `git push origin feature/<SPEC_ID>` (worktree에서)
2. `docker compose -p cline-<SPEC_ID> down`
3. `git worktree remove .worktrees/<SPEC_ID>`
4. `registry.json`에서 제거 (또는 status: "done")

---

## FR-6: Dev Agent Registry

### registry.json 스키마
```json
{
  "agents": {
    "spec-001": {
      "port": 3100,
      "status": "running",
      "worktree": ".worktrees/spec-001",
      "branch": "feature/spec-001",
      "test_queue": "test-queues/spec-001.json",
      "started_at": "2026-03-14T07:00:00Z"
    }
  },
  "next_port": 3101
}
```

### status 값
- `starting` → `running` → `finishing` → `done`

### FR-6.1 레지스트리 HTTP API (v1)
- `GET /registry` — 전체 에이전트 목록 반환
- 에이전트별 `/health` 자동 체크 포함

### FR-6.2 Quinn 파이프라인 연동
```bash
node pipeline-runner.js --from-registry
```
- `registry.json` 읽기
- status=running 에이전트 목록 자동 발견
- 각 에이전트 포트로 test_queue 실행
- 결과 수집 + 리포트

---

## 비기능 요구사항

- TypeScript strict mode
- ESLint + Prettier
- agent Dockerfile: `npm ci` + `npm run build` + `npm prune --omit=dev` (**Lesson D01**)
- `package-lock.json` Git 추적 필수 (**Lesson D02**)
- 타임아웃: Pi 환경 기준 60s (**Lesson T01**)

## 범위 외 (v1)

- 사용자 인증 (단일 사용자)
- 멀티 세션
- 히스토리 영속화
