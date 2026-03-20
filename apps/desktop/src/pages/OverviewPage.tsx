import React from 'react';
import { useDeviceStore, selectedDeviceSelector } from '@/stores/deviceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { DevicePanel } from '@/components/layout/DevicePanel';
import { useConnectDevice } from '@/hooks/useDevice';
import { useCurrentBattery } from '@/hooks/useBattery';
import { useStorageOverview } from '@/hooks/useStorage';
import { useTopAppsByTraffic } from '@/hooks/useNetwork';
import { formatBytes, formatBatteryLevel } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';
import { Badge } from '@/components/common/Badge';

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const selectedDevice = useDeviceStore(selectedDeviceSelector);
  const activeSession = useSessionStore((s) => s.activeSession);
  const { mutate: connect, isPending: isConnecting } = useConnectDevice();
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const sessionId = activeSession?.id ?? null;
  const { data: batteryStats } = useCurrentBattery(sessionId);
  const { data: storage } = useStorageOverview(sessionId);
  const { data: topApps = [] } = useTopAppsByTraffic(sessionId, 5);

  return (
    <div className="p-4 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Overview
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect to a device to start monitoring.
        </p>
      </div>

      {/* Device list */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Connected Devices
        </h2>
        <DevicePanel />
        {selectedDevice && !activeSession && (
          <button
            type="button"
            onClick={() => connect(selectedDevice.serial)}
            disabled={isConnecting}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Start Session'}
          </button>
        )}
      </section>

      {/* Device info cards */}
      {selectedDevice && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Device Info
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Model"
              value={selectedDevice.model ?? 'Unknown'}
              sub={selectedDevice.manufacturer ?? undefined}
            />
            <StatCard
              label="Android"
              value={selectedDevice.android_version ?? '—'}
              sub={selectedDevice.sdk_level ? `SDK ${selectedDevice.sdk_level}` : undefined}
            />
            {batteryStats && (
              <StatCard
                label="Battery"
                value={formatBatteryLevel(batteryStats.current_level)}
                sub={batteryStats.is_charging ? 'Charging' : undefined}
              />
            )}
            {storage && (
              <StatCard
                label="Storage"
                value={formatBytes(storage.used_bytes, friendlyMode)}
                sub={`of ${formatBytes(storage.total_bytes, friendlyMode)}`}
              />
            )}
          </div>
        </section>
      )}

      {/* Top apps by traffic */}
      {topApps.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Top Apps by Traffic
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {topApps.map((app) => (
              <div key={app.package_name} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {app.app_label ?? app.package_name}
                </span>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>↑ {formatBytes(app.bytes_sent, friendlyMode)}</span>
                  <span>↓ {formatBytes(app.bytes_received, friendlyMode)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Capabilities */}
      {selectedDevice && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Capabilities
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant={selectedDevice.is_rooted ? 'success' : 'muted'} size="sm">
              Root: {selectedDevice.is_rooted ? 'Yes' : 'No'}
            </Badge>
            <Badge variant={selectedDevice.has_helper ? 'success' : 'muted'} size="sm">
              Helper App: {selectedDevice.has_helper ? 'Installed' : 'Not installed'}
            </Badge>
            {activeSession && (
              <Badge variant="default" size="sm">
                Mode: {activeSession.mode}
              </Badge>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
