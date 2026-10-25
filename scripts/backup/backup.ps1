<#
.SYNOPSIS
  Aurelia Database & Storage Production Backup Runner (Windows PowerShell)

.DESCRIPTION
  Safely triggers the zero-cost Aurelia backup workflow, exporting:
   - Database schema & migrations
   - Application data across all 21 tables (JSON + SQL)
   - Recipe photography from Supabase Storage
   - Safe auth user metadata
   - Cryptographic SHA-256 manifest
  Saves to %USERPROFILE%\AureliaBackups\<TIMESTAMP>\

.PARAMETER Inventory
  Run read-only inspection without writing any files.

.PARAMETER TargetDir
  Custom destination path outside the repository.
#>

[CmdletBinding()]
param (
  [switch]$Inventory,
  [string]$TargetDir = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path "$scriptDir\..\.."

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Aurelia Production Backup Workflow" -ForegroundColor Cyan
Write-Host " Repository Root: $repoRoot" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location $repoRoot

$cmdArgs = @("tsx", "scripts/backup/backup.ts")
if ($Inventory) {
  $cmdArgs += "--inventory"
}
if ($TargetDir) {
  $cmdArgs += "--target-dir"
  $cmdArgs += $TargetDir
}

& npx @cmdArgs
if ($LASTEXITCODE -ne 0) {
  Write-Error "Backup process failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

if (-not $Inventory) {
  Write-Host "`nRunning post-backup cryptographic verification..." -ForegroundColor Yellow
  & npx tsx scripts/backup/verify-backup.ts
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Verification failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
  }
}
