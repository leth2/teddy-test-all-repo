# cc-proxy Tasks

## T1. 프로젝트 셋업

- [ ] T1.1 디렉토리 생성 (`test-all/projects/cc-proxy/`)
- [ ] T1.2 `package.json` (ESM, TypeScript)
- [ ] T1.3 `tsconfig.json`
- [ ] T1.4 `.env.example`, `.gitignore`
- [ ] T1.5 의존성 설치 (`@anthropic-ai/sdk`, `express`, `@types/*`)

## T2. AnthropicOAuthClient

- [ ] T2.1 `CLAUDE_CODE_TOKEN` 환경변수 로드 및 검증
- [ ] T2.2 `@anthropic-ai/sdk` 초기화 (`authToken` 방식)
- [ ] T2.3 필수 헤더 설정 (beta, user-agent, x-app)
- [ ] T2.4 system prompt "You are Claude Code..." 자동 주입

## T3. ProxyServer

- [ ] T3.1 Express 서버 기본 설정 (포트, JSON 파싱)
- [ ] T3.2 `POST /v1/messages` 엔드포인트
  - [ ] T3.2a 요청 바디 파싱
  - [ ] T3.2b stream=true: SSE 스트리밍 패스스루
  - [ ] T3.2c stream=false: 단일 JSON 응답
- [ ] T3.3 `GET /health` 엔드포인트
- [ ] T3.4 에러 처리 (4xx, 5xx → 클라이언트에 그대로 전달)

## T4. 검증

- [x] T4.1 `curl` 단순 호출 테스트 — PASS ✅
- [x] T4.2 `stream: true` 스트리밍 테스트 — PASS ✅
- [x] T4.3 cline + cc-proxy E2E — PASS ✅ (Quinn, Pi 2)
  - `[bridge] sessionUpdate: agent_message_chunk "1+1 = 2"` 수신 확인

## 완료 기준 — 모두 달성 🎉

- `POST /v1/messages`로 Claude 응답 수신 ✅
- `stream: true` SSE 스트리밍 동작 ✅
- Quinn이 `ANTHROPIC_BASE_URL=http://192.168.50.41:8787`로 cline E2E 통과 ✅

## 완료일: 2026-03-14
