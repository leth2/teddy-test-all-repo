/**
 * sse-handshake.js
 * ACP SSE 핸드셰이크 컨포먼스 테스트 (T3.2)
 *
 * 검증:
 * - GET /events → SSE 스트림 연결
 * - agent-ready 이벤트 수신 (서버가 자동으로 bridge.start() 실행)
 */

import { EventSource } from 'eventsource';

const BASE_URL = process.env.SSE_AGENT_URL || 'http://localhost:3002';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '60000');

console.log(`SSE 핸드셰이크 테스트 시작 — ${BASE_URL}`);
console.log(`타임아웃: ${TIMEOUT_MS}ms`);
console.log('SSE /events 연결 중... (bridge.start()는 서버 자동 실행)');

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    es.close();
    reject(new Error(`타임아웃: ${TIMEOUT_MS}ms 초과 — agent-ready 미수신`));
  }, TIMEOUT_MS);

  const es = new EventSource(`${BASE_URL}/events`);

  es.onopen = () => {
    console.log('✅ SSE /events 연결 성공');
  };

  // 서버가 보내는 이벤트 타입: agent-ready (하이픈)
  es.addEventListener('agent-ready', (e) => {
    console.log('✅ agent-ready 수신:', e.data);
    clearTimeout(timer);
    es.close();
    resolve({ event: 'agent-ready', data: e.data });
  });

  // 에러 이벤트
  es.addEventListener('error', (e) => {
    console.log('서버 error 이벤트:', e.data || '');
  });

  es.onerror = (err) => {
    console.log('SSE 연결 오류 (재시도 중...)');
  };
});

console.log('\n✅ T3.2 통과 — agent-ready 수신');
process.exit(0);
