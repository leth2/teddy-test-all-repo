# Lessons INDEX

> `spec-capture` 로 추가 | `spec-search <keyword>` 로 검색 | 횟수 = 재발 위험도

| ID  | 카테고리 | 제목 | 키워드 | 횟수 |
|-----|---------|------|--------|------|
| A01 | acp-protocol | npx spawn stdin pipe 미전달 | spawn, npx, stdio, socket, pipe, stdin | 2 |
| A02 | acp-protocol | session/new cwd 누락 | session, cwd, params, ACP, Invalid | 1 |
| A03 | acp-protocol | SSE 레이스 컨디션 — agent-ready 재전송 | SSE, race, ready, EventSource, 타이밍 | 1 |
| D01 | docker-node | npm ci --only=production → tsc 없음 | npm, tsc, Dockerfile, build, typescript | 2 |
| D02 | docker-node | package-lock.json 누락 | npm ci, lock, git | 2 |
| D03 | docker-node | @zed-industries 패키지명 혼동 | npx, binary, 패키지명, not found | 2 |
| D04 | docker-node | eventsource 패키지 없음 | eventsource, SSE, package | 1 |
| T01 | testing | 존재하지 않는 라우트 호출 | 라우트, endpoint, 404, /start | 1 |
| T02 | testing | TIMEOUT_MS 기본값 너무 짧음 | timeout, Pi, slow, TIMEOUT_MS | 2 |
| T03 | testing | 이벤트명 불일치 (하이픈 vs 언더스코어) | agent-ready, agent_ready, 이벤트명 | 1 |

> ⚠️ 횟수 2+ = 재발 가능성 높음 — 구현 시 우선 체크
