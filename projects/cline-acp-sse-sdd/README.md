# Dev Agent Chat (SSE)

ACP(Agent Client Protocol) 브릿지 서버와 React 채팅 UI를 통해 `claude-agent-acp` 에이전트와 실시간으로 인터랙션하는 개발 에이전트 플랫폼 PoC.

## 아키텍처

```
사용자 브라우저 (React UI :5174)
        ↕ HTTP SSE (GET /events)
        ↕ HTTP POST (/prompt, /permission)
Express SSE 서버 (:3002)
        ↕ stdio JSON-RPC
claude-agent-acp 프로세스
```

### SSE 방식 선택 이유

- **단방향 스트리밍**: 서버→클라이언트 방향 스트리밍에 최적
- **방화벽 친화적**: 순수 HTTP, WebSocket 불필요
- **자동 재연결**: 브라우저 `EventSource` API가 자동으로 재연결
- **간단한 구현**: 기존 HTTP 인프라 그대로 활용

## 통신 흐름

```
1. 브라우저가 GET /events로 SSE 연결 (EventSource)
2. 사용자가 채팅 입력 → POST /prompt { text }
3. 서버가 ACP 에이전트로 JSON-RPC 메시지 전송 (stdin)
4. 에이전트 응답 → 서버가 SSE 이벤트로 브로드캐스트
5. 에이전트가 권한 요청 → SSE 'permission-request' 이벤트
6. 사용자 승인/거부 → POST /permission { requestId, approved }
```

## 주요 기능

- ✅ ACP 에이전트 프로세스 자동 관리 (spawn/kill)
- ✅ ACP 메시지 → SSE 스트림 브릿지
- ✅ 실시간 스트리밍 채팅 UI (다크 테마, 한국어)
- ✅ Human-in-the-Loop 권한 다이얼로그
- ✅ 툴콜 로그 표시
- ✅ 15초마다 SSE keepalive
- ✅ Docker Compose 실행 지원

## SSE 이벤트 타입

| 이벤트 | 설명 |
|--------|------|
| `connected` | SSE 연결 성공 |
| `message` | 에이전트 메시지 |
| `toolcall` | 툴 호출 로그 |
| `permission-request` | 권한 요청 |
| `agent-exit` | 에이전트 종료 |
| `error` | 오류 발생 |

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/events` | GET | SSE 스트림 |
| `/prompt` | POST | 사용자 입력 전송 |
| `/permission` | POST | 권한 승인/거부 |
| `/health` | GET | 서버 상태 확인 |

## 시작하기

### Docker Compose (권장)

```bash
docker-compose up --build
```

- UI: http://localhost:5174
- Agent API: http://localhost:3002

### 로컬 개발

**에이전트 서버:**
```bash
cd agent
npm install
npm run dev
```

**UI:**
```bash
cd ui
npm install
npm run dev
```

## 기술 스택

- **Backend**: Node.js + TypeScript, Express, cors
- **ACP**: `@zed-industries/claude-agent-acp` (npx로 실행)
- **Frontend**: React 19 + TypeScript + Vite
- **서버 포트**: 3002
- **UI 포트**: 5174
- **컨테이너**: Docker (node:20-alpine)

## 개발 프로세스

이 프로젝트는 [SDD(Spec-Driven Development)](https://github.com/leth2/sdd-tool) 워크플로우로 개발되었습니다.

- **스티어링**: `.sdd/steering/` — 제품/기술/구조 방향
- **스펙**: `.sdd/specs/` — 요구사항/설계/태스크
- **로그**: `.sdd/logs/` — 구현 로그
