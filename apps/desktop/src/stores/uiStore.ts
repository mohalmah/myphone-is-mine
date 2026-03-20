import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  insightsPanelOpen: boolean;
  darkMode: boolean;
  friendlyMode: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleInsightsPanel: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  toggleFriendlyMode: () => void;
  setFriendlyMode: (friendly: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      insightsPanelOpen: true,
      darkMode: false,
      friendlyMode: true,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleInsightsPanel: () =>
        set((state) => ({ insightsPanelOpen: !state.insightsPanelOpen })),

      toggleDarkMode: () =>
        set((state) => ({ darkMode: !state.darkMode })),

      setDarkMode: (dark) => set({ darkMode: dark }),

      toggleFriendlyMode: () =>
        set((state) => ({ friendlyMode: !state.friendlyMode })),

      setFriendlyMode: (friendly) => set({ friendlyMode: friendly }),
    }),
    {
      name: 'phonescope-ui',
      partialize: (state: UIState) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        darkMode: state.darkMode,
        friendlyMode: state.friendlyMode,
      }),
    },
  ),
);
