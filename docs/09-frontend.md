# Frontend Architecture

## Tech Stack

- **React 19** — functional components with hooks
- **TypeScript 5** — strict mode, no `any`
- **Vite** — bundler and dev server
- **TailwindCSS** — utility-first styling
- **Zustand** — global UI state
- **TanStack Query** — data fetching (wraps taurpc calls, caching, auto-refetch)
- **TanStack Table** — sortable, filterable data tables
- **TanStack Virtual** — virtual scrolling for large lists
- **Recharts** — charts (timeline, bar, pie, treemap, heatmap)
- **React Router** — page navigation
- **taurpc generated client** — type-safe IPC to Rust backend
- **Zod** — runtime validation at IPC boundary
- **Vitest** — unit tests
- **Playwright** — E2E tests

---

## Page Layout

```
┌──────────────────────────────────────────────────┐
│ Header: Device name, mode badge, recording, dark │
│         mode toggle, friendly/raw toggle         │
├────────┬─────────────────────────┬───────────────┤
│        │                         │               │
│ Side   │   Main Content Area     │  Insights     │
│ bar    │   (router outlet)       │  Panel        │
│        │                         │  (collapsible)│
│ Links: │                         │               │
│ Overview│                        │  Recent       │
│ Live   │                         │  insights     │
│ Apps   │                         │  with         │
│ Network│                         │  severity     │
│ Requests                         │  badges       │
│ Logs   │                         │               │
│ Storage│                         │               │
│ Battery│                         │               │
│ Process│                         │               │
│ Usage  │                         │               │
│ Controls                         │               │
│ Advanced│                        │               │
│ Reports│                         │               │
│ Settings                         │               │
├────────┴─────────────────────────┴───────────────┤
│ Status bar: collector status, event count, DB size│
└──────────────────────────────────────────────────┘
```

---

## Pages

| Page | Route | Key Components | Data Source |
|------|-------|----------------|-------------|
| Overview | `/` | Summary cards, top apps chart, recent insights, resource recommendations | InsightCommands, AppCommands, NetworkCommands, UsageCommands |
| Live Activity | `/live` | Real-time log stream, network flow stream, event timeline | taurpc event subscription |
| Apps | `/apps` | Sortable table (name, traffic, permissions, storage), search, filter | AppCommands |
| App Detail | `/apps/:pkg` | Permissions list, traffic graph, logs, storage, controls | AppCommands, NetworkCommands, LogCommands |
| Network | `/network` | Domain breakdown, flow table, traffic timeline, domain tags | NetworkCommands |
| Requests | `/requests` | HTTP request table, detail panel (headers/body), HAR export | NetworkCommands (proxy data) |
| Logs | `/logs` | Log table, level filter, tag filter, search, auto-scroll | LogCommands |
| Storage | `/storage` | Treemap, per-app breakdown, timeline, hotspot highlights | StorageCommands |
| Battery | `/battery` | Battery level timeline, charging periods, drain correlations | BatteryCommands |
| Process | `/process` | Live process table, system resource gauges, thermal timeline | ProcessCommands |
| Usage | `/usage` | Screen time chart, app breakdown, heatmap, trends, goals, snapshots | UsageCommands |
| Controls | `/controls` | Force stop, disable, uninstall, permission toggle per app | AppCommands |
| Advanced | `/advanced` | Raw ADB shell, capability matrix, collector status | DeviceCommands |
| Reports | `/reports` | Export options (JSON, CSV, HAR, HTML), date range picker | ExportCommands |
| Settings | `/settings` | ADB path, proxy config, retention, redaction, capture policies | SettingsCommands |

---

## Component Directory

