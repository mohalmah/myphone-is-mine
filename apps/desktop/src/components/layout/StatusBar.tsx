import React from 'react';
import type { CollectorStatus } from '@/types';

interface StatusBarProps {
  collectorStatuses?: CollectorStatus[];
  eventCount?: number;
  dbSizeBytes?: number;
}

export function StatusBar({
  collectorStatuses = [],
  eventCount,
  dbSizeBytes,
}: StatusBarProps) {
  const runningCount = collectorStatuses.filter((s) => s.running).length;
  const totalCount = collectorStatuses.length;

  return (
    <footer className="flex items-center gap-4 px-4 py-1 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
      {/* Collectors */}
      <span className="flex items-center gap-1">
        <span
          className={`h-1.5 w-1.5 rounded-full ${runningCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`}
        />
        {totalCount > 0 ? `${runningCount}/${totalCount} collectors` : 'No collectors'}
      </span>

      {/* Event count */}
      {eventCount !== undefined && (
        <span>{eventCount.toLocaleString()} events</span>
      )}

      {/* DB size */}
      {dbSizeBytes !== undefined && (
        <span>DB: {(dbSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
      )}

      {/* Individual collector statuses */}
      {collectorStatuses.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          {collectorStatuses.map((s) => (
            <span
              key={s.name}
              className={`flex items-center gap-0.5 ${s.running ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
              title={s.error ?? (s.running ? 'Running' : 'Stopped')}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.running ? 'bg-green-500' : 'bg-red-500'}`} />
              {s.name.replace('Collector', '')}
            </span>
          ))}
        </div>
      )}
    </footer>
  );
}
