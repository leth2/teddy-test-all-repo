# Tasks: 메모 CRUD

Feature: `memo-crud`
Created: 2026-03-15

---

## 0. 프로젝트 초기화
> 요구사항: 3.1 | 예상: ~1h

- [x] 0.1 `package.json` 생성 — `npm init`, TypeScript/Jest 의존성 설치
- [x] 0.2 `tsconfig.json` 생성 — strict 모드, outDir: dist, rootDir: src
- [x] 0.3 Jest 설정 — `jest.config.js` + ts-jest 설정, 테스트 경로 `tests/**`
- [x] 0.4 폴더 구조 생성 — `src/memo/`, `tests/memo/`, `data/` 디렉토리

---

## 1. 메모 타입 정의 (P)
> 요구사항: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1 | 예상: ~1h

- [x] 1.1 `src/memo/memo.ts` 작성 — `Memo`, `CreateMemoInput`, `UpdateMemoInput`, `MemoSummary` 인터페이스 정의
- [x] 1.2 `src/memo/errors.ts` 작성 — `ValidationError`, `NotFoundError` 클래스 정의
- [x] 1.3 strict 모드 빌드 확인 — `tsc --noEmit` 오류 0개 ✅

---

## 2. MemoRepository 구현 (P)
> 요구사항: 2.1, 2.2 | 예상: ~2h

- [x] 2.1 테스트 작성 (`tests/memo/memo.repository.test.ts`) — findAll 빈 배열 반환, findById 존재/부재 케이스 (실패 확인)
- [x] 2.2 `IMemoRepository` 인터페이스 정의 (`src/memo/memo.repository.ts`)
- [x] 2.3 `JsonMemoRepository` 구현 (`src/memo/json-memo.repository.ts`) — `data/memos.json` 읽기/쓰기, 파일 없으면 `[]` 초기화
- [x] 2.4 테스트 통과 확인 — AC-2.1-1 포함 ✅ (6/6)

---

## 3. MemoService 구현
> 요구사항: 1.1~1.5, 2.2 | 예상: ~3h
> requires: 1, 2 완료

- [x] 3.1 테스트 작성 (`tests/memo/memo.service.test.ts`) — 모든 AC 시나리오 (실패 확인)
  - AC-1.1-1, AC-1.1-2, AC-1.1-3 (생성)
  - AC-1.2-1, AC-1.2-2, AC-1.2-3 (목록)
  - AC-1.3-1, AC-1.3-2 (상세 조회)
  - AC-1.4-1, AC-1.4-2, AC-1.4-3, AC-1.4-4 (수정)
  - AC-1.5-1, AC-1.5-2, AC-1.5-3 (삭제)
- [x] 3.2 `MemoService` 구현 (`src/memo/memo.service.ts`) — create, list, get, update, delete 메서드
- [x] 3.3 테스트 통과 확인 — 전체 AC 통과 ✅ (15/15)

---

## 4. 통합 테스트
> 요구사항: 2.1, 3.1 | 예상: ~1h
> requires: 2, 3 완료

- [x] 4.1 통합 테스트 작성 (`tests/memo/integration.test.ts`) — 실제 파일 I/O 포함 E2E 흐름 검증
- [x] 4.2 AC-2.1-1 검증 — 파일 없는 상태 시작 확인 ✅
- [x] 4.3 AC-3.1-1 검증 — `tsc --noEmit` 빌드 성공 ✅

---

## 5. 진입점 작성
> 요구사항: — | 예상: ~1h
> requires: 3 완료

- [x] 5.1 `src/index.ts` 작성 — MemoService 인스턴스화, 기본 사용 예시 포함
- [x] 5.2 `npm run build` — tsc 빌드 가능

---

## 검증 체크리스트

- [x] 모든 requirements ID 매핑: 1.1~1.5 → T3, 2.1 → T2/T4, 3.1 → T0/T1/T4
- [x] 각 태스크 1~3시간 범위
- [x] TDD 구조 (테스트 먼저 → 구현 → 확인)
- [x] T1, T2 병렬 실행 가능 (P 표시)
- [x] 의존성 명시 (T3 requires T1+T2, T4/T5 requires T3)

✅ 전체 테스트 24/24 통과 | tsc strict 빌드 오류 0개
