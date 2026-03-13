---
name: product
description: ACP 브릿지 서버 + React 채팅 UI (HTTP SSE). claude-agent-acp를 SSE+HTTP POST로 연결하는 개발 에이전트 UI. 요구사항/설계 시 로드.
---

## 제품 목적
claude-agent-acp(ACP 코딩 에이전트)를 HTTP SSE + POST로 연결하고, React 채팅 UI를 통해 사용자가 에이전트와 인터랙션하는 개발 에이전트 플랫폼 PoC.

## 핵심 기능
- ACP 에이전트 프로세스 관리 (spawn/kill)
- ACP 메시지 → SSE 스트림 브릿지
- 실시간 스트리밍 채팅 UI
- Human-in-the-Loop: POST /permission으로 승인/거부
- 툴콜 로그 표시

## 타겟 사용자
개발 에이전트 플랫폼을 구축하려는 개발자

## 핵심 제약
- HTTP SSE (서버→클라이언트), HTTP POST (클라이언트→서버)
- 방화벽 친화적 (순수 HTTP)
- EventSource 자동 재연결 활용
- Docker로 실행 가능
