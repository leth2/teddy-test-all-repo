# 태스크: URL 단축 서비스

> 스펙: 1773353840-url-shortener  
> 생성일: 2026-03-12T22:17:20Z  
> 요구사항 매핑: 1.1 ✅ 1.2 ✅ 1.3 ✅ 1.4 ✅ 1.5 ✅ 2.1 ✅ 2.2 ✅ 2.3 ✅ 3.1 ✅ 3.2 ✅ 4.1 ✅ 4.2 ✅

---

## 1. 프로젝트 설정
> 요구사항: 2.3, 3.1, 3.2 | 예상: ~1.5h

- [x] 1.1 백엔드 패키지 초기화 — package.json, 의존성(express, better-sqlite3, nanoid, cors, vitest, supertest) 설치
- [x] 1.2 SQLite 연결 및 스키마 — database.js: urls/clicks 테이블 생성, DB 인스턴스 싱글톤 제공
- [x] 1.3 Express 앱 설정 — app.js: CORS, JSON 파싱, 라우터 연결, 에러 핸들러
- [x] 1.4 테스트 환경 설정 — vitest.config.js, tests/setup.js: 인메모리 DB 사용

## 2. URL 단축 엔드포인트
> 요구사항: 1.1, 1.2, 2.1, 4.1, 4.2 | 예상: ~2h

- [x] 2.1 테스트 작성 (실패 확인) — tests/shorten.test.js: POST /api/shorten, GET /:code 케이스
- [x] 2.2 구현 (테스트 통과) — src/routes/url-routes.js: URL 유효성 검사, nanoid 코드 생성, DB 저장, 리다이렉트
- [x] 2.3 리팩토링 (테스트 유지) — 유효성 검사 함수 분리, 에러 핸들링 일관성

## 3. 통계 엔드포인트
> 요구사항: 1.4, 1.5, 2.2 | 예상: ~2h

- [x] 3.1 테스트 작성 (실패 확인) — tests/stats.test.js: GET /api/stats, GET /api/stats/:code 케이스
- [x] 3.2 구현 (테스트 통과) — src/routes/stats-routes.js: 전체 목록 + 날짜별 클릭 조회
- [x] 3.3 리팩토링 (테스트 유지) — 쿼리 함수 db 모듈로 이동

## 4. 태그 기능 (P)
> 요구사항: 1.3 | 예상: ~1h | 병렬: 태스크 3과 독립

- [ ] 4.1 테스트 추가 — tag 필드 포함 POST, 태그별 필터 조회
- [ ] 4.2 구현 — tag 파라미터 처리, GET /api/stats?tag=xxx 필터 지원
- [ ] 4.3 리팩토링 — 태그 로직 정리

## 5. 프론트엔드 — 기본 UI (P)
> 요구사항: 1.1, 1.4 | 예상: ~3h | 병렬: 백엔드 2,3 완료 후

- [ ] 5.1 Vite + React 프로젝트 초기화 — 의존성(react, vite, recharts, axios)
- [ ] 5.2 API 클라이언트 — src/api/api.js: shorten, getStats, getStatDetail 함수
- [ ] 5.3 ShortenForm 컴포넌트 — URL 입력, tag 입력, 제출 처리
- [ ] 5.4 UrlTable 컴포넌트 — 단축 URL 목록, 클릭 수 표시

## 6. 프론트엔드 — 통계 대시보드 (requires: 5 완료)
> 요구사항: 1.5 | 예상: ~2h

- [ ] 6.1 ClickChart 컴포넌트 — Recharts LineChart로 날짜별 클릭 시각화
- [ ] 6.2 Dashboard 페이지 — ShortenForm + UrlTable + ClickChart 통합
- [ ] 6.3 라우팅 — React Router: / (대시보드), /:code (상세)

## 7. 통합 테스트 (requires: 2, 3, 4 완료)
> 요구사항: 전체 | 예상: ~1.5h

- [ ] 7.1 E2E 시나리오 — URL 단축 → 리다이렉트 → 통계 확인 전체 흐름
- [ ] 7.2 에러 케이스 — 잘못된 URL, 존재하지 않는 코드, 중복 처리

---

## 요구사항 → 태스크 매핑

| 요구사항 | 태스크 |
|----------|--------|
| 1.1 URL 단축 | 2.1, 2.2, 2.3 |
| 1.2 리다이렉트 | 2.1, 2.2 |
| 1.3 태그 분류 | 4.1, 4.2, 4.3 |
| 1.4 전체 통계 목록 | 3.1, 3.2 |
| 1.5 상세 통계 | 3.1, 3.2 |
| 2.1 코드 충돌 없음 | 2.2 (nanoid) |
| 2.2 클릭 즉시 반영 | 2.2, 3.2 |
| 2.3 데이터 영속성 | 1.2 (SQLite) |
| 3.1 JSON API | 1.3, 2.2, 3.2 |
| 3.2 CORS | 1.3 |
| 4.1 URL-safe 코드 | 2.2 (nanoid) |
| 4.2 URL 유효성 검사 | 2.2 |
