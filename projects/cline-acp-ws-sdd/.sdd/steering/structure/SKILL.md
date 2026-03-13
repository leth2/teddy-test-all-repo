---
name: structure
description: 구조 스티어링. 구현 시 가드레일로 로드.
---

## 폴더 구조
- /agent: Node.js 브릿지 서버
  - src/bridge.ts: ACP 프로세스 관리
  - src/server.ts: WebSocket 서버
- /ui: React 채팅 UI
  - src/hooks/useChat.ts
  - src/components/: MessageList, ChatPanel, PermissionDialog, ToolCallLog

## 네이밍
- 파일: camelCase .ts/.tsx
- 컴포넌트: PascalCase
