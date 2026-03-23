import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';
import { useDeviceStore } from '@/stores/deviceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useEffect } from 'react';

export function useDeviceList() {
  const { setDevices } = useDeviceStore();

  const query = useQuery({
    queryKey: ['devices'],
    queryFn: () => ipc.deviceCommands.list_devices(),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (query.data) {
      setDevices(query.data);
    }
  }, [query.data, setDevices]);

  return query;
}

export function useConnectDevice() {
  const queryClient = useQueryClient();
  const { selectDevice, setConnecting, setConnectionError } = useDeviceStore();
  const { setActiveSession } = useSessionStore();

  return useMutation({
    mutationFn: (serial: string) => ipc.sessionCommands.start_session(serial),
    onMutate: (serial) => {
      selectDevice(serial);
      setConnecting(true);
      setConnectionError(null);
    },
    onSuccess: (session) => {
      setActiveSession(session);
      setConnecting(false);
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error: Error) => {
      setConnecting(false);
      setConnectionError(error.message);
    },
  });
}

export function useDisconnectDevice() {
  const { setActiveSession } = useSessionStore();

  return useMutation({
    mutationFn: ({ serial, sessionId }: { serial: string; sessionId: number }) =>
      ipc.sessionCommands.stop_session(serial, sessionId).then(() =>
        ipc.deviceCommands.disconnect_device(serial),
      ),
    onSuccess: () => {
      setActiveSession(null);
    },
  });
}

export function useCapabilities(serial: string | null) {
  const { setCapabilities } = useDeviceStore();

  const query = useQuery({
    queryKey: ['capabilities', serial],
    queryFn: () => ipc.deviceCommands.get_capabilities(serial!),
    enabled: serial !== null,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) {
      setCapabilities(query.data);
    }
  }, [query.data, setCapabilities]);

  return query;
}
