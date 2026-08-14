# manage.ps1 — one-command install / update / uninstall for the
# dsh-subagent-effort plugin, designed so nothing lingers after removal.
#
# Background: pnpm 11.21's minimum-release-age policy excludes freshly
# published versions from resolution unless their exact version is listed in
# the profile's pnpm-workspace.yaml minimumReleaseAgeExclude. `dsh plugin
# remove` does NOT clean those entries, so old references accumulate. This
# script owns the whole lifecycle and keeps that file consistent.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File manage.ps1 install    # install latest
#   powershell -ExecutionPolicy Bypass -File manage.ps1 update     # upgrade to latest
#   powershell -ExecutionPolicy Bypass -File manage.ps1 uninstall  # remove + clean leftovers
#   powershell -ExecutionPolicy Bypass -File manage.ps1 status     # what is installed
param(
  [Parameter(Position = 0)]
  [ValidateSet('install', 'update', 'uninstall', 'status')]
  [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$pkg = '@shijunan123/dsh-subagent-effort'
$client = '@shijunan123/dsh-client-ui-subagent-effort'
$profile = Join-Path $env:USERPROFILE '.dsh\profiles\web'
$wsFile = Join-Path $profile 'pnpm-workspace.yaml'

function Read-WorkspaceFile {
  return Get-Content $wsFile -Raw
}

function Write-WorkspaceFile([string]$content) {
  [System.IO.File]::WriteAllText($wsFile, $content, [System.Text.UTF8Encoding]::new($false))
}

function Get-LatestVersion([string]$name) {
  $v = npm view $name version 2>$null
  return ($v | Select-Object -First 1).Trim()
}

function Get-InstalledVersion([string]$name) {
  $dir = Join-Path $profile ("node_modules\" + ($name -replace '/', '\'))
  $manifest = Join-Path $dir 'package.json'
  if (-not (Test-Path $manifest)) { return $null }
  return (Get-Content $manifest -Raw | ConvertFrom-Json).version
}

# Ensure exact versions of the given packages appear in minimumReleaseAgeExclude.
function Sync-ReleaseAgeExcludes([string[]]$names) {
  $doc = Read-WorkspaceFile
  $changed = $false
  foreach ($name in $names) {
    $v = Get-InstalledVersion $name
    if ($v -eq $null) { continue }
    $entry = "'$name@$v'"
    if (-not $doc.Contains($entry)) {
      $doc = Add-ExcludeEntry $doc $entry
      Write-Host "  release-age exclude added: $entry"
      $changed = $true
    }
  }
  if ($changed) { Write-WorkspaceFile $doc }
}

# Insert one exact-version exclude entry under minimumReleaseAgeExclude.
function Add-ExcludeEntry([string]$doc, [string]$entry) {
  if ($doc -match '(?m)^minimumReleaseAgeExclude:\r?\n') {
    return $doc -replace '(?m)^minimumReleaseAgeExclude:\r?\n', "minimumReleaseAgeExclude:`r`n  - $entry`r`n"
  }
  return $doc.TrimEnd() + "`r`n`r`nminimumReleaseAgeExclude:`r`n  - $entry`r`n"
}

# Before resolving anything, whitelist the registry-latest versions so pnpm's
# minimum-release-age policy does not silently resolve to an older release.
function PreAllow-Latest([string[]]$names) {
  $doc = Read-WorkspaceFile
  $changed = $false
  foreach ($name in $names) {
    $latest = Get-LatestVersion $name
    if ([string]::IsNullOrWhiteSpace($latest)) { continue }
    $entry = "'$name@$latest'"
    if (-not $doc.Contains($entry)) {
      $doc = Add-ExcludeEntry $doc $entry
      Write-Host "  pre-allowed release: $entry"
      $changed = $true
    }
  }
  if ($changed) { Write-WorkspaceFile $doc }
}

# Remove every @shijunan123 entry from minimumReleaseAgeExclude.
function Clean-ReleaseAgeExcludes {
  $doc = Read-WorkspaceFile
  $kept = @()
  $inList = $false
  foreach ($line in ($doc -split "`r?`n")) {
    if ($line -match '^minimumReleaseAgeExclude:') { $inList = $true; continue }
    if ($inList -and $line -match '^\S' -and $line.Trim() -ne '') { $inList = $false }
    if ($inList -and $line -match "$pkg|$client") { continue }
    $kept += $line
  }
  Write-WorkspaceFile (($kept -join "`r`n").TrimEnd() + "`r`n")
  Write-Host '  release-age excludes cleaned for @shijunan123/*'
}

# Remove leftover package dirs in the profile (pnpm can leave orphans).
function Clean-LeftoverDirs {
  $dir = Join-Path $profile 'node_modules\@shijunan123'
  if (Test-Path $dir) {
    Remove-Item $dir -Recurse -Force
    Write-Host '  leftover node_modules/@shijunan123 removed'
  }
}

switch ($Action) {
  'install' {
    Write-Host "== install $pkg =="
    PreAllow-Latest @($pkg, $client)
    $latest = Get-LatestVersion $pkg
    Write-Host "  latest on registry: $latest"
    dsh plugin --profile web add "$pkg@$latest"
    Sync-ReleaseAgeExcludes @($pkg, $client)
    corepack pnpm --dir $profile update $client 2>&1 | Out-Null
    Write-Host ''
    Write-Host 'Done. Restart `dsh web` and hard-refresh the browser (Ctrl+F5).'
    Write-Host "Configure under Settings > Plugins > configurable > Subagent effort."
  }
  'update' {
    Write-Host "== update $pkg =="
    PreAllow-Latest @($pkg, $client)
    $latest = Get-LatestVersion $pkg
    Write-Host "  latest on registry: $latest"
    dsh plugin --profile web add "$pkg@$latest"
    Sync-ReleaseAgeExcludes @($pkg, $client)
    corepack pnpm --dir $profile update $pkg $client 2>&1 | Out-Null
    Write-Host "  installed: $pkg@$(Get-InstalledVersion $pkg), $client@$(Get-InstalledVersion $client)"
    Write-Host 'Done. Restart `dsh web` and hard-refresh the browser (Ctrl+F5).'
  }
  'uninstall' {
    Write-Host "== uninstall $pkg =="
    dsh plugin --profile web remove $pkg
    Clean-ReleaseAgeExcludes
    Clean-LeftoverDirs
    Write-Host ''
    Write-Host 'Done. Restart `dsh web` and hard-refresh the browser.'
    Write-Host 'Profile is back to the base bundles only.'
  }
  'status' {
    Write-Host "installed: $pkg@$(Get-InstalledVersion $pkg), $client@$(Get-InstalledVersion $client)"
    $rows = dsh --profile web --dump-config 2>&1 | Select-String 'subagent-effort'
    if ($rows) { Write-Host 'composed rows:'; $rows | ForEach-Object { Write-Host "  $($_.Line)" } } else { Write-Host 'composed rows: (none)' }
  }
}
