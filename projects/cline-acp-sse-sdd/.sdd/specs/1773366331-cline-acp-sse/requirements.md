# Requirements: cline-acp-sse

## 1. ACP 에이전트 프로세스 관리

**1.1** 시스템은 ACP 코딩 에이전트 프로세스를 시작하고 종료할 수 있어야 한다.
- AC1: 서버 시작 시 claude-agent-acp 프로세스가 자동으로 spawn된다
- AC2: 서버 종료 시 에이전트 프로세스가 정리(kill)된다
- AC3: 에이전트 프로세스 비정상 종료 시 오류 이벤트가 발생한다

**1.2** 시스템은 ACP JSON-RPC 프로토콜로 에이전트와 통신할 수 있어야 한다.
- AC1: stdio를 통해 에이전트와 JSON-RPC 메시지를 교환한다
- AC2: 에이전트로부터 수신한 메시지가 파싱되어 이벤트로 emit된다

## 2. SSE 스트리밍

**2.1** 서버는 GET /events 엔드포인트를 통해 SSE 스트림을 제공해야 한다.
- AC1: Content-Type: text/event-stream 헤더가 설정된다
- AC2: Cache-Control: no-cache, Connection: keep-alive 헤더가 설정된다
- AC3: 15초마다 keepalive 이벤트가 전송된다
- AC4: 클라이언트 연결 해제 시 스트림이 정리된다

**2.2** 시스템은 ACP 에이전트 메시지를 SSE 이벤트로 브릿지해야 한다.
- AC1: 에이전트로부터 수신된 메시지가 SSE 이벤트로 변환된다
- AC2: 툴콜 이벤트가 별도 SSE 이벤트 타입으로 전송된다

## 3. HTTP POST 입력

**3.1** 서버는 POST /prompt 엔드포인트로 사용자 입력을 수신해야 한다.
- AC1: { text: string } 형태의 요청 본문을 수신한다
- AC2: 수신된 프롬프트가 에이전트에 전달된다
- AC3: 잘못된 형식의 요청에 400 응답이 반환된다

**3.2** 서버는 POST /permission 엔드포인트로 Human-in-the-Loop 응답을 수신해야 한다.
- AC1: { approved: boolean, requestId: string } 형태의 요청 본문을 수신한다
- AC2: 승인/거부 결과가 에이전트에 전달된다
- AC3: 유효하지 않은 requestId에 404 응답이 반환된다

## 4. 상태 확인

**4.1** 서버는 GET /health 엔드포인트를 제공해야 한다.
- AC1: { status: "ok" } 응답을 반환한다
- AC2: 서버 정상 시 200 상태 코드를 반환한다

## 5. React 채팅 UI

**5.1** UI는 실시간 채팅 메시지를 표시해야 한다.
- AC1: SSE 연결 상태가 "SSE 연결됨" 문구로 표시된다
- AC2: 에이전트 메시지가 채팅 목록에 순서대로 표시된다
- AC3: 사용자 메시지와 에이전트 메시지가 시각적으로 구분된다

**5.2** UI는 툴콜 로그를 표시해야 한다.
- AC1: 에이전트의 툴 호출이 별도 로그 영역에 표시된다
- AC2: 툴 이름과 파라미터가 표시된다

**5.3** UI는 Human-in-the-Loop 권한 승인 다이얼로그를 제공해야 한다.
- AC1: 권한 요청 이벤트 수신 시 다이얼로그가 표시된다
- AC2: 승인/거부 버튼이 제공된다
- AC3: 사용자 응답이 POST /permission으로 전송된다

## 6. 인프라

**6.1** 시스템은 Docker로 실행 가능해야 한다.
- AC1: docker-compose up으로 agent(3002)와 ui(5174) 서비스가 시작된다
- AC2: 두 서비스가 네트워크로 연결된다

## 가정사항
- ACP 에이전트는 npx -y @zed-industries/claude-agent-acp 명령으로 실행 가능
- 브라우저의 EventSource API를 사용하여 자동 재연결 처리
- 다크 테마 UI, 한국어 레이블
