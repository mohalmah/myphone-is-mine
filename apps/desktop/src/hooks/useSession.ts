import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';
import { useSessionStore } from '@/stores/sessionStore';
import { useEffect } from 'react';

export function useActiveSessions() {
  const { setActiveSession } = useSessionStore();

  const query = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: () => ipc.sessionCommands.get_active_sessions(),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      setActiveSession(query.data[0]);
    }
  }, [query.data, setActiveSession]);

  return query;
}

export function useSessionHistory(deviceId: number | null) {
  const { setSessionHistory } = useSessionStore();

  const query = useQuery({
    queryKey: ['sessions', 'history', deviceId],
    queryFn: () => ipc.sessionCommands.get_session_history(deviceId!),
    enabled: deviceId !== null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setSessionHistory(query.data);
    }
  }, [query.data, setSessionHistory]);

  return query;
}
