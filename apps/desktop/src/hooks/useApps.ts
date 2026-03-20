import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';

export function useApps(sessionId: number | null) {
  return useQuery({
    queryKey: ['apps', sessionId],
    queryFn: () => ipc.appCommands.list_packages(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: 60_000,
  });
}

export function useAppDetail(sessionId: number | null, packageName: string | null) {
  return useQuery({
    queryKey: ['app', sessionId, packageName],
    queryFn: () =>
      ipc.appCommands.get_package_detail(sessionId!, packageName!),
    enabled: sessionId !== null && packageName !== null,
    staleTime: 30_000,
  });
}

export function useForceStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      packageName,
    }: {
      sessionId: number;
      packageName: string;
    }) => ipc.appCommands.force_stop(sessionId, packageName),
    onSuccess: (_data, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['apps', sessionId] });
    },
  });
}

export function useClearData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      packageName,
    }: {
      sessionId: number;
      packageName: string;
    }) => ipc.appCommands.clear_data(sessionId, packageName),
    onSuccess: (_data, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['apps', sessionId] });
    },
  });
}

export function useDisableApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      packageName,
    }: {
      sessionId: number;
      packageName: string;
    }) => ipc.appCommands.disable_app(sessionId, packageName),
    onSuccess: (_data, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['apps', sessionId] });
    },
  });
}

export function useUninstallApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      packageName,
      keepData = false,
    }: {
      sessionId: number;
      packageName: string;
      keepData?: boolean;
    }) => ipc.appCommands.uninstall_app(sessionId, packageName, keepData),
    onSuccess: (_data, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['apps', sessionId] });
    },
  });
}
