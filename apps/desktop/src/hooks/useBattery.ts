import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';

export function useBatteryTimeline(sessionId: number | null, limit = 288) {
  return useQuery({
    queryKey: ['battery-timeline', sessionId, limit],
    queryFn: () => ipc.batteryCommands.get_battery_timeline(sessionId!, limit),
    enabled: sessionId !== null,
    refetchInterval: 60_000,
  });
}

export function useCurrentBattery(sessionId: number | null) {
  return useQuery({
    queryKey: ['battery-current', sessionId],
    queryFn: () => ipc.batteryCommands.get_current_battery(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: 30_000,
  });
}

export function useBatteryStats(sessionId: number | null) {
  return useQuery({
    queryKey: ['battery-stats', sessionId],
    queryFn: () => ipc.batteryCommands.get_battery_stats(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: 60_000,
  });
}
