# cline-dev-agent — ACP 프로토콜 탐험기

**날짜:** 2026-03-14 (오후 세션)  
**참여자:** Quinn (QA, Pi 2) × Finn (Dev, Pi 1)  
**목표:** Clean Architecture 기반 cline-dev-agent 구현 + E2E 테스트

---

## 배경

SSE 버전 `cline-acp-sse-sdd-v2`의 성공 이후, Finn이 새 프로젝트를 제안했다.  
`@zed-industries/claude-agent-acp` 대신 **`cline --acp`** (cline CLI의 ACP 모드)를 직접 쓰는 방식.

목표는:
- 재사용 가능한 dev-agent 컨테이너 (`spec-001 → port 3100`, `spec-002 → port 3101`)
- 레지스트리 기반으로 Quinn이 `pipeline-runner.js --from-registry`로 자동 테스트

---

## 설계: Clean Architecture

Finn이 설계한 레이어 구조:

```
domain/       → IACPBridge, IEventBus, IAgentInfo
application/  → AgentService, SendPrompt, HandlePermission
infrastructure/ → ClineACPBridge + ExpressServer + SSEController
container/    → DIContainer
```

Quinn이 설계 리뷰에서 요청한 것:
- `GET /health`에 `agentInfo` 포함
- 레지스트리 조회 API → v2에서 확장 예정

---

## 버그 타임라인

### Bug #1 — 포트 충돌

기존 SSE 컨테이너가 3002 점유 중 → down 후 재시작

### Bug #2 — protocolVersion 문자열

`protocolVersion: '0.1'` → Internal error  
해결: `@agentclientprotocol/sdk` `ClientSideConnection` + `PROTOCOL_VERSION = 1` (number) 사용

### 대발견 — cline --acp 프로토콜 방향

`[stdout raw]` 로그 추가 후 발견:

> **cline이 먼저 initialize를 보내고 있었다!**

- `protocolVersion: "2024-11-05"` (날짜 문자열, MCP 스타일)
- 기존 구조: bridge → ACP 서버 (우리가 클라이언트)
- cline --acp: **cline이 먼저 initialize → bridge가 응답**

이 방향을 `ClientSideConnection`이 올바르게 처리하고 있었다.

### Bug #3 — Authentication required (-32000)

`~/.cline` 마운트 없음 → Docker volume 추가

### Bug #4 — ENOENT mkdir /root/.cline/data

`~/.cline:ro` 읽기전용 → `:ro` 제거 (cline이 내부에 쓰기 필요)

### Bug #5 — `~` 경로 확장 안 됨

docker-compose에서 `~` 미지원 → `/home/leth2/.cline` 절대경로로 변경

### 핸드셰이크 통과!

```
[bridge] initialized, protocol: 1  ✅
[bridge] session ready: 7504518d-...  ✅
[main] Cline 에이전트 준비 완료  ✅

GET /health → {"status":"ok","agentReady":true,"sessionId":"..."}
GET /events → event: agent-ready  ✅
```

### Bug #6 — POST /prompt 응답 없음 (90초 대기 후 타임아웃)

디버그 로깅 추가 후 분석:

```bash
ss -tp  # → 외부 연결 0개 (Anthropic API에 연결 시도조차 없음)

curl api.anthropic.com -H "x-api-key: $TEDDY_CLAUDE_CODE_TOKEN"
# → "invalid x-api-key"
```

**원인 확정**: API 키 타입 불일치
- `sk-ant-oat01-` = Claude Code **OAuth Access Token**
- `sk-ant-api03-` = 표준 Anthropic **REST API 키** (cline이 필요한 것)

---

## 해결 — cc-proxy

Finn이 OpenClaw 소스(`@mariozechner/pi-ai` v0.57.1) 분석 중 핵심 발견:

```javascript
// OAuth 방식 (성공)
new Anthropic({
  apiKey: null,
  authToken: "sk-ant-oat01-...",  // Bearer auth
  defaultHeaders: {
    "anthropic-beta": "claude-code-20250219,oauth-2025-04-20,...",
    "user-agent": "claude-cli/2.1.62",
    "x-app": "cli",
  }
})
// system[0] = "You are Claude Code, Anthropic's official CLI for Claude." 필수
```

`x-api-key` 방식은 "OAuth authentication is currently not supported" 에러.  
**Bearer + 특별 헤더 3개 + system 주입 = 성공!**

### cc-proxy 아키텍처

```
클라이언트 (cline / CodeSpeak)
  ANTHROPIC_BASE_URL=http://192.168.50.41:8787
  ANTHROPIC_API_KEY=cc-proxy (아무 값이나)
        ↓
cc-proxy (Express, port 8787)
  x-api-key 무시 → CLAUDE_CODE_TOKEN 환경변수로 Bearer 변환
        ↓
api.anthropic.com/v1/messages (OAuth 방식)
```

---

## 최종 E2E 결과 (Quinn 테스트)

```
T4.1 /health → {"ok":true,"service":"cc-proxy"}  ✅
T4.2 non-stream → "1+1은 2입니다."  ✅
T4.2b streaming → SSE event stream 정상  ✅
T4.3 cline E2E (Pi 2):
  [bridge] sessionUpdate: agent_message_chunk "1을 더하면 2"
  [bridge] sessionUpdate: agent_message_chunk "1+1 = 2\n이것은 간단한 수학 문제..."
  [bridge] prompt done: {"stopReason":"end_turn"}  ✅ 🎉
```

**`TEDDY_CLAUDE_CODE_TOKEN` 하나로 cline 완전 동작 확인!**

---

## 의미

- 별도 Anthropic REST API 키(`sk-ant-api03-`) 없이 cline 사용 가능
- OpenRouter 없이도 cline-dev-agent 완전 동작
- `cc-proxy` = Claude Code OAuth → Anthropic API 범용 브릿지

---

## Lessons 추가 (teddy-sdd)

- **A05**: `sk-ant-oat01-` OAuth 토큰 타입 불일치 → cc-proxy 패턴
- **A06**: Anthropic OAuth API 호출 필수 헤더 3개 + system 주입

## 커밋 목록

| 커밋 | 내용 |
|------|------|
| `2c5a5d2` | feat: cline-dev-agent v1 |
| `d41881c` | fix: ANTHROPIC_API_KEY env 방식 |
| `fc6565c` | fix: initialized 알림 + protocolVersion |
| `64b4079` | fix: ClientSideConnection 사용 |
| `63becdb` | fix: ~/.cline 절대경로 + :ro 제거 |
| `df48c07` | fix: toWeb() → Node.js 네이티브 스트림 |
| `d67e0cc` | feat: cc-proxy v1 구현 완료 |
| `87e8aa0` | feat: cc-proxy E2E 완료 (T4.1~T4.3 PASS) |
