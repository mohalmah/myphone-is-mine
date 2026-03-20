import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useDeviceStore, selectedDeviceSelector } from '@/stores/deviceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Toggle } from '@/components/common/Toggle';
import { Badge } from '@/components/common/Badge';

export function Header() {
  const { darkMode, toggleDarkMode, friendlyMode, toggleFriendlyMode } = useUIStore();
  const selectedDevice = useDeviceStore(selectedDeviceSelector);
  const activeSession = useSessionStore((s) => s.activeSession);

  const modeBadgeVariant =
    activeSession?.mode === 'root'
      ? 'error'
      : activeSession?.mode === 'proxy'
      ? 'warning'
      : activeSession?.mode === 'helper'
      ? 'success'
      : 'muted';

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 h-12">
      {/* Left: device info */}
      <div className="flex items-center gap-3">
        {selectedDevice ? (
          <>
            <span className="font-medium text-sm text-gray-900 dark:text-white">
              {selectedDevice.model ?? selectedDevice.serial}
            </span>
            {selectedDevice.android_version && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Android {selectedDevice.android_version}
              </span>
            )}
            {activeSession && (
              <Badge variant={modeBadgeVariant} size="sm">
                {activeSession.mode.charAt(0).toUpperCase() + activeSession.mode.slice(1)} Mode
              </Badge>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">No device connected</span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-4">
        <Toggle
          checked={friendlyMode}
          onChange={toggleFriendlyMode}
          label={friendlyMode ? 'Friendly' : 'Raw'}
        />
        <Toggle
          checked={darkMode}
          onChange={toggleDarkMode}
          label={darkMode ? 'Dark' : 'Light'}
        />
      </div>
    </header>
  );
}
