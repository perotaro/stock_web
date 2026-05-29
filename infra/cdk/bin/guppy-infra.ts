#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'

import { ApiStack } from '../lib/api-stack.js'
import { AuthStack } from '../lib/auth-stack.js'
import { loadGuppyStackConfig } from '../lib/config.js'
import { DataStack } from '../lib/data-stack.js'
import { FrontendHostingStack } from '../lib/frontend-hosting-stack.js'
import { GithubOidcStack } from '../lib/github-oidc-stack.js'
import { MonitoringStack } from '../lib/monitoring-stack.js'

const app = new cdk.App()
const config = loadGuppyStackConfig(app)

const stackEnv = {
  account: config.awsAccountId,
  region: config.awsRegion,
}

const dataStack = new DataStack(app, `${config.resourceNamePrefix}-data`, {
  env: stackEnv,
  config,
})

const authStack = new AuthStack(app, `${config.resourceNamePrefix}-auth`, {
  env: stackEnv,
  config,
})

const apiStack = new ApiStack(app, `${config.resourceNamePrefix}-api`, {
  env: stackEnv,
  config,
  tables: dataStack.tables,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
})

const frontendHostingStack = new FrontendHostingStack(
  app,
  `${config.resourceNamePrefix}-frontend-hosting`,
  {
    env: stackEnv,
    config,
    httpApi: apiStack.httpApi,
  },
)

const monitoringStack = new MonitoringStack(
  app,
  `${config.resourceNamePrefix}-monitoring`,
  {
    env: stackEnv,
    config,
    backendFunctions: apiStack.backendFunctions,
    httpApi: apiStack.httpApi,
  },
)

new GithubOidcStack(app, `${config.resourceNamePrefix}-github-oidc`, {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  config,
  frontendBucket: frontendHostingStack.frontendBucket,
  distribution: frontendHostingStack.distribution,
})

apiStack.addDependency(dataStack)
apiStack.addDependency(authStack)
frontendHostingStack.addDependency(apiStack)
monitoringStack.addDependency(apiStack)
