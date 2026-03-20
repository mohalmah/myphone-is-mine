import type { DomainCategory } from '@/types';

interface DomainRule {
  pattern: RegExp | string;
  category: DomainCategory;
}

const DOMAIN_RULES: DomainRule[] = [
  // Analytics
  { pattern: /google-analytics\.com$/, category: 'analytics' },
  { pattern: /googletagmanager\.com$/, category: 'analytics' },
  { pattern: /segment\.io$/, category: 'analytics' },
  { pattern: /amplitude\.com$/, category: 'analytics' },
  { pattern: /mixpanel\.com$/, category: 'analytics' },
  { pattern: /firebase\.google\.com$/, category: 'analytics' },
  { pattern: /crashlytics\.com$/, category: 'analytics' },

  // Ads
  { pattern: /doubleclick\.net$/, category: 'ads' },
  { pattern: /googlesyndication\.com$/, category: 'ads' },
  { pattern: /googleadservices\.com$/, category: 'ads' },
  { pattern: /facebook\.com\/ads/, category: 'ads' },
  { pattern: /mopub\.com$/, category: 'ads' },
  { pattern: /applovin\.com$/, category: 'ads' },
  { pattern: /admob\.com$/, category: 'ads' },

  // CDN
  { pattern: /akamaized\.net$/, category: 'cdn' },
  { pattern: /cloudfront\.net$/, category: 'cdn' },
  { pattern: /fastly\.net$/, category: 'cdn' },
  { pattern: /cdn\.ampproject\.org$/, category: 'cdn' },
  { pattern: /googlevideo\.com$/, category: 'cdn' },
  { pattern: /ytimg\.com$/, category: 'cdn' },
  { pattern: /fbcdn\.net$/, category: 'cdn' },
  { pattern: /cdninstagram\.com$/, category: 'cdn' },

  // Social
  { pattern: /facebook\.com$/, category: 'social' },
  { pattern: /instagram\.com$/, category: 'social' },
  { pattern: /twitter\.com$/, category: 'social' },
  { pattern: /x\.com$/, category: 'social' },
  { pattern: /tiktok\.com$/, category: 'social' },
  { pattern: /reddit\.com$/, category: 'social' },
  { pattern: /snapchat\.com$/, category: 'social' },
  { pattern: /linkedin\.com$/, category: 'social' },

  // Search
  { pattern: /google\.com$/, category: 'search' },
  { pattern: /googleapis\.com$/, category: 'search' },
  { pattern: /bing\.com$/, category: 'search' },
  { pattern: /yahoo\.com$/, category: 'search' },
  { pattern: /duckduckgo\.com$/, category: 'search' },

  // Government
  { pattern: /\.gov$/, category: 'government' },
  { pattern: /\.gov\.\w{2}$/, category: 'government' },
];

export function classifyDomain(domain: string): DomainCategory {
  const lowerDomain = domain.toLowerCase();
  for (const rule of DOMAIN_RULES) {
    if (rule.pattern instanceof RegExp) {
      if (rule.pattern.test(lowerDomain)) {
        return rule.category;
      }
    } else if (lowerDomain.includes(rule.pattern)) {
      return rule.category;
    }
  }
  return 'unknown';
}

export const CATEGORY_COLORS: Record<DomainCategory, string> = {
  first_party: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  analytics: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ads: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cdn: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  social: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  search: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  government: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  unknown: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
};

export const CATEGORY_LABELS: Record<DomainCategory, string> = {
  first_party: 'First Party',
  analytics: 'Analytics',
  ads: 'Advertising',
  cdn: 'CDN',
  social: 'Social',
  search: 'Search',
  government: 'Government',
  unknown: 'Unknown',
};
