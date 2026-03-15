---
name: structure
description: 메모 앱 구조 스티어링. 폴더 구조, 네이밍 규칙, 모듈 경계. 설계 및 구현 시 가드레일로 로드.
---

## 폴더 구조

- feature-first: `src/` 아래 기능별 모듈 배치
- 테스트 파일은 소스 옆 co-location (`*.test.ts`)

## 네이밍 규칙

- 파일: kebab-case (예: `memo-repository.ts`)
- 클래스/타입: PascalCase (예: `MemoRepository`)
- 함수/변수: camelCase (예: `createMemo`)
- 상수: SCREAMING_SNAKE_CASE (예: `DEFAULT_DATA_DIR`)

## 모듈 경계

- model: 메모 데이터 타입 정의
- repository: 데이터 저장/조회 (파일 I/O)
- service: 비즈니스 로직 (CRUD 연산)

## 금지 패턴

- 순환 의존: 모듈 간 단방향 의존만 허용 (service → repository → model)
