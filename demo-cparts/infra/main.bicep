// Bufab Catalog (C-parts) — Azure infra. Same Bufab-compliant pattern as
// the NCR demo, but the Web App piggybacks on the App Service Plan that
// the NCR deployment already created (one plan, two apps — saves cost).
//
// Per the bufab-infrastructure-context-overlay rule:
//   - Sweden Central region
//   - Naming: bufab-<env>-<region>-<app>-<resource>
//   - Required tags: Owner, CostCenter, ProjectID
//   - App Service for web workloads
//   - Encryption at rest (Azure default)
//   - No hardcoded secrets

@description('Short environment label.')
param env string = 'hack'

@description('Short region code.')
param regionCode string = 'swc'

@description('Short app label for THIS web app.')
param app string = 'cpart'

@description('App label of the existing App Service Plan to reuse. Defaults to the NCR demo plan.')
param sharedPlanApp string = 'ncr'

@description('Azure region for the new web app.')
param location string = 'swedencentral'

@description('Owner team or person responsible for these resources.')
param ownerTag string = 'ricardson'

@description('Cost center bucket for billing.')
param costCenterTag string = 'bufab-hackathon-2026'

@description('Project identifier carried through Azure billing and tagging.')
param projectIdTag string = 'bufab-cparts-demo'

var commonTags = {
  Owner: ownerTag
  CostCenter: costCenterTag
  ProjectID: projectIdTag
  Environment: env
}

var planName = 'bufab-${env}-${regionCode}-${sharedPlanApp}-plan'
var workspaceName = 'bufab-${env}-${regionCode}-${sharedPlanApp}-law'
var appInsightsName = 'bufab-${env}-${regionCode}-${app}-ai'
var appName = 'bufab-${env}-${regionCode}-${app}-app'

// Reuse the existing plan from the NCR deployment.
resource plan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: planName
}

// Reuse the shared Log Analytics workspace.
resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: workspaceName
}

// Per-app App Insights instance so we can correlate this app's telemetry.
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: commonTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  tags: commonTags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      alwaysOn: true
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'true'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
      ]
    }
  }
}

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppName string = webApp.name
output resourceGroupName string = resourceGroup().name
