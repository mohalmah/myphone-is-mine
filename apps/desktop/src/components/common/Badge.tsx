import React from 'react';
import type { LogLevel, InsightSeverity, RiskLevel } from '@/types';

// ─── Generic Badge ────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  muted: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center rounded font-medium ${sizeClass} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// ─── Log Level Badge ──────────────────────────────────────────────────────────

const LOG_LEVEL_VARIANTS: Record<LogLevel, NonNullable<BadgeProps['variant']>> = {
  V: 'muted',
  D: 'info',
  I: 'success',
  W: 'warning',
  E: 'error',
  F: 'error',
};

const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  V: 'V',
  D: 'D',
  I: 'I',
  W: 'W',
  E: 'E',
  F: 'F',
};

interface LogLevelBadgeProps {
  level: LogLevel;
}

export function LogLevelBadge({ level }: LogLevelBadgeProps) {
  return (
    <Badge variant={LOG_LEVEL_VARIANTS[level]} size="sm">
      {LOG_LEVEL_LABELS[level]}
    </Badge>
  );
}

// ─── Severity Badge ───────────────────────────────────────────────────────────

const SEVERITY_VARIANTS: Record<InsightSeverity, NonNullable<BadgeProps['variant']>> = {
  info: 'info',
  warning: 'warning',
  critical: 'error',
};

interface SeverityBadgeProps {
  severity: InsightSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge variant={SEVERITY_VARIANTS[severity]} size="sm">
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}

// ─── Risk Badge ───────────────────────────────────────────────────────────────

const RISK_VARIANTS: Record<RiskLevel, NonNullable<BadgeProps['variant']>> = {
  safe: 'success',
  low: 'info',
  medium: 'warning',
  high: 'error',
  unknown: 'muted',
};

interface RiskBadgeProps {
  risk: RiskLevel;
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  return (
    <Badge variant={RISK_VARIANTS[risk]} size="sm">
      {risk.charAt(0).toUpperCase() + risk.slice(1)}
    </Badge>
  );
}
