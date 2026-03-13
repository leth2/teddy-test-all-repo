---
name: tech
description: 기술 스티어링. 설계/구현 시 가드레일로 로드.
---

## 기술 스택
- Backend: Node.js + TypeScript, Express + cors (SSE 서버)
- ACP 연동: @agentclientprotocol/sdk, claude-agent-acp (npx로 실행)
- Frontend: React 19 + TypeScript + Vite (포트 5174)
- 서버 포트: 3002
- 테스트: Vitest
- 컨테이너: Docker (node:20-alpine)

## 주요 결정
- SSE: GET /events → 서버에서 클라이언트로 스트리밍
- HTTP POST: /prompt, /permission → 클라이언트에서 서버로
- EventSource: 브라우저 내장 자동 재연결
- stdio: ACP 에이전트와 통신 방식
