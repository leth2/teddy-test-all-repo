# 🤖 Claude Code Agent Teams — File-based IPC Demo

> Claude Code의 에이전트 팀 기능이 내부적으로 어떻게 동작하는지 시각적으로 보여주는 인터랙티브 데모

## 배경

Claude Code v2.1+ 에는 **Agent Teams** 기능이 있습니다. 여러 Claude 인스턴스가 팀으로 협업하는데, 놀랍게도 통신 방식은 WebSocket이나 HTTP가 아닌 **순수 파일 기반 IPC(Inter-Process Communication)** 입니다.

이 프로젝트는 소스코드 역공학을 통해 밝혀낸 Claude Code의 실제 통신 패턴을 재현합니다.

## 핵심 발견

### 📁 파일 기반 Mailbox 시스템

```
~/.claude/teams/{team-name}/
├── config.json                 # 팀 설정 (멤버 목록)
├── inboxes/
│   ├── lead.json               # Lead의 수신함
│   ├── researcher.json         # Researcher의 수신함
│   ├── developer.json          # Developer의 수신함
│   └── reviewer.json           # Reviewer의 수신함
└── tasks/
    ├── 1.json                  # 태스크 #1
    ├── 2.json                  # 태스크 #2
    └── 3.json                  # 태스크 #3
```

### 📨 통신 방식

- **메시지 전송** = 상대방의 inbox JSON 파일에 append
- **메시지 수신** = 자기 inbox에서 `read: false` 필터
- **동시성 제어** = `.lock` 파일 기반 (retry 10회, 5~100ms timeout)
- **폴링 주기** = Claude의 API 턴 자체가 폴링 (매 응답마다 inbox 확인)
- **메시지 형식** = XML 태그로 시스템 프롬프트에 주입

```xml
<teammate-message teammate_id="researcher" color="#4A9EE0">
  📊 조사 완료! MVP 기능: CRUD + 우선순위 + 마감일
</teammate-message>
```

### 🔒 파일 락킹 패턴

```javascript
// Claude Code의 실제 락 설정 (소스에서 추출)
{ retries: 10, minTimeout: 5, maxTimeout: 100 }
```

- `.lock` 파일 생성 = 락 획득
- `.lock` 파일 삭제 = 락 해제
- 충돌 시 랜덤 대기 후 재시도

### 📋 태스크 Claim 메커니즘

```
1. 팀원이 태스크 파일 락 획득
2. 태스크 JSON 읽기
3. owner 필드 확인 (이미 claim됐으면 실패)
4. owner = 자기 이름, status = in_progress 쓰기
5. 락 해제
```

## 실행

```bash
npm install
npm start
# → http://localhost:3333
```

## 화면 구성

| 영역 | 내용 |
|------|------|
| **왼쪽** | 📂 파일 시스템 실시간 뷰 — 파일 생성/수정을 실시간으로 관찰 |
| **중앙** | 🤖 에이전트 카드 4개 — 각자의 inbox 메시지 표시 |
| **오른쪽 상단** | 📋 공유 태스크 리스트 — pending → in_progress → completed |
| **오른쪽 하단** | 📡 이벤트 로그 — 모든 IPC 이벤트 타임라인 |

파일 이름을 클릭하면 실제 JSON 내용을 확인할 수 있습니다.

## 시나리오: "할 일 관리 앱 설계"

**▶ 시나리오 시작** 버튼을 누르면:

1. 🎯 **Lead** — 팀 구성, 태스크 3개 생성, 팀원에게 분배
2. 🔍 **Researcher** — 기존 Todo 앱 사례 조사 → 결과 보고
3. 🛠️ **Developer** — Boilerplate 준비 → API 스키마 설계
4. 📝 **Reviewer** — 코드 리뷰 기준 작성
5. 팀원 간 **직접 메시지** 교환 (Developer ↔ Reviewer)
6. Lead가 **결과 종합** → 완료

## 기술 스택

- **Backend**: Node.js + Express + WebSocket (UI 업데이트용)
- **Frontend**: Vanilla HTML/CSS/JS (프레임워크 없음)
- **IPC**: 순수 파일 I/O (JSON 파일 + 파일 락킹) — Claude Code 패턴 그대로

## 역공학 방법

Claude Code v2.1.77의 번들 파일(`cli.js`, 12MB)을 분석:

```bash
# 내부 코드네임: tengu (天狗)
grep -oP '"tengu_team[^"]*"' cli.js | sort -u

# Mailbox 함수들
grep -oP 'writeToMailbox|readMailbox|readUnreadMessages' cli.js

# 태스크 도구
grep -oP '"(TaskCreate|TaskList|TaskGet|TaskUpdate)"' cli.js
```

## 참고

- [Claude Code Agent Teams 공식 문서](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Subagents 공식 문서](https://code.claude.com/docs/en/sub-agents)

## 라이선스

MIT — 교육/학습 목적으로 자유롭게 사용하세요.
