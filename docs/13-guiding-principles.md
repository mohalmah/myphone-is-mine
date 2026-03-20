# 13 — Guiding Principles

Read this before you write your first line of code. These are not suggestions.
They are how we build PhoneScope.

---

## 1. Start Order — What to Build First

**phonescope-events is the foundation of everything.** It defines the types that
every other crate depends on. It must be rock-solid, well-documented, and stable
before any downstream work begins. If events is broken, everyone is blocked.

After events, there are two pillars: **Storage** and **ADB**. These can be built
in parallel by separate teams during Week 2, but both must be complete before
Milestone 1 can close. Storage gives us persistence. ADB gives us data. Without
either one, the app is an empty shell.

The rule is simple: **never start a crate before its dependencies have been
handed over.** If you depend on types from phonescope-events, wait until those
types are merged and reviewed. If you depend on the storage API, wait until the
trait is published. Building against imaginary interfaces leads to rework.

The Integration Team has a special responsibility: **deliver the Tauri shell
early.** Frontend teams and backend teams both need a running app frame to test
against. The sooner the shell exists, the sooner everyone can integrate. The
Integration Team unblocks the entire project.

---

## 2. Code Against Interfaces, Not Implementations

Every boundary between crates is defined by a **trait**. The storage crate
exposes a `StorageBackend` trait. The ADB crate exposes an `AdbConnection`
trait. The analytics crate consumes trait objects, not concrete types.

Why? Because teams work in parallel. The Storage Team is still writing SQLite
queries while the Analytics Team needs to test aggregations. Traits make this
possible.

Every team builds a **mock implementation** of the traits they depend on. These
mocks live in a `#[cfg(test)]` module or a dedicated `testutil` module. They
return canned data. They are fast. They let you test your logic without waiting
for anyone.

When the real implementation ships, swapping it in should be a **one-line
change** — replace the mock constructor with the real constructor. If swapping
requires more than that, the trait boundary is wrong. Fix the trait, not the
caller.

---

## 3. One Team, One Crate, One Week

Merge conflicts kill velocity. We avoid them with a simple rule: **no two teams
edit the same crate in the same sprint week.**

If Team ADB needs a new event variant and Team Storage also needs one, they do
not both edit phonescope-events. Instead, they file a request with the
Integration Team, who batches the changes and merges them in a single coordinated
PR.

**phonescope-events is the only shared-write crate**, and after Week 1, all
changes to it require Integration Team approval. This is not bureaucracy — it is
protection. A breaking change to events ripples through every crate in the
workspace.

If you need a type that lives in another team's crate, do not add it yourself.
Open an issue, tag the Integration Team, and use a placeholder type until it
lands. Patience here saves days of merge conflict resolution later.

---

## 4. Database Migrations Are Sacred

Migrations are **numbered and sequential**. Migration 001 runs before 002. Always.
On every machine. In every environment. There is no branching, no conditional
logic, no "run this only if column X exists."

**Only one team adds migrations per week.** The schedule is tracked in
`docs/migration-registry.md` — a simple numbered list that says which team owns
which migration slot. Before writing a migration, claim your slot in that file.
If someone else already claimed it, coordinate or wait.

**Never modify an existing migration.** Once a migration is committed to `main`,
it is immutable. If it is wrong, write a new migration that fixes it. Users in
the wild have already run the old one. Changing it means their database diverges
from yours, and debugging that is a nightmare.

Test every migration twice:
1. Against an **empty database** — fresh install path.
2. Against a **database with existing data** — upgrade path.

Both must pass. Both must be fast.

---

## 5. Local-First, Privacy-First

PhoneScope makes **zero network calls**. The desktop app never phones home. There
is no telemetry. No analytics. No crash reporting. No update checker that pings a
server. Nothing.

This is not a limitation — it is the product's core promise. Users trust
PhoneScope with the most intimate data their phone produces: what apps they use,
what domains they contact, how they spend their time. That trust is sacred. We do
not betray it by shipping data anywhere.

Every piece of data we collect must be **explainable to the user**. If a user
opens the database and sees a table, they should be able to understand why it
exists and what it contains. No hidden tables. No opaque blobs. No "internal
use only" columns.

**Redaction runs before storage, not after.** If we decide that a certain field
should be redacted (e.g., the body of an SMS notification in a logcat line), the
redaction happens in the collector, before the event reaches the database. Data
that should not be stored is never stored. You cannot delete what you never saved.

---

## 6. Capability-Aware Degradation

PhoneScope works on a spectrum of access levels:

| Level | What it requires | What it enables |
|-------|-----------------|-----------------|
| Basic | ADB over USB | Logs, app list, battery, storage, usage stats |
| Helper | Sideloaded VPN app | Per-app network flows with UID attribution |
| Root | Rooted device | tcpdump for raw packet capture |
| Proxy | mitmproxy + CA cert | Full HTTP request/response inspection |

The app **must work with just ADB**. That is the baseline. Every additional
capability — root, helper, proxy — enhances the experience but is never
required. A user who cannot root their phone still gets a useful tool.

The UI must **gracefully communicate** what is available and what is not. Never
show an empty state with no explanation. Instead, show:

> "Network flows are not available. Install the PhoneScope Helper app on your
> device to see per-app network traffic."

Tell the user what they are missing, why, and how to get it. Respect their
decision if they choose not to.

---

## 7. Confidence Is a First-Class Citizen

Not all data is created equal. An ADB-derived byte count from `dumpsys netstats`
is an approximation — the kernel reports it, but it may not include every packet.
A VPN-intercepted flow record has exact UID attribution. A tcpdump capture has
exact bytes but no UID.

We make this explicit with a **Confidence** level on every measurement:

