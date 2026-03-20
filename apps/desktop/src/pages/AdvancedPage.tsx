import React from 'react';
import { useDeviceStore } from '@/stores/deviceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Badge } from '@/components/common/Badge';
import { MOCK_COLLECTOR_STATUSES } from '@/services/mockData';

export default function AdvancedPage() {
  const capabilities = useDeviceStore((s) => s.capabilities);
  const activeSession = useSessionStore((s) => s.activeSession);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Advanced</h1>

      {/* Capability matrix */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Capability Matrix
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          {capabilities ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(capabilities).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <Badge variant={value ? 'success' : 'muted'} size="sm">
                    {value ? 'Yes' : 'No'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeSession ? 'Detecting capabilities...' : 'Connect a device to see capabilities.'}
            </p>
          )}
        </div>
      </section>

      {/* Collector status */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Collector Status
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {MOCK_COLLECTOR_STATUSES.map((c) => (
            <div key={c.name} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${c.running ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-900 dark:text-white">{c.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {c.error && (
                  <span className="text-red-500">{c.error}</span>
                )}
                <span>{c.events_collected.toLocaleString()} events</span>
                <Badge variant={c.running ? 'success' : 'muted'} size="sm">
                  {c.running ? 'Running' : 'Stopped'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Session info */}
      {activeSession && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Active Session
          </h2>
          <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-auto">
            {JSON.stringify(activeSession, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
