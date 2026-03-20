import React from 'react';
import { useDeviceStore, selectedDeviceSelector } from '@/stores/deviceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Badge } from '@/components/common/Badge';

export function DevicePanel() {
  const devices = useDeviceStore((s) => s.devices);
  const selectedDevice = useDeviceStore(selectedDeviceSelector);
  const { selectDevice, isConnecting } = useDeviceStore();
  const activeSession = useSessionStore((s) => s.activeSession);

  if (devices.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
          No devices connected
        </p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
          Connect an Android device via USB and enable USB debugging.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {devices.map((device) => {
        const isSelected = selectedDevice?.serial === device.serial;
        return (
          <button
            key={device.serial}
            type="button"
            onClick={() => selectDevice(device.serial)}
            disabled={isConnecting}
            className={`
              w-full text-left p-3 rounded-lg border transition-all
              ${isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-gray-900 dark:text-white">
                {device.model ?? device.serial}
              </span>
              <div className="flex items-center gap-1">
                {device.is_rooted && (
                  <Badge variant="warning" size="sm">Root</Badge>
                )}
                {device.has_helper && (
                  <Badge variant="success" size="sm">Helper</Badge>
                )}
                {isSelected && activeSession && (
                  <Badge variant="default" size="sm">Connected</Badge>
                )}
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {device.serial}
              {device.android_version && ` • Android ${device.android_version}`}
              {device.sdk_level && ` (SDK ${device.sdk_level})`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
