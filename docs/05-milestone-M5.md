# M5: Proxy Mode & HTTP Inspection (Weeks 12–15)

**Goal:** mitmproxy as a Tauri sidecar for full HTTP/HTTPS request inspection, HAR parsing, and request-level visibility.

**Ship Criteria:** Proxy starts as sidecar, device traffic routes through it, HTTP requests visible with full detail (method, URL, headers, status, size, timing), HAR export works.

**Parallel Note:** M5 starts at Week 12, overlapping with M4 (Weeks 12-13). T6 leads M5. T3 and T4 split time between M4 polish and M5.

---

## Architecture

```
Android Device                Desktop (Rust + mitmproxy)
┌─────────┐                  ┌──────────────────────────┐
│ WiFi    │─── HTTP/S ──────►│ mitmproxy (sidecar)      │
│ proxy:  │                  │   port 8080              │
│ desktop │                  │   ├─ intercept traffic   │
│ :8080   │                  │   ├─ write HAR entries   │
│         │                  │   └─ stream to stdout    │
└─────────┘                  │                          │
                             │ ProxyManager (Rust)      │
                             │   ├─ start/stop sidecar  │
                             │   ├─ parse HAR stream    │
                             │   └─ → HttpRequestEvent  │
                             │                          │
                             │ ProxyCollector            │
                             │   └─ feed to EventBus    │
                             └──────────────────────────┘
```

### mitmproxy Sidecar Strategy

- Downloaded per-platform via `cargo xtask fetch-mitmproxy`
- Placed in `apps/desktop/src-tauri/binaries/` (gitignored)
- Launched via `tauri-plugin-shell` sidecar API
- Uses `mitmdump` mode (headless) with custom addon or `--set hardump=<path>`
- Sidecar lifecycle managed by `ProxyManager`

---

## phonescope-proxy Crate

**Owner:** T6 (Proxy Team)

```rust
pub struct ProxyManager {
    process: Option<CommandChild>,
    config: ProxyConfig,
    har_path: PathBuf,
}

pub struct ProxyConfig {
    pub listen_port: u16,       // default 8080
    pub web_port: u16,          // default 8081 (mitmweb UI, optional)
    pub har_dump_path: PathBuf,
    pub upstream_cert: bool,
    pub ssl_insecure: bool,
    pub scripts: Vec<PathBuf>,  // custom mitmdump scripts
}

impl ProxyManager {
    pub async fn start(&mut self, app_handle: &AppHandle) -> Result<()>;
    pub async fn stop(&mut self) -> Result<()>;
    pub fn is_running(&self) -> bool;
    pub async fn configure_device_proxy(&self, shell: &AdbShell, port: u16) -> Result<()>;
    pub async fn remove_device_proxy(&self, shell: &AdbShell) -> Result<()>;
    pub async fn install_ca_cert(&self, shell: &AdbShell) -> Result<()>;
    pub fn har_watcher(&self) -> Result<impl Stream<Item = HarEntry>>;
}
```

---

## Week 12: Proxy Crate + xtask + DB Table

### T6 — Proxy Team

| Task | Files |
|------|-------|
| Create `phonescope-proxy` crate skeleton | `crates/phonescope-proxy/Cargo.toml`, `src/lib.rs` |
| Implement `ProxyConfig` with defaults | `crates/phonescope-proxy/src/lib.rs` |
| Implement `ProxyManager::start()` — launch mitmproxy via shell sidecar | `crates/phonescope-proxy/src/lib.rs` |
| Implement `ProxyManager::stop()` — graceful shutdown | `crates/phonescope-proxy/src/lib.rs` |
| Implement `ProxyManager::is_running()` — check process alive | `crates/phonescope-proxy/src/lib.rs` |
| Implement process health monitoring (restart on crash) | `crates/phonescope-proxy/src/lib.rs` |
| Define `HarEntry` struct (subset of HAR 1.2 spec) | `crates/phonescope-proxy/src/har.rs` |
| Unit tests for config, lifecycle | `crates/phonescope-proxy/tests/` |

