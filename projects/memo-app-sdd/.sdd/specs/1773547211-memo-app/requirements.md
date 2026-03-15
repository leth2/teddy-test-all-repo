# Requirements: memo-app

## REQ-01: 메모 추가
When 사용자가 내용(content)을 제공하면,
The system shall 고유 UUID v4 ID와 생성 시각을 부여하여 메모를 저장한다.
<!-- @impl: src/MemoService.ts#MemoService.add -->

AC:
- 반환값: `{ id: string, content: string, createdAt: Date }`
- content가 빈 문자열이면 에러 발생
- 동일 content라도 항상 새 ID 생성

## REQ-02: 메모 조회
When 사용자가 ID를 제공하면,
The system shall 해당 메모를 반환한다.
<!-- @impl: src/MemoService.ts#MemoService.get -->
<!-- @impl: src/MemoService.ts#MemoService.getAll -->

AC:
- 존재하는 ID → 메모 객체 반환
- 존재하지 않는 ID → `null` 반환 (에러 아님)
- 전체 목록 조회: `getAll()` → 배열 반환 (순서: 생성 역순)

## REQ-03: 메모 삭제
When 사용자가 ID를 제공하면,
The system shall 해당 메모를 저장소에서 제거한다.
<!-- @impl: src/MemoService.ts#MemoService.delete -->

AC:
- 존재하는 ID → 삭제 후 `true` 반환
- 존재하지 않는 ID → `false` 반환 (에러 아님)
