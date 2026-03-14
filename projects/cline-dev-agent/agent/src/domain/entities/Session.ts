export type SessionStatus = 'initializing' | 'ready' | 'busy' | 'error' | 'closed';

export interface Session {
  id: string;
  cwd: string;
  status: SessionStatus;
  createdAt: Date;
}
