---
name: structure
description: URL 단축 서비스 구조 스티어링. 폴더 구조, 네이밍 규칙. 설계 및 구현 시 가드레일로 로드.
---

## 폴더 구조
- 모노레포: /backend, /frontend
- Backend: src/routes/, src/db/, src/middleware/, tests/
- Frontend: src/components/, src/pages/, src/api/

## 네이밍 규칙
- 파일: kebab-case (url-routes.js)
- 컴포넌트: PascalCase (Dashboard.jsx)
- API 엔드포인트: /api/... 접두사

## 모듈 경계
- Backend: routes → db (단방향)
- Frontend: pages → components → api (단방향)
