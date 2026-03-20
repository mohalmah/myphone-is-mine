import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';

export function useProcessSnapshot(sessionId: number | null) {
  return useQuery({
    queryKey: ['process-snapshot', sessionId],
    queryFn: () => ipc.processCommands.get_process_snapshot(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: 5_000,
  });
}

export function useThermalSamples(sessionId: number | null, limit = 100) {
  return useQuery({
    queryKey: ['thermal-samples', sessionId, limit],
    queryFn: () => ipc.processCommands.get_thermal_samples(sessionId!, limit),
    enabled: sessionId !== null,
    refetchInterval: 30_000,
  });
}

export function useSystemResources(sessionId: number | null) {
  return useQuery({
    queryKey: ['system-resources', sessionId],
    queryFn: () => ipc.processCommands.get_system_resources(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: 3_000,
  });
}
