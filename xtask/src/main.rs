//! Build automation tasks for PhoneScope.
//!
//! Usage: `cargo xtask <task>`
//!
//! Tasks:
//!   fetch-mitmproxy   Download the mitmproxy sidecar binary

use std::env;

fn main() -> anyhow::Result<()> {
    let task = env::args().nth(1);
    match task.as_deref() {
        Some("fetch-mitmproxy") => fetch_mitmproxy(),
        Some(unknown) => anyhow::bail!("Unknown task: {}", unknown),
        None => {
            eprintln!("Usage: cargo xtask <task>");
            eprintln!("Tasks:");
            eprintln!("  fetch-mitmproxy   Download the mitmproxy sidecar binary");
            Ok(())
        }
    }
}

fn fetch_mitmproxy() -> anyhow::Result<()> {
    println!("fetch-mitmproxy: not yet implemented — place the mitmproxy binary in apps/desktop/src-tauri/binaries/");
    Ok(())
}
