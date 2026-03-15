# 요구사항: memo-crud

## 개요

개인 메모를 로컬 파일 시스템에 생성·조회·수정·삭제할 수 있는 TypeScript 메모 앱.

## 요구사항

### 1. 메모 데이터 모델

**1.1** `REQ-001` The system shall assign a unique UUID v4 identifier to each memo.
<!-- @impl: REQ-001 → src/memo-service.ts#MemoService.create -->
- AC1: 생성된 메모의 id는 UUID v4 형식이다
- AC2: 두 개의 메모를 생성하면 서로 다른 id를 가진다

**1.2** `REQ-002` The system shall store a title (string) for each memo.
<!-- @impl: REQ-002 → src/memo.ts#Memo -->
<!-- @impl: REQ-002 → src/memo-service.ts#MemoService.create -->
- AC1: 메모 생성 시 title이 저장된다
- AC2: 빈 문자열 title은 허용하지 않는다

**1.3** `REQ-003` The system shall store content (string) for each memo.
<!-- @impl: REQ-003 → src/memo.ts#Memo -->
- AC1: 메모 생성 시 content가 저장된다
- AC2: 빈 문자열 content는 허용한다

**1.4** `REQ-004` The system shall record createdAt and updatedAt timestamps for each memo.
<!-- @impl: REQ-004 → src/memo-service.ts#MemoService.create -->
<!-- @impl: REQ-004 → src/memo-service.ts#MemoService.update -->
- AC1: 생성 시 createdAt과 updatedAt이 동일한 ISO 8601 타임스탬프로 설정된다
- AC2: 수정 시 updatedAt만 갱신된다

### 2. 메모 생성

**2.1** `REQ-005` When the user provides a title and content, the system shall create a new memo and return it.
<!-- @impl: REQ-005 → src/memo-service.ts#MemoService.create -->
- AC1: title과 content를 전달하면 id, title, content, createdAt, updatedAt이 포함된 메모가 반환된다
- AC2: 생성된 메모는 이후 조회 시 존재한다

### 3. 메모 조회

**3.1** `REQ-006` The system shall return a list of all stored memos.
<!-- @impl: REQ-006 → src/memo-service.ts#MemoService.findAll -->
- AC1: 메모가 없으면 빈 배열을 반환한다
- AC2: 메모가 3개 있으면 3개 요소의 배열을 반환한다

**3.2** `REQ-007` When the user provides a memo id, the system shall return the corresponding memo.
<!-- @impl: REQ-007 → src/memo-service.ts#MemoService.findById -->
- AC1: 존재하는 id로 조회하면 해당 메모를 반환한다
- AC2: 존재하지 않는 id로 조회하면 null을 반환한다

### 4. 메모 수정

**4.1** `REQ-008` When the user provides a memo id and update data, the system shall update the memo and return it.
<!-- @impl: REQ-008 → src/memo-service.ts#MemoService.update -->
- AC1: title만 변경하면 title이 갱신되고 content는 유지된다
- AC2: content만 변경하면 content가 갱신되고 title은 유지된다
- AC3: updatedAt이 갱신된다
- AC4: 존재하지 않는 id로 수정하면 null을 반환한다

### 5. 메모 삭제

**5.1** `REQ-009` When the user provides a memo id, the system shall delete the memo and return true.
<!-- @impl: REQ-009 → src/memo-service.ts#MemoService.remove -->
- AC1: 존재하는 id로 삭제하면 true를 반환한다
- AC2: 삭제 후 해당 id로 조회하면 null을 반환한다
- AC3: 존재하지 않는 id로 삭제하면 false를 반환한다

### 6. 데이터 영속성

**6.1** `REQ-010` The system shall persist memos to a local JSON file.
<!-- @impl: REQ-010 → src/memo-repository.ts#MemoRepository.saveAll -->
- AC1: 메모 생성 후 JSON 파일에 데이터가 저장된다
- AC2: 앱 재시작 후에도 이전에 저장한 메모를 조회할 수 있다

**6.2** `REQ-011` When the data file does not exist, the system shall create it with an empty memo list.
<!-- @impl: REQ-011 → src/memo-repository.ts#MemoRepository.loadAll -->
<!-- @impl: REQ-011 → src/memo-repository.ts#MemoRepository.saveAll -->
- AC1: 데이터 파일이 없는 상태에서 첫 조회 시 빈 배열을 반환한다
- AC2: 첫 생성 시 데이터 파일이 자동 생성된다

## 제약 조건

- 외부 데이터베이스 없이 로컬 JSON 파일 기반 저장
- Node.js 내장 모듈 최대한 활용

## 범위 외

- 사용자 인증/권한 관리
- 실시간 동기화
- 웹 UI
- 검색/필터링 기능
