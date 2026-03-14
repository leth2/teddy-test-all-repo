# Design: Cline Dev Agent

## 전체 구조

```
cline-dev-agent/
├── agent/                    # 백엔드 (Node.js + TypeScript)
│   ├── src/
│   │   ├── domain/
│   │   │   ├── entities/     # Message, Session, ToolCall, Permission
│   │   │   └── ports/        # IACPBridge, IEventBus, ISessionRepo
│   │   ├── application/
│   │   │   ├── usecases/     # SendPrompt, HandlePermission, StartSession
│   │   │   └── services/     # AgentService
│   │   ├── infrastructure/
│   │   │   ├── acp/          # ClineACPBridge (cline --acp spawn)
│   │   │   └── http/         # ExpressServer, SSEController, routes
│   │   └── container/        # DIContainer (의존성 주입)
│   ├── Dockerfile
│   └── package.json
├── ui/                       # 프론트엔드 (React + Vite + shadcn)
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/         # ChatPanel, MessageItem, MessageInput
│   │   │   ├── tools/        # ToolCallCard, ToolResult
│   │   │   ├── permission/   # PermissionDialog
│   │   │   └── layout/       # AgentStatusBar, SidePanel
│   │   ├── hooks/            # useSSE, useAgent, useSession
│   │   ├── contexts/         # SessionContext
│   │   ├── services/         # AgentAPI (HTTP 클라이언트)
│   │   └── types/            # 공유 타입 정의
│   ├── vite.config.ts
│   └── package.json
└── docker-compose.yml
```

## 백엔드 핵심 설계

### IAgentInfo (Domain Entity — Registry 확장 포인트)
```typescript
// v1: GET /agent/info → 단일 객체
// v2: GET /registry → IAgentInfo[] (Registry 서비스)
interface IAgentInfo {
  specId: string;
  port: number;
  status: 'starting' | 'running' | 'idle' | 'finishing' | 'done' | 'error';
  worktree: string;
  branch: string;
  testQueue?: string;
  startedAt: Date;
}
```

### IACPBridge (Domain Port)
```typescript
interface IACPBridge {
  start(): Promise<void>;
  stop(): void;
  sendPrompt(sessionId: string, content: string): void;
  respondPermission(requestId: string, approved: boolean): void;
  isReady(): boolean;
  on(event: 'ready' | 'message' | 'tool-call' | 'permission' | 'exit', handler): void;
}
```

### ClineACPBridge (Infrastructure)
```typescript
// cline --acp 직접 spawn (npx 우회 — Lesson A01)
const bin = 'cline';  // npm i -g cline으로 PATH에 있음
this.process = spawn(bin, ['--acp'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env },
});
```

### AgentService (Application)
```typescript
class AgentService {
  constructor(
    private bridge: IACPBridge,     // DIP: 인터페이스 주입
    private eventBus: IEventBus,
  ) {}
  // bridge 이벤트 → eventBus → SSE 클라이언트
}
```

### SSEController (Infrastructure)
```typescript
// race condition 방지 (Lesson A03)
router.get('/events', (req, res) => {
  setupSSEHeaders(res);
  sseClients.add(res);
  send(res, 'connected', {});
  if (agentService.isReady()) {
    send(res, 'agent-ready', {});
  }
});
```

## 프론트엔드 핵심 설계

### useSSE 훅
```typescript
function useSSE(url: string) {
  // EventSource 연결 + 자동 재연결
  // 이벤트 타입별 dispatch
}
```

### SSE 이벤트 → UI 매핑

| SSE 이벤트 | UI 처리 |
|-----------|---------|
| `agent-ready` | StatusBar: 🟢 연결됨 |
| `agent-message` | ChatPanel: AI 응답 추가 |
| `agent-tool-call` | ToolCallCard: 툴 시각화 |
| `permission-request` | PermissionDialog: 팝업 |
| `agent-exit` | StatusBar: 🔴 종료 |

## 데이터 흐름

```
사용자 입력
→ MessageInput 컴포넌트
→ POST /prompt (AgentAPI)
→ SendPromptUseCase
→ ClineACPBridge.sendPrompt()
→ cline --acp stdin (JSON-RPC session/prompt)

cline 응답
→ ClineACPBridge stdout 파싱
→ AgentService 이벤트 발행
→ SSEController.broadcast()
→ GET /events SSE 스트림
→ useSSE 훅
→ ChatPanel / ToolCallCard 업데이트
```

## ACP 세션 시작 시퀀스

```
서버 시작
→ ClineACPBridge.start()
→ spawn('cline', ['--acp'])
→ send: { method: 'initialize', id: 0, params: { protocol: '0.1' } }
→ recv: { result: { capabilities: {...} } }
→ send: { method: 'session/new', id: 1, params: { cwd: '/workspace', mcpServers: [] } }
→ recv: { result: { sessionId: '...' } }
→ emit('ready') → broadcast 'agent-ready'
```

## Docker 볼륨 전략

- `~/.cline:/root/.cline:ro` — Cline OAuth 인증
- `./workspace:/workspace` — 작업 디렉토리 (cline이 파일 조작)
- `cwd: '/workspace'` — session/new params (Lesson A02)
