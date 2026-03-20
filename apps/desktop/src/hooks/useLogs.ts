import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';
import type { LogEntry, LogFilter, DeviceEvent } from '@/types';

export function useLogs(sessionId: number | null, filter: LogFilter = {}) {
  return useQuery({
    queryKey: ['logs', sessionId, filter],
    queryFn: () => ipc.logCommands.get_logs(sessionId!, filter),
    enabled: sessionId !== null,
    refetchInterval: 5_000,
  });
}

export function useLogTags(sessionId: number | null) {
  return useQuery({
    queryKey: ['log-tags', sessionId],
    queryFn: () => ipc.logCommands.get_log_tags(sessionId!),
    enabled: sessionId !== null,
    staleTime: 30_000,
  });
}

/**
 * Live log stream hook — subscribes to real-time device events from Rust,
 * filters for Log type events, and maintains a rolling buffer.
 */
export function useLogStream(sessionId: number | null, maxEntries = 1000) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);

  const clearLogs = useCallback(() => setLogs([]), []);
  const togglePause = useCallback(() => setPaused((p) => !p), []);

  useEffect(() => {
    if (sessionId === null) return;

    let unlisten: (() => void) | undefined;

    void ipc.events.onDeviceEvent((event: DeviceEvent) => {
      if (paused) return;
      if (event.type === 'Log' && event.meta.session_id === sessionId) {
        setLogs((prev) => {
          const next = [...prev, event.data];
          return next.length > maxEntries ? next.slice(-maxEntries) : next;
        });
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [sessionId, paused, maxEntries]);

  return { logs, paused, togglePause, clearLogs };
}
