# 12 — Testing & Acceptance Criteria

Every milestone has a definition of done. Code that does not meet these criteria
does not ship. No exceptions.

---

## Milestone 1 — Foundation

### Unit Tests

| Area | What to test |
|------|-------------|
| Logcat parsing | Parse `threadtime` format lines into structured `LogEntry` events. Cover: normal lines, multiline payloads, malformed timestamps, binary garbage, empty lines. |
| Package listing | Parse `pm list packages -f` output into `(package_name, apk_path)` tuples. Handle `package:` prefix, paths with spaces, empty output. |
| Package detail | Parse `dumpsys package <pkg>` output: extract version, permissions, install date, UID. Handle missing fields gracefully. |

### Integration Tests

- Connect to a running Android emulator via ADB.
- Call `list_packages()` and verify the result contains at least one system package (e.g., `com.android.settings`).
- Start and stop a logcat stream; verify at least one `LogEntry` is received within 5 seconds.

### Frontend — Component Tests

| Component | Assertions |
|-----------|------------|
| `LogsPage` | Renders log entries, filters by severity, pauses/resumes stream, highlights search matches. |
| `AppsPage` | Renders package list, filters by system/user, shows package detail on click. |
| `ControlsPage` | Shows device connection status, displays ADB path, shows connect/disconnect actions. |

### End-to-End

1. Launch the Tauri application.
2. Connect to a mock ADB device (or emulator).
3. Verify the Logs page displays streaming log entries.
4. Navigate to the Apps page and confirm the package list loads.
5. Select an app and execute force-stop; verify the command completes without error.

---

## Milestone 2 — Deep Telemetry

### Unit Tests

| Area | What to test |
|------|-------------|
| Battery parsing | Parse `dumpsys battery` output: level, status, temperature, voltage, health. Handle missing keys. |
| Network stats | Parse `dumpsys netstats` output: per-UID rx/tx bytes and packets. Handle zero-traffic UIDs. |
| Process list | Parse `top -b -n 1` output: PID, name, CPU%, MEM%, state. Handle header variations across Android versions. |
| Thermal zones | Parse `/sys/class/thermal/thermal_zone*/temp` values. Handle missing zones, non-numeric content. |
| Domain classification | Exact match (`graph.facebook.com` -> Facebook), suffix match (`*.doubleclick.net` -> Google Ads), unknown domains return `Unknown`. |
| Insight: HighBackgroundTraffic | Fires when a non-foreground app exceeds the traffic threshold. Does not fire for foreground apps. |
| Insight: ExcessiveTrackers | Fires when an app contacts more than N known tracker domains. Threshold is configurable. |
| Insight: BatteryDrainCorrelation | Fires when battery drop rate correlates with high-CPU processes. Does not fire during charging. |
| Insight: StorageHog | Fires when an app's data directory exceeds the configured threshold. |
| Insight: ThermalWarning | Fires when any thermal zone exceeds the warning temperature. |
| Insight: ResourceOverload | Fires when combined CPU usage of background processes exceeds threshold. |
| Insight: ExcessivePermissions | Fires when an app holds more dangerous permissions than its category median. |
| Insight: NewDomainContact | Fires when an app contacts a domain not seen in its historical baseline. |

### Integration Tests

- Feed a known dataset (battery samples, network stats, process snapshots) into the analytics engine.
- Verify the output summary contains the correct aggregations: total traffic per app, average CPU per app, battery drain rate.
- Verify at least one insight is generated from the test data.

### Frontend — Chart Tests

| Component | Assertions |
|-----------|------------|
| Battery timeline | Renders SVG/Canvas chart with correct Y-axis (0–100%), X-axis time labels, charging indicator. |
| Storage treemap | Renders proportional blocks for app data sizes; clicking a block shows detail. |
| Process table | Renders sortable columns (CPU%, MEM%, name); updates on new data; handles 100+ rows without jank. |

---

## Milestone 3 — App Usage Intelligence

### Unit Tests

| Area | What to test |
|------|-------------|
| Usage stats parsing | Parse `dumpsys usagestats` output for daily, weekly, monthly buckets. Extract `totalTimeInForeground`, `lastTimeUsed`, `mLastTimeSaved`. Handle empty buckets. |
| Snapshot deduplication | Two snapshots with identical data within the dedup window produce one stored record. Snapshots with changed data produce a new record. Edge case: clock skew between snapshots. |
| Period comparison | Comparing week-over-week usage: calculate delta, percentage change, trend direction. Handle zero-usage baselines (avoid divide-by-zero). |

### Integration Tests

- Configure a snapshot scheduler with a 1-second interval (test mode).
- Run for 5 seconds; verify at least 3 snapshots are stored in the database.
- Verify deduplication: if device state does not change, duplicate snapshots are not stored.

### Frontend Tests

| Component | Assertions |
|-----------|------------|
| Usage dashboard | Renders daily/weekly/monthly views from mock data. Bar chart shows per-app screen time. |
| Goals | User can set a daily screen-time goal; progress bar reflects current usage; exceeded goals show a warning. |
| Usage insights | Insight cards render with correct severity, app name, and actionable text. |

---

## Milestone 4 — Helper App

### Unit Tests

