use anyhow::{bail, Result};

fn main() -> Result<()> {
    let task = std::env::args().nth(1);
    match task.as_deref() {
        Some("fetch-mitmproxy") => fetch_mitmproxy(),
        Some(other) => bail!("unknown task: {other}"),
        None => bail!("usage: cargo xtask <task>"),
    }
}

fn fetch_mitmproxy() -> Result<()> {
    println!("fetch-mitmproxy: not yet implemented");
    Ok(())
}
