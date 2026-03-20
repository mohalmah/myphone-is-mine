# M4: Helper App & Per-App Network (Weeks 9–13)

**Goal:** Build the Android Kotlin helper app with VPN-based per-app network capture, enabling exact network attribution to specific apps.

**Ship Criteria:** Helper app installs on device, pairs with desktop over ADB port-forward, streams per-app network flows in real time, correctly attributes traffic to apps.

**Parallel Note:** M4 (Weeks 9-13) overlaps with M3 (Weeks 9-11). T5 and T3 focus on M4. T2 and T4 split between M3 and M4.

---

## Architecture Overview

```
Desktop (Rust)                    Android Device
┌─────────────┐  ADB forward     ┌──────────────────┐
│ VpnFlow     │◄──WebSocket──────│ PhoneScope Helper │
│ Collector   │  tcp:9876        │                   │
│             │                  │ VpnCaptureService │
│ Produces:   │                  │   ├─ TUN iface    │
│ NetworkFlow │                  │   ├─ PacketParser  │
│ Events with │                  │   ├─ UidMapper     │
│ Exact UID   │                  │   └─ DnsResolver   │
└─────────────┘                  └──────────────────┘
```

### Pairing Protocol

1. Desktop runs `adb forward tcp:9876 tcp:9876`
2. Desktop connects WebSocket to `ws://localhost:9876`
3. Helper sends `HandshakeResponse { protocol_version: 1, device_info, helper_version }`
4. Desktop sends `StartCapture { config }`
5. Helper begins streaming `FlowUpdate` and `DnsResolution` messages
6. Desktop sends `Ping` every 5s; helper responds `Pong`
7. Desktop sends `StopCapture` to end; or disconnects

---

## phonescope-helper-protocol Crate

**Owner:** T5 (Android Team)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HelperMessage {
    // Desktop → Helper
    Handshake(HandshakeRequest),
    StartCapture(CaptureConfig),
    StopCapture,
    RequestDeviceInfo,
    RequestStorageAnalysis,
    Ping,

    // Helper → Desktop
    HandshakeResponse(HandshakeResponse),
    FlowUpdate(FlowRecord),
    DnsResolution(DnsRecord),
    DeviceInfo(DeviceInfoPayload),
    StorageAnalysis(StorageAnalysisPayload),
    Pong,
    Error(ErrorPayload),
}

pub struct HandshakeRequest {
    pub protocol_version: u32,
    pub desktop_version: String,
}

pub struct HandshakeResponse {
    pub protocol_version: u32,
    pub helper_version: String,
    pub device_info: DeviceInfoPayload,
    pub capabilities: Vec<String>,
}

pub struct CaptureConfig {
    pub capture_dns: bool,
    pub excluded_packages: Vec<String>,
    pub batch_interval_ms: u64,
}

pub struct FlowRecord {
    pub uid: u32,
    pub package_name: Option<String>,
    pub remote_ip: String,
    pub remote_port: u16,
    pub local_port: u16,
    pub protocol: String, // "tcp" | "udp"
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub timestamp: String,
}

pub struct DnsRecord {
    pub query_name: String,
    pub query_type: String,
    pub resolved_ips: Vec<String>,
    pub package_name: Option<String>,
    pub timestamp: String,
}
```

---

## Android App Structure

```
apps/android/app/src/main/java/com/phonescope/helper/
  PhoneScopeApp.kt                  # Application class
  MainActivity.kt                   # Status UI, pairing, permissions
  service/
    VpnCaptureService.kt            # VpnService — TUN, packet capture, forwarding
    FlowClassifierService.kt        # UID → package mapping, flow aggregation
    DeviceMetadataService.kt        # Device info collection
    StorageAnalyzerService.kt       # Per-app storage analysis
  network/
    DesktopPairingServer.kt         # WebSocket server on localhost:9876
    WebSocketHandler.kt             # Message routing, serialization
    MessageSerializer.kt            # JSON encode/decode (mirrors Rust types)
  model/
    FlowRecord.kt                   # Data classes mirroring Rust
    DeviceInfo.kt
    StorageInfo.kt
    PairingState.kt
    HelperMessage.kt                # Sealed class mirroring Rust enum
  permission/
    PermissionManager.kt            # Runtime permission handling
  util/
    PacketParser.kt                 # IP/TCP/UDP header parsing
    DnsResolver.kt                  # DNS response parsing from TUN
    UidMapper.kt                    # /proc/net/tcp → UID → package
