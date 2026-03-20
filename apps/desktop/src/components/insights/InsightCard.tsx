import React from 'react';
import type { Insight } from '@/types';
import { SeverityBadge } from '@/components/common/Badge';
import { formatTimestamp } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (id: number) => void;
}

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <SeverityBadge severity={insight.severity} />
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {insight.category}
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(insight.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs flex-shrink-0"
            title="Dismiss"
          >
            ×
          </button>
        )}
      </div>

      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
        {insight.title}
      </p>

      <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
        {insight.description}
      </p>

      {!friendlyMode && insight.technical_detail && (
        <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
          {insight.technical_detail}
        </p>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {formatTimestamp(insight.created_at, friendlyMode)}
      </p>
    </div>
  );
}
