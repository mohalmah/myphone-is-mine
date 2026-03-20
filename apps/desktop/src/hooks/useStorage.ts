import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';

export function useStorageOverview(sessionId: number | null) {
  return useQuery({
    queryKey: ['storage-overview', sessionId],
    queryFn: () => ipc.storageCommands.get_storage_overview(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: 60_000,
  });
}

export function useAppStorageBreakdown(sessionId: number | null) {
  return useQuery({
    queryKey: ['app-storage-breakdown', sessionId],
    queryFn: () => ipc.storageCommands.get_app_storage_breakdown(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: 120_000,
  });
}
