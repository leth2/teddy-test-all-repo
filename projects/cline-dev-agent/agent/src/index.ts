import { buildContainer } from './container/DIContainer';

async function main() {
  const { agentService, server } = buildContainer();

  server.start();

  try {
    await agentService.start();
    console.log('[main] Cline 에이전트 준비 완료');
  } catch (err) {
    console.error('[main] 에이전트 시작 실패:', err);
    process.exit(1);
  }

  process.on('SIGTERM', () => {
    console.log('[main] SIGTERM — 종료');
    agentService.stop();
    process.exit(0);
  });
}

main();
