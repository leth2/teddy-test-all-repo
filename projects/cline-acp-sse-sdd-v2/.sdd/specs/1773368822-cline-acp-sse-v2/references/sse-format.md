# Server-Sent Events (SSE) — 형식 스펙 레퍼런스

> 출처: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
> 및 https://html.spec.whatwg.org/multipage/server-sent-events.html
> 수집일: 2026-03-13

## 서버 응답 헤더 (필수)

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

## 이벤트 스트림 형식

각 이벤트는 하나 이상의 필드 라인으로 구성되며, **빈 줄 두 개(`\n\n`)로 종료**.

### 기본 메시지 (이벤트 타입 없음)

```
data: 메시지 내용\n\n
```

클라이언트에서는 `EventSource.onmessage`로 처리됨.

### 커스텀 이벤트 타입

```
event: [eventType]\n
data: [JSON 데이터]\n
\n
```

예:
```
event: message\n
data: {"role":"agent","content":"안녕하세요"}\n
\n
```

클라이언트에서는 `EventSource.addEventListener('[eventType]', handler)`로 처리.

### Keepalive 이벤트

```
event: keepalive\n
data: {}\n
\n
```

또는 코멘트 라인으로:
```
: keepalive\n
\n
```

### 멀티라인 데이터

여러 `data:` 라인은 개행으로 연결됨:
```
data: 첫 번째 줄\n
data: 두 번째 줄\n
\n
```

### id 필드 (Last-Event-ID)

```
id: [이벤트 ID]\n
event: message\n
data: {...}\n
\n
```

재연결 시 서버에 `Last-Event-ID` 헤더로 전송됨.

## Node.js Express 구현 패턴

```typescript
// 헤더 설정
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.flushHeaders();

// 이벤트 전송 함수
function sendEvent(res: Response, eventType: string, data: unknown): void {
  res.write(`event: ${eventType}\n`);
  res.write(`data: ${JSON.stringify(data)}\n`);
  res.write('\n');
}

// Keepalive
const keepalive = setInterval(() => {
  res.write('event: keepalive\n');
  res.write('data: {}\n');
  res.write('\n');
}, 15000);

// 연결 해제 처리
req.on('close', () => {
  clearInterval(keepalive);
  // 구독자 목록에서 제거
});
```

## 브라우저 클라이언트 (EventSource)

```typescript
const evtSource = new EventSource('http://localhost:3002/events');

// 커스텀 이벤트 수신
evtSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  // 처리
});

evtSource.addEventListener('toolcall', (event) => {
  const data = JSON.parse(event.data);
  // 처리
});

evtSource.addEventListener('permission-request', (event) => {
  const data = JSON.parse(event.data);
  // 처리
});

// 연결 오류 처리 (자동 재연결)
evtSource.onerror = (err) => {
  console.error('SSE 오류:', err);
};
```

## ⚠️ 주의사항

- 이벤트 스트림 형식: `event:` 다음 **공백 없이** 또는 공백 한 칸 — `event: name\n`
- `data:` 뒤의 공백 하나는 무시됨
- 각 이벤트는 반드시 **빈 줄(`\n\n`)로 종료**
- `res.write()`는 각 라인을 개별 호출하거나 하나의 문자열로 합쳐서 호출 가능
- `res.flushHeaders()` 호출 필수 (버퍼링 방지)
