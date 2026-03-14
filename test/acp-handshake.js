/**
 * acp-handshake.js
 * ACP WebSocket 핸드셰이크 컨포먼스 테스트 (T2.1)
 *
 * 검증 항목:
 * - WebSocket 연결 성공
 * - agent_ready 메시지 수신 (initialize + session/new 완료 신호)
 */

import { WebSocket } from 'ws';

const ACP_WS_URL = process.env.ACP_AGENT_URL
  ? process.env.ACP_AGENT_URL.replace('http://', 'ws://')
  : 'ws://localhost:3001';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '60000'); // Pi에서 npx 첫 다운로드 고려 60초

async function testACPHandshake() {
  console.log(`ACP WebSocket 핸드셰이크 테스트 시작 — ${ACP_WS_URL}`);
  console.log(`타임아웃: ${TIMEOUT_MS}ms`);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`타임아웃: ${TIMEOUT_MS}ms 초과 — agent_ready 미수신`));
    }, TIMEOUT_MS);

    const ws = new WebSocket(ACP_WS_URL);
    const received = [];

    ws.on('open', () => {
      console.log('✅ WebSocket 연결 성공');
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        console.log(`수신 [${msg.type}]:`, JSON.stringify(msg).slice(0, 200));
        received.push(msg.type);

        if (msg.type === 'agent_ready') {
          console.log('✅ agent_ready 수신 — ACP 핸드셰이크 완료!');
          clearTimeout(timer);
          ws.close(1000);
          resolve({ success: true, received });
        } else if (msg.type === 'error') {
          clearTimeout(timer);
          ws.close();
          reject(new Error(`서버 에러: ${msg.message}`));
        } else if (msg.type === 'agent_exit') {
          clearTimeout(timer);
          ws.close();
          reject(new Error(`에이전트 종료: code=${msg.code}`));
        }
      } catch {
        console.error('파싱 오류:', raw.toString().slice(0, 100));
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket 오류: ${err.message}`));
    });

    ws.on('close', (code, reason) => {
      if (code !== 1000 && code !== 1001 && !received.includes('agent_ready')) {
        clearTimeout(timer);
        reject(new Error(`WebSocket 비정상 종료: ${code} — 수신 메시지: ${received.join(', ')}`));
      }
    });
  });
}

testACPHandshake()
  .then((result) => {
    console.log('\n✅ T2.1 통과 — 수신된 메시지 타입:', result.received.join(', '));
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ T2.1 실패:', err.message);
    process.exit(1);
  });
