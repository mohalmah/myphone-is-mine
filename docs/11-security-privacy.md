# Security & Privacy

## Core Principle

PhoneScope is local-only. No data leaves the user's computer. No accounts, no cloud, no telemetry.

---

## Redaction Rules

Applied at the collector output stage — BEFORE data reaches storage.

```rust
pub struct RedactionConfig {
    pub redact_message_bodies: bool,        // Strip HTTP request/response bodies
    pub redact_auth_headers: bool,          // Strip Authorization, Cookie, Set-Cookie
    pub redact_query_params: Vec<String>,   // Param names to redact (token, key, password, secret, api_key)
    pub redact_log_patterns: Vec<String>,   // Regex patterns to redact in log messages
    pub custom_redaction_rules: Vec<RedactionRule>,
}

pub struct RedactionRule {
    pub name: String,
    pub pattern: String,       // Regex
    pub replacement: String,   // Default: "[REDACTED]"
    pub applies_to: Vec<RedactionTarget>, // LogMessage, HttpHeader, HttpBody, Url, DnsQuery
}
```

**Default redactions (always on):**
- HTTP `Authorization` header → `[REDACTED]`
- HTTP `Cookie` / `Set-Cookie` headers → `[REDACTED]`
- URL query params named: `token`, `key`, `password`, `secret`, `api_key`, `access_token`, `refresh_token`

---

## Capture Policies

```rust
pub struct CapturePolicy {
    pub capture_http_bodies: bool,          // Default: false
    pub capture_dns: bool,                  // Default: true
    pub capture_log_content: bool,          // Default: true
    pub excluded_packages: Vec<String>,     // Don't capture traffic for these apps
    pub excluded_domains: Vec<String>,      // Don't record requests to these domains
    pub max_log_retention_days: u32,        // Default: 7
    pub max_network_retention_days: u32,    // Default: 30
}
```

Users can exclude specific apps (e.g., banking apps) and domains from all capture.

---

## Consent Flow

### First Launch

The onboarding wizard (M6) includes a consent step explaining:

1. **What data is collected:** logs, app list, network connections, battery, storage, CPU usage
2. **Where it's stored:** local SQLite file at `~/.phonescope/data.db` (exact path shown)
3. **What is NOT done:** no cloud upload, no telemetry, no analytics, no accounts
4. **User must explicitly opt in** to each data tier

### Per-Mode Consent

When enabling a new mode (helper app, proxy), additional consent is shown:

- **Helper mode:** "The helper app creates a local VPN on your phone to see which app makes which network connection. All data stays on your phone and desktop."
- **Proxy mode:** "PhoneScope will route your phone's HTTP traffic through mitmproxy on your computer. This allows seeing full HTTP request details. A CA certificate will be installed on your device."

### New Device Connection

Each new device triggers a brief consent reminder showing what will be collected.

---

## Local-Only Guarantees

1. **No network calls** from the desktop app (except ADB over USB/localhost)
2. **No telemetry, analytics, or crash reporting** embedded in the app
3. **No auto-update checks** — user manually updates
4. **Database file location** is user-visible and documented in settings
5. **Export is always explicit** — user must click export button and choose save location
6. **No background processes** — app only collects when running and user has connected a device

---

## Monitoring Indicators

Users and device owners must be aware monitoring is happening:

1. **Android helper** shows a persistent notification: "PhoneScope is monitoring network traffic"
2. **Android system** shows VPN key icon in status bar when helper VPN is active
3. **Desktop app** shows a "RECORDING" indicator in the header bar during active capture
4. **Proxy mode** makes the proxy configuration visible in Android's WiFi settings
5. **All actions are logged** in the `user_action` table (force stop, uninstall, permission changes)

---

## Data at Rest

- **SQLite file** is stored with standard file permissions (user-only read/write)
- **No encryption at rest** by default — this is the user's responsibility (use full-disk encryption)
- **Export files** are not encrypted — user is warned before export
- **HAR exports** may contain sensitive data (URLs, headers) — warning shown before export
- **Usage snapshots** contain app usage patterns that could be privacy-sensitive — never auto-shared

---

## Usage Data Privacy

- Usage snapshots are stored **locally only** and **never transmitted**
- User can delete any individual snapshot or all snapshots for a time range
- Usage data is not included in standard exports unless user explicitly selects it
- Category classification (Social, Games, etc.) is done locally using package name heuristics

---

## Security Practices

- All SQLite queries use **parameterized statements** (no string concatenation)
- ADB commands are **validated and sanitized** before execution (no shell injection)
- WebSocket communication with helper app is **localhost only** over ADB port-forward
- mitmproxy sidecar binary is **verified by checksum** after download
- No user input is passed directly to shell commands
- Frontend validates all data from backend with Zod schemas
