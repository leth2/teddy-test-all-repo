# 브리핑: cline-acp-sse-v2

**기능**: cline-acp-sse-v2
**날짜**: 2026-03-13
**도구**: SDD v2 (개선된 도구)

## 완료된 작업

### 구현 파일
- `agent/src/bridge.ts` — ACP 브릿지 (올바른 핸드셰이크 포함)
- `agent/src/bridge.test.ts` — 브릿지 테스트 (v1 오류 방지 케이스 포함)
- `agent/src/server.ts` — Express SSE 서버
- `agent/src/server.test.ts` — 서버 유닛 테스트
- `agent/package.json`, `agent/tsconfig.json`, `agent/Dockerfile`
- `ui/src/hooks/useChat.ts` — React SSE 훅
- `ui/src/components/` — 5개 컴포넌트
- `ui/src/App.tsx`, `ui/src/main.tsx`, `ui/src/index.css`
- `ui/package.json`, `ui/vite.config.ts`, `ui/tsconfig.json`
- `docker-compose.yml`, `README.md`

### 스펙 문서
- `requirements.md` — 7개 그룹, 25개 요구사항 (v1: 6그룹)
- `design.md` — ACP 스펙 참조 링크 포함
- `tasks.md` — TDD 구조, 요구사항 매핑 표
- `references/acp-protocol.md` — ACP 공식 스펙 요약
- `references/sse-format.md` — SSE 형식 스펙

## v1 대비 핵심 개선사항

1. **올바른 ACP 프로토콜** — initialize/session/new 핸드셰이크
2. **올바른 method 이름** — session/prompt, session/update, session/request_permission
3. **올바른 권한 응답** — { id: requestId, result: { approved } }
4. **외부 스펙 레퍼런스** — references/ 폴더에 검증된 스펙 저장
5. **검증 단계** — 각 단계 후 validation 실행
6. **정확한 태스크 상태** — 테스트 미실행 시 [~] 사용

## 실행 방법

```bash
# 로컬
cd agent && npm install && npm run dev
cd ui && npm install && npm run dev

# Docker
ANTHROPIC_API_KEY=sk-... docker-compose up
```

## 테스트 실행 (npm install 후)

```bash
cd agent && npm test  # bridge/server 유닛 테스트
cd ui && npm test     # (UI 테스트 추가 가능)
```

## 상태 요약

| 단계 | 상태 |
|------|------|
| 요구사항 | ✅ 완료 + 검증 통과 |
| 설계 | ✅ 완료 + 외부 스펙 저장 |
| 태스크 | ✅ 완료 + 검증 통과 |
| 구현 | [~] 코드 작성 완료 (npm install 후 테스트 실행 가능) |
| 구현 검증 | ✅ 설계 계약 일치 확인 |
