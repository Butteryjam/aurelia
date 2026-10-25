<#
.SYNOPSIS
  Windows Task Scheduler Setup for Aurelia Automated Backups (OPTIONAL)

.DESCRIPTION
  Prepares a recurring Windows Scheduled Task to execute backup.ps1 automatically.
  Per security directives, this script is PREPARED but NOT registered automatically.
  Run this script explicitly ONLY AFTER the manual backup workflow has been tested and verified.

.PARAMETER Frequency
  Daily (default) or Weekly.

.PARAMETER Time
  Time of day to run (default "02:00").
#>

[CmdletBinding()]
param (
  [ValidateSet("Daily", "Weekly")]
  [string]$Frequency = "Daily",

  [string]$Time = "02:00"
)

$TaskName = "AureliaProductionBackup"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backupScript = Resolve-Path "$scriptDir\backup.ps1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Aurelia Windows Task Scheduler Configuration" -ForegroundColor Cyan
Write-Host " Target Task Name: $TaskName" -ForegroundColor Yellow
Write-Host " Target Script:    $backupScript" -ForegroundColor Gray
Write-Host " Schedule:         $Frequency at $Time" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`""
$Trigger = if ($Frequency -eq "Daily") {
  New-ScheduledTaskTrigger -Daily -At $Time
} else {
  New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $Time
}
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Write-Host "`nTo register and activate this recurring scheduled task, execute:" -ForegroundColor Green
Write-Host "Register-ScheduledTask -TaskName `"$TaskName`" -Action `$Action -Trigger `$Trigger -Settings `$Settings -Description `"Daily zero-cost local backup of Aurelia production database and storage`"" -ForegroundColor White

Write-Host "`nTo unregister / remove this scheduled task later:" -ForegroundColor Green
Write-Host "Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false" -ForegroundColor White
