---
name: structure
description: 구조 스티어링. 구현 시 가드레일로 로드.
---

## 폴더 구조
- /agent: Node.js Express SSE 서버
  - src/bridge.ts: ACP 프로세스 관리
  - src/server.ts: Express + SSE 엔드포인트
- /ui: React 채팅 UI
  - src/hooks/useChat.ts (EventSource 사용)
  - src/components/: MessageList, ChatPanel, PermissionDialog, ToolCallLog

## 네이밍
- 파일: camelCase .ts/.tsx
- 컴포넌트: PascalCase
