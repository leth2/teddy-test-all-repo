# Requirements: 메모 CRUD

Feature: `memo-crud`
Created: 2026-03-15

---

## 1. 사용자 기능

### 1.1 메모 생성
사용자가 제목과 본문을 입력하면, 시스템은 고유 ID와 생성 시각을 포함한 메모를 저장한다.
<!-- @impl: src/memo/memo.service.ts#MemoService.create -->

- AC1: 제목(1자 이상)과 본문을 입력하면 저장에 성공하고 생성된 메모를 반환한다.
- AC2: 제목이 빈 문자열이면 저장이 거부되고 오류를 반환한다.
- AC3: 저장된 메모는 고유 ID와 `createdAt` 타임스탬프를 포함한다.

### 1.2 메모 목록 조회
사용자가 목록 조회를 요청하면, 시스템은 저장된 모든 메모를 반환한다.
<!-- @impl: src/memo/memo.service.ts#MemoService.list -->

- AC1: 메모가 0개일 때 빈 배열을 반환한다.
- AC2: 메모가 1개 이상일 때 전체 목록을 반환한다.
- AC3: 반환된 각 항목은 id, title, createdAt을 포함한다.

### 1.3 메모 상세 조회
사용자가 특정 ID를 지정하면, 시스템은 해당 메모의 전체 내용을 반환한다.
<!-- @impl: src/memo/memo.service.ts#MemoService.get -->

- AC1: 존재하는 ID를 지정하면 해당 메모(id, title, body, createdAt, updatedAt)를 반환한다.
- AC2: 존재하지 않는 ID를 지정하면 "메모를 찾을 수 없음" 오류를 반환한다.

### 1.4 메모 수정
사용자가 특정 ID와 변경할 제목 또는 본문을 입력하면, 시스템은 해당 메모를 업데이트한다.
<!-- @impl: src/memo/memo.service.ts#MemoService.update -->

- AC1: 존재하는 ID에 유효한 제목을 입력하면 수정에 성공하고 갱신된 메모를 반환한다.
- AC2: 수정된 메모는 `updatedAt`이 갱신된다.
- AC3: 존재하지 않는 ID를 지정하면 오류를 반환한다.
- AC4: 제목을 빈 문자열로 수정하려 하면 거부되고 오류를 반환한다.

### 1.5 메모 삭제
사용자가 특정 ID를 지정하면, 시스템은 해당 메모를 영구 삭제한다.
<!-- @impl: src/memo/memo.service.ts#MemoService.delete -->

- AC1: 존재하는 ID를 지정하면 삭제에 성공한다.
- AC2: 삭제 후 해당 ID로 조회하면 "메모를 찾을 수 없음" 오류를 반환한다.
- AC3: 존재하지 않는 ID를 지정하면 오류를 반환한다.

---

## 2. 시스템 동작

### 2.1 데이터 영속성
시스템은 프로세스가 재시작되어도 메모 데이터를 보존한다.
<!-- @impl: src/memo/json-memo.repository.ts#JsonMemoRepository -->

- AC1: 메모를 저장한 후 시스템을 재시작해도 데이터가 유지된다.
- AC2: 영속성 파일이 없으면 빈 상태로 초기화된다.

### 2.2 데이터 무결성
시스템은 동시에 발생하는 쓰기 작업에서 데이터 손실 없이 처리한다.

- AC1: 연속적인 쓰기 작업에서 데이터가 손실되지 않는다.

---

## 3. 제약 조건

### 3.1 타입 안전성
모든 메모 데이터는 명시적 TypeScript 타입으로 정의된다.
<!-- @impl: src/memo/memo.ts#Memo -->

- AC1: `any` 타입 사용 없이 컴파일이 성공한다.
- AC2: TypeScript strict 모드 하에서 오류 없이 빌드된다.

---

## 가정사항

- UI 없음 — 서비스/레포지토리 계층만 구현 (MVP)
- 영속성: JSON 파일 기반 (외부 DB 없음)
- 단일 사용자 가정 — 인증 없음
