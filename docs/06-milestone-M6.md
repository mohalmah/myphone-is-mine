# M6: Polish & Ship (Weeks 16–19)

**Goal:** Onboarding wizard, root mode, report generation, performance optimization, dark mode, friendly/raw toggle, E2E testing, and packaging for distribution.

**Ship Criteria:** New user can install, connect a device, and understand the app within 2 minutes. Reports exportable. App handles 1M+ log entries without lag. Packaged for Windows/macOS/Linux.

---

## Week 16: Root Mode

### T1 — Platform Team

| Task | Files |
|------|-------|
| Implement root detection in phonescope-adb: `adb shell su -c id` | `crates/phonescope-adb/src/shell.rs` |
| Implement root shell: `AdbShell::root_exec()` — run commands via `su` | `crates/phonescope-adb/src/shell.rs` |
| Implement deep file system access via root | `crates/phonescope-adb/src/file_ops.rs` |
| Update capability detection: root mode enables tcpdump + deep storage | `crates/phonescope-core/src/lib.rs` |

### T3 — Collectors Team

| Task | Files |
|------|-------|
| Implement `RootTcpdumpCollector`: run `tcpdump -i any -n -l` via root shell | `crates/phonescope-collectors/src/root_tcpdump.rs` |
| Parse tcpdump output into `NetworkFlowEvent` with `Confidence::Exact` | `crates/phonescope-collectors/src/root_tcpdump.rs` |
| Implement deep storage collector: access `/data/data/` via root for exact app sizes | `crates/phonescope-collectors/src/storage.rs` |
| Unit tests for tcpdump output parsing | `crates/phonescope-collectors/tests/` |

### T2 — Data Team

| Task | Files |
|------|-------|
| Root-specific insight rules: apps with suspicious file writes, hidden storage | `crates/phonescope-insights/src/rules.rs` |
| Deep storage insight: "App X has 500MB of data not visible without root" | `crates/phonescope-insights/src/rules.rs` |

### T4 — Frontend Team

| Task | Files |
|------|-------|
| Update `AdvancedPage`: root-specific options, raw ADB shell | `apps/desktop/src/pages/AdvancedPage.tsx` |
| Root status indicator in header | `apps/desktop/src/components/layout/Header.tsx` |
| Capability matrix view: show what's available per mode | `apps/desktop/src/components/device/CapabilityMatrix.tsx` |

**Week 16 Acceptance Criteria:**
- Root detection works on rooted devices
- tcpdump-based capture provides exact flow data
- Deep storage analysis shows hidden data sizes
- AdvancedPage shows root-specific features

---

## Week 17: Onboarding Wizard + Report Generation

### T4 — Frontend Team

| Task | Files |
|------|-------|
| Build onboarding wizard (multi-step modal on first launch) | `apps/desktop/src/components/onboarding/OnboardingWizard.tsx` |
| Step 1: Welcome + what PhoneScope does | `apps/desktop/src/components/onboarding/WelcomeStep.tsx` |
| Step 2: ADB detection (auto-detect, manual path, download link) | `apps/desktop/src/components/onboarding/AdbSetupStep.tsx` |
| Step 3: Connect device (show detected devices, connect button) | `apps/desktop/src/components/onboarding/ConnectStep.tsx` |
| Step 4: Explain modes (basic/helper/proxy/root) with capabilities | `apps/desktop/src/components/onboarding/ModesStep.tsx` |
| Step 5: Consent (what data is collected, where stored, opt-in per tier) | `apps/desktop/src/components/onboarding/ConsentStep.tsx` |
| Step 6: Done (go to overview) | `apps/desktop/src/components/onboarding/DoneStep.tsx` |
| Persist "onboarding completed" flag in settings store | `apps/desktop/src/stores/settingsStore.ts` |
| Build `ReportsPage`: export options with date range picker | `apps/desktop/src/pages/ReportsPage.tsx` |
| Report preview: summary view before export | `apps/desktop/src/components/reports/ReportPreview.tsx` |
| Export format selector: JSON, CSV, HAR, HTML summary | `apps/desktop/src/components/reports/ExportOptions.tsx` |

### T2 — Data Team

| Task | Files |
|------|-------|
| Implement report generation: compile session data into structured summary | `crates/phonescope-storage/src/queries.rs` |
| JSON export: all events for date range | `crates/phonescope-tauri/src/commands/export.rs` |
| CSV export: per-table CSV files in a zip | `crates/phonescope-tauri/src/commands/export.rs` |
| HTML summary report: device info, top apps, network summary, insights, charts data | `crates/phonescope-tauri/src/commands/export.rs` |
| Usage data export (separate from session-scoped exports) | `crates/phonescope-usage/src/lib.rs` |

### INT — Integration Team

| Task | Files |
|------|-------|
| Wire all export commands through taurpc | `crates/phonescope-tauri/src/commands/export.rs` |
| File save dialog integration (Tauri dialog API) | `crates/phonescope-tauri/src/commands/export.rs` |

