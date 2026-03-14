const BASE_URL = import.meta.env.VITE_AGENT_URL ?? 'http://localhost:3002';

export const AgentAPI = {
  async sendPrompt(content: string, sessionId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, sessionId }),
    });
    if (!res.ok) throw new Error(`prompt 전송 실패: ${res.status}`);
  },

  async respondPermission(requestId: string, approved: boolean): Promise<void> {
    const res = await fetch(`${BASE_URL}/permission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, approved }),
    });
    if (!res.ok) throw new Error(`권한 응답 실패: ${res.status}`);
  },

  async getHealth(): Promise<{ status: string; agentReady: boolean; sessionId: string }> {
    const res = await fetch(`${BASE_URL}/health`);
    return res.json();
  },

  getEventsUrl(): string {
    return `${BASE_URL}/events`;
  },
};
