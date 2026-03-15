---
name: tech
description: 메모 앱 기술 스티어링. 기술 스택, 주요 결정, 외부 서비스. 설계 생성 시, 구현 시 가드레일로 로드.
---

## 기술 스택

- 언어: TypeScript 5.x
- 런타임: Node.js 20 LTS
- 테스트: Vitest
- 패키지 매니저: npm

## 주요 결정

- 로컬 JSON 파일 저장: 외부 DB 의존 없이 단순하게 유지
- TDD 방식 구현: 테스트 먼저, 코드 나중
- ESM 모듈 시스템 사용

## 외부 서비스

- 없음 (완전 로컬)

## 빌드/배포

- TypeScript → JavaScript 컴파일 후 Node.js 실행

## 기술적 제약

- Node.js 내장 모듈만 사용 (fs, path 등), 외부 라이브러리 최소화
