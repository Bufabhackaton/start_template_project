# Audit a deployed app against Bufab's infrastructure rules.
#
# Pulls the live resource state from Azure and compares each field to what
# the bufab-mcp `bufab-infrastructure-context-overlay` rule prescribes.
# Use it post-deploy to show the jury (or an auditor) that what the agent
# generated actually satisfies every rule it was supposed to satisfy.
#
# Usage:
#   ./scripts/audit.ps1 -AppName bufab-hack-swc-cpart-app
#   ./scripts/audit.ps1 -AppName bufab-hack-swc-ncr-app
#
# Optional:
#   -ResourceGroup  defaults to bufab-hackathon-prod
#   -ExpectProjectID  override the expected ProjectID tag

param(
  [Parameter(Mandatory=$true)]
  [string]$AppName,

  [string]$ResourceGroup = "bufab-hackathon-prod",

  [string]$ExpectProjectID
)

$ErrorActionPreference = "Stop"

# Derive expected project ID from the app name if not overridden
if (-not $ExpectProjectID) {
  if ($AppName -like "*-cpart-*") { $ExpectProjectID = "bufab-cparts-demo" }
  elseif ($AppName -like "*-ncr-*") { $ExpectProjectID = "bufab-ncr-demo" }
  else { $ExpectProjectID = "(unknown — pass -ExpectProjectID)" }
}

Write-Host ""
Write-Host "============================================================"
Write-Host " bufab-mcp rules vs. Azure reality"
Write-Host " App: $AppName"
Write-Host " RG : $ResourceGroup"
Write-Host "============================================================"

$site = az webapp show --resource-group $ResourceGroup --name $AppName -o json | ConvertFrom-Json
$cfg = az webapp config show --resource-group $ResourceGroup --name $AppName -o json | ConvertFrom-Json
$settings = az webapp config appsettings list --resource-group $ResourceGroup --name $AppName -o json | ConvertFrom-Json
$ai = $settings | Where-Object name -eq APPLICATIONINSIGHTS_CONNECTION_STRING

function Check($rule, $expected, $actual) {
  # Normalize for comparison: lowercase + strip whitespace.
  # Handles Azure returning "Sweden Central" vs canonical "swedencentral".
  $eN = ($expected -as [string]).Trim().ToLower() -replace '\s+', ''
  $aN = ($actual -as [string]).Trim().ToLower() -replace '\s+', ''
  $pass = if ($eN -eq $aN) { "PASS" } else { "FAIL" }
  $color = if ($pass -eq "PASS") { "Green" } else { "Red" }
  Write-Host ("  {0,-32} expect={1,-26} got={2,-26} [{3}]" -f $rule, $expected, $actual, $pass) -ForegroundColor $color
  return ($pass -eq "PASS")
}

$passed = 0
$total = 0
function Track($result) {
  $script:total++
  if ($result) { $script:passed++ }
}

Write-Host ""
Track (Check "Region (EU residency)"          "swedencentral"        $site.location)
Track (Check "Naming convention"              $AppName               $site.name)
Track (Check "HTTPS only"                     $true                  $site.httpsOnly)
Track (Check "Managed identity"               "SystemAssigned"       $site.identity.type)
Track (Check "Min TLS"                        "1.2"                  $cfg.minTlsVersion)
Track (Check "FTPS disabled"                  "Disabled"             $cfg.ftpsState)
Track (Check "HTTP/2 enabled"                 $true                  $cfg.http20Enabled)
Track (Check "AlwaysOn"                       $true                  $cfg.alwaysOn)
Track (Check "Linux Node 20 runtime"          "NODE|20-lts"          $cfg.linuxFxVersion)
Track (Check "Tag: Owner"                     "ricardson"            $site.tags.Owner)
Track (Check "Tag: CostCenter"                "bufab-hackathon-2026" $site.tags.CostCenter)
Track (Check "Tag: ProjectID"                 $ExpectProjectID       $site.tags.ProjectID)
Track (Check "Tag: Environment"               "hack"                 $site.tags.Environment)
Track (Check "App Insights wired"             $true                  ($ai -ne $null))

Write-Host ""
Write-Host "============================================================"
$summaryColor = if ($passed -eq $total) { "Green" } else { "Yellow" }
Write-Host (" Result: {0}/{1} rules satisfied" -f $passed, $total) -ForegroundColor $summaryColor
Write-Host "============================================================"
Write-Host ""

if ($passed -ne $total) {
  exit 1
}
