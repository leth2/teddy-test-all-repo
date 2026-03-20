# cc-auto-yes

Claude Code TUI 프롬프트에서 자동으로 **Yes** 를 선택해주는 PTY 래퍼 스크립트.

## 배경

Claude Code를 24시간 무인 실행할 때, 중간에 Yes/No 선택 프롬프트가 나오면 멈춰버리는 문제가 있다.
이 스크립트는 PTY(pseudo-terminal)로 출력을 감시하다가 Yes/No 프롬프트가 감지되면 자동으로 Yes를 선택한다.

## 지원 패턴

| 패턴 | 형식 | 처리 방법 |
|------|------|-----------|
| TUI - Yes 이미 선택됨 | `❯ Yes` | Enter |
| TUI - No 선택됨 | `❯ No` | ↑ 화살표 → Enter |
| 텍스트 - Y가 기본값 | `[Y/n]` | Enter |
| 텍스트 - N이 기본값 | `[y/N]` | `y` 입력 → Enter |

## 사용법

```bash
# 실행 권한 부여
chmod +x auto_yes_claude.py

# 기본 실행 (claude 명령어를 감싸서 실행)
./auto_yes_claude.py

# claude 옵션 전달
./auto_yes_claude.py --model claude-opus-4-5

# 특정 작업과 함께
./auto_yes_claude.py --task "리팩토링 진행해줘"
```

## 주의사항

- `--dangerously-skip-permissions` 플래그와 함께 쓰면 대부분의 프롬프트가 사전에 차단됨
- 이 스크립트는 그래도 남는 Yes/No 프롬프트를 커버하는 용도
- 무인 실행 시에는 격리된 환경(Docker, VM 등)에서 사용 권장
- Python 3.x 필요 (표준 라이브러리만 사용, 별도 설치 불필요)

## 스택

- Python 3
- `pty`, `os`, `select` (표준 라이브러리)

## 관련

- [Claude Code 공식 문서](https://docs.anthropic.com/claude-code)
- `--dangerously-skip-permissions` 플래그로 더 많은 프롬프트 스킵 가능
