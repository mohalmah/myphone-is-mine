import { create } from 'zustand';
import type { SessionInfo } from '@/types';

interface SessionState {
  activeSession: SessionInfo | null;
  sessionHistory: SessionInfo[];

  setActiveSession: (session: SessionInfo | null) => void;
  setSessionHistory: (sessions: SessionInfo[]) => void;
  endSession: (sessionId: number) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  sessionHistory: [],

  setActiveSession: (session) => set({ activeSession: session }),

  setSessionHistory: (sessions) => set({ sessionHistory: sessions }),

  endSession: (sessionId) =>
    set((state) => ({
      activeSession:
        state.activeSession?.id === sessionId ? null : state.activeSession,
      sessionHistory: state.sessionHistory.map((s) =>
        s.id === sessionId
          ? { ...s, ended_at: new Date().toISOString() }
          : s,
      ),
    })),
}));