**Acceptance Criteria:**
- ProxyManager starts and stops mitmproxy sidecar
- Health check detects crashed process
- Process restarts on crash

---

### INT — Integration Team

| Task | Files |
|------|-------|
| Implement `cargo xtask fetch-mitmproxy` — download mitmproxy binary for current OS/arch | `xtask/src/main.rs` |
| Download to `apps/desktop/src-tauri/binaries/` | `xtask/src/main.rs` |
| Add `binaries/` to `.gitignore` | `.gitignore` |
| Configure `tauri.conf.json` with sidecar: `"externalBin": ["binaries/mitmdump"]` | `apps/desktop/src-tauri/tauri.conf.json` |
| Add `shell:allow-execute` capability for mitmproxy | `apps/desktop/src-tauri/capabilities/default.json` |

---

### T2 — Data Team

| Task | Files |
|------|-------|
| Write migration 007: `http_request` table | `crates/phonescope-storage/src/migrations.rs` |
| Implement `insert_http_request()` and `query_http_requests(filter)` | `crates/phonescope-storage/src/queries.rs` |
| Define `HttpRequestFilter` (host, method, status, time range, package) | `crates/phonescope-storage/src/queries.rs` |
| Define `HttpRequestRow` model | `crates/phonescope-storage/src/models.rs` |

---

## Week 13: HAR Parser + ProxyCollector

### T6 — Proxy Team

| Task | Files |
|------|-------|
| Implement HAR 1.2 parser | `crates/phonescope-proxy/src/har.rs` |
| Parse HAR entries: method, URL, status, headers, size, timing, TLS info | `crates/phonescope-proxy/src/har.rs` |
| Implement `har_watcher()` — watch HAR dump file for new entries (file tailing) | `crates/phonescope-proxy/src/lib.rs` |
| Implement request normalization: extract host, path, query params | `crates/phonescope-proxy/src/normalize.rs` |
| Write mitmdump addon script for streaming HAR entries to stdout | `crates/phonescope-proxy/scripts/stream_har.py` |
| Unit tests for HAR parsing (sample HAR files) | `crates/phonescope-proxy/tests/`, `tests/fixtures/sample.har` |

**Acceptance Criteria:**
- HAR parser handles standard HAR 1.2 format
- Streaming watcher picks up new entries as mitmproxy writes them
- Request normalization extracts correct host/path

---

### T3 — Collectors Team

| Task | Files |
|------|-------|
| Implement `ProxyCollector` — reads from `ProxyManager::har_watcher()` | `crates/phonescope-collectors/src/proxy.rs` |
| Convert `HarEntry` into `HttpRequestEvent` | `crates/phonescope-collectors/src/proxy.rs` |
| Extract DNS info from proxy, produce `DnsEvent` | `crates/phonescope-collectors/src/proxy.rs` |
| Register ProxyCollector in CollectorManager | `crates/phonescope-collectors/src/lib.rs` |
| Unit tests | `crates/phonescope-collectors/tests/` |

---

### INT — Integration Team

| Task | Files |
|------|-------|
| Wire proxy into Tauri sidecar lifecycle (start on demand, stop on app close) | `apps/desktop/src-tauri/src/lib.rs` |
| Configure sidecar command args | `crates/phonescope-tauri/src/lib.rs` |

---

## Week 14: CA Cert + Device Proxy Config + Frontend

### T6 — Proxy Team

| Task | Files |
|------|-------|
| Implement CA certificate generation/export from mitmproxy | `crates/phonescope-proxy/src/lib.rs` |
| Implement `install_ca_cert()` — push cert to device via ADB, instruct user | `crates/phonescope-proxy/src/lib.rs` |
| Implement `configure_device_proxy()` — set Android global proxy to desktop IP:port | `crates/phonescope-proxy/src/lib.rs` |
| Implement `remove_device_proxy()` — clear proxy settings | `crates/phonescope-proxy/src/lib.rs` |
| Handle proxy auth if needed | `crates/phonescope-proxy/src/lib.rs` |

