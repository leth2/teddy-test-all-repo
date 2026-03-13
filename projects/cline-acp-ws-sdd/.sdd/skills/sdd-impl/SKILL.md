---
name: sdd-impl
description: TDD 구현. tasks.md의 태스크를 Red-Green-Refactor 사이클로 구현. 스티어링 가드레일 준수. spec-impl 커맨드에서 사용.
allowed-tools: Bash Read Write Edit MultiEdit Grep Glob LS WebFetch WebSearch
---

# TDD 구현

## 준비 단계

1. `.sdd/specs/$FEATURE/` 전체 읽기 (spec.json, requirements.md, design.md, tasks.md)
2. `.sdd/steering/` 전체 읽기 — **구현 전반의 가드레일**:
   - `tech`: 사용할 언어/프레임워크/라이브러리 기준
   - `structure`: 파일 위치, 네이밍 규칙 기준
   - **스티어링과 충돌하는 구현 선택 금지**
3. 실행할 태스크 결정:
   - task-numbers 지정 시 해당 태스크만 (예: "1.1" 또는 "1,2,3")
   - 없으면 미완료 태스크 순서대로

## Red-Green-Refactor 사이클

### 🔴 Red — 실패하는 테스트 먼저
1. 태스크의 수락 기준(AC) 읽기
2. AC를 테스트 코드로 번역
3. 테스트 실행 → **반드시 실패 확인**
4. 실패 이유가 "구현 없음"인지 확인 (컴파일 오류 아님)

### 🟢 Green — 최소한의 통과 코드
1. 테스트를 통과시키는 **최소한의 코드**만 작성
2. 과도한 엔지니어링 금지
3. 테스트 실행 → 통과 확인
4. 기존 테스트 회귀 없음 확인

### 🔵 Refactor — 정리
1. 중복 제거
2. 네이밍 개선
3. 구조 정리
4. **모든 테스트 통과 유지**

## 체크포인트 (각 태스크 완료 시)

- `tasks.md`의 해당 항목 `[ ]` → `[x]` 업데이트
- 로그에 완료 타임스탬프 기록

## 완료 기준

태스크 완료 = 다음 모두 충족:
- 모든 AC 테스트 통과
- 기존 테스트 회귀 없음
- tasks.md 업데이트됨
- 로그에 기록됨

## 오류 처리 (자율 모드)

→ `references/tdd-protocol.md` 참조

## 진행 로그 형식

```
[HH:MM] 🔴 태스크 N.M 테스트 작성
[HH:MM] 🟢 태스크 N.M 구현 완료 (테스트 통과)
[HH:MM] 🔵 태스크 N.M 리팩토링 완료
[HH:MM] ✅ 태스크 N.M 완료
[HH:MM] ⚠️ 태스크 N.M 오류: <내용> — 재시도 1/3
[HH:MM] ❌ 태스크 N.M 실패: <내용> — 스킵
```
