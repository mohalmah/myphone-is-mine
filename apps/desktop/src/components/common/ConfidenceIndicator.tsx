import React from 'react';
import type { Confidence } from '@/types';

interface ConfidenceIndicatorProps {
  confidence: Confidence;
  showLabel?: boolean;
}

const CONFIDENCE_CONFIG: Record<
  Confidence,
  { symbol: string; label: string; description: string; color: string }
> = {
  Exact: {
    symbol: '✓',
    label: 'Exact',
    description: 'Measurement is exact and verified.',
    color: 'text-green-600 dark:text-green-400',
  },
  Approximate: {
    symbol: '~',
    label: 'Approximate',
    description: 'Measurement is approximate, may have small errors.',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  Inferred: {
    symbol: '?',
    label: 'Inferred',
    description: 'Value is inferred from indirect signals.',
    color: 'text-orange-600 dark:text-orange-400',
  },
  Unavailable: {
    symbol: '—',
    label: 'Unavailable',
    description: 'Measurement is not available for this device/mode.',
    color: 'text-gray-400 dark:text-gray-500',
  },
};

export function ConfidenceIndicator({
  confidence,
  showLabel = false,
}: ConfidenceIndicatorProps) {
  const config = CONFIDENCE_CONFIG[confidence];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono ${config.color}`}
      title={`${config.label}: ${config.description}`}
    >
      <span>{config.symbol}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
