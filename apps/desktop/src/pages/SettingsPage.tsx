import React, { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { ipc } from '@/services/ipc';
import { Toggle } from '@/components/common/Toggle';

export default function SettingsPage() {
  const { settings, updateSettings, setSettings, markClean, isDirty } = useSettingsStore();

  // Load settings from backend on mount
  useEffect(() => {
    void ipc.settingsCommands.get_settings().then((s) => {
      setSettings(s);
    });
  }, [setSettings]);

  const handleSave = async () => {
    try {
      await ipc.settingsCommands.update_settings(settings);
      markClean();
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
        {isDirty && (
          <button
            type="button"
            onClick={() => void handleSave()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        )}
      </div>

      {/* ADB */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">ADB</h2>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            ADB Path (leave empty for auto-detect)
          </label>
          <input
            type="text"
            placeholder="/usr/bin/adb"
            value={settings.adb_path ?? ''}
            onChange={(e) => updateSettings({ adb_path: e.target.value || null })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
      </section>

      {/* Proxy */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proxy</h2>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Proxy Port
          </label>
          <input
            type="number"
            value={settings.proxy_port}
            onChange={(e) => updateSettings({ proxy_port: Number(e.target.value) })}
            className="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      </section>

      {/* Retention */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data Retention</h2>
        {[
          { key: 'log_retention_days' as const, label: 'Log retention (days)' },
          { key: 'network_retention_days' as const, label: 'Network retention (days)' },
          { key: 'http_retention_days' as const, label: 'HTTP request retention (days)' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
            <input
              type="number"
              value={settings[key]}
              onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right"
            />
          </div>
        ))}
      </section>

      {/* Display */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Display</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</p>
          </div>
          <Toggle
            checked={settings.dark_mode}
            onChange={(v) => updateSettings({ dark_mode: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">Friendly Mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Show human-readable values instead of raw data</p>
          </div>
          <Toggle
            checked={settings.friendly_mode}
            onChange={(v) => updateSettings({ friendly_mode: v })}
          />
        </div>
      </section>

      {/* Usage snapshots */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Usage Tracking</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">Auto Snapshot</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Automatically capture usage snapshots while connected</p>
          </div>
          <Toggle
            checked={settings.auto_snapshot}
            onChange={(v) => updateSettings({ auto_snapshot: v })}
          />
        </div>
      </section>
    </div>
  );
}
