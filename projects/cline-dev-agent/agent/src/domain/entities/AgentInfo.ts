// v1: GET /agent/info → 단일 객체
// v2: GET /registry → IAgentInfo[] (Registry 확장 포인트)
export type AgentStatus = 'starting' | 'running' | 'idle' | 'finishing' | 'done' | 'error';

export interface AgentInfo {
  specId: string;
  port: number;
  status: AgentStatus;
  worktree: string;
  branch: string;
  testQueue?: string;
  startedAt: Date;
}
