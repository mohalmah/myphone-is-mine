import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';

export function useApps(serial: string | null) {
  return useQuery({
    queryKey: ['apps', serial],
    queryFn: () => ipc.appCommands.list_packages(serial!),
    enabled: serial !== null,
    refetchInterval: 60_000,
  });
}

export function useAppDetail(serial: string | null, packageName: string | null) {
  return useQuery({
    queryKey: ['app', serial, packageName],
    queryFn: () =>
      ipc.appCommands.get_package_detail(serial!, packageName!),
    enabled: serial !== null && packageName !== null,
    staleTime: 30_000,
  });
}

export function useForceStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serial,
      packageName,
    }: {
      serial: string;
      packageName: string;
    }) => ipc.appCommands.force_stop(serial, packageName),
    onSuccess: (_data, { serial }) => {
      void queryClient.invalidateQueries({ queryKey: ['apps', serial] });
    },
  });
}

export function useClearData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serial,
      packageName,
    }: {
      serial: string;
      packageName: string;
    }) => ipc.appCommands.clear_data(serial, packageName),
    onSuccess: (_data, { serial }) => {
      void queryClient.invalidateQueries({ queryKey: ['apps', serial] });
    },
  });
}

export function useDisableApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serial,
      packageName,
    }: {
      serial: string;
      packageName: string;
    }) => ipc.appCommands.disable_app(serial, packageName),
    onSuccess: (_data, { serial }) => {
      void queryClient.invalidateQueries({ queryKey: ['apps', serial] });
    },
  });
}

export function useUninstallApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serial,
      packageName,
      keepData = false,
    }: {
      serial: string;
      packageName: string;
      keepData?: boolean;
    }) => ipc.appCommands.uninstall_app(serial, packageName, keepData),
    onSuccess: (_data, { serial }) => {
      void queryClient.invalidateQueries({ queryKey: ['apps', serial] });
    },
  });
}
