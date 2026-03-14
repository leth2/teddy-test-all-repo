# Lessons: Docker + Node

AI가 반복하는 실수 패턴 모음.

## D01 npm ci --only=production 후 tsc 없음

**증상:** Docker 빌드 성공, 컨테이너 시작 시 `tsc: not found` 또는 `Cannot find module` 에러

**원인:** `npm ci --only=production`은 devDependencies 제외. `typescript`, `ts-node` 등 빌드 도구가 없어짐.

**체크:** Dockerfile에 `npm ci --only=production` + `tsc` 또는 `ts-node` 사용 조합 확인

**수정:**
```dockerfile
RUN npm ci          # 전체 설치 (빌드용)
RUN npm run build   # TypeScript 컴파일
RUN npm prune --omit=dev  # 이후 dev 제거
```

---

## D02 package-lock.json 없음

**증상:** `npm ci` 실행 시 `npm error The \`npm ci\` command can only install with an existing package-lock.json` 에러

**원인:** `package-lock.json`을 `.gitignore`에 추가했거나 생성 후 커밋 안 함

**체크:** `git ls-files package-lock.json` 결과가 비어있으면 미추가

**수정:** 로컬에서 `npm install` 실행 후 `package-lock.json` 커밋

---

## D03 @zed-industries/claude-agent-acp 패키지명 오류

**증상:** `npm error 404 Not Found - GET https://registry.npmjs.org/claude-agent-acp`

**원인:** 패키지명이 `claude-agent-acp`가 아닌 `@zed-industries/claude-agent-acp` (scoped package)

**체크:** `npm view @zed-industries/claude-agent-acp` 로 확인

**수정:** `package.json`에 `"@zed-industries/claude-agent-acp": "^0.21.0"` 추가

---

## D04 eventsource 패키지 없음 (SSE 테스트)

**증상:** `Cannot find package 'eventsource' imported from test/sse-handshake.js`

**원인:** SSE 테스트에 `eventsource` npm 패키지 필요한데 `package.json`에 없음

**체크:** `npm list eventsource` — 없으면 설치 필요

**수정:** `npm install eventsource` 후 `package.json` 커밋

---
