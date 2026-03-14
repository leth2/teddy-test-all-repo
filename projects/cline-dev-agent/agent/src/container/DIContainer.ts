import { ClineACPBridge } from '../infrastructure/acp/ClineACPBridge';
import { EventBus } from '../infrastructure/http/EventBus';
import { SSEController } from '../infrastructure/http/SSEController';
import { AgentService } from '../application/services/AgentService';
import { SendPrompt } from '../application/usecases/SendPrompt';
import { HandlePermission } from '../application/usecases/HandlePermission';
import { ExpressServer } from '../infrastructure/http/ExpressServer';
import { createRouter } from '../infrastructure/http/routes';

// D: 의존성 주입 — 상위 레이어가 인터페이스에 의존하도록 여기서 조립
export function buildContainer() {
  const port = parseInt(process.env.PORT ?? '3002');
  const cwd = process.env.WORKSPACE ?? process.cwd();

  // Infrastructure
  const bridge = new ClineACPBridge(cwd);
  const eventBus = new EventBus();

  // Application
  const agentService = new AgentService(bridge, eventBus);
  const sendPrompt = new SendPrompt(bridge);
  const handlePermission = new HandlePermission(bridge);

  // Presentation
  const sseController = new SSEController(eventBus, agentService);
  const router = createRouter(sseController, agentService, sendPrompt, handlePermission);
  const server = new ExpressServer(port, router);

  return { agentService, server };
}
