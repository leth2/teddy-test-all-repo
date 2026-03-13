# cline-acp-sse — SSE 브릿지 (v2)

> SDD v2 (개선된 도구): ACP 공식 스펙 기반, 검증 포함

claude-agent-acp 코딩 에이전트를 **HTTP SSE + POST**로 연결하는 PoC 프로젝트.

## 아키텍처

```
브라우저 (React UI :5174)
    ↕ SSE (GET /events)     ← 서버→클라이언트 스트리밍
    ↕ POST /prompt          ← 사용자 메시지
    ↕ POST /permission      ← Human-in-the-Loop
Express SSE 서버 (:3002)
    ↕ stdio JSON-RPC (ACP 프로토콜)
claude-agent-acp 프로세스
```

## ACP 프로토콜 (v2 개선사항)

v2는 공식 [Agent Client Protocol](https://agentclientprotocol.com/) 스펙을 준수합니다:

```
1. initialize (id:0) ↔ 응답
2. session/new (id:1) ↔ sessionId 획득
3. session/prompt (id:N) → 에이전트 처리
4. session/update notifications ← 스트리밍 응답
5. session/request_permission ← 권한 요청
6. { id: requestId, result: { approved } } → 권한 응답
```

### v1과의 차이점

| | v1 (틀림) | v2 (올바름) |
|-|----------|------------|
| 프롬프트 전송 | `method: "prompt"` | `method: "session/prompt"` |
| 권한 응답 | `method: "permission"` | `id: requestId, result: { approved }` |
| 메시지 파싱 | `method === "message"` | `method === "session/update"` + `sessionUpdate === "agent_message_chunk"` |
| 초기화 | 없음 | initialize → session/new 핸드셰이크 |

## 실행

### 로컬 개발

```bash
# 1. 에이전트 서버
cd agent
npm install
npm run dev

# 2. React UI (별도 터미널)
cd ui
npm install
npm run dev
```

### Docker Compose

```bash
export ANTHROPIC_API_KEY=sk-...
docker-compose up
```

- 에이전트 서버: http://localhost:3002
- React UI: http://localhost:5174

## 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/events` | GET | SSE 스트림 (text/event-stream) |
| `/prompt` | POST | `{ text }` 프롬프트 전송 |
| `/permission` | POST | `{ requestId, approved }` 권한 응답 |
| `/health` | GET | `{ status, agentRunning }` 상태 확인 |

## SSE 이벤트 타입

| 이벤트 | 데이터 |
|--------|--------|
| `connected` | `{ message }` |
| `message` | `{ id, role, content, timestamp }` |
| `toolcall` | `{ id, name, params, status, timestamp }` |
| `permission-request` | `{ requestId, description, tool }` |
| `keepalive` | `{}` |
| `agent-ready` | `{ message }` |

## 기술 스택

- **백엔드**: Node.js 20 + TypeScript + Express + cors
- **에이전트**: @zed-industries/claude-agent-acp (ACP 준수)
- **프론트엔드**: React 19 + TypeScript + Vite
- **포트**: agent=3002, ui=5174
- **컨테이너**: Docker Compose

## 개발 방식

이 프로젝트는 **SDD (Spec-Driven Development) v2** 도구로 작성됐습니다.
스펙 문서: `.sdd/specs/1773368822-cline-acp-sse-v2/`
- `requirements.md`: EARS 형식 요구사항
- `design.md`: 아키텍처 + 인터페이스 계약 (ACP 스펙 참조 링크 포함)
- `tasks.md`: TDD 태스크 목록
- `references/acp-protocol.md`: ACP 공식 스펙 요약
- `references/sse-format.md`: SSE 이벤트 형식 스펙