```

### VPN Capture Architecture

1. `VpnCaptureService` extends `android.net.VpnService`
2. Creates TUN: `Builder().addAddress("10.0.0.1", 32).addRoute("0.0.0.0", 0).establish()`
3. Reads raw IP packets from TUN file descriptor in a loop
4. `PacketParser` extracts: src/dst IP, src/dst port, protocol, payload size
5. `UidMapper` reads `/proc/net/tcp` and `/proc/net/udp`, maps local port → UID
6. `FlowClassifierService` maps UID → package via `PackageManager.getPackagesForUid()`
7. `DnsResolver` intercepts DNS packets (port 53), parses A/AAAA responses
8. Packets forwarded to real network via protected socket (bypasses VPN)
9. Flow summaries batched and sent to desktop via WebSocket

### Required Permissions

- `BIND_VPN_SERVICE` — VPN capture
- `QUERY_ALL_PACKAGES` — enumerate installed packages
- `FOREGROUND_SERVICE` — persistent notification (Android requirement)
- `POST_NOTIFICATIONS` — show status notification

---

## Week 9: Protocol Crate + Android Skeleton + WebSocket Server

### T5 — Android Team

| Task | Files |
|------|-------|
| Create `phonescope-helper-protocol` crate with all message types | `crates/phonescope-helper-protocol/Cargo.toml`, `src/lib.rs`, `src/messages.rs`, `src/handshake.rs` |
| Set up Android Gradle project (Kotlin DSL, minSdk 26, targetSdk 35) | `apps/android/build.gradle.kts`, `settings.gradle.kts`, `app/build.gradle.kts` |
| Create `PhoneScopeApp.kt` application class | `apps/android/app/src/main/.../PhoneScopeApp.kt` |
| Create `MainActivity.kt` — minimal UI showing pairing status | `apps/android/app/src/main/.../MainActivity.kt` |
| Implement `DesktopPairingServer` — WebSocket server on localhost:9876 using OkHttp | `apps/android/app/src/main/.../network/DesktopPairingServer.kt` |
| Implement `MessageSerializer` — JSON encode/decode matching Rust types | `apps/android/app/src/main/.../network/MessageSerializer.kt` |
| Implement `WebSocketHandler` — route incoming messages, send outgoing | `apps/android/app/src/main/.../network/WebSocketHandler.kt` |
| Create Kotlin data classes mirroring Rust types | `apps/android/app/src/main/.../model/` |
| Unit tests for message serialization (must match Rust JSON format) | `apps/android/app/src/test/` |

**Acceptance Criteria:**
- Android project builds: `./gradlew assembleDebug`
- WebSocket server starts and accepts connections
- Handshake message round-trips correctly between Rust and Kotlin

---

### T3 — Collectors Team

| Task | Files |
|------|-------|
| Create `VpnFlowCollector` skeleton — connects to helper via WebSocket | `crates/phonescope-collectors/src/vpn_flow.rs` |
| Implement WebSocket client using tokio-tungstenite | `crates/phonescope-collectors/src/vpn_flow.rs` |
| Implement handshake flow (send HandshakeRequest, validate response) | `crates/phonescope-collectors/src/vpn_flow.rs` |
| Parse incoming FlowUpdate messages into `NetworkFlowEvent` with `Confidence::Exact` | `crates/phonescope-collectors/src/vpn_flow.rs` |

---

## Week 10: VPN Capture Service + Packet Parser

### T5 — Android Team

| Task | Files |
|------|-------|
| Implement `VpnCaptureService` — VpnService with TUN interface | `apps/android/app/src/main/.../service/VpnCaptureService.kt` |
| Implement `PacketParser` — parse IPv4/IPv6 headers, TCP/UDP headers | `apps/android/app/src/main/.../util/PacketParser.kt` |
| Implement `UidMapper` — read `/proc/net/tcp`, `/proc/net/tcp6`, `/proc/net/udp`, `/proc/net/udp6` | `apps/android/app/src/main/.../util/UidMapper.kt` |
| Map local port → UID from proc tables | `apps/android/app/src/main/.../util/UidMapper.kt` |
| Implement packet forwarding via protected DatagramSocket/Socket | `apps/android/app/src/main/.../service/VpnCaptureService.kt` |
| Foreground notification for VPN service | `apps/android/app/src/main/.../service/VpnCaptureService.kt` |
| AndroidManifest.xml: VPN permission, service declarations | `apps/android/app/src/main/AndroidManifest.xml` |
| Unit tests for PacketParser (IPv4, IPv6, TCP, UDP) | `apps/android/app/src/test/.../util/PacketParserTest.kt` |
| Unit tests for UidMapper (mock /proc/net/tcp content) | `apps/android/app/src/test/.../util/UidMapperTest.kt` |

**Acceptance Criteria:**
- VPN service starts and creates TUN interface
- PacketParser correctly extracts headers from raw IP packets
- UidMapper maps local ports to UIDs from /proc/net files
- Packets are forwarded (internet still works with VPN active)

---

### T3 — Collectors Team

| Task | Files |
|------|-------|
| Complete `VpnFlowCollector` — full message handling loop | `crates/phonescope-collectors/src/vpn_flow.rs` |
| Handle reconnection (if WebSocket drops, retry with backoff) | `crates/phonescope-collectors/src/vpn_flow.rs` |
| Parse DnsResolution messages into `DnsEvent` | `crates/phonescope-collectors/src/vpn_flow.rs` |
| Unit tests with mock WebSocket server | `crates/phonescope-collectors/tests/` |

---

## Week 11: Flow Classification + DNS Resolution

### T5 — Android Team

| Task | Files |
|------|-------|
| Implement `FlowClassifierService` — UID → package name mapping | `apps/android/app/src/main/.../service/FlowClassifierService.kt` |
| Flow aggregation: group packets into flows (same src+dst, aggregate bytes) | `apps/android/app/src/main/.../service/FlowClassifierService.kt` |
| Implement `DnsResolver` — intercept DNS queries (port 53), parse responses | `apps/android/app/src/main/.../util/DnsResolver.kt` |
| Map DNS query to requesting UID | `apps/android/app/src/main/.../util/DnsResolver.kt` |
| Send FlowUpdate and DnsResolution messages to desktop via WebSocket | `apps/android/app/src/main/.../service/VpnCaptureService.kt` |
| Implement batch sending (aggregate flows every 1s, send batch) | `apps/android/app/src/main/.../network/WebSocketHandler.kt` |
| Implement `DeviceMetadataService` and `StorageAnalyzerService` | `apps/android/app/src/main/.../service/` |

**Acceptance Criteria:**
- Flows correctly attributed to packages
- DNS responses parsed with correct IP resolution
- Batch sending reduces WebSocket overhead
- Flow data appears on desktop in real time

---

### INT — Integration Team

| Task | Files |
|------|-------|
| Add helper-related fields to capability detection | `crates/phonescope-core/src/lib.rs` |
| Wire helper client connection into session lifecycle | `crates/phonescope-core/src/lib.rs` |
| ADB port-forward setup when helper detected | `crates/phonescope-core/src/lib.rs` |

---

## Week 12: Pairing UI + Permission Management

### T5 — Android Team

| Task | Files |
|------|-------|
| Implement `PermissionManager` — request VPN, QUERY_ALL_PACKAGES at runtime | `apps/android/app/src/main/.../permission/PermissionManager.kt` |
| Build pairing UI: status indicator (waiting/connected/capturing), device info | `apps/android/app/src/main/.../MainActivity.kt` |
| VPN exclusion list: exclude self and user-specified apps | `apps/android/app/src/main/.../service/VpnCaptureService.kt` |
| Error handling: VPN permission denied, WebSocket disconnect, low memory | All service files |
| Instrumented tests: VPN starts, packets captured | `apps/android/app/src/androidTest/` |

---

### T4 — Frontend Team

| Task | Files |
|------|-------|
| Build pairing UI in React: helper status card (installed/not, version, VPN status) | `apps/desktop/src/components/device/HelperStatus.tsx` |
| Helper install instructions (step-by-step with ADB command) | `apps/desktop/src/components/device/HelperInstall.tsx` |
| Enhance NetworkPage: show confidence badges (Exact for helper flows, Approximate for ADB) | `apps/desktop/src/pages/NetworkPage.tsx` |
| Per-app network detail in AppDetailPage with exact attribution | `apps/desktop/src/pages/AppDetailPage.tsx` |

---

### INT — Integration Team

| Task | Files |
|------|-------|
| Wire helper status into DeviceCommands | `crates/phonescope-tauri/src/commands/device.rs` |
| Update capability detection to probe helper WebSocket | `crates/phonescope-core/src/lib.rs` |
| Push helper events to frontend | `crates/phonescope-tauri/src/lib.rs` |

---

## Week 13: Full Integration + Polish

### All Teams

| Task | Owner |
|------|-------|
| E2E test: install helper → pair → start capture → see per-app flows | T5 + INT |
| Reconnection testing: disconnect/reconnect device, helper recovers | T5 |
| Performance: helper handles 100+ concurrent flows without dropping | T5 |
| Memory leak testing on Android (long-running VPN) | T5 |
| Polish frontend: loading states, error messages for helper issues | T4 |
| Write handover docs | T5, T3 |

**Acceptance Criteria:**
- Complete flow: install APK → grant permissions → pair → capture → see flows on desktop
- Reconnection works within 5 seconds
- Helper handles heavy traffic without crashing
- Correct app attribution for 95%+ of flows

---

## M4 Exit Criteria Checklist

- [ ] Helper APK builds and installs on Android 8+ device
- [ ] WebSocket pairing over ADB port-forward works
- [ ] VPN capture correctly intercepts all device traffic
- [ ] Per-app attribution works (UID → package)
- [ ] DNS queries captured and attributed to apps
- [ ] Flows displayed on desktop NetworkPage with Confidence::Exact
- [ ] Helper shows persistent notification during capture
- [ ] Reconnection on disconnect works
- [ ] VPN exclusion list works
- [ ] Internet still works on device with VPN active
- [ ] CI: Android project builds, unit tests pass

---

## Handovers from M4

| From | To | What | When |
|------|----|------|------|
| T5 | INT | `phonescope-helper-protocol` v1 | End of Week 9 |
| T5 | INT | Helper APK + pairing flow | End of Week 13 |
| T3 | INT | VpnFlowCollector | End of Week 10 |
