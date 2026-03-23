import React from 'react';
import { useDeviceStore } from '@/stores/deviceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Badge } from '@/components/common/Badge';

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
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeSession ? 'No collector data available.' : 'Connect a device to view collector status.'}
          </p>
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
