# Daily job run by the Windows scheduled task "Green Path - Sync Substack".
# Reads Substack, updates the three home page cards, and pushes any change to GitHub,
# which then republishes the site. Log: %LOCALAPPDATA%\GreenPathSync\sync.log
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA "GreenPathSync"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir "sync.log"

function Log($msg) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Add-Content $log }

try {
  Set-Location $repo
  Log "start"
  git pull --rebase --autostash 2>&1 | ForEach-Object { Log "git: $_" }
  node scripts/sync-substack.mjs 2>&1 | ForEach-Object { Log "sync: $_" }
  if ($LASTEXITCODE -ne 0) { throw "sync script failed" }

  # Commit only what the sync touches, so unrelated work in progress is left alone.
  $changes = git status --porcelain -- src/index.html src/assets/articles
  if (-not $changes) { Log "no new posts"; exit 0 }
  git add -- src/index.html src/assets/articles
  git commit -m "Sync latest Substack posts" 2>&1 | ForEach-Object { Log "git: $_" }
  git push 2>&1 | ForEach-Object { Log "git: $_" }
  Log "pushed; site will redeploy"
} catch {
  Log "FAILED: $_"
  exit 1
}
