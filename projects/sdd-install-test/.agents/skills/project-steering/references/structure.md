---
name: structure
description: 메모 앱 폴더 구조·네이밍·모듈 경계
---

# Structure Steering

## 폴더 구조
```
src/
  memo/          ← 메모 도메인 (feature-first)
    memo.ts      ← 타입 정의
    memo.service.ts
    memo.repository.ts
  index.ts       ← 진입점
tests/
  memo/
data/            ← 영속성 파일 저장소
```

## 네이밍 규칙
- 파일: kebab-case (`.ts`)
- 클래스/인터페이스: PascalCase
- 함수/변수: camelCase
- 타입: PascalCase + `Type` suffix 금지 (예: `Memo`, `CreateMemoInput`)

## 모듈 경계
- Service: 비즈니스 로직만
- Repository: 영속성 접근만
- 계층 간 직접 접근 금지
