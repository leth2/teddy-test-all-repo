# Lessons: ACP Protocol

AI가 반복하는 실수 패턴 모음.

## A01 npx spawn stdin 미연결

**증상:** `bridge.start()` 후 무한 대기. 서버 로그가 "초기화 중..."에서 멈춤. 프로세스는 살아있음.

**원인:** `spawn('npx', ['-y', '@zed-industries/claude-agent-acp'], { stdio: ['pipe','pipe','pipe'] })` 사용 시 npm exec(v7+)가 자식 프로세스 stdin을 IPC socket으로 연결함. `/proc/PID/fd/0 → socket` (파이프 아님).

**체크:** `ls -la /proc/<child-pid>/fd/0` — `pipe:`면 정상, `socket:`이면 미연결

**수정:** `@zed-industries/claude-agent-acp`를 `dependencies`에 추가하고 `node_modules/.bin/claude-agent-acp` 직접 실행:
```typescript
const agentBin = resolve(__dirname, '../node_modules/.bin/claude-agent-acp');
spawn(agentBin, [], { stdio: ['pipe', 'pipe', 'pipe'] })
```

---

## A02 session/new cwd 누락

**증상:** `session/new` 호출 시 `{"code":-32602,"message":"Invalid params","data":{"cwd":{"_errors":["Invalid..."]}}}` 에러

**원인:** ACP SDK `session/new` 메서드는 `cwd` 파라미터가 필수인데, bridge에서 빈 params `{}` 전송

**체크:** `session/new` 응답에 `error.data.cwd` 키 존재 여부 확인

**수정:**
```typescript
params: {
  cwd: process.cwd(),
  mcpServers: [],
}
```

---

## A03 agent-ready 레이스 컨디션

**증상:** SSE 클라이언트가 `/events`에 늦게 연결하면 `agent-ready` 이벤트를 영원히 못 받음. 타임아웃 발생.

**원인:** 서버 시작 시 `bridge.on('started')` 이벤트가 한 번만 broadcast됨. 테스트 클라이언트 연결 전에 이미 완료되면 놓침.

**체크:** 서버 로그에 "핸드셰이크 완료"가 있는데 테스트가 타임아웃 → 레이스 컨디션

**수정:** `/events` 핸들러에 `isReady()` 체크 추가:
```typescript
app.get('/events', (req, res) => {
  clients.add(res);
  sendSSEEvent(res, 'connected', {});
  if (bridge.isReady()) {
    sendSSEEvent(res, 'agent-ready', { message: '준비됨' });
  }
});
```

---

## A04 — Claude Code OAuth 토큰 (sk-ant-oat01-) Anthropic API 사용법
**날짜:** 2026-03-14
**증상:** `ANTHROPIC_API_KEY=sk-ant-oat01-...` → `"invalid x-api-key"` 에러
**원인:** `oat01` 토큰은 REST API의 `x-api-key` 헤더가 아닌 OAuth Bearer 방식 필요
**수정:** cc-proxy를 통해 헤더 변환
```
클라이언트: x-api-key: any
cc-proxy: Authorization: Bearer sk-ant-oat01-...
          anthropic-beta: claude-code-20250219,oauth-2025-04-20,...
          user-agent: claude-cli/2.1.62
          x-app: cli
```
**검증:** T4.1~T4.3 통과 (2026-03-14)

## A05 — Docker 컨테이너에서 호스트 cc-proxy 접근
**날짜:** 2026-03-14
**증상:** 컨테이너에서 `ANTHROPIC_BASE_URL` 미설정 → cline이 api.anthropic.com 직접 호출
**수정:** `docker-compose.yml`에 환경변수 추가:
```yaml
environment:
  - ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-}
```
`.env`: `ANTHROPIC_BASE_URL=http://172.17.0.1:8787` (Docker bridge IP)
**확인:** `docker exec <container> env | grep ANTHROPIC_BASE_URL`