**Acceptance Criteria:**
- CA cert pushed to device and user shown install instructions
- Device proxy settings configured via ADB
- Proxy settings cleaned up on disconnect

---

### T4 — Frontend Team

| Task | Files |
|------|-------|
| Build `RequestsPage`: HTTP request table (method, URL, status, size, duration) | `apps/desktop/src/pages/RequestsPage.tsx` |
| Request detail panel: headers, body preview, timing breakdown | `apps/desktop/src/components/proxy/RequestDetail.tsx` |
| Request filtering: by host, method, status code, content type | `apps/desktop/src/components/proxy/RequestFilters.tsx` |
| HAR export button | `apps/desktop/src/pages/RequestsPage.tsx` |
| Proxy settings panel: start/stop toggle, port config, status indicator | `apps/desktop/src/components/proxy/ProxySettings.tsx` |
| CA cert install wizard (step-by-step guide with screenshots) | `apps/desktop/src/components/proxy/CaCertWizard.tsx` |
| Create `useProxy` hook | `apps/desktop/src/hooks/useProxy.ts` |

**Acceptance Criteria:**
- RequestsPage shows HTTP requests in real time
- Detail panel shows headers and body
- Filtering works on all fields
- HAR export produces valid file
- Proxy settings panel starts/stops proxy

---

### INT — Integration Team

| Task | Files |
|------|-------|
| Wire `ProxyCommands`: `start_proxy`, `stop_proxy`, `get_proxy_status`, `install_ca_cert`, `configure_device_proxy` | `crates/phonescope-tauri/src/commands/proxy.rs` |
| Wire proxy status events to frontend | `crates/phonescope-tauri/src/lib.rs` |
| Update capability detection for proxy mode | `crates/phonescope-core/src/lib.rs` |

---

## Week 15: Correlation + Full Integration

### T6 — Proxy Team

| Task | Files |
|------|-------|
| Implement request-flow correlation: match HTTP requests to network flows by timing + endpoint | `crates/phonescope-proxy/src/normalize.rs` |
| Implement HAR export: compile captured requests into standard HAR 1.2 file | `crates/phonescope-proxy/src/har.rs` |
| Performance: handle 100+ requests/second without dropping | `crates/phonescope-proxy/benches/` |

---

### INT — Integration Team

| Task | Files |
|------|-------|
| Wire HAR export command | `crates/phonescope-tauri/src/commands/export.rs` |
| E2E test: start proxy → configure device → browse on phone → see requests on desktop → export HAR | tests |
| Validate exported HAR with HAR validator | tests |
| Write handover docs | `docs/handovers/proxy-v1.md` |

**Acceptance Criteria:**
- Full proxy flow works end-to-end
- HTTP requests correlated with network flows where possible
- HAR export produces valid HAR 1.2 file
- Proxy handles sustained traffic without memory leaks

---

## M5 Exit Criteria Checklist

- [ ] mitmproxy starts as Tauri sidecar
- [ ] `cargo xtask fetch-mitmproxy` downloads correct binary per platform
- [ ] Device traffic routes through proxy
- [ ] CA cert installation flow works
- [ ] HTTP requests visible on RequestsPage with full detail
- [ ] Request filtering works (host, method, status, content type)
- [ ] HAR export produces valid file
- [ ] Proxy start/stop from UI works
- [ ] Proxy status shown in header
- [ ] Request-flow correlation works
- [ ] No memory leaks under sustained traffic
- [ ] CI green

---

## Handovers from M5

| From | To | What | When |
|------|----|------|------|
| T6 | INT | `phonescope-proxy` v1 — manager, HAR parser, normalizer | End of Week 14 |
| INT | All | Full proxy integration | End of Week 15 |
