import React from 'react';
import type { DomainCategory } from '@/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/services/domainClassifier';
import { useUIStore } from '@/stores/uiStore';
import { formatDomain } from '@/services/formatters';

interface DomainTagProps {
  domain: string;
  category?: DomainCategory | null;
  showCategory?: boolean;
}

export function DomainTag({ domain, category, showCategory = true }: DomainTagProps) {
  const friendlyMode = useUIStore((s) => s.friendlyMode);
  const displayDomain = formatDomain(domain, friendlyMode);
  const cat = category ?? 'unknown';
  const colorClass = CATEGORY_COLORS[cat];
  const categoryLabel = CATEGORY_LABELS[cat];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-sm font-mono">{displayDomain}</span>
      {showCategory && (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}>
          {categoryLabel}
        </span>
      )}
    </span>
  );
}
