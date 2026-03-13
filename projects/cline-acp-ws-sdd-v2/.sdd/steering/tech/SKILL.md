---
name: tech
description: 기술 스티어링. 설계/구현 시 가드레일로 로드.
---

## 기술 스택
- Backend: Node.js + TypeScript, ws 라이브러리 (WebSocket 서버)
- ACP 연동: @agentclientprotocol/sdk, claude-agent-acp (npx로 실행)
- Frontend: React 19 + TypeScript + Vite (포트 5173)
- 서버 포트: 3001
- 테스트: Vitest
- 컨테이너: Docker (node:20-alpine)

## 주요 결정
- WebSocket: 양방향 실시간 통신
- stdio: ACP 에이전트와 통신 방식
- 브릿지 패턴: WebSocket ↔ ACP stdio 변환
