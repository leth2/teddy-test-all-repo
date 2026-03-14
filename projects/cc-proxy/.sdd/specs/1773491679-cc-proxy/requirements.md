# cc-proxy Requirements

## 목적

Claude Code OAuth 토큰(`sk-ant-oat01-`)을 일반 Anthropic REST API 키처럼 사용할 수 있게 해주는 로컬 프록시 서버.
Anthropic API 키를 요구하는 모든 도구(cline, CodeSpeak, 기타)에서 Claude Code 토큰 하나로 동작 가능하게 한다.

## 사용 시나리오

```bash
# 어떤 도구든 이렇게 설정하면 동작
export ANTHROPIC_API_KEY="dummy-key"
export ANTHROPIC_BASE_URL="http://localhost:8787"

codespeak build     # Claude Code 토큰으로 실행
cline ...           # Claude Code 토큰으로 실행
```

## 기능 요구사항

### FR-1: Anthropic API 호환 엔드포인트

- `POST /v1/messages` — Anthropic Messages API 스펙 준수
- 요청/응답 포맷이 기존 Anthropic REST API와 동일
- `x-api-key` 또는 `Authorization: Bearer` 헤더 수신 (무시 또는 검증)

### FR-2: Claude Code 백엔드 연동

- Claude Code CLI (`claude`) 를 백엔드로 사용
- `CLAUDE_CODE_TOKEN` 환경변수로 토큰 주입
- Claude Code ACP(stdio) 방식으로 실제 요청 처리

### FR-3: 스트리밍 지원

- Anthropic의 Server-Sent Events(SSE) 스트리밍 포맷 지원
- `stream: true` 요청 시 SSE로 응답
- `stream: false` 요청 시 단일 JSON 응답

### FR-4: 멀티 클라이언트

- 여러 도구가 동시에 프록시에 접속 가능
- 요청별 독립 세션 처리

### FR-5: 설정 및 실행

- 단일 명령으로 실행: `npx cc-proxy` 또는 `cc-proxy start`
- 포트 설정 가능 (기본: 8787)
- `.env` 파일로 토큰 관리

## 비기능 요구사항

- Node.js 기반 (Claude Code 환경과 동일)
- 로컬 전용 (외부 노출 불필요)
- 응답 지연 최소화 (ACP 방식 우선)
- 설치 없이 `npx` 실행 가능 (장기 목표)

## 제약

- Claude Code CLI (`claude`) 가 설치되어 있어야 함
- Pi 1 (ARM64, Node.js v22) 환경 기준
- API 키 검증 없음 (로컬 전용이므로)
