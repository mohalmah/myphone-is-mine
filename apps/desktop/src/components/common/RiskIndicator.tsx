import React from 'react';
import type { RiskLevel } from '@/types';

interface RiskIndicatorProps {
  risk: RiskLevel;
  showLabel?: boolean;
}

const RISK_CONFIG: Record<
  RiskLevel,
  { color: string; label: string; dotColor: string }
> = {
  safe: {
    color: 'text-green-600 dark:text-green-400',
    dotColor: 'bg-green-500',
    label: 'Safe',
  },
  low: {
    color: 'text-yellow-600 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
    label: 'Low Risk',
  },
  medium: {
    color: 'text-orange-600 dark:text-orange-400',
    dotColor: 'bg-orange-500',
    label: 'Medium Risk',
  },
  high: {
    color: 'text-red-600 dark:text-red-400',
    dotColor: 'bg-red-500',
    label: 'High Risk',
  },
  unknown: {
    color: 'text-gray-500 dark:text-gray-400',
    dotColor: 'bg-gray-400',
    label: 'Unknown',
  },
};

export function RiskIndicator({ risk, showLabel = false }: RiskIndicatorProps) {
  const config = RISK_CONFIG[risk];
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${config.color}`}
      title={config.label}
    >
      <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
      {showLabel && (
        <span className="text-xs font-medium">{config.label}</span>
      )}
    </span>
  );
}
