---
name: tech
description: URL 단축 서비스 기술 스티어링. 기술 스택, 주요 결정. 설계 생성 시, 구현 시 가드레일로 로드.
---

## 기술 스택
- Backend: Node.js + Express
- Database: SQLite (better-sqlite3)
- 짧은 코드 생성: nanoid
- Frontend: React + Vite
- 차트: Recharts
- 테스트: Vitest + Supertest
- 언어: JavaScript (TypeScript 없음)

## 주요 결정
- SQLite: 설정 없이 파일 기반 DB, 단순 배포
- nanoid: 충돌 없는 짧은 코드 생성
- REST API: 단순하고 표준적인 인터페이스
