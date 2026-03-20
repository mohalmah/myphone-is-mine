import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';

export function useUsageSummary(
  sessionId: number | null,
  periodStart: string,
  periodEnd: string,
) {
  return useQuery({
    queryKey: ['usage-summary', sessionId, periodStart, periodEnd],
    queryFn: () =>
      ipc.usageCommands.get_usage_summary(sessionId!, periodStart, periodEnd),
    enabled: sessionId !== null,
    staleTime: 300_000,
  });
}

export function useTopApps(
  sessionId: number | null,
  periodStart: string,
  periodEnd: string,
  limit = 10,
) {
  return useQuery({
    queryKey: ['top-apps', sessionId, periodStart, periodEnd, limit],
    queryFn: () =>
      ipc.usageCommands.get_top_apps(sessionId!, periodStart, periodEnd, limit),
    enabled: sessionId !== null,
    staleTime: 300_000,
  });
}

export function useHourlyDistribution(
  sessionId: number | null,
  date: string,
) {
  return useQuery({
    queryKey: ['hourly-distribution', sessionId, date],
    queryFn: () =>
      ipc.usageCommands.get_hourly_distribution(sessionId!, date),
    enabled: sessionId !== null,
    staleTime: 300_000,
  });
}

export function useSnapshots(deviceId: number | null) {
  return useQuery({
    queryKey: ['snapshots', deviceId],
    queryFn: () => ipc.usageCommands.list_snapshots(deviceId!),
    enabled: deviceId !== null,
    staleTime: 60_000,
  });
}

export function useGoalProgress(
  sessionId: number | null,
  date: string,
) {
  return useQuery({
    queryKey: ['goal-progress', sessionId, date],
    queryFn: () =>
      ipc.usageCommands.get_goal_progress(sessionId!, date),
    enabled: sessionId !== null,
    staleTime: 60_000,
  });
}

export function useTriggerSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      type,
    }: {
      sessionId: number;
      type: 'hourly' | 'daily' | 'weekly' | 'manual';
    }) => ipc.usageCommands.trigger_snapshot(sessionId, type),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });
}
