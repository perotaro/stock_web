import { cpSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CfnOutput,
  Duration,
  SecretValue,
  Stack,
  type StackProps,
} from 'aws-cdk-lib'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'

import {
  cursorSigningSecretParameter,
  type GuppyStackConfig,
} from './config.js'
import type { BackendTables } from './data-stack.js'

export type BackendFunctions = {
  publicSummary: lambda.Function
  summary: lambda.Function
  systemLatest: lambda.Function
  watchlist: lambda.Function
}

export type ApiStackProps = StackProps & {
  config: GuppyStackConfig
  tables: BackendTables
  userPool: cognito.UserPool
  userPoolClient: cognito.UserPoolClient
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = join(__dirname, '..', '..', '..')
const BACKEND_APP_DIR = join(REPOSITORY_ROOT, 'apps', 'backend')

export class ApiStack extends Stack {
  public readonly backendFunctions: BackendFunctions
  public readonly httpApi: apigatewayv2.HttpApi

  /**
   * バックエンド API 基盤を定義する。
   *
   * @param scope Construct scope。
   * @param id Stack ID。
   * @param props Stack props、Guppy 設定、依存リソース。
   * @returns なし。
   */
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const backendRole = this.createBackendRole(props.tables)
    this.backendFunctions = this.createBackendFunctions(
      props.config,
      backendRole,
      props.tables,
      props.userPool,
      props.userPoolClient,
    )
    this.httpApi = this.createHttpApi(
      props.config,
      this.backendFunctions,
      props.userPool,
      props.userPoolClient,
    )

    this.createParameters(props.config)
    this.createOutputs()
  }

  /**
   * Lambda 実行ロールを作成する。
   *
   * @param tables バックエンド API 用 table 群。
   * @returns Lambda 実行ロール。
   */
  private createBackendRole(tables: BackendTables): iam.Role {
    const role = new iam.Role(this, 'BackendLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    })

    tables.publicSummary.grantReadData(role)
    tables.systemLatestStatus.grantReadData(role)
    tables.systemLatestSignals.grantReadData(role)
    tables.watchlist.grantReadData(role)

    return role
  }

  /**
   * バックエンド Lambda 関数群を作成する。
   *
   * @param config Guppy stack 設定。
   * @param role Lambda 実行ロール。
   * @param tables バックエンド API 用 table 群。
   * @param userPool Cognito User Pool。
   * @param userPoolClient Cognito User Pool client。
   * @returns バックエンド Lambda 関数群。
   */
  private createBackendFunctions(
    config: GuppyStackConfig,
    role: iam.Role,
    tables: BackendTables,
    userPool: cognito.UserPool,
    userPoolClient: cognito.UserPoolClient,
  ): BackendFunctions {
    const code = lambda.Code.fromAsset(BACKEND_APP_DIR, {
      bundling: {
        image: lambda.Runtime.PYTHON_3_11.bundlingImage,
        local: {
          tryBundle(outputDir: string): boolean {
            execSync(
              [
                'python -m pip install',
                '--no-cache-dir',
                'pydantic==2.12.5',
                'aws-lambda-powertools==3.26.0',
                'aws-lambda-typing==2.20.0',
                `--target ${JSON.stringify(outputDir)}`,
              ].join(' '),
              {
                cwd: BACKEND_APP_DIR,
                stdio: 'inherit',
              },
            )
            cpSync(join(BACKEND_APP_DIR, 'src'), outputDir, {
              recursive: true,
            })
            return true
          },
        },
        command: [
          'bash',
          '-c',
          [
            'python -m pip install --no-cache-dir pydantic==2.12.5 aws-lambda-powertools==3.26.0 aws-lambda-typing==2.20.0 -t /asset-output',
            'cp -R src/. /asset-output/',
            "find /asset-output -type d -name '__pycache__' -prune -exec rm -rf {} +",
            "find /asset-output -type d -name 'tests' -prune -exec rm -rf {} +",
          ].join(' && '),
        ],
      },
    })
    const environment = this.backendEnvironment(
      config,
      tables,
      userPool,
      userPoolClient,
    )

    return {
      publicSummary: this.createBackendFunction(
        'PublicSummaryFunction',
        `${config.resourceNamePrefix}-public-summary`,
        'handlers.public.get_public_summary.lambda_handler',
        role,
        code,
        environment,
      ),
      summary: this.createBackendFunction(
        'SummaryFunction',
        `${config.resourceNamePrefix}-summary`,
        'handlers.summary.get_summary.lambda_handler',
        role,
        code,
        environment,
      ),
      systemLatest: this.createBackendFunction(
        'SystemLatestFunction',
        `${config.resourceNamePrefix}-system-latest`,
        'handlers.systems.get_system_latest.lambda_handler',
        role,
        code,
        environment,
      ),
      watchlist: this.createBackendFunction(
        'WatchlistFunction',
        `${config.resourceNamePrefix}-watchlist`,
        'handlers.watchlist.get_watchlist.lambda_handler',
        role,
        code,
        environment,
      ),
    }
  }

  /**
   * Lambda 共通環境変数を生成する。
   *
   * @param config Guppy stack 設定。
   * @param tables バックエンド API 用 table 群。
   * @param userPool Cognito User Pool。
   * @param userPoolClient Cognito User Pool client。
   * @returns Lambda 環境変数。
   */
  private backendEnvironment(
    config: GuppyStackConfig,
    tables: BackendTables,
    userPool: cognito.UserPool,
    userPoolClient: cognito.UserPoolClient,
  ): Record<string, string> {
    const cursorSecret = cursorSigningSecretParameter(config)

    return {
      ENV_NAME: config.environmentName,
      PUBLIC_SUMMARY_TABLE_NAME: tables.publicSummary.tableName,
      SYSTEM_LATEST_STATUS_TABLE_NAME: tables.systemLatestStatus.tableName,
      SYSTEM_LATEST_SIGNALS_TABLE_NAME: tables.systemLatestSignals.tableName,
      WATCHLIST_TABLE_NAME: tables.watchlist.tableName,
      ALLOWED_ORIGINS: config.frontendBaseUrl,
      COGNITO_ISSUER_URL: userPool.userPoolProviderUrl,
      COGNITO_AUDIENCE: userPoolClient.userPoolClientId,
      CURSOR_SIGNING_SECRET: SecretValue.ssmSecure(
        cursorSecret.parameterName,
        String(cursorSecret.version),
      ).unsafeUnwrap(),
    }
  }

  /**
   * Lambda 関数を作成する。
   *
   * @param id Construct ID。
   * @param functionName Lambda 関数名。
   * @param handler Lambda handler。
   * @param role Lambda 実行ロール。
   * @param code Lambda code asset。
   * @param environment Lambda 環境変数。
   * @returns Lambda 関数。
   */
  private createBackendFunction(
    id: string,
    functionName: string,
    handler: string,
    role: iam.Role,
    code: lambda.Code,
    environment: Record<string, string>,
  ): lambda.Function {
    return new lambda.Function(this, id, {
      functionName,
      runtime: lambda.Runtime.PYTHON_3_11,
      architecture: lambda.Architecture.X86_64,
      handler,
      role,
      code,
      memorySize: 128,
      timeout: Duration.seconds(10),
      environment,
    })
  }

  /**
   * HTTP API と route を作成する。
   *
   * @param config Guppy stack 設定。
   * @param functions バックエンド Lambda 関数群。
   * @param userPool Cognito User Pool。
   * @param userPoolClient Cognito User Pool client。
   * @returns HTTP API。
   */
  private createHttpApi(
    config: GuppyStackConfig,
    functions: BackendFunctions,
    userPool: cognito.UserPool,
    userPoolClient: cognito.UserPoolClient,
  ): apigatewayv2.HttpApi {
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${config.resourceNamePrefix}-api`,
      createDefaultStage: true,
    })
    const authorizer = new authorizers.HttpJwtAuthorizer(
      'CognitoJwtAuthorizer',
      userPool.userPoolProviderUrl,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
        identitySource: ['$request.header.Authorization'],
      },
    )

    httpApi.addRoutes({
      path: '/api/v1/public/summary',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'PublicSummaryIntegration',
        functions.publicSummary,
      ),
    })
    httpApi.addRoutes({
      path: '/api/v1/summary',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'SummaryIntegration',
        functions.summary,
      ),
      authorizer,
    })
    httpApi.addRoutes({
      path: '/api/v1/systems/{system_code}/latest',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'SystemLatestIntegration',
        functions.systemLatest,
      ),
      authorizer,
    })
    httpApi.addRoutes({
      path: '/api/v1/watchlist',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'WatchlistIntegration',
        functions.watchlist,
      ),
      authorizer,
    })

    return httpApi
  }

  /**
   * API の非機密値を SSM Parameter Store に保存する。
   *
   * @param config Guppy stack 設定。
   * @returns 何も返さない。
   */
  private createParameters(config: GuppyStackConfig): void {
    new ssm.StringParameter(this, 'HttpApiEndpointParameter', {
      parameterName: `/${config.resourceNamePrefix}/api/http-api-endpoint`,
      stringValue: this.httpApi.apiEndpoint,
    })
  }

  /**
   * API の主要値を CloudFormation output に出力する。
   *
   * @returns 何も返さない。
   */
  private createOutputs(): void {
    new CfnOutput(this, 'HttpApiEndpoint', {
      value: this.httpApi.apiEndpoint,
    })
  }
}
