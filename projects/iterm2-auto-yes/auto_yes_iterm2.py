#!/usr/bin/env python3
"""
iterm2-auto-yes: iTerm2에서 실행 중인 Claude Code Yes/No 프롬프트 자동 선택기

이미 실행 중인 iTerm2 세션을 외부에서 감시하다가
Yes/No 선택지가 감지되면 자동으로 Yes를 선택한다.

방식:
- AppleScript로 iTerm2 현재 세션 화면 텍스트 읽기
- 패턴 감지 후 AppleScript / System Events로 키 이벤트 주입

요구사항:
- macOS
- iTerm2
- 시스템 환경설정 → 개인 정보 보호 → 손쉬운 사용 에서
  터미널(또는 Python/iTerm2) 접근 허용 필요

사용법:
    python3 auto_yes_iterm2.py          # 현재 윈도우 첫 번째 탭 감시
    python3 auto_yes_iterm2.py --window 2 --tab 1  # 특정 윈도우/탭 지정
    python3 auto_yes_iterm2.py --interval 0.5      # 감시 주기(초) 조정
    python3 auto_yes_iterm2.py --dry-run           # 실제 입력 없이 감지만 로그
"""

import subprocess
import time
import re
import sys
import argparse
import datetime


# ── 패턴 정의 ────────────────────────────────────────────────────────────────

# TUI 화살표 선택 패턴 (Claude Code inkl. 한글 프롬프트)
# 지원 형식:
#   ❯ Yes        (화살표 선택)
#   > Yes        (> 선택)
#   >1. Yes      (번호 목록)
#   ❯ 1. Yes
YES_SELECTED   = re.compile(r'[❯>]\s*\d*\.?\s*Yes',  re.IGNORECASE)
NO_SELECTED    = re.compile(r'[❯>]\s*\d*\.?\s*No',   re.IGNORECASE)

# 텍스트 기반 프롬프트
YES_DEFAULT    = re.compile(r'\[Y/n\]',     re.IGNORECASE)
NO_DEFAULT     = re.compile(r'\[y/N\]',     re.IGNORECASE)

# Yes/No 둘 다 있는데 어느 것도 선택 표시 없는 경우 (Yes 먼저 나온 경우)
YES_ABOVE_NO   = re.compile(r'Yes\s*\n\s*No', re.IGNORECASE | re.DOTALL)

# 마지막으로 처리한 스냅샷 (중복 처리 방지)
_last_handled_snapshot = ""


# ── AppleScript 헬퍼 ─────────────────────────────────────────────────────────

def run_applescript(script: str, timeout: int = 5) -> str:
    """AppleScript 실행 후 stdout 반환. 실패시 빈 문자열."""
    try:
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True, text=True, timeout=timeout
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception as e:
        log(f"[AppleScript 오류] {e}")
        return ""


def get_screen_content(window: int = 1, tab: int = 1) -> str:
    """iTerm2 지정 세션의 현재 화면 텍스트 읽기."""
    script = f'''
    tell application "iTerm2"
        tell window {window}
            tell tab {tab}
                tell current session
                    return contents
                end tell
            end tell
        end tell
    end tell
    '''
    return run_applescript(script)


def send_enter(window: int = 1, tab: int = 1):
    """iTerm2 세션에 Enter 전송."""
    script = f'''
    tell application "iTerm2"
        tell window {window}
            tell tab {tab}
                tell current session
                    write text ""
                end tell
            end tell
        end tell
    end tell
    '''
    run_applescript(script)


def send_up_arrow():
    """System Events로 위쪽 화살표 키 전송 (iTerm2 포커스 필요)."""
    script = '''
    tell application "System Events"
        tell process "iTerm2"
            key code 126
        end tell
    end tell
    '''
    run_applescript(script)


def focus_iterm():
    """iTerm2를 포커스 (키 이벤트 전달을 위해)."""
    run_applescript('tell application "iTerm2" to activate')


# ── 로그 ─────────────────────────────────────────────────────────────────────

def log(msg: str):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


# ── 메인 감시 루프 ────────────────────────────────────────────────────────────

def handle_content(content: str, window: int, tab: int, dry_run: bool) -> bool:
    """
    화면 내용을 분석해서 Yes 자동 선택.
    처리했으면 True 반환.
    """
    global _last_handled_snapshot

    # 마지막 줄 기준으로 판단 (프롬프트는 보통 화면 하단)
    recent = content[-1500:]

    # 중복 처리 방지 (같은 스냅샷에서 반복 처리 안 함)
    snapshot_key = recent[-300:]
    if snapshot_key == _last_handled_snapshot:
        return False

    action = None

    if YES_SELECTED.search(recent):
        action = "YES_SELECTED → Enter"
        if not dry_run:
            send_enter(window, tab)

    elif NO_SELECTED.search(recent):
        action = "NO_SELECTED → ↑ + Enter"
        if not dry_run:
            focus_iterm()
            time.sleep(0.1)
            send_up_arrow()
            time.sleep(0.1)
            send_enter(window, tab)

    elif YES_DEFAULT.search(recent):
        action = "[Y/n] → Enter"
        if not dry_run:
            send_enter(window, tab)

    elif NO_DEFAULT.search(recent):
        action = "[y/N] → 'y' + Enter"
        if not dry_run:
            # write text "y"
            script = f'''
            tell application "iTerm2"
                tell window {window}
                    tell tab {tab}
                        tell current session
                            write text "y"
                        end tell
                    end tell
                end tell
            end tell
            '''
            run_applescript(script)

    elif YES_ABOVE_NO.search(recent):
        action = "Yes/No 목록 → Enter (Yes 기본값 가정)"
        if not dry_run:
            send_enter(window, tab)

    if action:
        prefix = "[DRY-RUN] " if dry_run else ""
        log(f"{prefix}감지: {action}")
        _last_handled_snapshot = snapshot_key
        return True

    return False


def watch(window: int = 1, tab: int = 1, interval: float = 0.5, dry_run: bool = False):
    """메인 감시 루프."""
    log(f"감시 시작 — iTerm2 window={window} tab={tab} interval={interval}s")
    if dry_run:
        log("DRY-RUN 모드: 실제 키 입력 없이 감지만 로그합니다")
    log("중단: Ctrl+C")
    print()

    while True:
        try:
            content = get_screen_content(window, tab)
            if content:
                handle_content(content, window, tab, dry_run)
            time.sleep(interval)
        except KeyboardInterrupt:
            log("종료")
            break
        except Exception as e:
            log(f"[오류] {e}")
            time.sleep(interval)


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="iTerm2에서 실행 중인 Claude Code Yes/No 프롬프트 자동 선택"
    )
    parser.add_argument("--window",   type=int,   default=1,   help="iTerm2 윈도우 번호 (기본: 1)")
    parser.add_argument("--tab",      type=int,   default=1,   help="탭 번호 (기본: 1)")
    parser.add_argument("--interval", type=float, default=0.5, help="감시 주기(초) (기본: 0.5)")
    parser.add_argument("--dry-run",  action="store_true",     help="실제 입력 없이 감지만 출력")
    args = parser.parse_args()

    watch(
        window=args.window,
        tab=args.tab,
        interval=args.interval,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
