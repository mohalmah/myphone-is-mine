/**
 * Mock data for development and testing. Used when no real device is connected.
 */

import type {
  AppSettings,
  AppUsageRecord,
  BatterySample,
  BatteryStats,
  CapabilityProfile,
  CollectorStatus,
  DeviceInfo,
  DomainBreakdown,
  HttpRequest,
  Insight,
  LogEntry,
  NetworkFlow,
  Package,
  ProcessSnapshot,
  ProxyStatus,
  SessionInfo,
  StorageOverview,
  SystemResources,
  ThermalSample,
  TopAppByTraffic,
  UsageSummary,
} from '@/types';

export const MOCK_DEVICE: DeviceInfo = {
  serial: 'emulator-5554',
  model: 'Pixel 7',
  manufacturer: 'Google',
  android_version: '14',
  sdk_level: 34,
  is_rooted: false,
  has_helper: false,
};

export const MOCK_SESSION: SessionInfo = {
  id: 1,
  device_id: 1,
  started_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  ended_at: null,
  mode: 'basic',
};

export const MOCK_CAPABILITIES: CapabilityProfile = {
  has_adb: true,
  has_root: false,
  has_helper_app: false,
  has_proxy: false,
  can_logcat: true,
  can_dumpsys: true,
  can_netstats: false,
  can_tcpdump: false,
  can_vpn_capture: false,
};

const LOG_LEVELS = ['V', 'D', 'I', 'W', 'E', 'F'] as const;
const LOG_TAGS = [
  'ActivityManager',
  'PackageManager',
  'WindowManager',
  'Zygote',
  'dalvikvm',
  'System.err',
  'InputDispatcher',
  'SurfaceFlinger',
  'AudioFlinger',
  'CameraService',
];
const LOG_MESSAGES = [
  'Activity started: com.example.app/.MainActivity',
  'Package installed: com.example.testapp v1.0.0',
  'Window added: Window{...} of AppWindowToken',
  'Process com.example.app (pid 1234) has died',
  'GC freed 1024 objects / 128 KB in 10ms',
  'Unable to start service Intent { act=android.intent.action.VIEW }',
  'Loaded class com.example.app.SomeClass from dex',
  'ANR in com.example.app (com.example.app/.MainActivity)',
  'Killing proc com.example.app:server/u0a100 (adj 0): empty',
  'Battery level changed: 85 -> 84',
];

export function generateMockLogs(count: number, sessionId = 1): LogEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    session_id: sessionId,
    package_id: i % 5 === 0 ? null : (i % 10) + 1,
    level: LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)],
    tag: LOG_TAGS[Math.floor(Math.random() * LOG_TAGS.length)],
    message: LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)],
    pid: 1000 + (i % 100),
    tid: 1000 + (i % 50),
    captured_at: new Date(Date.now() - (count - i) * 1000).toISOString(),
  }));
}

