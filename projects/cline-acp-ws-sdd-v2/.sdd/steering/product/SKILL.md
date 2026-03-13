---
name: product
description: ACP 브릿지 서버 + React 채팅 UI (WebSocket). claude-agent-acp를 WebSocket으로 연결하는 개발 에이전트 UI. 요구사항/설계 시 로드. (v2: 개선된 SDD 도구 적용, 외부 스펙 참조 및 검증 프로세스 포함)
---

## 제품 목적
claude-agent-acp(ACP 코딩 에이전트)를 WebSocket으로 연결하고, React 채팅 UI를 통해 사용자가 에이전트와 인터랙션하는 개발 에이전트 플랫폼 PoC.

## 핵심 기능
- ACP 에이전트 프로세스 관리 (spawn/kill)
- ACP 메시지 ↔ WebSocket 브릿지
- 실시간 스트리밍 채팅 UI
- Human-in-the-Loop: 파일 쓰기/삭제 권한 승인/거부 다이얼로그
- 툴콜 로그 표시

## 타겟 사용자
개발 에이전트 플랫폼을 구축하려는 개발자

## 핵심 제약
- WebSocket 기반 실시간 통신
- 단일 세션 (WebSocket 1개 = 에이전트 프로세스 1개)
- Docker로 실행 가능
