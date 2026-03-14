import { Request, Response } from 'express';
import { IEventBus, SSEEvent } from '../../domain/ports/IEventBus';
import { AgentService } from '../../application/services/AgentService';

// S: SSE 연결 관리 단일 책임
export class SSEController {
  private clients: Set<Response> = new Set();

  constructor(
    private readonly eventBus: IEventBus,
    private readonly agentService: AgentService,
  ) {
    // 이벤트 버스 구독 → 전체 SSE 클라이언트에 broadcast
    this.eventBus.subscribe((event) => this.broadcast(event));
  }

  handleConnect(req: Request, res: Response): void {
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.clients.add(res);

    // Lesson A03: race condition 방지 — 이미 ready면 즉시 전송
    this.send(res, { type: 'agent-ready', data: { sessionId: this.agentService.getSessionId() }, timestamp: new Date() });
    if (this.agentService.isReady()) {
      this.send(res, {
        type: 'agent-ready',
        data: { sessionId: this.agentService.getSessionId() },
        timestamp: new Date(),
      });
    }

    req.on('close', () => {
      this.clients.delete(res);
    });
  }

  private broadcast(event: SSEEvent): void {
    this.clients.forEach((res) => this.send(res, event));
  }

  private send(res: Response, event: SSEEvent): void {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  }
}
