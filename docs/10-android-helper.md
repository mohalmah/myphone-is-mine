# Android Helper App Design

## Overview

The PhoneScope helper is a minimal Android app that provides VPN-based per-app network capture. It runs on the device, connects to the desktop app via WebSocket over ADB port-forward, and streams flow/DNS data. It is NOT a standalone monitoring app — it exists solely to provide data to the desktop.

**Key design decisions:**
- No persistent data storage on device
- No cloud communication
- Persistent notification required by Android for VPN services
- Minimal UI: just status, pairing, and permissions

---

## Module Structure

```
apps/android/
├── build.gradle.kts              # Root Gradle config
├── settings.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts          # minSdk 26, targetSdk 35, Kotlin DSL
    ├── src/
    │   ├── main/
    │   │   ├── AndroidManifest.xml
    │   │   ├── res/
    │   │   │   ├── layout/
    │   │   │   ├── values/
    │   │   │   └── drawable/
    │   │   └── java/com/phonescope/helper/
    │   │       ├── PhoneScopeApp.kt
    │   │       ├── MainActivity.kt
    │   │       ├── service/
    │   │       │   ├── VpnCaptureService.kt
    │   │       │   ├── FlowClassifierService.kt
    │   │       │   ├── DeviceMetadataService.kt
    │   │       │   └── StorageAnalyzerService.kt
    │   │       ├── network/
    │   │       │   ├── DesktopPairingServer.kt
    │   │       │   ├── WebSocketHandler.kt
    │   │       │   └── MessageSerializer.kt
    │   │       ├── model/
    │   │       │   ├── FlowRecord.kt
    │   │       │   ├── DeviceInfo.kt
    │   │       │   ├── StorageInfo.kt
    │   │       │   ├── PairingState.kt
    │   │       │   └── HelperMessage.kt
    │   │       ├── permission/
    │   │       │   └── PermissionManager.kt
    │   │       └── util/
    │   │           ├── PacketParser.kt
    │   │           ├── DnsResolver.kt
    │   │           └── UidMapper.kt
    │   ├── test/                  # JUnit + MockK
    │   └── androidTest/          # Espresso + instrumented
    └── proguard-rules.pro
```

---

## VPN Capture Architecture

### 1. TUN Interface Creation

```kotlin
class VpnCaptureService : VpnService() {
    private var tunInterface: ParcelFileDescriptor? = null

    private fun startCapture() {
        tunInterface = Builder()
            .addAddress("10.0.0.1", 32)
            .addRoute("0.0.0.0", 0)          // Capture all IPv4
            .addRoute("::", 0)                 // Capture all IPv6
            .addDnsServer("8.8.8.8")
            .setSession("PhoneScope VPN")
            .setMtu(1500)
            .establish()
    }
}
```

### 2. Packet Reading Loop

```kotlin
val inputStream = FileInputStream(tunInterface!!.fileDescriptor)
val buffer = ByteArray(32767)
while (isRunning) {
    val length = inputStream.read(buffer)
    if (length > 0) {
        val packet = buffer.copyOf(length)
        processPacket(packet)
    }
}
```

### 3. Packet Parsing (PacketParser.kt)

Extracts from raw IP packets:
- IP version (4 or 6)
- Source/destination IP
- Protocol (TCP=6, UDP=17)
- Source/destination port
- Payload size
- TCP flags (SYN, FIN, RST for connection tracking)

### 4. UID Mapping (UidMapper.kt)

Reads `/proc/net/tcp`, `/proc/net/tcp6`, `/proc/net/udp`, `/proc/net/udp6`:
```
sl  local_address  rem_address  st  ...  uid
0:  0100007F:1F90  0100007F:C9B8  01  ...  10145
```

Maps local port → UID. Then maps UID → package via `PackageManager.getPackagesForUid(uid)`.

### 5. DNS Resolution (DnsResolver.kt)

Intercepts packets to port 53, parses DNS responses:
- Query name (e.g., "graph.facebook.com")
- Query type (A, AAAA, CNAME)
- Resolved IP addresses
- Response code

### 6. Packet Forwarding

Packets must still reach the internet. Uses a protected DatagramSocket (UDP) or Socket (TCP) that bypasses the VPN:

```kotlin
val socket = DatagramSocket()
protect(socket) // VpnService.protect() — bypasses TUN
socket.send(DatagramPacket(data, data.size, remoteAddress, remotePort))
```

### 7. Flow Aggregation (FlowClassifierService.kt)

Groups packets into flows (same src+dst+port+protocol). Aggregates bytes sent/received. Sends FlowUpdate messages to desktop every 1 second.

---

## Pairing Protocol

```
Desktop                              Helper App
   │                                      │
   │── adb forward tcp:9876 tcp:9876 ──►  │
   │                                      │
   │── WebSocket connect ────────────────►│ (DesktopPairingServer)
   │                                      │
   │◄── HandshakeResponse ──────────────  │ (protocol_version, device_info)
   │                                      │
   │── StartCapture(config) ────────────►│
   │                                      │ (VpnCaptureService starts)
   │◄── FlowUpdate ─────────────────────  │
   │◄── FlowUpdate ─────────────────────  │
   │◄── DnsResolution ──────────────────  │
   │◄── FlowUpdate ─────────────────────  │
   │                                      │
   │── Ping ────────────────────────────►│
   │◄── Pong ───────────────────────────  │
   │                                      │
   │── StopCapture ─────────────────────►│
   │                                      │ (VPN stops)
```

---

## HelperMessage Sealed Class (Kotlin)

```kotlin
sealed class HelperMessage {
    // Desktop → Helper
    data class Handshake(val protocolVersion: Int, val desktopVersion: String) : HelperMessage()
    data class StartCapture(val config: CaptureConfig) : HelperMessage()
    object StopCapture : HelperMessage()
    object RequestDeviceInfo : HelperMessage()
    object RequestStorageAnalysis : HelperMessage()
    object Ping : HelperMessage()

    // Helper → Desktop
    data class HandshakeResponse(val protocolVersion: Int, val helperVersion: String, val deviceInfo: DeviceInfoPayload) : HelperMessage()
    data class FlowUpdate(val flow: FlowRecord) : HelperMessage()
    data class DnsResolution(val dns: DnsRecord) : HelperMessage()
    data class DeviceInfo(val info: DeviceInfoPayload) : HelperMessage()
    data class StorageAnalysis(val analysis: StorageAnalysisPayload) : HelperMessage()
    object Pong : HelperMessage()
    data class Error(val code: Int, val message: String) : HelperMessage()
}
```

---

## Required Permissions

| Permission | Purpose |
|-----------|---------|
| `BIND_VPN_SERVICE` | Create TUN interface for packet capture |
| `QUERY_ALL_PACKAGES` | Enumerate all installed packages for UID mapping |
| `FOREGROUND_SERVICE` | Keep VPN service running with notification |
| `POST_NOTIFICATIONS` | Show capture status notification |

---

## Build Configuration

```kotlin
// app/build.gradle.kts
android {
    namespace = "com.phonescope.helper"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.phonescope.helper"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("io.mockk:mockk:1.13.13")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
```
