import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Overview', icon: '⊞' },
  { path: '/live', label: 'Live Activity', icon: '▶' },
  { path: '/apps', label: 'Apps', icon: '⬜' },
  { path: '/network', label: 'Network', icon: '⇄' },
  { path: '/requests', label: 'Requests', icon: '↔' },
  { path: '/logs', label: 'Logs', icon: '≡' },
  { path: '/storage', label: 'Storage', icon: '⬡' },
  { path: '/battery', label: 'Battery', icon: '⚡' },
  { path: '/process', label: 'Process', icon: '⚙' },
  { path: '/usage', label: 'Usage', icon: '◷' },
  { path: '/controls', label: 'Controls', icon: '⊙' },
  { path: '/advanced', label: 'Advanced', icon: '⌥' },
  { path: '/reports', label: 'Reports', icon: '⊞' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`
        flex flex-col bg-gray-900 text-gray-100 transition-all duration-200 flex-shrink-0
        ${sidebarCollapsed ? 'w-12' : 'w-48'}
      `}
    >
      {/* Logo / collapse toggle */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-700">
        {!sidebarCollapsed && (
          <span className="text-sm font-bold text-white tracking-wide">PhoneScope</span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-sm transition-colors
              ${isActive
                ? 'bg-blue-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }
              ${sidebarCollapsed ? 'justify-center' : ''}`
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
