import React, { useState } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useHttpRequests } from '@/hooks/useNetwork';
import { Badge } from '@/components/common/Badge';
import { formatTimestamp } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';
import type { HttpRequest } from '@/types';
function StatusCodeBadge({ code }: { code: number | null }) {
  if (!code) return <span className="text-gray-400">—</span>;
  const variant =
    code >= 500 ? 'error' : code >= 400 ? 'warning' : code >= 300 ? 'info' : 'success';
  return <Badge variant={variant} size="sm">{code}</Badge>;
}

export default function RequestsPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const { data: requests } = useHttpRequests(sessionId);
  const displayRequests = requests ?? [];

  const [selected, setSelected] = useState<HttpRequest | null>(null);
  const [search, setSearch] = useState('');

  const filtered = displayRequests.filter((r) =>
    search
      ? r.url.toLowerCase().includes(search.toLowerCase()) ||
        (r.package_name ?? '').toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="flex h-full">
      {/* Request list */}
      <div className="flex flex-col flex-1 overflow-hidden border-r border-gray-200 dark:border-gray-700">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2">HTTP Requests</h1>
          <input
            type="text"
            placeholder="Search URL or app..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>

        <div className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map((req) => (
            <button
              key={req.id}
              type="button"
              onClick={() => setSelected(req)}
              className={`
                w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                ${selected?.id === req.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              `}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 w-12 flex-shrink-0">
                  {req.method}
                </span>
                <StatusCodeBadge code={req.status_code} />
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  {req.duration_ms ? `${req.duration_ms}ms` : ''}
                </span>
              </div>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                {req.host}{req.path}
              </p>
              {req.package_name && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {req.package_name}
                </p>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-sm text-center text-gray-500 dark:text-gray-400">
              {sessionId ? 'No requests captured. Enable proxy mode to capture HTTP traffic.' : 'Connect a device to view requests.'}
            </p>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-96 flex-shrink-0 overflow-auto p-4 space-y-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            × Close
          </button>

          <div>
            <span className="inline-flex items-center gap-2 mb-2">
              <span className="font-bold text-blue-600 dark:text-blue-400">{selected.method}</span>
              <StatusCodeBadge code={selected.status_code} />
              {selected.is_tls && <Badge variant="success" size="sm">TLS</Badge>}
            </span>
            <p className="text-xs font-mono break-all text-gray-700 dark:text-gray-300">{selected.url}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Duration</p>
              <p>{selected.duration_ms ? `${selected.duration_ms}ms` : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Content-Type</p>
              <p className="font-mono">{selected.content_type ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Request size</p>
              <p>{selected.request_size ? `${selected.request_size} B` : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Response size</p>
              <p>{selected.response_size ? `${selected.response_size} B` : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">App</p>
              <p className="font-mono text-xs">{selected.package_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Captured</p>
              <p>{formatTimestamp(selected.captured_at, friendlyMode)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
