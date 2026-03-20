import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppDetail } from '@/hooks/useApps';
import { Badge } from '@/components/common/Badge';

export default function AppDetailPage() {
  const { pkg } = useParams<{ pkg: string }>();
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;

  const { data: app, isLoading } = useAppDetail(sessionId, pkg ?? null);

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="p-4">
        <Link to="/apps" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Apps
        </Link>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {sessionId ? 'App not found.' : 'Connect a device to view app details.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link to="/apps" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Apps
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {app.app_label ?? app.package_name}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {app.app_label ?? app.package_name}
        </h1>
        <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mt-0.5">
          {app.package_name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Version</p>
          <p className="font-medium">{app.version_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Version Code</p>
          <p className="font-medium">{app.version_code ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
          <Badge variant={app.is_system ? 'muted' : 'default'} size="sm">
            {app.is_system ? 'System' : 'User'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
          <Badge variant={app.is_enabled ? 'success' : 'muted'} size="sm">
            {app.is_enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Target SDK</p>
          <p className="font-medium">{app.target_sdk ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Min SDK</p>
          <p className="font-medium">{app.min_sdk ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Installer</p>
          <p className="font-medium font-mono text-xs">{app.installer ?? '—'}</p>
        </div>
      </div>

      {/* Permissions */}
      {app.permissions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Permissions ({app.permissions.length})
          </h2>
          <div className="space-y-1">
            {app.permissions.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center justify-between py-1.5 px-3 rounded bg-gray-50 dark:bg-gray-800"
              >
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                  {perm.permission.replace('android.permission.', '')}
                </span>
                <Badge variant={perm.is_granted ? 'success' : 'muted'} size="sm">
                  {perm.is_granted ? 'Granted' : 'Denied'}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