| Area | What to test |
|------|-------------|
| IPv4 parsing | Parse raw IPv4 headers: version, IHL, total length, protocol, source/dest addresses. Handle options field. |
| IPv6 parsing | Parse raw IPv6 headers: version, traffic class, flow label, next header, source/dest addresses. Handle extension headers. |
| TCP parsing | Parse TCP headers: source/dest ports, sequence number, flags (SYN, ACK, FIN, RST). Handle variable header length. |
| UDP parsing | Parse UDP headers: source/dest ports, length, checksum. Verify minimum packet size. |
| UID mapping | Read `/proc/net/tcp` and `/proc/net/tcp6`; map `(local_addr, local_port, remote_addr, remote_port)` to UID. Handle hex-encoded addresses. |

### Integration Tests

- Start the helper app on a test device or emulator.
- Verify WebSocket connection is established within 2 seconds.
- Send a `Ping` message and receive a `Pong` response.
- Trigger network traffic on the device; verify at least one `FlowRecord` is received via WebSocket.

### Protocol Conformance

Send every `HelperMessage` variant over WebSocket and verify:
- `FlowRecord` — parsed correctly by the desktop client.
- `DnsRecord` — domain name and resolved IPs extracted.
- `Heartbeat` — connection stays alive; missed heartbeats trigger reconnect.
- `Error` — error message is surfaced to the user.

### Android Instrumented Tests

- VPN service starts when user grants permission.
- VPN service captures packets from at least one app.
- VPN service stops cleanly when the user toggles it off.
- No packet leaks: all traffic goes through the VPN tunnel while active.

---

## Milestone 5 — Proxy Mode

### Unit Tests

| Area | What to test |
|------|-------------|
| HAR parsing | Parse a standard HAR 1.2 file: extract entries, requests, responses, timings. Handle missing optional fields (`comment`, `cache`). Reject invalid HAR versions. |

### Integration Tests

- Start the mitmproxy sidecar process from the desktop app.
- Verify the proxy is listening on the configured port within 5 seconds.
- Stop the sidecar; verify the process terminates and the port is released.

### Proxy Capture Tests

- Route an HTTP request through the proxy.
- Verify the captured request includes: method, URL, headers, body (if present).
- Verify response capture includes: status code, headers, body.
- Verify requests are normalized: header names lowercased, cookies parsed, query params split.

### HAR Export

- Capture 10 requests through the proxy.
- Export to HAR format.
- Validate the output against the HAR 1.2 JSON schema.
- Verify `entries` count matches captured request count.
- Verify `startedDateTime` is ISO 8601 format.

### CA Certificate Flow

- Test the CA certificate generation produces a valid X.509 certificate.
- Test the user-facing installation instructions are shown for the current OS.
- Test that HTTPS interception works after certificate installation.

---

## Milestone 6 — Polish & Ship

### End-to-End

- Complete the onboarding wizard: select ADB path, connect device, confirm connection, reach the main dashboard.
- Verify every page is reachable and renders without errors.

### Performance

| Benchmark | Target |
|-----------|--------|
| Insert 1,000,000 log entries into SQLite | Completes within a reasonable time; single-entry query returns in < 100ms. |
| Render 10,000 rows in a virtual-scrolling table | 60fps sustained during scroll (measure via performance observer or Chrome DevTools audit). |
| Load usage dashboard with 365 days of snapshot data | Page interactive in < 2 seconds. |

### Export Validation

| Format | Validation |
|--------|-----------|
| JSON | Valid JSON; parseable by `serde_json` and `JSON.parse`. Schema matches documented format. |
| CSV | Valid CSV; parseable by any RFC 4180 parser. Header row present. No unescaped commas in fields. |
| HAR | Valid HAR 1.2; passes schema validation. |

### Root Mode

- Parse `tcpdump -nn -l` output: extract timestamp, protocol, source, dest, length.
- Handle IPv4 and IPv6 addresses in tcpdump output.
- Handle truncated lines and permission errors gracefully.

### Packaging

- Tauri build succeeds for Windows (x86_64), macOS (x86_64 + aarch64), Linux (x86_64 AppImage + .deb).
- Built artifacts launch and display the main window.
- Code signing is applied where configured.

---

## General Quality Gates

These gates apply to **every milestone** and **every pull request**. CI enforces them
automatically. A PR that fails any gate does not merge.

### Rust

| Gate | Command / Rule |
|------|---------------|
| Lints | `cargo clippy --workspace -- -D warnings` passes with zero warnings. |
| Formatting | `cargo fmt --check` passes. No manual formatting overrides. |
| No panics in libraries | `unwrap()` is forbidden in library crates. Use `expect()` with a reason only in tests and xtask. Enforced by a CI grep check. |
| Doc comments | Every `pub fn`, `pub struct`, `pub enum`, and `pub trait` has a `///` doc comment. Enforced by `#![warn(missing_docs)]` in library crate roots. |
| Test coverage | Library crates maintain > 70% line coverage measured by `cargo llvm-cov`. Coverage drops block the PR. |

### TypeScript

| Gate | Rule |
|------|------|
| Strict mode | `tsconfig.json` has `"strict": true`. No overrides. |
| No `any` | The word `any` does not appear as a type annotation. Enforced by ESLint rule `@typescript-eslint/no-explicit-any`. |
| Linting | `eslint` and `prettier` pass with zero errors. |

### Security

| Gate | Rule |
|------|------|
| SQL injection | All database queries use parameterized statements (`?` placeholders). No string-concatenated SQL. Enforced by code review and a CI grep for raw SQL concatenation patterns. |
| Command injection | All ADB commands are constructed using typed argument builders, never string interpolation. Enforced by code review. |
| No secrets in code | No API keys, tokens, passwords, or credentials in the repository. Enforced by `gitleaks` in CI. |
| Dependency audit | `cargo audit` and `npm audit` run in CI. Known vulnerabilities block the build. |
