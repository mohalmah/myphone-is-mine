/**
 * IPC service — wraps @tauri-apps/api/core invoke calls with typed parameters
 * and return values matching the taurpc-generated Rust command signatures.
 *
 * Pattern: ipc.<commandGroup>.<commandName>(args)
 *
 * All functions return typed Promises. Zod schemas validate at the boundary
 * to catch mismatches between Rust and TypeScript types early.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  AppSettings,
  AppStorageBreakdown,
  AppUsageRecord,
  BatterySample,
  BatteryStats,
  CapabilityProfile,
  CollectorStatus,
  DeviceEvent,
  DeviceInfo,
  DnsQuery,
  DomainBreakdown,
  GoalProgress,
  HttpRequest,
  Insight,
  LogEntry,
  LogFilter,
  NetworkFlow,
  Package,
  PackageDetail,
  ProcessSnapshot,
  ProxyStatus,
  SessionInfo,
  StorageOverview,
  SystemResources,
  ThermalSample,
  TopAppByTraffic,
  UsageGoal,
  UsageSnapshot,
  UsageSummary,
} from '@/types';

// ─── Device Commands ──────────────────────────────────────────────────────────

export const deviceCommands = {
  list_devices: (): Promise<DeviceInfo[]> =>
    invoke('list_devices'),

  connect_device: (serial: string): Promise<SessionInfo> =>
    invoke('connect_device', { serial }),

  disconnect_device: (serial: string): Promise<void> =>
    invoke('disconnect_device', { serial }),

  get_capabilities: (serial: string): Promise<CapabilityProfile> =>
    invoke('get_capabilities', { serial }),
};

// ─── Session Commands ─────────────────────────────────────────────────────────

export const sessionCommands = {
  get_active_sessions: (): Promise<SessionInfo[]> =>
    invoke('get_active_sessions'),

  get_session_history: (deviceId: number): Promise<SessionInfo[]> =>
    invoke('get_session_history', { device_id: deviceId }),

  start_session: (serial: string): Promise<SessionInfo> =>
    invoke('start_session', { serial }),

  stop_session: (serial: string, sessionId: number): Promise<void> =>
    invoke('stop_session', { serial, session_id: sessionId }),
};

// ─── App Commands ─────────────────────────────────────────────────────────────

export const appCommands = {
  list_packages: (serial: string): Promise<Package[]> =>
    invoke('list_packages', { serial }),

  get_package_detail: (
    serial: string,
    packageName: string,
  ): Promise<PackageDetail> =>
    invoke('get_package_detail', {
      serial,
      package_name: packageName,
    }),

  force_stop: (serial: string, packageName: string): Promise<void> =>
    invoke('force_stop', {
      serial,
      package_name: packageName,
    }),

  clear_data: (serial: string, packageName: string): Promise<void> =>
    invoke('clear_data', {
      serial,
      package_name: packageName,
    }),

  disable_app: (serial: string, packageName: string): Promise<void> =>
    invoke('disable_app', {
      serial,
      package_name: packageName,
    }),

  uninstall_app: (
    serial: string,
    packageName: string,
    keepData: boolean,
  ): Promise<void> =>
    invoke('uninstall_app', {
      serial,
      package_name: packageName,
      keep_data: keepData,
    }),

  revoke_permission: (
    serial: string,
    packageName: string,
    permission: string,
  ): Promise<void> =>
    invoke('revoke_permission', {
      serial,
      package_name: packageName,
      permission,
    }),

  grant_permission: (
    serial: string,
    packageName: string,
    permission: string,
  ): Promise<void> =>
    invoke('grant_permission', {
      serial,
      package_name: packageName,
      permission,
    }),
};

// ─── Log Commands ─────────────────────────────────────────────────────────────

export const logCommands = {
  get_logs: (sessionId: number, filter: LogFilter): Promise<LogEntry[]> =>
    invoke('get_logs', { session_id: sessionId, filter }),

  get_log_tags: (sessionId: number): Promise<string[]> =>
    invoke('get_log_tags', { session_id: sessionId }),

  clear_log_buffer: (sessionId: number): Promise<void> =>
    invoke('clear_log_buffer', { session_id: sessionId }),
};

// ─── Network Commands ─────────────────────────────────────────────────────────

export const networkCommands = {
  get_flows: (
    sessionId: number,
    limit?: number,
    offset?: number,
  ): Promise<NetworkFlow[]> =>
    invoke('get_flows', {
      session_id: sessionId,
      limit: limit ?? 100,
      offset: offset ?? 0,
    }),

  get_requests: (
    sessionId: number,
    limit?: number,
    offset?: number,
  ): Promise<HttpRequest[]> =>
    invoke('get_requests', {
      session_id: sessionId,
      limit: limit ?? 100,
      offset: offset ?? 0,
    }),

  get_dns_queries: (
    sessionId: number,
    limit?: number,
  ): Promise<DnsQuery[]> =>
    invoke('get_dns_queries', {
      session_id: sessionId,
      limit: limit ?? 200,
    }),

  get_domain_breakdown: (sessionId: number): Promise<DomainBreakdown[]> =>
    invoke('get_domain_breakdown', {
      session_id: sessionId,
    }),

  get_top_apps_by_traffic: (
    sessionId: number,
    limit?: number,
  ): Promise<TopAppByTraffic[]> =>
    invoke('get_top_apps_by_traffic', {
      session_id: sessionId,
      limit: limit ?? 10,
    }),
};

// ─── Storage Commands ─────────────────────────────────────────────────────────

export const storageCommands = {
  get_storage_overview: (sessionId: number): Promise<StorageOverview> =>
    invoke('get_storage_overview', {
      session_id: sessionId,
    }),

  get_app_storage_breakdown: (
    sessionId: number,
  ): Promise<AppStorageBreakdown[]> =>
    invoke('get_app_storage_breakdown', {
      session_id: sessionId,
    }),

  get_folder_sizes: (
    sessionId: number,
    packageName?: string,
  ): Promise<AppStorageBreakdown[]> =>
    invoke('get_folder_sizes', {
      session_id: sessionId,
      package_name: packageName ?? null,
    }),
};

// ─── Battery Commands ─────────────────────────────────────────────────────────

export const batteryCommands = {
  get_current_battery: (sessionId: number): Promise<BatteryStats> =>
    invoke('get_current_battery', {
      session_id: sessionId,
    }),

  get_battery_timeline: (
    sessionId: number,
    limit?: number,
  ): Promise<BatterySample[]> =>
    invoke('get_battery_timeline', {
      session_id: sessionId,
      limit: limit ?? 288,
    }),

  get_battery_stats: (sessionId: number): Promise<BatteryStats> =>
    invoke('get_battery_stats', { session_id: sessionId }),
};

// ─── Process Commands ─────────────────────────────────────────────────────────

export const processCommands = {
  get_process_snapshot: (sessionId: number): Promise<ProcessSnapshot> =>
    invoke('get_process_snapshot', {
      session_id: sessionId,
    }),

  get_thermal_samples: (
    sessionId: number,
    limit?: number,
  ): Promise<ThermalSample[]> =>
    invoke('get_thermal_samples', {
      session_id: sessionId,
      limit: limit ?? 100,
    }),

  get_system_resources: (sessionId: number): Promise<SystemResources> =>
    invoke('get_system_resources', {
      session_id: sessionId,
    }),
};

// ─── Proxy Commands ───────────────────────────────────────────────────────────

export const proxyCommands = {
  start_proxy: (port?: number): Promise<void> =>
    invoke('start_proxy', { port: port ?? 8080 }),

  stop_proxy: (): Promise<void> =>
    invoke('stop_proxy'),

  get_proxy_status: (): Promise<ProxyStatus> =>
    invoke('get_proxy_status'),

  install_ca_cert: (serial: string): Promise<void> =>
    invoke('install_ca_cert', { serial }),

  configure_device_proxy: (serial: string, host: string, port: number): Promise<void> =>
    invoke('configure_device_proxy', { serial, host, port }),
};

// ─── Insight Commands ─────────────────────────────────────────────────────────

export const insightCommands = {
  get_insights: (
    sessionId: number,
    limit?: number,
  ): Promise<Insight[]> =>
    invoke('get_insights', {
      session_id: sessionId,
      limit: limit ?? 50,
    }),

  get_insight_categories: (sessionId: number): Promise<string[]> =>
    invoke('get_insight_categories', {
      session_id: sessionId,
    }),

  dismiss_insight: (insightId: number): Promise<void> =>
    invoke('dismiss_insight', { insight_id: insightId }),
};

// ─── Usage Commands ───────────────────────────────────────────────────────────

export const usageCommands = {
  get_usage_summary: (
    sessionId: number,
    periodStart: string,
    periodEnd: string,
  ): Promise<UsageSummary> =>
    invoke('get_usage_summary', {
      session_id: sessionId,
      period_start: periodStart,
      period_end: periodEnd,
    }),

  get_top_apps: (
    sessionId: number,
    periodStart: string,
    periodEnd: string,
    limit?: number,
  ): Promise<AppUsageRecord[]> =>
    invoke('get_top_apps', {
      session_id: sessionId,
      period_start: periodStart,
      period_end: periodEnd,
      limit: limit ?? 10,
    }),

  get_hourly_distribution: (
    sessionId: number,
    date: string,
  ): Promise<{ hour: number; screen_on_ms: number }[]> =>
    invoke('get_hourly_distribution', {
      session_id: sessionId,
      date,
    }),

  compare_periods: (
    sessionId: number,
    periodA: { start: string; end: string },
    periodB: { start: string; end: string },
  ): Promise<{ period_a: UsageSummary; period_b: UsageSummary }> =>
    invoke('compare_periods', {
      session_id: sessionId,
      period_a: periodA,
      period_b: periodB,
    }),

  trigger_snapshot: (
    sessionId: number,
    snapshotType: 'hourly' | 'daily' | 'weekly' | 'manual',
  ): Promise<number> =>
    invoke('trigger_snapshot', {
      session_id: sessionId,
      snapshot_type: snapshotType,
    }),

  list_snapshots: (deviceId: number, limit?: number): Promise<UsageSnapshot[]> =>
    invoke('list_snapshots', {
      device_id: deviceId,
      limit: limit ?? 100,
    }),

  create_goal: (
    deviceId: number,
    packageId: number | null,
    dailyLimitMs: number,
  ): Promise<UsageGoal> =>
    invoke('create_goal', {
      device_id: deviceId,
      package_id: packageId,
      daily_limit_ms: dailyLimitMs,
    }),

  update_goal: (
    goalId: number,
    dailyLimitMs: number,
    isActive: boolean,
  ): Promise<void> =>
    invoke('update_goal', {
      goal_id: goalId,
      daily_limit_ms: dailyLimitMs,
      is_active: isActive,
    }),

  delete_goal: (goalId: number): Promise<void> =>
    invoke('delete_goal', { goal_id: goalId }),

  get_goal_progress: (
    sessionId: number,
    date: string,
  ): Promise<GoalProgress[]> =>
    invoke('get_goal_progress', {
      session_id: sessionId,
      date,
    }),
};

// ─── Settings Commands ────────────────────────────────────────────────────────

export const settingsCommands = {
  get_settings: (): Promise<AppSettings> =>
    invoke('get_settings'),

  update_settings: (settings: Partial<AppSettings>): Promise<void> =>
    invoke('update_settings', { settings }),

  get_adb_path: (): Promise<string | null> =>
    invoke('get_adb_path'),

  set_adb_path: (path: string): Promise<void> =>
    invoke('set_adb_path', { path }),
};

// ─── Export Commands ──────────────────────────────────────────────────────────

export const exportCommands = {
  export_json: (
    sessionId: number,
    outputPath: string,
  ): Promise<void> =>
    invoke('export_json', {
      session_id: sessionId,
      output_path: outputPath,
    }),

  export_csv: (
    sessionId: number,
    outputPath: string,
  ): Promise<void> =>
    invoke('export_csv', {
      session_id: sessionId,
      output_path: outputPath,
    }),

  export_har: (
    sessionId: number,
    outputPath: string,
  ): Promise<void> =>
    invoke('export_har', {
      session_id: sessionId,
      output_path: outputPath,
    }),

  generate_report: (
    sessionId: number,
    outputPath: string,
  ): Promise<void> =>
    invoke('generate_report', {
      session_id: sessionId,
      output_path: outputPath,
    }),

  export_usage_csv: (
    deviceId: number,
    outputPath: string,
  ): Promise<void> =>
    invoke('export_usage_csv', {
      device_id: deviceId,
      output_path: outputPath,
    }),
};

// ─── Real-Time Events (Rust → Frontend) ──────────────────────────────────────

export const events = {
  onDeviceEvent: (
    callback: (event: DeviceEvent) => void,
  ): Promise<() => void> => {
    console.log('[ipc] registering device-event listener');
    return listen<DeviceEvent>('device-event', (e) => {
      console.log('[ipc] device-event received:', e.payload);
      callback(e.payload);
    });
  },

  onDeviceConnected: (
    callback: (info: DeviceInfo) => void,
  ): Promise<() => void> =>
    listen<DeviceInfo>('device-connected', (e) =>
      callback(e.payload),
    ),

  onDeviceDisconnected: (
    callback: (serial: string) => void,
  ): Promise<() => void> =>
    listen<string>('device-disconnected', (e) =>
      callback(e.payload),
    ),

  onSessionStarted: (
    callback: (info: SessionInfo) => void,
  ): Promise<() => void> =>
    listen<SessionInfo>('session-started', (e) =>
      callback(e.payload),
    ),

  onSessionEnded: (
    callback: (sessionId: number) => void,
  ): Promise<() => void> =>
    listen<number>('session-ended', (e) =>
      callback(e.payload),
    ),

  onCapabilityDetected: (
    callback: (profile: CapabilityProfile) => void,
  ): Promise<() => void> =>
    listen<CapabilityProfile>('capability-detected', (e) =>
      callback(e.payload),
    ),

  onInsightGenerated: (
    callback: (insight: Insight) => void,
  ): Promise<() => void> =>
    listen<Insight>('insight-generated', (e) =>
      callback(e.payload),
    ),

  onCollectorStatusChanged: (
    callback: (status: CollectorStatus) => void,
  ): Promise<() => void> =>
    listen<CollectorStatus>('collector-status-changed', (e) =>
      callback(e.payload),
    ),

  onProxyStatusChanged: (
    callback: (running: boolean) => void,
  ): Promise<() => void> =>
    listen<boolean>('proxy-status-changed', (e) =>
      callback(e.payload),
    ),

  onUsageSnapshotCaptured: (
    callback: (snapshotId: number) => void,
  ): Promise<() => void> =>
    listen<number>('usage-snapshot-captured', (e) =>
      callback(e.payload),
    ),
};

// ─── Unified IPC object ───────────────────────────────────────────────────────

export const ipc = {
  deviceCommands,
  sessionCommands,
  appCommands,
  logCommands,
  networkCommands,
  storageCommands,
  batteryCommands,
  processCommands,
  proxyCommands,
  insightCommands,
  usageCommands,
  settingsCommands,
  exportCommands,
  events,
};

export default ipc;
