---
name: tech
description: 메모 앱 기술 스택·결정·제약
---

# Tech Steering

## 기술 스택
- 언어: TypeScript
- 런타임: Node.js
- 패키지 매니저: npm

## 주요 결정
- TypeScript strict 모드 사용
- 테스트: Jest + ts-jest
- 빌드: tsc (TypeScript 컴파일러)

## 외부 서비스
- 없음 (로컬 영속성 우선)

## 제약
- 순수 TypeScript — 불필요한 프레임워크 추가 금지
- 타입 안전성 최우선
