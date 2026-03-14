/**
 * sse-handshake.js
 * ACP SSE 핸드셰이크 컨포먼스 테스트 (T3.2)
 *
 * 검증 항목:
 * - POST /start → 에이전트 시작
 * - GET /events → SSE 스트림 연결
 * - agent_ready 이벤트 수신
 */

import { EventSource } from 'eventsource';

const BASE_URL = process.env.SSE_AGENT_URL || 'http://localhost:3002';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '60000');

async function testSSEHandshake() {
  console.log(`SSE 핸드셰이크 테스트 시작 — ${BASE_URL}`);
  console.log(`타임아웃: ${TIMEOUT_MS}ms`);

  // Step 1: POST /start — 에이전트 시작
  try {
    const startRes = await fetch(`${BASE_URL}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log(`POST /start → ${startRes.status}`);
    if (!startRes.ok && startRes.status !== 409) {
      // 409 = 이미 실행 중 (OK)
      throw new Error(`/start 실패: HTTP ${startRes.status}`);
    }
  } catch (err) {
    console.error('❌ /start 실패:', err.message);
    process.exit(1);
  }

  // Step 2: GET /events — SSE 스트림 구독
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      es.close();
      reject(new Error(`타임아웃: ${TIMEOUT_MS}ms 초과 — agent_ready 미수신`));
    }, TIMEOUT_MS);

    const es = new EventSource(`${BASE_URL}/events`);
    const received = [];

    es.addEventListener('agent_ready', (e) => {
      console.log('✅ agent_ready 수신:', e.data);
      received.push('agent_ready');
      clearTimeout(timer);
      es.close();
      resolve({ success: true, received });
    });

    es.addEventListener('error_event', (e) => {
      clearTimeout(timer);
      es.close();
      reject(new Error(`서버 에러: ${e.data}`));
    });

    es.onerror = (err) => {
      // SSE 연결 오류는 재시도가 기본 — 첫 연결 실패만 처리
      console.log('SSE 연결 오류 (재시도 중...):', err.message || 'unknown');
    };

    es.onopen = () => {
      console.log('✅ SSE /events 연결 성공');
    };
  });
}

// eventsource 패키지 확인
try {
  const { EventSource } = await import('eventsource');
  globalThis.EventSource = EventSource;
} catch {
  // Node 22+ native EventSource
}

testSSEHandshake()
  .then((result) => {
    console.log('\n✅ T3.2 통과 — 수신된 이벤트:', result.received.join(', '));
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ T3.2 실패:', err.message);
    process.exit(1);
  });
