// ─── Confidence ──────────────────────────────────────────────────────────────

export type Confidence = 'Exact' | 'Approximate' | 'Inferred' | 'Unavailable';

// ─── Event Source ─────────────────────────────────────────────────────────────

export type EventSource = 'Adb' | 'HelperApp' | 'Proxy' | 'RootShell' | 'Synthetic';

export interface EventMeta {
  session_id: number;
  timestamp: string; // ISO 8601
  source: EventSource;
}

// ─── Device & Session ────────────────────────────────────────────────────────

export interface DeviceInfo {
  serial: string;
  model: string | null;
  manufacturer: string | null;
  android_version: string | null;
  sdk_level: number | null;
  is_rooted: boolean;
  has_helper: boolean;
}

export interface SessionInfo {
  id: number;
  device_id: number;
  started_at: string;
  ended_at: string | null;
  mode: 'basic' | 'helper' | 'proxy' | 'root';
}

export interface CapabilityProfile {
  has_adb: boolean;
  has_root: boolean;
  has_helper_app: boolean;
  has_proxy: boolean;
  can_logcat: boolean;
  can_dumpsys: boolean;
  can_netstats: boolean;
  can_tcpdump: boolean;
  can_vpn_capture: boolean;
}

// ─── Log ─────────────────────────────────────────────────────────────────────

export type LogLevel = 'V' | 'D' | 'I' | 'W' | 'E' | 'F';

export interface LogEntry {
  id: number;
  session_id: number;
  package_id: number | null;
  level: LogLevel;
  tag: string | null;
  message: string;
  pid: number | null;
  tid: number | null;
  captured_at: string;
}

export interface LogFilter {
  levels?: LogLevel[];
  tag?: string;
  message_search?: string;
  package_id?: number;
  time_from?: string;
  time_to?: string;
  limit?: number;
  offset?: number;
}

// ─── Package / App ───────────────────────────────────────────────────────────

export interface Package {
  id: number;
  device_id: number;
  package_name: string;
  app_label: string | null;
  version_name: string | null;
  version_code: number | null;
  is_system: boolean;
  is_enabled: boolean;
  installer: string | null;
  target_sdk: number | null;
  min_sdk: number | null;
  first_seen_at: string;
  last_updated_at: string;
}

export interface AppPermission {
  id: number;
  package_id: number;
  permission: string;
  is_granted: boolean;
  captured_at: string;
}

export interface PackageDetail extends Package {
  permissions: AppPermission[];
}

// ─── Network ─────────────────────────────────────────────────────────────────

export type DomainCategory =
  | 'first_party'
  | 'analytics'
  | 'ads'
  | 'cdn'
  | 'social'
  | 'search'
  | 'government'
  | 'unknown';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'unknown';

export interface Domain {
  id: number;
  name: string;
  category: DomainCategory | null;
  risk_level: RiskLevel;
  first_seen_at: string;
}

export interface NetworkFlow {
  id: number;
  session_id: number;
  package_id: number | null;
  endpoint_id: number | null;
  direction: 'outbound' | 'inbound';
  bytes_sent: number;
  bytes_received: number;
  started_at: string;
  ended_at: string | null;
  confidence: Confidence;
  // joined fields
  domain_name?: string;
  domain_category?: DomainCategory;
  package_name?: string;
}

export interface HttpRequest {
  id: number;
  flow_id: number | null;
  session_id: number;
  package_id: number | null;
  method: string;
  url: string;
  host: string;
  path: string;
  status_code: number | null;
  request_size: number | null;
  response_size: number | null;
  content_type: string | null;
  duration_ms: number | null;
  is_tls: boolean;
  har_entry_json: string | null;
  captured_at: string;
  // joined fields
  package_name?: string;
}

export interface DnsQuery {
  id: number;
  session_id: number;
  package_id: number | null;
  query_name: string;
  query_type: string;
  resolved_ips: string[] | null;
  response_code: number | null;
  duration_ms: number | null;
  captured_at: string;
  package_name?: string;
}

export interface DomainBreakdown {
  domain: string;
  category: DomainCategory | null;
  risk_level: RiskLevel;
  bytes_sent: number;
  bytes_received: number;
  request_count: number;
  app_count: number;
}

export interface TopAppByTraffic {
  package_name: string;
  app_label: string | null;
  bytes_sent: number;
  bytes_received: number;
}

// ─── Battery ─────────────────────────────────────────────────────────────────

export interface BatterySample {
  id: number;
  session_id: number;
  level: number;
  is_charging: boolean;
  temperature: number | null;
  voltage: number | null;
  current_ma: number | null;
  health: string | null;
  technology: string | null;
  captured_at: string;
}

