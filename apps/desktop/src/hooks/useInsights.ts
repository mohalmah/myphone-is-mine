import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';
import type { Insight } from '@/types';

export function useInsightsQuery(sessionId: number | null, limit = 50) {
  return useQuery({
    queryKey: ['insights', sessionId, limit],
    queryFn: () => ipc.insightCommands.get_insights(sessionId!, limit),
    enabled: sessionId !== null,
    refetchInterval: 30_000,
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (insightId: number) =>
      ipc.insightCommands.dismiss_insight(insightId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

/**
 * Combined hook: fetches insights from backend + listens for real-time
 * insight events pushed from Rust.
 */
export function useInsights(sessionId: number | null) {
  const [liveInsights, setLiveInsights] = useState<Insight[]>([]);
  const { data: fetchedInsights = [] } = useInsightsQuery(sessionId);
  const dismissMutation = useDismissInsight();

  // Subscribe to real-time insight events
  useEffect(() => {
    if (sessionId === null) return;

    let unlisten: (() => void) | undefined;

    void ipc.events.onInsightGenerated((insight: Insight) => {
      if (insight.session_id === sessionId) {
        setLiveInsights((prev) => [insight, ...prev].slice(0, 100));
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [sessionId]);

  // Merge live insights with fetched, deduplicate
  const allInsights = React.useMemo(() => {
    const ids = new Set(fetchedInsights.map((i) => i.id));
    return [
      ...liveInsights.filter((i) => !ids.has(i.id)),
      ...fetchedInsights,
    ];
  }, [liveInsights, fetchedInsights]);

  const dismiss = (insightId: number) => {
    setLiveInsights((prev) => prev.filter((i) => i.id !== insightId));
    dismissMutation.mutate(insightId);
  };

  return { insights: allInsights, dismiss };
}
