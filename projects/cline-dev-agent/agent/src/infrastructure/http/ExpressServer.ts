import express, { Express } from 'express';
import cors from 'cors';
import { Router } from 'express';

// S: 서버 설정 단일 책임
export class ExpressServer {
  private readonly app: Express;
  private readonly port: number;

  constructor(port: number, router: Router) {
    this.port = port;
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(router);
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`[server] http://localhost:${this.port} 시작`);
    });
  }
}