**Week 17 Acceptance Criteria:**
- First-launch wizard guides user through setup in < 2 minutes
- Wizard detects ADB and connected devices
- JSON/CSV/HAR/HTML exports produce valid files
- Date range picker correctly scopes exports

---

## Week 18: Performance + Dark Mode + Friendly/Raw Toggle

### T4 — Frontend Team

| Task | Files |
|------|-------|
| Implement virtual scrolling for ALL data tables (TanStack Virtual) | All table components |
| Implement pagination for large datasets (server-side via taurpc) | Hooks + page components |
| Dark mode: TailwindCSS dark variant, toggle in settings | `apps/desktop/tailwind.config.ts`, `apps/desktop/src/stores/uiStore.ts` |
| Dark mode color scheme for all components | All component files |
| Friendly/Raw mode toggle in header | `apps/desktop/src/components/layout/Header.tsx` |
| Friendly mode: replace domains with service names, humanize sizes, summarize logs | `apps/desktop/src/services/formatters.ts` |
| Raw mode: exact values, full domains, technical detail | `apps/desktop/src/services/formatters.ts` |
| Apply friendly/raw to ALL pages | All page files |
| Service name mapping: graph.facebook.com → "Facebook API", etc. | `apps/desktop/src/services/domainClassifier.ts` |

### T2 — Data Team

| Task | Files |
|------|-------|
| Query optimization: add missing indexes for slow queries | `crates/phonescope-storage/src/migrations.rs` |
| Implement paginated queries (LIMIT + OFFSET, cursor-based for logs) | `crates/phonescope-storage/src/queries.rs` |
| Benchmark: all queries < 100ms with 1M rows | `crates/phonescope-storage/benches/` |
| Implement database vacuum on demand | `crates/phonescope-storage/src/lib.rs` |
| Optimize batch inserts (prepared statements, transaction batching) | `crates/phonescope-storage/src/lib.rs` |

### T1 — Platform Team

| Task | Files |
|------|-------|
| Profile and optimize collector performance | Various collector files |
| Reduce ADB command overhead (batch queries where possible) | `crates/phonescope-adb/src/shell.rs` |

**Week 18 Acceptance Criteria:**
- 10K rows render at 60fps with virtual scrolling
- All queries < 100ms with 1M rows
- Dark mode toggles without page reload
- Friendly mode shows human-readable text on all pages
- Raw mode shows exact technical values

---

## Week 19: E2E Tests + Packaging + Release

### T4 — Frontend Team

| Task | Files |
|------|-------|
| Set up Playwright for E2E testing | `apps/desktop/playwright.config.ts` |
| E2E: onboarding flow | `apps/desktop/e2e/onboarding.spec.ts` |
| E2E: connect device → browse apps → view logs | `apps/desktop/e2e/basic-flow.spec.ts` |
| E2E: usage dashboard with data | `apps/desktop/e2e/usage.spec.ts` |
| E2E: export report | `apps/desktop/e2e/export.spec.ts` |
| Accessibility audit (keyboard navigation, screen reader labels) | All components |

### INT — Integration Team

| Task | Files |
|------|-------|
| Release CI workflow: Tauri build for Windows, macOS, Linux | `.github/workflows/release.yml` |
| Code signing setup (macOS notarization, Windows signing) | `.github/workflows/release.yml` |
| Auto-updater configuration (optional, manual update) | `apps/desktop/src-tauri/tauri.conf.json` |
| Final integration test: all features working together | tests |
| Build installers: .dmg, .msi/.exe, .AppImage/.deb | CI output |
| Write user-facing README | `README.md` |

### All Teams

| Task | Owner |
|------|-------|
| Fix all remaining bugs from E2E testing | Respective teams |
| Performance regression testing | T2 + INT |
| Security audit: no SQL injection, no command injection, no XSS | INT |
| Final code review across all crates | All teams |
| Documentation review | All teams |

**Week 19 Acceptance Criteria:**
- All E2E tests pass
- Builds produced for Windows, macOS, Linux
- Installers install and run correctly
- No critical bugs remaining
- README written with installation instructions
- All CI checks green

---

## M6 Exit Criteria Checklist

- [ ] Onboarding wizard guides new users (< 2 minutes to first data)
- [ ] Root mode: tcpdump capture + deep storage on rooted devices
- [ ] JSON/CSV/HAR/HTML export all work correctly
- [ ] Virtual scrolling: 10K rows at 60fps
- [ ] All queries < 100ms with 1M rows
- [ ] Usage dashboard < 2s with 365 days of data
- [ ] Dark mode works across all pages
- [ ] Friendly/Raw toggle works across all pages
- [ ] E2E tests pass for all critical flows
- [ ] Builds for Windows, macOS, Linux
- [ ] README with installation instructions
- [ ] No critical bugs, no security vulnerabilities
- [ ] CI fully green
