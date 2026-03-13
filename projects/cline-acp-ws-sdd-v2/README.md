# Cline ACP WebSocket Bridge (v2)

> ACP(Agent Client Protocol) 에이전트를 WebSocket으로 연결하는 채팅 UI PoC  
> SDD v2 개선된 도구 적용 — 외부 스펙 참조 및 검증 프로세스 포함

## 개선사항 (v2 vs v1)

- ✅ **정확한 ACP 메서드명**: `session/new`, `session/prompt` (v1의 추정 메서드명 수정)
- ✅ **올바른 핸드셰이크**: `initialize` → `session/new` → `session/prompt`
- ✅ **알림 처리**: `session/update`는 id 없는 JSON-RPC Notification
- ✅ **권한 요청**: `session/request_permission`은 id 있는 Request (options 배열)
- ✅ **readline 파싱**: stdout 줄 단위 파싱 명시
- ✅ **검증 프로세스**: Requirements/Design/Tasks/Impl 단계별 검증

## 아키텍처

```
사용자 → React UI (5173) ↔ WebSocket ↔ WS Server (3001) ↔ stdio ↔ claude-agent-acp
```

## ACP 프로토콜 시퀀스

```
1. Client → Agent: initialize (id:0)
2. Agent → Client: initialize response
3. Client → Agent: session/new (id:1, cwd)
4. Agent → Client: session/new response (sessionId)
5. Client → Agent: session/prompt (id:N, sessionId, prompt)
6. Agent → Client: session/update notifications (id 없음)
7. Agent → Client: session/prompt response (stopReason)
```

## 실행 방법

```bash
# 환경변수 설정
export ANTHROPIC_API_KEY=sk-...

# 전체 실행
docker-compose up

# 접속
# UI: http://localhost:5173
# WS: ws://localhost:3001
```

## 개발 환경

```bash
# Agent
cd agent
npm install
npm run dev

# UI
cd ui
npm install
npm run dev
```

## 기술 스택

- **Backend**: Node.js + TypeScript, ws 라이브러리
- **ACP 에이전트**: `claude-agent-acp` (npx)
- **Frontend**: React 19 + TypeScript + Vite
- **테스트**: Vitest
- **컨테이너**: Docker Compose

## 스펙 참조

- ACP 공식 문서: https://agentclientprotocol.com/
- 스펙 파일: `.sdd/specs/1773368794-cline-acp-ws-v2/references/acp-protocol.md`
