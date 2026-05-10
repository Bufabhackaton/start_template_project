// Maria's NCR demo app — Bufab-compliant infrastructure.
//
// Per the bufab-infrastructure-context-overlay rule:
//   - Sweden Central region
//   - Naming: bufab-<env>-<region>-<app>-<resource>
//   - Required tags: Owner, CostCenter, ProjectID
//   - App Service preferred for web workloads
//   - Encryption at rest (Azure default)
//   - No hardcoded secrets

@description('Short environment label, used in resource names.')
param env string = 'hack'

@description('Short region code, used in resource names. swc = Sweden Central.')
param regionCode string = 'swc'

@description('Short app label, used in resource names.')
param app string = 'ncr'

@description('Azure region for all resources.')
param location string = 'swedencentral'

@description('App Service Plan SKU. B1 is sufficient for the demo workload.')
param appServicePlanSku string = 'B1'

@description('Owner team or person responsible for these resources.')
param ownerTag string = 'ricardson'

@description('Cost center bucket for billing.')
param costCenterTag string = 'bufab-hackathon-2026'

@description('Project identifier carried through Azure billing and tagging.')
param projectIdTag string = 'bufab-ncr-demo'

var commonTags = {
  Owner: ownerTag
  CostCenter: costCenterTag
  ProjectID: projectIdTag
  Environment: env
}

var planName = 'bufab-${env}-${regionCode}-${app}-plan'
var appName = 'bufab-${env}-${regionCode}-${app}-app'
var appInsightsName = 'bufab-${env}-${regionCode}-${app}-ai'
var workspaceName = 'bufab-${env}-${regionCode}-${app}-law'

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

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

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: commonTags
  sku: {
    name: appServicePlanSku
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
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
