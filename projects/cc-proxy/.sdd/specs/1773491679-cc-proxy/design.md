# cc-proxy Design

## 아키텍처

```
클라이언트 (cline / CodeSpeak / etc)
  POST /v1/messages  x-api-key: any
       ↓
cc-proxy (Express, port 8787)
  ├── 헤더 변환: x-api-key → Authorization: Bearer <OAuth token>
  ├── beta 헤더 추가
  ├── system prompt 주입 ("You are Claude Code...")
  └── 스트리밍 패스스루 (SSE)
       ↓
api.anthropic.com/v1/messages
  Authorization: Bearer sk-ant-oat01-...
  anthropic-beta: claude-code-20250219,oauth-2025-04-20,...
  user-agent: claude-cli/2.1.62
  x-app: cli
```

## 컴포넌트

### 1. ProxyServer (Express)

- `POST /v1/messages` — 메인 프록시 엔드포인트
- `GET /v1/models` — 모델 목록 (더미 응답, 필요 시)
- `GET /health` — 상태 확인

### 2. AnthropicOAuthClient

- `CLAUDE_CODE_TOKEN` 환경변수에서 토큰 로드
- `@anthropic-ai/sdk` 사용, `authToken` 방식
- 필수 헤더 자동 주입:
  - `anthropic-beta: claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14`
  - `user-agent: claude-cli/2.1.62`
  - `x-app: cli`
- system prompt 첫 항목에 "You are Claude Code..." 주입 (없을 경우)

### 3. StreamingProxy

- `stream: true` 요청 → SSE 패스스루
- `stream: false` 요청 → 단일 JSON 응답

## 환경변수

```bash
CLAUDE_CODE_TOKEN=sk-ant-oat01-...   # 필수: Claude Code OAuth 토큰
PORT=8787                             # 선택: 포트 (기본 8787)
```

## 클라이언트 설정 예시

```bash
# 어떤 도구든 이렇게만 설정
export ANTHROPIC_API_KEY="cc-proxy"           # 아무 값이나 OK
export ANTHROPIC_BASE_URL="http://localhost:8787"
```

## 기술 스택

- Node.js (ESM)
- `@anthropic-ai/sdk` — OAuth 방식 Anthropic 호출
- `express` — HTTP 서버
- TypeScript

## 제약사항

- 로컬 전용 (`127.0.0.1` 바인드)
- 인증 검사 없음 (API 키 값 무시)
- 모델 이름 그대로 전달 (변환 없음)
