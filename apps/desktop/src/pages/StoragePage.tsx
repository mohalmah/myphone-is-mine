import React from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useStorageOverview, useAppStorageBreakdown } from '@/hooks/useStorage';
import { formatBytes } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';

export default function StoragePage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const { data: overview } = useStorageOverview(sessionId);
  const { data: appBreakdown = [] } = useAppStorageBreakdown(sessionId);

  const usedPercent = overview ? Math.round((overview.used_bytes / overview.total_bytes) * 100) : 0;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Storage</h1>

      {/* Overview */}
      <section>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              {formatBytes(overview?.used_bytes ?? 0, friendlyMode)} used
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {formatBytes(overview?.free_bytes ?? 0, friendlyMode)} free of {formatBytes(overview?.total_bytes ?? 0, friendlyMode)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${usedPercent > 90 ? 'bg-red-500' : usedPercent > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{usedPercent}% used</p>
        </div>
      </section>

      {/* App breakdown */}
      {appBreakdown.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Per-App Storage
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {appBreakdown
              .sort((a, b) => b.size_bytes - a.size_bytes)
              .map((app) => (
                <div key={app.package_name} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {app.app_label ?? app.package_name}
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatBytes(app.size_bytes, friendlyMode)}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {appBreakdown.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {sessionId ? 'No storage data available.' : 'Connect a device to view storage details.'}
        </p>
      )}
    </div>
  );
}