export const MOCK_PACKAGES: Package[] = [
  {
    id: 1,
    device_id: 1,
    package_name: 'com.google.android.gms',
    app_label: 'Google Play Services',
    version_name: '24.02.14',
    version_code: 240214000,
    is_system: true,
    is_enabled: true,
    installer: null,
    target_sdk: 34,
    min_sdk: 26,
    first_seen_at: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 86400 * 1000).toISOString(),
  },
  {
    id: 2,
    device_id: 1,
    package_name: 'com.instagram.android',
    app_label: 'Instagram',
    version_name: '315.0.0.33.109',
    version_code: 315000033,
    is_system: false,
    is_enabled: true,
    installer: 'com.android.vending',
    target_sdk: 34,
    min_sdk: 26,
    first_seen_at: new Date(Date.now() - 15 * 86400 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
  {
    id: 3,
    device_id: 1,
    package_name: 'com.spotify.music',
    app_label: 'Spotify',
    version_name: '8.9.4.614',
    version_code: 89040614,
    is_system: false,
    is_enabled: true,
    installer: 'com.android.vending',
    target_sdk: 33,
    min_sdk: 24,
    first_seen_at: new Date(Date.now() - 60 * 86400 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
  },
  {
    id: 4,
    device_id: 1,
    package_name: 'com.whatsapp',
    app_label: 'WhatsApp',
    version_name: '2.24.3.75',
    version_code: 202403075,
    is_system: false,
    is_enabled: true,
    installer: 'com.android.vending',
    target_sdk: 34,
    min_sdk: 21,
    first_seen_at: new Date(Date.now() - 90 * 86400 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
  },
  {
    id: 5,
    device_id: 1,
    package_name: 'com.google.android.youtube',
    app_label: 'YouTube',
    version_name: '19.10.35',
    version_code: 1910350,
    is_system: false,
    is_enabled: true,
    installer: 'com.android.vending',
    target_sdk: 34,
    min_sdk: 26,
    first_seen_at: new Date(Date.now() - 45 * 86400 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
  },
];

export const MOCK_BATTERY_SAMPLES: BatterySample[] = Array.from(
  { length: 48 },
  (_, i) => ({
    id: i + 1,
    session_id: 1,
    level: Math.max(10, 95 - i * 1.8),
    is_charging: false,
    temperature: 28 + Math.random() * 4,
    voltage: 3.7 + Math.random() * 0.5,
    current_ma: -(300 + Math.random() * 200),
    health: 'Good',
    technology: 'Li-ion',
    captured_at: new Date(Date.now() - (48 - i) * 30 * 60 * 1000).toISOString(),
  }),
);

export const MOCK_BATTERY_STATS: BatteryStats = {
  current_level: 72,
  is_charging: false,
  health: 'Good',
  temperature: 30.5,
  estimated_drain_per_hour: 3.5,
};

export const MOCK_STORAGE: StorageOverview = {
  total_bytes: 128 * 1024 * 1024 * 1024,
  used_bytes: 87 * 1024 * 1024 * 1024,
  free_bytes: 41 * 1024 * 1024 * 1024,
  captured_at: new Date().toISOString(),
};

export const MOCK_DOMAIN_BREAKDOWN: DomainBreakdown[] = [
  {
    domain: 'graph.facebook.com',
    category: 'first_party',
    risk_level: 'medium',
    bytes_sent: 145000,
    bytes_received: 890000,
    request_count: 234,
    app_count: 3,
  },
  {
    domain: 'ssl.google-analytics.com',
    category: 'analytics',
    risk_level: 'low',
    bytes_sent: 45000,
    bytes_received: 12000,
    request_count: 89,
    app_count: 7,
  },
  {
    domain: 'ads.doubleclick.net',
    category: 'ads',
    risk_level: 'medium',
    bytes_sent: 23000,
    bytes_received: 456000,
    request_count: 67,
    app_count: 4,
  },
  {
    domain: 'api.spotify.com',
    category: 'first_party',
    risk_level: 'safe',
    bytes_sent: 89000,
    bytes_received: 2340000,
    request_count: 145,
    app_count: 1,
  },
];

export const MOCK_TOP_APPS_TRAFFIC: TopAppByTraffic[] = [
  {
    package_name: 'com.instagram.android',
    app_label: 'Instagram',
    bytes_sent: 2345678,
    bytes_received: 45678901,
  },
  {
    package_name: 'com.google.android.youtube',
    app_label: 'YouTube',
    bytes_sent: 1234567,
    bytes_received: 123456789,
  },
  {
    package_name: 'com.spotify.music',
    app_label: 'Spotify',
    bytes_sent: 456789,
    bytes_received: 23456789,
  },
  {
    package_name: 'com.whatsapp',
    app_label: 'WhatsApp',
    bytes_sent: 3456789,
    bytes_received: 8901234,
  },
];

export const MOCK_INSIGHTS: Insight[] = [
  {
    id: 1,
    session_id: 1,
    package_id: 2,
    category: 'network',
    severity: 'warning',
    title: 'Instagram: Unusual background network activity',
    description:
      'Instagram sent 2.3 MB of data while running in the background over the last hour.',
    technical_detail: 'graph.facebook.com: 1.4 MB, api.instagram.com: 0.9 MB',
    confidence: 'Approximate',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    package_name: 'com.instagram.android',
  },
  {
    id: 2,
    session_id: 1,
    package_id: null,
    category: 'battery',
    severity: 'info',
    title: 'Battery drain rate is normal',
    description: 'Battery is draining at approximately 3.5% per hour.',
    technical_detail: null,
    confidence: 'Approximate',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    session_id: 1,
    package_id: 3,
    category: 'privacy',
    severity: 'critical',
    title: 'Spotify accessing location in background',
    description:
      'Spotify has accessed fine location data 12 times in the last 24 hours while in the background.',
    technical_detail: 'ACCESS_FINE_LOCATION permission used in background service',
    confidence: 'Exact',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    package_name: 'com.spotify.music',
  },
];

export const MOCK_COLLECTOR_STATUSES: CollectorStatus[] = [
  {
    name: 'LogcatCollector',
    running: true,
    last_event_at: new Date(Date.now() - 1000).toISOString(),
    error: null,
    events_collected: 15234,
  },
  {
    name: 'PackageCollector',
    running: true,
    last_event_at: new Date(Date.now() - 60000).toISOString(),
    error: null,
    events_collected: 142,
  },
  {
    name: 'BatteryCollector',
    running: true,
    last_event_at: new Date(Date.now() - 30000).toISOString(),
    error: null,
    events_collected: 48,
  },
  {
    name: 'NetworkStatsCollector',
    running: false,
    last_event_at: null,
    error: 'Requires root or helper app',
    events_collected: 0,
  },
];

export const MOCK_PROXY_STATUS: ProxyStatus = {
  running: false,
  port: null,
  ca_cert_installed: false,
  intercepted_count: 0,
};

export const MOCK_SETTINGS: AppSettings = {
  adb_path: null,
  proxy_port: 8080,
  log_retention_days: 7,
  network_retention_days: 30,
  http_retention_days: 14,
  redact_headers: ['Authorization', 'Cookie', 'Set-Cookie'],
  auto_snapshot: true,
  dark_mode: false,
  friendly_mode: true,
};

export const MOCK_PROCESS_SNAPSHOT: ProcessSnapshot = {
  id: 1,
  session_id: 1,
  total_cpu_percent: 23.5,
  total_ram_kb: 8 * 1024 * 1024,
  used_ram_kb: 5.2 * 1024 * 1024,
  captured_at: new Date().toISOString(),
};

export const MOCK_SYSTEM_RESOURCES: SystemResources = {
  total_cpu_percent: 23.5,
  used_ram_kb: 5.2 * 1024 * 1024,
  total_ram_kb: 8 * 1024 * 1024,
  processes: [
    {
      id: 1,
      snapshot_id: 1,
      pid: 1234,
      name: 'com.instagram.android',
      package_id: 2,
      cpu_percent: 8.3,
      rss_kb: 245000,
      vss_kb: 1200000,
      threads: 47,
      state: 'S',
      oom_adj: 0,
      package_name: 'com.instagram.android',
    },
    {
      id: 2,
      snapshot_id: 1,
      pid: 2345,
      name: 'com.spotify.music',
      package_id: 3,
      cpu_percent: 4.1,
      rss_kb: 180000,
      vss_kb: 980000,
      threads: 32,
      state: 'S',
      oom_adj: 0,
      package_name: 'com.spotify.music',
    },
  ],
};

export const MOCK_THERMAL_SAMPLES: ThermalSample[] = Array.from(
  { length: 20 },
  (_, i) => ({
    id: i + 1,
    session_id: 1,
    zone_name: 'CPU',
    temperature_celsius: 38 + Math.random() * 10,
    throttling_status: 'none' as const,
    captured_at: new Date(Date.now() - (20 - i) * 60 * 1000).toISOString(),
  }),
);

export const MOCK_HTTP_REQUESTS: HttpRequest[] = [
  {
    id: 1,
    flow_id: 1,
    session_id: 1,
    package_id: 2,
    method: 'POST',
    url: 'https://graph.facebook.com/v19.0/me/feed',
    host: 'graph.facebook.com',
    path: '/v19.0/me/feed',
    status_code: 200,
    request_size: 1024,
    response_size: 512,
    content_type: 'application/json',
    duration_ms: 245,
    is_tls: true,
    har_entry_json: null,
    captured_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    package_name: 'com.instagram.android',
  },
  {
    id: 2,
    flow_id: 2,
    session_id: 1,
    package_id: 5,
    method: 'GET',
    url: 'https://www.youtube.com/api/stats/watchtime',
    host: 'www.youtube.com',
    path: '/api/stats/watchtime',
    status_code: 204,
    request_size: 256,
    response_size: 0,
    content_type: null,
    duration_ms: 89,
    is_tls: true,
    har_entry_json: null,
    captured_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    package_name: 'com.google.android.youtube',
  },
];

export const MOCK_NETWORK_FLOWS: NetworkFlow[] = [
  {
    id: 1,
    session_id: 1,
    package_id: 2,
    endpoint_id: 1,
    direction: 'outbound',
    bytes_sent: 145000,
    bytes_received: 890000,
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ended_at: null,
    confidence: 'Approximate',
    domain_name: 'graph.facebook.com',
    domain_category: 'first_party',
    package_name: 'com.instagram.android',
  },
  {
    id: 2,
    session_id: 1,
    package_id: 5,
    endpoint_id: 2,
    direction: 'outbound',
    bytes_sent: 45000,
    bytes_received: 1200000,
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    ended_at: null,
    confidence: 'Approximate',
    domain_name: 'googlevideo.com',
    domain_category: 'cdn',
    package_name: 'com.google.android.youtube',
  },
];

export const MOCK_USAGE_SUMMARY: UsageSummary = {
  total_screen_on_ms: 4.5 * 3600 * 1000,
  unlock_count: 42,
  top_apps: [
    {
      id: 1,
      snapshot_id: 1,
      package_id: 5,
      foreground_time_ms: 90 * 60 * 1000,
      background_time_ms: 20 * 60 * 1000,
      launch_count: 8,
      notifications_posted: 0,
      last_time_used: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      category: 'Entertainment',
      package_name: 'com.google.android.youtube',
      app_label: 'YouTube',
    },
    {
      id: 2,
      snapshot_id: 1,
      package_id: 2,
      foreground_time_ms: 75 * 60 * 1000,
      background_time_ms: 45 * 60 * 1000,
      launch_count: 15,
      notifications_posted: 32,
      last_time_used: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      category: 'Social',
      package_name: 'com.instagram.android',
      app_label: 'Instagram',
    },
  ] as AppUsageRecord[],
  period_start: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  period_end: new Date().toISOString(),
};
