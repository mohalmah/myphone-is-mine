import React from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useUsageSummary } from '@/hooks/useUsage';
import { formatDuration, formatTimestamp } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';
import { MOCK_USAGE_SUMMARY } from '@/services/mockData';

export default function UsagePage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);

  const { data: summary } = useUsageSummary(
    sessionId,
    yesterday.toISOString(),
    today.toISOString(),
  );

  const displaySummary = summary ?? MOCK_USAGE_SUMMARY;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">App Usage</h1>

      {/* Screen time summary */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Screen Time (24h)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(displaySummary.total_screen_on_ms, friendlyMode)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Unlocks (24h)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {displaySummary.unlock_count}
          </p>
        </div>
      </section>

      {/* Top apps */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Top Apps by Screen Time
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {displaySummary.top_apps.map((app) => {
            const totalMs = displaySummary.total_screen_on_ms || 1;
            const pct = Math.round((app.foreground_time_ms / totalMs) * 100);
            return (
              <div key={app.package_id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {app.app_label ?? app.package_name ?? `App ${app.package_id}`}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {formatDuration(app.foreground_time_ms, friendlyMode)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{app.launch_count} launches</span>
                  {app.notifications_posted > 0 && (
                    <span>{app.notifications_posted} notifications</span>
                  )}
                  {app.last_time_used && (
                    <span>Last: {formatTimestamp(app.last_time_used, friendlyMode)}</span>
                  )}
                </div>
              </div>
            );
          })}
          {displaySummary.top_apps.length === 0 && (
            <p className="px-4 py-8 text-sm text-center text-gray-500 dark:text-gray-400">
              No usage data available.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