export interface BatteryStats {
  current_level: number;
  is_charging: boolean;
  health: string | null;
  temperature: number | null;
  estimated_drain_per_hour: number | null;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export interface StorageOverview {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  captured_at: string;
}

export interface AppStorageBreakdown {
  package_name: string;
  app_label: string | null;
  size_bytes: number;
  path: string;
}

// ─── Process ─────────────────────────────────────────────────────────────────

export interface ProcessSnapshot {
  id: number;
  session_id: number;
  total_cpu_percent: number | null;
  total_ram_kb: number | null;
  used_ram_kb: number | null;
  captured_at: string;
}

export interface ProcessEntry {
  id: number;
  snapshot_id: number;
  pid: number;
  name: string;
  package_id: number | null;
  cpu_percent: number;
  rss_kb: number;
  vss_kb: number;
  threads: number;
  state: 'R' | 'S' | 'T' | 'Z' | null;
  oom_adj: number | null;
  package_name?: string;
}

export interface ThermalSample {
  id: number;
  session_id: number;
  zone_name: string;
  temperature_celsius: number;
  throttling_status: 'none' | 'light' | 'moderate' | 'severe' | 'critical';
  captured_at: string;
}

export interface SystemResources {
  total_cpu_percent: number;
  used_ram_kb: number;
  total_ram_kb: number;
  processes: ProcessEntry[];
}

// ─── Usage ───────────────────────────────────────────────────────────────────

export type SnapshotType = 'hourly' | 'daily' | 'weekly' | 'manual';

export interface UsageSnapshot {
  id: number;
  session_id: number;
  device_id: number;
  snapshot_type: SnapshotType;
  period_start: string;
  period_end: string;
  captured_at: string;
}

export interface AppUsageRecord {
  id: number;
  snapshot_id: number;
  package_id: number;
  foreground_time_ms: number;
  background_time_ms: number;
  launch_count: number;
  notifications_posted: number;
  last_time_used: string | null;
  category: string | null;
  // joined
  package_name?: string;
  app_label?: string | null;
}

export interface ScreenTimeRecord {
  id: number;
  snapshot_id: number;
  total_screen_on_ms: number;
  unlock_count: number;
}

export interface UsageSummary {
  total_screen_on_ms: number;
  unlock_count: number;
  top_apps: AppUsageRecord[];
  period_start: string;
  period_end: string;
}

export interface UsageGoal {
  id: number;
  device_id: number;
  package_id: number | null;
  daily_limit_ms: number;
  is_active: boolean;
  created_at: string;
  package_name?: string;
  app_label?: string | null;
}

export interface GoalProgress {
  goal: UsageGoal;
  used_ms: number;
  percent_used: number;
  is_exceeded: boolean;
}

// ─── Insights ────────────────────────────────────────────────────────────────

export type InsightCategory =
  | 'network'
  | 'battery'
  | 'storage'
  | 'privacy'
  | 'behavior'
  | 'usage'
  | 'thermal'
  | 'resource';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface Insight {
  id: number;
  session_id: number;
  package_id: number | null;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  technical_detail: string | null;
  confidence: Confidence;
  created_at: string;
  package_name?: string;
}

// ─── Proxy ───────────────────────────────────────────────────────────────────

export interface ProxyStatus {
  running: boolean;
  port: number | null;
  ca_cert_installed: boolean;
  intercepted_count: number;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  adb_path: string | null;
  proxy_port: number;
  log_retention_days: number;
  network_retention_days: number;
  http_retention_days: number;
  redact_headers: string[];
  auto_snapshot: boolean;
  dark_mode: boolean;
  friendly_mode: boolean;
}

// ─── Collector Status ────────────────────────────────────────────────────────

export interface CollectorStatus {
  name: string;
  running: boolean;
  last_event_at: string | null;
  error: string | null;
  events_collected: number;
}

// ─── Events (Rust → Frontend push) ───────────────────────────────────────────

export type DeviceEvent =
  | { type: 'Log'; meta: EventMeta; data: LogEntry }
  | { type: 'Package'; meta: EventMeta; data: Package }
  | { type: 'Battery'; meta: EventMeta; data: BatterySample }
  | { type: 'NetworkFlow'; meta: EventMeta; data: NetworkFlow }
  | { type: 'HttpRequest'; meta: EventMeta; data: HttpRequest }
  | { type: 'Dns'; meta: EventMeta; data: DnsQuery }
  | { type: 'Process'; meta: EventMeta; data: ProcessEntry }
  | { type: 'Thermal'; meta: EventMeta; data: ThermalSample }
  | { type: 'AppUsage'; meta: EventMeta; data: AppUsageRecord }
  | { type: 'Insight'; meta: EventMeta; data: Insight };
