import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';

interface SettingsState {
  settings: AppSettings;
  isDirty: boolean;

  updateSettings: (partial: Partial<AppSettings>) => void;
  setSettings: (settings: AppSettings) => void;
  markClean: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  adb_path: null,
  proxy_port: 8080,
  log_retention_days: 7,
  network_retention_days: 30,
  http_retention_days: 14,
  redact_headers: ['Authorization', 'Cookie', 'Set-Cookie'],
  auto_snapshot: true,
  dark_mode: false,
  friendly_mode: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      isDirty: false,

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
          isDirty: true,
        })),

      setSettings: (settings) => set({ settings, isDirty: false }),

      markClean: () => set({ isDirty: false }),
    }),
    {
      name: 'phonescope-settings',
    },
  ),
);
