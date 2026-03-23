import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppDetail } from '@/hooks/useApps';
import { Badge } from '@/components/common/Badge';
import { formatBytes } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-medium text-sm mt-0.5">{value ?? '—'}</p>
    </div>
  );
}

export default function AppDetailPage() {
  const { pkg } = useParams<{ pkg: string }>();
  const activeSession = useSessionStore((s) => s.activeSession);
  const serial = activeSession?.serial ?? null;
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const { data: app, isLoading } = useAppDetail(serial, pkg ?? null);

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
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
          {serial ? 'App not found.' : 'Connect a device to view app details.'}
        </p>
      </div>
    );
  }

  const totalSize =
    (app.apk_size_bytes ?? 0) + (app.data_size_bytes ?? 0) + (app.cache_size_bytes ?? 0);

  return (
    <div className="p-4 space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to="/apps" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Apps
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
          {app.package_name}
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
          {app.package_name}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={app.is_system ? 'muted' : 'default'} size="sm">
            {app.is_system ? 'System' : 'User'}
          </Badge>
          <Badge variant={app.is_enabled ? 'success' : 'muted'} size="sm">
            {app.is_enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </div>

      {/* Version & SDK */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Identity</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoRow
            label="Version"
            value={app.version_name
              ? `${app.version_name} (${app.version_code ?? '?'})`
              : app.version_code?.toString() ?? '—'}
          />
          <InfoRow label="Min SDK" value={app.min_sdk} />
          <InfoRow label="Target SDK" value={app.target_sdk} />
          <InfoRow label="Installer" value={app.installer?.replace('com.android.', '') ?? '—'} />
          <InfoRow label="First install" value={app.first_install_time?.slice(0, 10) ?? '—'} />
          <InfoRow label="Last updated" value={app.last_update_time?.slice(0, 10) ?? '—'} />
        </div>
      </section>

      {/* Storage */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Storage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoRow
            label="APK / Code"
            value={app.apk_size_bytes != null ? formatBytes(app.apk_size_bytes, friendlyMode) : '—'}
          />
          <InfoRow
            label="Data"
            value={app.data_size_bytes != null ? formatBytes(app.data_size_bytes, friendlyMode) : '—'}
          />
          <InfoRow
            label="Cache"
            value={app.cache_size_bytes != null ? formatBytes(app.cache_size_bytes, friendlyMode) : '—'}
          />
          <InfoRow
            label="Total"
            value={totalSize > 0 ? formatBytes(totalSize, friendlyMode) : '—'}
          />
        </div>
        {app.code_path && (
          <p className="mt-2 text-xs font-mono text-gray-500 dark:text-gray-400 break-all">
            {app.code_path}
          </p>
        )}
      </section>

      {/* Permissions */}
      {app.permissions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Permissions ({app.permissions.length})
          </h2>
          <div className="space-y-1">
            {app.permissions.map((perm) => (
              <div
                key={perm.permission}
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

      {/* Activities */}
      {app.activities.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Activities ({app.activities.length})
          </h2>
          <div className="space-y-0.5">
            {app.activities.map((a) => (
              <p key={a} className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                {a}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {app.services.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Services ({app.services.length})
          </h2>
          <div className="space-y-0.5">
            {app.services.map((s) => (
              <p key={s} className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                {s}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
