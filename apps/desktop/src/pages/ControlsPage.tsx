import React, { useState } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useApps, useForceStop, useClearData, useDisableApp, useUninstallApp } from '@/hooks/useApps';
import type { Package } from '@/types';

interface ConfirmDialog {
  type: 'force_stop' | 'clear_data' | 'disable' | 'uninstall';
  pkg: Package;
}

const ACTION_LABELS = {
  force_stop: 'Force Stop',
  clear_data: 'Clear Data',
  disable: 'Disable',
  uninstall: 'Uninstall',
};

const ACTION_DESCRIPTIONS = {
  force_stop: 'Force stop this app. It will not lose any data.',
  clear_data: 'Clear all app data. This cannot be undone.',
  disable: 'Disable this app. It will not run until re-enabled.',
  uninstall: 'Uninstall this app. All data will be deleted.',
};

export default function ControlsPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const serial = activeSession?.serial ?? null;

  const { data: apps } = useApps(serial);
  const displayApps = apps ?? [];

  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);

  const forceStop = useForceStop();
  const clearData = useClearData();
  const disableApp = useDisableApp();
  const uninstallApp = useUninstallApp();

  const filteredApps = displayApps.filter((a) =>
    search
      ? (a.app_label ?? a.package_name).toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const handleConfirm = () => {
    if (!confirm || !serial) return;
    const { type, pkg } = confirm;
    const args = { serial, packageName: pkg.package_name };
    switch (type) {
      case 'force_stop':
        forceStop.mutate(args);
        break;
      case 'clear_data':
        clearData.mutate(args);
        break;
      case 'disable':
        disableApp.mutate(args);
        break;
      case 'uninstall':
        uninstallApp.mutate({ ...args, keepData: false });
        break;
    }
    setConfirm(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2">App Controls</h1>
        <input
          type="text"
          placeholder="Search apps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
        {!serial && (
          <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            Connect a device to perform actions.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
        {filteredApps.map((app) => (
          <div key={app.package_name} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {app.app_label ?? app.package_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {app.package_name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!serial}
                onClick={() => setConfirm({ type: 'force_stop', pkg: app })}
                className="px-2.5 py-1 text-xs rounded border border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-40 transition-colors"
              >
                Force Stop
              </button>
              <button
                type="button"
                disabled={!serial}
                onClick={() => setConfirm({ type: 'clear_data', pkg: app })}
                className="px-2.5 py-1 text-xs rounded border border-orange-400 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-40 transition-colors"
              >
                Clear Data
              </button>
              {!app.is_system && (
                <button
                  type="button"
                  disabled={!serial}
                  onClick={() => setConfirm({ type: 'uninstall', pkg: app })}
                  className="px-2.5 py-1 text-xs rounded border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                >
                  Uninstall
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {ACTION_LABELS[confirm.type]}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {confirm.pkg.app_label ?? confirm.pkg.package_name}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              {ACTION_DESCRIPTIONS[confirm.type]}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {ACTION_LABELS[confirm.type]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
