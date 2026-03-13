# Requirements: cline-acp-sse-v2

> 스티어링 기반: product(ACP 브릿지 + React 채팅 UI), tech(Node.js/Express/React 19), structure(/agent + /ui)

## 1. ACP 에이전트 프로세스 관리

**1.1** 서버 시작 시 시스템은 ACP 코딩 에이전트 프로세스를 자동으로 시작해야 한다.
- AC1: 서버 초기화 완료 후 claude-agent-acp 프로세스가 spawn된다
- AC2: 에이전트 spawn 실패 시 `error` 이벤트가 emit되고 오류 메시지가 포함된다
- AC3: 이미 프로세스가 실행 중이면 중복 spawn을 하지 않는다

**1.2** 서버 종료 시 시스템은 ACP 에이전트 프로세스를 정리해야 한다.
- AC1: stop() 호출 시 에이전트 프로세스가 종료된다
- AC2: 프로세스 종료 후 내부 참조가 null로 초기화된다

**1.3** 에이전트 프로세스 비정상 종료 시 시스템은 오류 이벤트를 발생시켜야 한다.
- AC1: 프로세스 비정상 종료 시 `exit` 이벤트가 종료 코드와 함께 emit된다
- AC2: 프로세스 오류 시 `error` 이벤트가 emit된다

## 2. ACP JSON-RPC 통신

**2.1** 시스템은 stdio를 통해 에이전트와 JSON-RPC 메시지를 교환해야 한다.
- AC1: sendPrompt(text) 호출 시 에이전트의 stdin으로 JSON-RPC 요청이 전송된다
- AC2: 에이전트 stdout의 JSON-RPC 응답이 파싱되어 적절한 이벤트로 emit된다
- AC3: JSON 파싱 실패 시 에러 이벤트가 발생하고 브릿지는 계속 동작한다

**2.2** 시스템은 에이전트로부터 수신한 메시지 타입을 구분하여 처리해야 한다.
- AC1: 일반 메시지는 `message` 이벤트로 emit된다
- AC2: 툴콜 알림은 `toolcall` 이벤트로 emit된다
- AC3: 권한 요청은 `permission-request` 이벤트로 requestId, description, tool 포함하여 emit된다

**2.3** 시스템은 Human-in-the-Loop 권한 응답을 에이전트에 전달해야 한다.
- AC1: sendPermission(requestId, approved) 호출 시 에이전트 stdin으로 JSON-RPC 메시지가 전송된다
- AC2: 존재하지 않는 requestId에 대한 응답 시도 시 오류가 반환된다

## 3. SSE 스트리밍

**3.1** 서버는 GET /events 엔드포인트를 통해 SSE 스트림을 제공해야 한다.
- AC1: 응답 헤더에 `Content-Type: text/event-stream`이 설정된다
- AC2: 응답 헤더에 `Cache-Control: no-cache`와 `Connection: keep-alive`가 설정된다
- AC3: CORS 헤더가 설정되어 브라우저에서 접근 가능하다
- AC4: 클라이언트 연결 해제(close 이벤트) 시 해당 클라이언트가 구독자 목록에서 제거된다

**3.2** 서버는 15초마다 keepalive 이벤트를 전송해야 한다.
- AC1: 15초 인터벌로 `event: keepalive\ndata: {}\n\n` 형식의 이벤트가 전송된다
- AC2: 클라이언트 연결 해제 시 해당 클라이언트의 keepalive 타이머가 정리된다

**3.3** 시스템은 ACP 에이전트 메시지를 SSE 이벤트로 변환하여 브로드캐스트해야 한다.
- AC1: SSE 이벤트 형식: `event: [type]\ndata: [JSON]\n\n`
- AC2: 모든 연결된 클라이언트에게 동시에 전송된다
- AC3: 툴콜은 별도 `toolcall` 이벤트 타입으로 전송된다

## 4. HTTP POST 입력

**4.1** 서버는 POST /prompt 엔드포인트로 사용자 입력을 수신해야 한다.
- AC1: `{ text: string }` 형태의 요청 본문을 파싱한다
- AC2: 수신된 프롬프트가 ACPBridge.sendPrompt()를 통해 에이전트에 전달된다
- AC3: text 필드가 없거나 빈 문자열이면 400 응답을 반환한다
- AC4: 에이전트가 초기화되지 않은 경우 503 응답을 반환한다

**4.2** 서버는 POST /permission 엔드포인트로 Human-in-the-Loop 응답을 수신해야 한다.
- AC1: `{ approved: boolean, requestId: string }` 형태의 요청 본문을 파싱한다
- AC2: 결과가 ACPBridge.sendPermission()을 통해 에이전트에 전달된다
- AC3: requestId 또는 approved 필드가 없으면 400 응답을 반환한다
- AC4: 존재하지 않는 requestId이면 404 응답을 반환한다

## 5. 상태 확인

**5.1** 서버는 GET /health 엔드포인트를 제공해야 한다.
- AC1: `{ status: "ok", agentRunning: boolean }` 응답을 반환한다
- AC2: 서버 정상 시 200 상태 코드를 반환한다

## 6. React 채팅 UI

**6.1** UI는 SSE 연결 상태를 표시해야 한다.
- AC1: EventSource 연결 성공 시 "SSE 연결됨" 문구가 표시된다
- AC2: 연결 끊김 시 "SSE 연결 안됨" 또는 재연결 중 상태가 표시된다

**6.2** UI는 실시간 채팅 메시지를 표시해야 한다.
- AC1: 에이전트 메시지가 채팅 목록에 수신 순서대로 표시된다
- AC2: 사용자 메시지와 에이전트 메시지가 시각적으로 구분된다
- AC3: 새 메시지 수신 시 자동 스크롤이 최하단으로 이동한다

**6.3** UI는 툴콜 로그를 별도 영역에 표시해야 한다.
- AC1: 에이전트의 툴 호출이 툴콜 로그 영역에 표시된다
- AC2: 툴 이름과 파라미터 정보가 표시된다

**6.4** UI는 Human-in-the-Loop 권한 승인 다이얼로그를 제공해야 한다.
- AC1: `permission-request` SSE 이벤트 수신 시 모달 다이얼로그가 표시된다
- AC2: 승인/거부 버튼이 제공된다
- AC3: 사용자 응답이 POST /permission으로 `{ requestId, approved }` 형태로 전송된다

## 7. 인프라

**7.1** 시스템은 Docker Compose로 실행 가능해야 한다.
- AC1: `docker-compose up` 명령으로 agent 서비스(포트 3002)와 ui 서비스(포트 5174)가 시작된다
- AC2: 두 서비스가 동일 Docker 네트워크에서 통신 가능하다

## 가정사항
- ACP 에이전트는 `npx -y @zed-industries/claude-agent-acp` 명령으로 실행 가능
- 브라우저의 EventSource API를 통해 자동 재연결 처리
- UI는 다크 테마, 한국어 레이블 사용
- JSON-RPC 파싱 오류는 브릿지를 종료시키지 않음 (계속 동작)
