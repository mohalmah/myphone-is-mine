import { useState, useEffect, useCallback } from 'react';
import type { DeviceEvent } from '@/types';
import { ipc } from '@/services/ipc';

/**
 * Hook for subscribing to real-time DeviceEvents from the Rust backend.
 * Events are pushed via Tauri event system (backed by the EventBus).
 */
export function useDeviceEvents(sessionId: number | null, maxEvents = 1000) {
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const clearEvents = useCallback(() => setEvents([]), []);

  useEffect(() => {
    if (sessionId === null) {
      setIsSubscribed(false);
      return;
    }

    let unlisten: (() => void) | undefined;
    setIsSubscribed(false);

    void ipc.events
      .onDeviceEvent((event: DeviceEvent) => {
        if (event.meta.session_id === sessionId) {
          setEvents((prev) => {
            const next = [...prev, event];
            return next.length > maxEvents ? next.slice(-maxEvents) : next;
          });
        }
      })
      .then((fn) => {
        unlisten = fn;
        setIsSubscribed(true);
      });

    return () => {
      unlisten?.();
      setIsSubscribed(false);
    };
  }, [sessionId, maxEvents]);

  return { events, isSubscribed, clearEvents };
}
