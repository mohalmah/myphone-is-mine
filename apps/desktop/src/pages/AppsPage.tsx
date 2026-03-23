import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { useApps } from '@/hooks/useApps';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { formatBytes } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';
import type { ColumnDef } from '@tanstack/react-table';
import type { Package } from '@/types';

type AppFilter = 'all' | 'user' | 'system';

export default function AppsPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const serial = activeSession?.serial ?? null;
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const { data: apps, isLoading } = useApps(serial);
  const displayApps = apps ?? [];

  const [filter, setFilter] = useState<AppFilter>('all');
  const [globalFilter, setGlobalFilter] = useState('');

  const filteredApps = useMemo(() => {
    return displayApps.filter((app) => {
      if (filter === 'user' && app.is_system) return false;
      if (filter === 'system' && !app.is_system) return false;
      return true;
    });
  }, [displayApps, filter]);

  const columns: ColumnDef<Package>[] = [
    {
      accessorKey: 'package_name',
      header: 'Package',
      cell: ({ row }) => (
        <Link
          to={`/apps/${row.original.package_name}`}
          className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {row.original.package_name}
        </Link>
      ),
    },
    {
      accessorKey: 'version_name',
      header: 'Version',
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.version_name ?? '—'}
          {row.original.version_code != null && (
            <span className="text-gray-400 ml-1">({row.original.version_code})</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'apk_size_bytes',
      header: 'APK Size',
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return (
          <span className="text-xs">
            {v != null ? formatBytes(v, friendlyMode) : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'target_sdk',
      header: 'SDK',
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.min_sdk != null ? `${row.original.min_sdk}+` : ''}
          {row.original.target_sdk != null ? ` / ${row.original.target_sdk}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'installer',
      header: 'Installer',
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        const label = v?.replace('com.android.', '').replace('com.google.android.', 'Google ') ?? '—';
        return <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>;
      },
    },
    {
      accessorKey: 'last_update_time',
      header: 'Updated',
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        if (!v) return <span className="text-xs">—</span>;
        // Android format: "2023-01-15 10:30:00"
        return <span className="text-xs text-gray-600 dark:text-gray-400">{v.slice(0, 10)}</span>;
      },
    },
    {
      accessorKey: 'is_system',
      header: 'Type',
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? 'muted' : 'default'} size="sm">
          {getValue() ? 'System' : 'User'}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_enabled',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? 'success' : 'muted'} size="sm">
          {getValue() ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link
          to={`/apps/${row.original.package_name}`}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Details →
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <input
          type="text"
          placeholder="Search apps..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 w-64"
        />

        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {(['all', 'user', 'system'] as AppFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1 text-xs rounded-md transition-colors capitalize
                ${filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }
              `}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {filteredApps.length} apps
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <DataTable
          data={filteredApps}
          columns={columns}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          isLoading={isLoading}
          emptyMessage={serial ? 'No apps found.' : 'Connect a device to list apps.'}
        />
      </div>
    </div>
  );
}
