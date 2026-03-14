import React, { createContext, useContext, useState, ReactNode } from 'react';

type ConnectionStatus = 'connecting' | 'ready' | 'busy' | 'error' | 'disconnected';

interface SessionContextValue {
  sessionId: string | null;
  status: ConnectionStatus;
  setSessionId: (id: string) => void;
  setStatus: (s: ConnectionStatus) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  return (
    <SessionContext.Provider value={{ sessionId, status, setSessionId, setStatus }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession: SessionProvider 밖에서 사용됨');
  return ctx;
}
