# iterm2-auto-yes

이미 실행 중인 iTerm2 세션에서 Claude Code의 Yes/No 프롬프트를 **자동으로 Yes 선택**하는 백그라운드 감시 스크립트.

## 기존 방식과 차이

| 방식 | 이미 실행 중인 세션 | 설명 |
|------|------------------|------|
| PTY 래퍼 (`cc-auto-yes`) | ❌ | Claude Code를 감싸서 시작해야 함 |
| iTerm2 Triggers | ⚠️ | 텍스트 매칭 불안정 (escape code 혼입) |
| **이 스크립트** | ✅ | 외부에서 화면 감시 → 키 주입 |

## 동작 방식

```
[이 스크립트] ──AppleScript──▶ [iTerm2 화면 읽기]
                                      │
                               Yes/No 패턴 감지?
                                      │
              ◀──System Events──── 키 이벤트 주입
```

1. AppleScript로 iTerm2 세션 화면 텍스트를 주기적으로 읽음
2. Yes/No 패턴 감지
3. AppleScript / System Events로 키 입력 전송

## 요구사항

- macOS
- iTerm2
- Python 3 (표준 라이브러리만 사용)
- **손쉬운 사용 권한** 필요:
  `시스템 설정 → 개인 정보 보호 및 보안 → 손쉬운 사용`에서 터미널 또는 iTerm2 허용

## 사용법

```bash
# 기본 실행 (window 1, tab 1 감시)
python3 auto_yes_iterm2.py

# 특정 윈도우/탭 지정
python3 auto_yes_iterm2.py --window 2 --tab 1

# 감시 주기 조정 (기본 0.5초)
python3 auto_yes_iterm2.py --interval 0.3

# dry-run: 실제 키 입력 없이 감지만 확인
python3 auto_yes_iterm2.py --dry-run
```

## 실행 예시

```
[19:42:01] 감시 시작 — iTerm2 window=1 tab=1 interval=0.5s
[19:42:01] 중단: Ctrl+C

[19:43:15] 감지: YES_SELECTED → Enter
[19:44:02] 감지: NO_SELECTED → ↑ + Enter
[19:44:50] 감지: [Y/n] → Enter
```

## 감지 패턴

| 패턴 | 처리 |
|------|------|
| `❯ Yes` (Yes가 선택됨) | Enter |
| `❯ No` (No가 선택됨) | ↑ 화살표 → Enter |
| `[Y/n]` | Enter |
| `[y/N]` | `y` 입력 → Enter |
| Yes/No 목록 (선택 표시 없음) | Enter (Yes 기본값 가정) |

## 주의사항

- **다른 창에서 실행 권장**: Claude Code가 돌고 있는 탭과 다른 터미널 창에서 실행
- `--dry-run`으로 먼저 패턴 감지 확인 후 실제 실행
- 손쉬운 사용 권한 없으면 키 이벤트 주입이 안 됨
- `--window`, `--tab` 번호는 iTerm2 내 순서 기준

## 관련 프로젝트

- [`cc-auto-yes`](../cc-auto-yes) — PTY 기반 래퍼 (새로 시작하는 경우용)
