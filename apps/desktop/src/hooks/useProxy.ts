import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';

export function useProxyStatus() {
  return useQuery({
    queryKey: ['proxy-status'],
    queryFn: () => ipc.proxyCommands.get_proxy_status(),
    refetchInterval: 5_000,
  });
}

export function useStartProxy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (port?: number) => ipc.proxyCommands.start_proxy(port),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['proxy-status'] });
    },
  });
}

export function useStopProxy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipc.proxyCommands.stop_proxy(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['proxy-status'] });
    },
  });
}