| Level | Meaning |
|-------|---------|
| **Exact** | Measured directly, no estimation involved |
| **Approximate** | Derived from a reliable source with known limitations |
| **Inferred** | Estimated from indirect evidence (e.g., heuristic UID matching) |
| **Unavailable** | Cannot be determined with current capabilities |

The UI **shows confidence indicators**. A small icon, a tooltip, a subtle color
shift — the exact design is up to the frontend team, but the information must be
present. Users deserve to know how much to trust a number.

When combining data from multiple sources, the combined confidence is the
**lowest** of the inputs. Exact + Approximate = Approximate. Exact + Inferred =
Inferred. Never overstate certainty.

---

## 8. Long-Term Data Matters

PhoneScope is not a one-time diagnostic tool. Users build history over weeks and
months. The app usage snapshots that tell someone "you spent 3 hours on Instagram
today" become powerful when they can also say "that is 40% more than your average
over the last 90 days."

**Snapshots are never auto-deleted.** The user controls their data. They can
export it, they can manually delete it, but the app does not silently discard
history to save space.

Design every query to handle **365+ days of data** efficiently. This means:
- Proper indexes on timestamp columns.
- Aggregation queries that use indexed range scans, not full table scans.
- Pre-computed daily rollups for dashboards that do not need per-minute granularity.

Test with realistic data volumes. A test database with 10 rows tells you nothing
about performance. Seed your test databases with months of synthetic data and
measure query times. If a dashboard query takes 5 seconds, that is a bug, not a
future optimization.

---

## 9. Friendly by Default, Technical on Demand

The default UI speaks **human**. It says "Instagram used 847 MB of mobile data
this week" — not "com.instagram.android: rx_bytes=888406016 iface=rmnet0."

But the technical detail is always available. A click, a toggle, an expandable
section — the raw data is right there for users who want it. PhoneScope serves
both the curious parent checking their kid's screen time and the security
researcher tracing suspicious network connections.

Insights follow the same pattern:

> **Friendly:** "TikTok is using significant battery in the background."
>
> **Technical (expandable):** "com.zhiliaoapp.musically consumed 12% CPU
> averaged over the last 4 hours while not in the foreground. Top threads:
> `MtopWorker` (4.2%), `AwemeDownloader` (3.1%)."

The friendly version tells you what to care about. The technical version tells
you why.

---

## 10. Ship Weekly, Integrate Weekly

Every team ships **something working** every week. Not "almost done." Not "works
on my machine." Something that compiles, passes tests, and can be demonstrated.

The Integration Team merges and tests **every Tuesday**. That is integration day.
All feature branches must be rebased on `main` and passing CI before the merge
window opens.

**Broken builds are fixed within 24 hours.** A red CI on `main` blocks every
team from merging. The team that broke it owns the fix. If they cannot fix it in
24 hours, the Integration Team reverts the offending commit and the team tries
again next week.

Weekly integration builds are **tagged** (`v0.1.0-week3`, `v0.2.0-week5`, etc.)
and published as testable artifacts. Anyone on the team can download a weekly
build and test it. This is how we catch integration bugs early.

---

## 11. Error Handling Philosophy

Errors are not exceptional in PhoneScope. ADB connections drop. Devices
disconnect mid-stream. Parsers encounter garbage. This is normal operation, and
the code must handle it gracefully.

**Library crates** use `thiserror` with **specific error variants**. Every error
type tells you exactly what went wrong:

```rust
#[derive(Debug, thiserror::Error)]
pub enum AdbError {
    #[error("device not found: {serial}")]
    DeviceNotFound { serial: String },

    #[error("command timed out after {timeout:?}")]
    Timeout { timeout: Duration },

    #[error("unexpected output from `{command}`: {details}")]
    ParseError { command: String, details: String },
}
```

Never use `anyhow` in a library crate. Never use a generic `StringError`. Never
panic. If a function can fail, it returns `Result`.

**Binary crates** (the Tauri app, xtask) use `anyhow` for top-level error
handling. This is the only place where error context is added ad-hoc with
`.context("doing something")`.

**The frontend** wraps every IPC call in error handling that shows a
user-friendly message. "Failed to connect to device" — not "IPC error:
serde_json::Error: missing field `serial` at line 1 column 42."

**Collectors are fault-isolated.** If the battery collector fails, the network
collector keeps running. If logcat parsing hits a corrupt line, it logs a warning
and moves to the next line. Partial data is always better than no data. The
system degrades gracefully, one component at a time.

---

## 12. Performance Budgets

Performance is not something we optimize later. It is a constraint we design
for now. These budgets are tested in CI and enforced like any other test.

| Operation | Budget |
|-----------|--------|
| App startup to device list displayed | < 2 seconds |
| Log streaming latency (device to UI) | < 100ms |
| Any single SQLite query (with index) | < 100ms |
| Virtual-scrolling table at 10,000 rows | 60fps sustained |
| Usage dashboard with 1 year of data | < 2 seconds to interactive |

If you are writing a query and it takes 200ms, do not move on. Add an index.
Restructure the query. Pre-aggregate. Whatever it takes to get under 100ms.

If the UI janks during scrolling, do not move on. Profile it. Find the
bottleneck. Fix it. Sixty frames per second is not aspirational — it is the
minimum.

Performance bugs are treated with the same urgency as correctness bugs. A slow
app is a broken app.

---

## Summary

These principles exist because PhoneScope is not a weekend project. It is a
tool that people will trust with sensitive data, rely on for months of history,
and use to understand devices they care about. Every decision — from how we
handle errors to how we store migrations to how we display confidence levels —
reflects that responsibility.

Build something you would trust with your own phone's data.
