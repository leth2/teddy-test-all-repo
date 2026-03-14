import { Router } from 'express';
import { SSEController } from './SSEController';
import { SendPrompt } from '../../application/usecases/SendPrompt';
import { HandlePermission } from '../../application/usecases/HandlePermission';
import { AgentService } from '../../application/services/AgentService';
import { AgentInfo } from '../../domain/entities/AgentInfo';

const SPEC_ID = process.env.SPEC_ID ?? 'dev';
const PORT = parseInt(process.env.PORT ?? '3002');
const WORKTREE = process.env.WORKTREE ?? process.cwd();
const BRANCH = process.env.BRANCH ?? 'main';
const START_TIME = new Date();

export function createRouter(
  sseController: SSEController,
  agentService: AgentService,
  sendPrompt: SendPrompt,
  handlePermission: HandlePermission,
): Router {
  const router = Router();

  // GET /events — SSE 스트림
  router.get('/events', (req, res) => {
    sseController.handleConnect(req, res);
  });

  // GET /health
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      agentReady: agentService.isReady(),
      sessionId: agentService.getSessionId(),
    });
  });

  // GET /agent/info — v1 단일 응답, v2 Registry 확장 포인트
  router.get('/agent/info', (req, res) => {
    const info: AgentInfo = {
      specId: SPEC_ID,
      port: PORT,
      status: agentService.isReady() ? 'running' : 'starting',
      worktree: WORKTREE,
      branch: BRANCH,
      startedAt: START_TIME,
    };
    res.json(info);
  });

  // POST /prompt
  router.post('/prompt', (req, res) => {
    const { content, sessionId } = req.body as { content?: string; sessionId?: string };
    if (!content) {
      res.status(400).json({ error: 'content 필드가 필요합니다' });
      return;
    }
    try {
      sendPrompt.execute({
        content,
        sessionId: sessionId ?? agentService.getSessionId() ?? '',
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(503).json({ error: String(err) });
    }
  });

  // POST /permission
  router.post('/permission', (req, res) => {
    const { requestId, approved } = req.body as { requestId?: string; approved?: boolean };
    if (!requestId || approved === undefined) {
      res.status(400).json({ error: 'requestId, approved 필드가 필요합니다' });
      return;
    }
    handlePermission.execute({ requestId, approved });
    res.json({ ok: true });
  });

  return router;
}
