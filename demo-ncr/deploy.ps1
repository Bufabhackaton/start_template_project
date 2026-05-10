# Deploys Maria's NCR demo to Azure.
# - Bicep template in ./infra/main.bicep (already validated by bufab-mcp)
# - Web payload in ./web (zipped + pushed via az webapp deploy)
# Targets BUFAB hackathon subscription, Sweden Central.

$ErrorActionPreference = "Stop"

$subscriptionId = "50a3811d-d665-4449-9478-b8eadb71a6a6"
$resourceGroup = "bufab-hackathon-prod"
$location = "swedencentral"
$deploymentName = "bufab-ncr-{0}" -f (Get-Date -Format "yyyyMMdd-HHmmss")
$repoRoot = Split-Path -Parent $PSScriptRoot
$bicepFile = Join-Path $PSScriptRoot "infra/main.bicep"
$webDir = Join-Path $PSScriptRoot "web"
$tempZip = Join-Path $env:TEMP "bufab-ncr-web.zip"

Write-Host "=== 1/4 az login check ==="
$current = az account show --query id -o tsv
if ($current -ne $subscriptionId) {
  Write-Host "Switching subscription to $subscriptionId"
  az account set --subscription $subscriptionId
}

Write-Host "=== 2/4 ensure resource group ==="
az group create `
  --name $resourceGroup `
  --location $location `
  --subscription $subscriptionId `
  --tags Owner=ricardson CostCenter=bufab-hackathon-2026 ProjectID=bufab-ncr-demo Environment=hackathon `
  -o none

Write-Host "=== 3/4 deploy infrastructure (Bicep) ==="
$deployJson = az deployment group create `
  --subscription $subscriptionId `
  --resource-group $resourceGroup `
  --name $deploymentName `
  --template-file $bicepFile `
  --parameters env=hack regionCode=swc app=ncr `
               ownerTag=ricardson costCenterTag=bufab-hackathon-2026 projectIdTag=bufab-ncr-demo `
  -o json | ConvertFrom-Json

$webAppName = $deployJson.properties.outputs.webAppName.value
$webAppUrl = $deployJson.properties.outputs.webAppUrl.value
Write-Host "  webApp: $webAppName"
Write-Host "  url:    $webAppUrl"

Write-Host "=== 4/4 zip + deploy web payload ==="
if (Test-Path $tempZip) { Remove-Item $tempZip -Force }
Compress-Archive -Path "$webDir/*" -DestinationPath $tempZip
Write-Host "  uploaded zip from $webDir"

az webapp deploy `
  --subscription $subscriptionId `
  --resource-group $resourceGroup `
  --name $webAppName `
  --src-path $tempZip `
  --type zip `
  -o none

Write-Host ""
Write-Host "===================================================="
Write-Host " DONE"
Write-Host "===================================================="
Write-Host " URL: $webAppUrl"
Write-Host "===================================================="
