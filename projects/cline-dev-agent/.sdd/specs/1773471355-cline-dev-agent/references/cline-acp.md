# Cline CLI ACP 참조

출처: https://docs.cline.bot/cline-cli/acp-editor-integrations

## ACP 시작

```bash
npm i -g cline
cline auth          # OAuth 인증
cline --acp         # ACP 모드 시작 (stdio JSON-RPC)
```

## ACP 특징

- JSON-RPC 2.0 via stdio
- 동일한 ACP 프로토콜: initialize → session/new → session/prompt
- 인증: ~/.cline 디렉토리 (cline auth 실행 후)
- 전체 Cline 기능: Skills, Hooks, MCP integrations

## ACP 설정 예 (JetBrains)

```json
{
  "agent_servers": {
    "Cline": {
      "command": "cline",
      "args": ["--acp"],
      "env": {}
    }
  }
}
```

## 브릿지 패턴

```
클라이언트 (React UI)
  ↕ HTTP + SSE
서버 (Express)
  ↕ stdio JSON-RPC
cline --acp (ACP 에이전트)
```

## 인증 방법

- `cline auth` 실행 → ~/.cline/ 에 인증 정보 저장
- Docker: ~/.cline:/root/.cline:ro 볼륨 마운트
- 또는 ANTHROPIC_API_KEY 환경변수 (cline이 지원하는 경우 확인 필요)
