import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatusBar } from '@/components/layout/StatusBar';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { useUIStore } from '@/stores/uiStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { useDeviceList } from '@/hooks/useDevice';
import { ipc } from '@/services/ipc';

export function AppLayout() {
  const darkMode = useUIStore((s) => s.darkMode);
  const { addOrUpdateDevice, removeDevice } = useDeviceStore();

  // Keep device list fresh
  useDeviceList();

  // Subscribe to device connect/disconnect events
  useEffect(() => {
    let unlistenConnected: (() => void) | undefined;
    let unlistenDisconnected: (() => void) | undefined;

    void ipc.events.onDeviceConnected((info) => {
      addOrUpdateDevice(info);
    }).then((fn) => { unlistenConnected = fn; });

    void ipc.events.onDeviceDisconnected((serial) => {
      removeDevice(serial);
    }).then((fn) => { unlistenDisconnected = fn; });

    return () => {
      unlistenConnected?.();
      unlistenDisconnected?.();
    };
  }, [addOrUpdateDevice, removeDevice]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
          <InsightsPanel />
        </div>
        <StatusBar />
      </div>
    </div>
  );
}
