#!/usr/bin/env python3
"""
cc-auto-yes: Claude Code TUI 프롬프트 자동 Yes 선택기

Claude Code 실행 중 나타나는 Yes/No 선택 프롬프트에서
자동으로 Yes를 선택해주는 PTY 래퍼 스크립트.

지원 패턴:
- [Y/n] 형식 텍스트 프롬프트
- [y/N] 형식 텍스트 프롬프트
- TUI 화살표 선택 (❯ Yes / ❯ No 형식)
- Yes가 아래 있을 경우 위쪽 화살표로 이동 후 선택

사용법:
    chmod +x auto_yes_claude.py
    ./auto_yes_claude.py [claude 옵션들...]
    ./auto_yes_claude.py --model claude-opus-4-5 --task "..."
"""

import pty
import os
import sys
import re
import select
import time


# Yes 가 이미 선택된 상태 (그냥 Enter)
YES_SELECTED_PATTERN = re.compile(r'❯\s*Yes', re.IGNORECASE)

# No 가 선택된 상태 (위쪽 화살표로 Yes로 이동 필요)
NO_SELECTED_PATTERN = re.compile(r'❯\s*No', re.IGNORECASE)

# 텍스트 기반 [Y/n] 형식
YES_DEFAULT_PATTERN = re.compile(r'\[Y/n\]', re.IGNORECASE)

# 텍스트 기반 [y/N] 형식 (소문자 y를 보내야 함)
NO_DEFAULT_PATTERN = re.compile(r'\[y/N\]', re.IGNORECASE)

# Yes/No 선택지 목록이 있는 경우 (Yes가 위)
YES_ABOVE_NO_PATTERN = re.compile(r'Yes.*\n.*No', re.DOTALL | re.IGNORECASE)

# 버퍼 최대 크기 (바이트)
BUFFER_MAX = 4096

# 응답 전 대기 시간 (초) - TUI 렌더링 완료 대기
RESPONSE_DELAY = 0.15


def handle_prompt(master_fd: int, text: str) -> bool:
    """
    현재 버퍼 텍스트를 분석하고 Yes 자동 선택.
    처리했으면 True 반환.
    """

    # 케이스 1: Yes 가 이미 선택(❯)되어 있음 → Enter
    if YES_SELECTED_PATTERN.search(text):
        time.sleep(RESPONSE_DELAY)
        os.write(master_fd, b'\r')
        return True

    # 케이스 2: No 가 선택(❯)되어 있음 → 위쪽 화살표 → Enter
    if NO_SELECTED_PATTERN.search(text):
        time.sleep(RESPONSE_DELAY)
        os.write(master_fd, b'\x1b[A')  # ↑ 화살표
        time.sleep(0.05)
        os.write(master_fd, b'\r')
        return True

    # 케이스 3: [Y/n] 형식 → 그냥 Enter (Y가 기본값)
    if YES_DEFAULT_PATTERN.search(text):
        time.sleep(RESPONSE_DELAY)
        os.write(master_fd, b'\r')
        return True

    # 케이스 4: [y/N] 형식 → 'y' 전송
    if NO_DEFAULT_PATTERN.search(text):
        time.sleep(RESPONSE_DELAY)
        os.write(master_fd, b'y\r')
        return True

    return False


def main():
    args = sys.argv[1:]
    cmd = ['claude'] + args if args else ['claude']

    master_fd, slave_fd = pty.openpty()
    pid = os.fork()

    if pid == 0:
        # 자식 프로세스: claude 실행
        os.setsid()
        os.dup2(slave_fd, 0)
        os.dup2(slave_fd, 1)
        os.dup2(slave_fd, 2)
        os.close(master_fd)
        os.close(slave_fd)
        os.execvp(cmd[0], cmd)
        sys.exit(1)

    # 부모 프로세스: 출력 감시
    os.close(slave_fd)
    buffer = b''

    try:
        while True:
            try:
                r, _, _ = select.select([master_fd, sys.stdin.fileno()], [], [], 0.05)
            except (ValueError, OSError):
                break

            if master_fd in r:
                try:
                    data = os.read(master_fd, 1024)
                except OSError:
                    break

                if not data:
                    break

                buffer = (buffer + data)[-BUFFER_MAX:]
                os.write(sys.stdout.fileno(), data)

                text = buffer.decode('utf-8', errors='ignore')
                if handle_prompt(master_fd, text):
                    buffer = b''

            if sys.stdin.fileno() in r:
                try:
                    user_input = os.read(sys.stdin.fileno(), 1024)
                    os.write(master_fd, user_input)
                except OSError:
                    break

    finally:
        os.close(master_fd)
        os.waitpid(pid, 0)


if __name__ == '__main__':
    main()
