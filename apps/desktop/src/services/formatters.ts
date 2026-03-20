/**
 * Friendly vs Raw formatting utilities.
 * All formatters take a `friendly` boolean to switch between modes.
 */

// ─── Bytes ────────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number, friendly: boolean): string {
  if (!friendly) return `${bytes.toLocaleString()} bytes`;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── Duration ─────────────────────────────────────────────────────────────────

export function formatDuration(ms: number, friendly: boolean): string {
  if (!friendly) return `${ms.toLocaleString()} ms`;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60 * 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600 * 1000) {
    const m = Math.floor(ms / (60 * 1000));
    const s = Math.floor((ms % (60 * 1000)) / 1000);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(ms / (3600 * 1000));
  const m = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Timestamp ───────────────────────────────────────────────────────────────

const UNITS: { label: string; ms: number }[] = [
  { label: 'year', ms: 365 * 24 * 3600 * 1000 },
  { label: 'month', ms: 30 * 24 * 3600 * 1000 },
  { label: 'day', ms: 24 * 3600 * 1000 },
  { label: 'hour', ms: 3600 * 1000 },
  { label: 'minute', ms: 60 * 1000 },
  { label: 'second', ms: 1000 },
];

export function formatTimestamp(isoString: string, friendly: boolean): string {
  if (!friendly) return isoString;
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 5000) return 'just now';
  for (const unit of UNITS) {
    const count = Math.floor(diff / unit.ms);
    if (count >= 1) {
      return `${count} ${unit.label}${count !== 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

// ─── Domain ───────────────────────────────────────────────────────────────────

const DOMAIN_FRIENDLY_NAMES: Record<string, string> = {
  'graph.facebook.com': 'Facebook API',
  'api.instagram.com': 'Instagram API',
  'api.spotify.com': 'Spotify API',
  'googlevideo.com': 'YouTube CDN',
  'ssl.google-analytics.com': 'Google Analytics',
  'ads.doubleclick.net': 'DoubleClick Ads',
  'pagead2.googlesyndication.com': 'Google Ads',
  'api.twitter.com': 'Twitter API',
  'api.tiktok.com': 'TikTok API',
  'graph.instagram.com': 'Instagram Graph API',
};

export function formatDomain(domain: string, friendly: boolean): string {
  if (!friendly) return domain;
  return DOMAIN_FRIENDLY_NAMES[domain] ?? domain;
}

// ─── Log message ──────────────────────────────────────────────────────────────

export function formatLogMessage(message: string, friendly: boolean): string {
  if (!friendly) return message;
  // Truncate very long messages in friendly mode
  if (message.length > 200) {
    return message.slice(0, 197) + '...';
  }
  return message;
}

// ─── Screen time ─────────────────────────────────────────────────────────────

export function formatScreenTime(ms: number, friendly: boolean): string {
  return formatDuration(ms, friendly);
}

// ─── Battery percentage ───────────────────────────────────────────────────────

export function formatBatteryLevel(level: number): string {
  return `${level}%`;
}

// ─── Temperature ─────────────────────────────────────────────────────────────

export function formatTemperature(celsius: number, friendly: boolean): string {
  if (!friendly) return `${celsius.toFixed(2)}°C`;
  return `${celsius.toFixed(1)}°C`;
}
