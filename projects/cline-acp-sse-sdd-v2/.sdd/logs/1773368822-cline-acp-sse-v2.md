# 개발 로그: cline-acp-sse-v2

## 타임라인

[11:25] 🚀 SDD v2 프로젝트 시작
[11:25] ✅ v1 프로젝트 분석 완료 (issues 파악)
[11:26] ✅ SDD 도구 설치 완료
[11:26] ✅ Step 1: 스티어링 복사 (product/structure/tech)
[11:27] ✅ Step 2: requirements.md 생성 (7개 그룹, 요구사항 강화)
[11:27] ✅ Requirements 검증 통과 — 에러 처리/엣지케이스 추가
[11:28] 🔍 Step 3: 외부 스펙 연구 시작
[11:28] ✅ ACP 공식 스펙 수집 (agentclientprotocol.com)
[11:28] ✅ SSE 공식 스펙 수집 (MDN + WHATWG)
[11:28] ✅ references/acp-protocol.md 저장
[11:28] ✅ references/sse-format.md 저장
[11:29] ✅ design.md 생성 (올바른 ACP 핸드셰이크 포함)
[11:29] ✅ Design 검증 통과
[11:30] ✅ Step 4: tasks.md 생성 (TDD 구조, 의존성 명시)
[11:30] ✅ Tasks 검증 통과 — 모든 요구사항 매핑 확인
[11:30] ✅ Step 5: 구현 시작 (references/ 파일 참조)
[11:31] ✅ agent/package.json, tsconfig.json, Dockerfile
[11:31] ✅ ui/package.json, vite.config.ts, tsconfig.json
[11:33] ✅ bridge.ts 구현 — 올바른 ACP 핸드셰이크
[11:33] ✅ bridge.test.ts 작성 (v1 오류 방지 테스트 포함)
[11:34] ✅ server.ts 구현 — 올바른 SSE 형식
[11:34] ✅ server.test.ts 작성
[11:35] ✅ React UI 구현 (5개 컴포넌트 + hook)
[11:35] ✅ docker-compose.yml, README.md
[11:36] ✅ Implementation 검증 완료
[11:36] ✅ 로그 + 브리핑 작성

## v1에서 발견된 문제점 (v2에서 수정)

### 🔴 Critical: ACP 프로토콜 오류
1. **잘못된 method 이름**: `"prompt"` → `"session/prompt"`
2. **초기화 핸드셰이크 누락**: `initialize` → `session/new` 시퀀스 없음
3. **잘못된 권한 응답**: `method: "permission"` → `{ id: requestId, result: { approved } }`
4. **잘못된 메시지 파싱**: `method === "message"` → `method === "session/update"` + `update.sessionUpdate`
5. **잘못된 권한 요청 파싱**: `method === "permission-request"` → `method === "session/request_permission"`

### ⚠️ Warning: 설계 누락
1. `toolcall` 이벤트에 `status` 필드 누락 (v2에서 추가)
2. `sendPrompt()` 에서 sessionId 미초기화 에러 처리 누락
3. `/health` 응답에 `agentRunning` 필드 누락

## 외부 스펙 참조 효과

- ACP 공식 스펙 확인으로 **5개의 중요한 프로토콜 오류** 발견/수정
- SSE 스펙 확인으로 `res.flushHeaders()` 필수성 명확화
- 핸드셰이크 상태 머신 설계 가능 (initialize→session/new→ready)