```
apps/desktop/src/
├── main.tsx
├── App.tsx
├── router.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── DevicePanel.tsx
│   │   └── StatusBar.tsx
│   ├── common/
│   │   ├── DataTable.tsx
│   │   ├── Chart.tsx
│   │   ├── TimelineChart.tsx
│   │   ├── GaugeChart.tsx
│   │   ├── Badge.tsx
│   │   ├── ConfidenceIndicator.tsx
│   │   ├── DomainTag.tsx
│   │   ├── RiskIndicator.tsx
│   │   └── Toggle.tsx
│   ├── device/
│   │   ├── HelperStatus.tsx
│   │   ├── HelperInstall.tsx
│   │   └── CapabilityMatrix.tsx
│   ├── apps/
│   │   └── AppControls.tsx
│   ├── network/
│   │   ├── FlowTable.tsx
│   │   ├── DomainBreakdown.tsx
│   │   ├── TrafficTimeline.tsx
│   │   └── DnsTable.tsx
│   ├── proxy/
│   │   ├── RequestDetail.tsx
│   │   ├── RequestFilters.tsx
│   │   ├── ProxySettings.tsx
│   │   └── CaCertWizard.tsx
│   ├── logs/
│   │   └── LogStream.tsx
│   ├── storage/
│   │   └── AppStorageTable.tsx
│   ├── battery/
│   │   └── DrainCorrelation.tsx
│   ├── process/
│   │   ├── ResourceGauges.tsx
│   │   ├── ThermalTimeline.tsx
│   │   └── ThermalWarning.tsx
│   ├── usage/
│   │   ├── ScreenTimeChart.tsx
│   │   ├── AppUsageBreakdown.tsx
│   │   ├── TopAppsTable.tsx
│   │   ├── UsageHeatmap.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   ├── PeriodComparison.tsx
│   │   ├── PeriodSelector.tsx
│   │   ├── NotificationTable.tsx
│   │   ├── LongTermTrend.tsx
│   │   ├── LaunchCountChart.tsx
│   │   ├── GoalsManager.tsx
│   │   ├── GoalProgress.tsx
│   │   └── SnapshotManager.tsx
│   ├── insights/
│   │   ├── InsightsPanel.tsx
│   │   ├── InsightCard.tsx
│   │   └── RecommendationCards.tsx
│   ├── onboarding/
│   │   ├── OnboardingWizard.tsx
│   │   ├── WelcomeStep.tsx
│   │   ├── AdbSetupStep.tsx
│   │   ├── ConnectStep.tsx
│   │   ├── ModesStep.tsx
│   │   ├── ConsentStep.tsx
│   │   └── DoneStep.tsx
│   ├── reports/
│   │   ├── ReportPreview.tsx
│   │   └── ExportOptions.tsx
│   └── settings/
│       └── SettingsForm.tsx
├── pages/
│   ├── OverviewPage.tsx
│   ├── LiveActivityPage.tsx
│   ├── AppsPage.tsx
│   ├── AppDetailPage.tsx
│   ├── NetworkPage.tsx
│   ├── RequestsPage.tsx
│   ├── LogsPage.tsx
│   ├── StoragePage.tsx
│   ├── BatteryPage.tsx
│   ├── ProcessPage.tsx
│   ├── UsagePage.tsx
│   ├── ControlsPage.tsx
│   ├── AdvancedPage.tsx
│   ├── ReportsPage.tsx
│   └── SettingsPage.tsx
├── hooks/
│   ├── useDevice.ts
│   ├── useSession.ts
│   ├── useApps.ts
│   ├── useNetwork.ts
│   ├── useLogs.ts
│   ├── useStorage.ts
│   ├── useBattery.ts
│   ├── useProcess.ts
│   ├── useUsage.ts
│   ├── useInsights.ts
│   ├── useProxy.ts
│   └── useWebSocket.ts
├── stores/
│   ├── deviceStore.ts
│   ├── sessionStore.ts
│   ├── settingsStore.ts
│   └── uiStore.ts
├── services/
│   ├── ipc.ts              # Generated taurpc client
│   ├── formatters.ts       # Friendly/raw formatting
│   ├── domainClassifier.ts # Domain → service name mapping
│   └── mockData.ts         # Dev mock data
├── types/
│   └── index.ts            # Re-exports generated types
└── assets/
```

---

## Domain Tag System

```typescript
type DomainCategory =
  | 'first_party' | 'analytics' | 'ads' | 'cdn'
  | 'social' | 'search' | 'government' | 'unknown';

const CATEGORY_COLORS: Record<DomainCategory, string> = {
  first_party: 'bg-blue-100 text-blue-800',
  analytics:   'bg-purple-100 text-purple-800',
  ads:         'bg-red-100 text-red-800',
  cdn:         'bg-gray-100 text-gray-800',
  social:      'bg-teal-100 text-teal-800',
  search:      'bg-green-100 text-green-800',
  government:  'bg-amber-100 text-amber-800',
  unknown:     'bg-slate-100 text-slate-800',
};
```

---

## Risk/Behavior Indicators

```typescript
type RiskLevel = 'safe' | 'low' | 'medium' | 'high';

// Green dot: safe, Yellow dot: low/medium, Red dot: high
```

---

## Confidence Indicator

```typescript
// Shows Exact ✓, Approximate ~, Inferred ?, Unavailable —
// With tooltip explaining the confidence level and source
```

---

## Friendly vs Raw Mode

Global toggle persisted in `settingsStore`. Affects ALL pages:

| Element | Friendly | Raw |
|---------|----------|-----|
| Domains | "Facebook API" | graph.facebook.com |
| Sizes | "4.2 GB" | 4,509,715,456 bytes |
| Durations | "2h 15m" | 8,100,000 ms |
| Log messages | Summarized | Full raw text |
| Insights | Plain language | Technical with exact values |
| Timestamps | "3 minutes ago" | 2026-03-20T14:23:45Z |

---

## State Management

1. **Component state** (`useState`): expanded rows, text input, modal open/close
2. **Zustand stores**: selected device, sidebar state, dark mode, friendly mode
3. **TanStack Query**: all backend data (auto-cached, configurable refetch intervals)

```typescript
// Example hook
export function useApps(sessionId: number) {
  return useQuery({
    queryKey: ['apps', sessionId],
    queryFn: () => ipc.appCommands.list_packages(sessionId),
    refetchInterval: 60_000,
  });
}
```

---

## Real-Time Events

```typescript
export function useDeviceEvents(sessionId: number) {
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  useEffect(() => {
    const unlisten = ipc.events.onDeviceEvent((event) => {
      if (event.meta.session_id === sessionId) {
        setEvents(prev => [...prev.slice(-999), event]);
      }
    });
    return () => { unlisten(); };
  }, [sessionId]);
  return events;
}
```
