# 태스크: memo-crud

## 진행 상황
- 전체: 10개 서브태스크
- 완료: 10개
- 예상 총 시간: ~6h

---

## 1. 프로젝트 초기 설정
> 요구사항: 전체 | 예상: ~1h

- [x] 1.1 프로젝트 초기화 — package.json, tsconfig.json, vitest 설정 완료, 빈 테스트 실행 통과

## 2. 메모 데이터 모델 (P)
> 요구사항: 1.1, 1.2, 1.3, 1.4 | 예상: ~1h

- [x] 2.1 Memo 타입 테스트 작성 (실패 확인) — Memo, CreateMemoInput, UpdateMemoInput 타입 검증 테스트
- [x] 2.2 Memo 타입 구현 — 2.1 테스트 통과

## 3. 메모 저장소 (P)
> 요구사항: 6.1, 6.2 | 예상: ~1.5h

- [x] 3.1 MemoRepository 테스트 작성 (실패 확인) — loadAll, saveAll, 파일 자동 생성 테스트
- [x] 3.2 MemoRepository 구현 — 3.1 테스트 통과

## 4. 메모 서비스
> 요구사항: 2.1, 3.1, 3.2, 4.1, 5.1 | 예상: ~2h | requires: 2, 3 완료

- [x] 4.1 MemoService 테스트 작성 (실패 확인) — create, findAll, findById, update, remove 전체 AC 테스트
- [x] 4.2 MemoService 구현 — 4.1 테스트 통과
- [x] 4.3 리팩토링 — 모든 테스트 유지, 코드 정리

## 5. 통합 테스트
> 요구사항: 1.1~6.2 | 예상: ~0.5h | requires: 4 완료

- [x] 5.1 E2E CRUD 플로우 테스트 — 생성→조회→수정→삭제 전체 흐름, 영속성 확인
