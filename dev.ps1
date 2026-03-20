#Requires -Version 5.1
<#
.SYNOPSIS
    PhoneScope dev launcher — checks prerequisites, installs deps, starts Tauri dev mode.
.EXAMPLE
    .\dev.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot

function Write-Step  { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "   OK  $msg" -ForegroundColor Green }
function Write-Fail  { param($msg) Write-Host "   FAIL $msg" -ForegroundColor Red }
function Write-Warn  { param($msg) Write-Host "   WARN $msg" -ForegroundColor Yellow }

# ── 1. Node / pnpm ──────────────────────────────────────────────────────────
Write-Step "Checking Node.js"
try {
    $nodeVer = node --version 2>&1
    Write-OK "node $nodeVer"
} catch {
    Write-Fail "Node.js not found. Install from https://nodejs.org (LTS)"
    exit 1
}

Write-Step "Checking pnpm"
try {
    $pnpmVer = pnpm --version 2>&1
    Write-OK "pnpm $pnpmVer"
} catch {
    Write-Warn "pnpm not found — installing globally via npm..."
    npm install -g pnpm
    $pnpmVer = pnpm --version 2>&1
    Write-OK "pnpm $pnpmVer installed"
}

# ── 2. Rust / Cargo ──────────────────────────────────────────────────────────
Write-Step "Checking Rust / Cargo"
$cargoPath = $null
foreach ($candidate in @(
    "$env:USERPROFILE\.cargo\bin\cargo.exe",
    "C:\Users\$env:USERNAME\.cargo\bin\cargo.exe"
)) {
    if (Test-Path $candidate) { $cargoPath = $candidate; break }
}
if (-not $cargoPath) {
    try { $cargoPath = (Get-Command cargo -ErrorAction Stop).Source } catch {}
}

if ($cargoPath) {
    $cargoVer = & $cargoPath --version 2>&1
    Write-OK "cargo $cargoVer"
} else {
    Write-Warn "Rust/Cargo not found."
    Write-Host ""
    Write-Host "   To install Rust on Windows, run:"
    Write-Host "       winget install Rustlang.Rustup"
    Write-Host "   or visit https://rustup.rs and run the installer."
    Write-Host ""
    Write-Host "   After installing, RESTART this terminal and run .\dev.ps1 again."
    $choice = Read-Host "   Open rustup.rs in browser? [Y/n]"
    if ($choice -ne 'n' -and $choice -ne 'N') {
        Start-Process "https://rustup.rs"
    }
    exit 1
}

# ── 3. Tauri prerequisites (WebView2) ────────────────────────────────────────
Write-Step "Checking WebView2 runtime"
$wv2 = Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
if (-not $wv2) {
    $wv2 = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
}
if ($wv2) {
    Write-OK "WebView2 found"
} else {
    Write-Warn "WebView2 runtime not found — Tauri windows require it."
    $choice = Read-Host "   Download WebView2 installer? [Y/n]"
    if ($choice -ne 'n' -and $choice -ne 'N') {
        Start-Process "https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
    }
    Write-Host "   Install WebView2 then re-run this script." -ForegroundColor Yellow
    exit 1
}

# ── 4. Frontend deps ─────────────────────────────────────────────────────────
$desktopDir = Join-Path $Root "apps\desktop"
Write-Step "Installing frontend dependencies"
if (-not (Test-Path (Join-Path $desktopDir "node_modules"))) {
    Push-Location $desktopDir
    pnpm install
    Pop-Location
    Write-OK "node_modules installed"
} else {
    Write-OK "node_modules already present (skipping)"
}

# ── 5. Start Tauri dev ────────────────────────────────────────────────────────
Write-Step "Starting PhoneScope (Tauri dev mode)"
Write-Host ""
Write-Host "   This will:" -ForegroundColor Gray
Write-Host "     1. Compile the Rust backend (first run takes a few minutes)" -ForegroundColor Gray
Write-Host "     2. Start the Vite frontend dev server on http://localhost:1420" -ForegroundColor Gray
Write-Host "     3. Open the native PhoneScope window" -ForegroundColor Gray
Write-Host ""
Write-Host "   Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

Push-Location $desktopDir
try {
    # Add .cargo/bin to PATH for this session in case it wasn't in PATH
    $cargoBin = Split-Path $cargoPath
    $env:PATH = "$cargoBin;$env:PATH"

    pnpm tauri dev
} finally {
    Pop-Location
}
