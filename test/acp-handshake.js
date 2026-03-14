/**
 * acp-handshake.js
 * ACP WebSocket 핸드셰이크 컨포먼스 테스트 (T2.1)
 *
 * 검증 항목:
 * - WebSocket 연결 성공
 * - agent_ready 메시지 수신
 */

import { WebSocket } from 'ws';

const ACP_WS_URL = process.env.ACP_AGENT_URL
  ? process.env.ACP_AGENT_URL.replace('http://', 'ws://')
  : 'ws://localhost:3001';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '10000');

async function testACPHandshake() {
  console.log(`ACP WebSocket 핸드셰이크 테스트 시작 — ${ACP_WS_URL}`);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`타임아웃: ${TIMEOUT_MS}ms 초과`));
    }, TIMEOUT_MS);

    const ws = new WebSocket(ACP_WS_URL);

    ws.on('open', () => {
      console.log('✅ WebSocket 연결 성공');
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        console.log('수신:', JSON.stringify(msg));

        if (msg.type === 'agent_ready') {
          console.log('✅ agent_ready 수신 — ACP 핸드셰이크 완료');
          clearTimeout(timer);
          ws.close();
          resolve(true);
        }
      } catch {
        console.error('파싱 오류:', raw.toString());
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.on('close', (code) => {
      if (code !== 1000 && code !== 1001) {
        clearTimeout(timer);
        reject(new Error(`WebSocket 비정상 종료: ${code}`));
      }
    });
  });
}

testACPHandshake()
  .then(() => {
    console.log('\n✅ ACP 핸드셰이크 통과');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ ACP 핸드셰이크 실패:', err.message);
    process.exit(1);
  });
