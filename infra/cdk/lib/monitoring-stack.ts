import { Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as logs from 'aws-cdk-lib/aws-logs'
import type { Construct } from 'constructs'

import type { GuppyStackConfig } from './config.js'
import type { BackendFunctions } from './api-stack.js'

export type MonitoringStackProps = StackProps & {
  config: GuppyStackConfig
  backendFunctions: BackendFunctions
  httpApi: apigatewayv2.HttpApi
}

export class MonitoringStack extends Stack {
  /**
   * CloudWatch Logs retention と基本アラームを定義する。
   *
   * @param scope Construct scope。
   * @param id Stack ID。
   * @param props Stack props、Guppy 設定、監視対象リソース。
   * @returns なし。
   */
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props)

    this.createLambdaLogGroups(props.backendFunctions)
    this.createLambdaErrorAlarms(props.config, props.backendFunctions)
    this.createHttpApiAlarm(props.config, props.httpApi)
  }

  /**
   * Lambda 用 CloudWatch LogGroup と保持期間を作成する。
   *
   * @param functions バックエンド Lambda 関数群。
   * @returns 何も返さない。
   */
  private createLambdaLogGroups(functions: BackendFunctions): void {
    Object.entries(functions).forEach(([key, backendFunction]) => {
      new logs.LogGroup(this, `${key}LogGroup`, {
        logGroupName: `/aws/lambda/${backendFunction.functionName}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.RETAIN,
      })
    })
  }

  /**
   * Lambda error count の基本アラームを作成する。
   *
   * @param config Guppy stack 設定。
   * @param functions バックエンド Lambda 関数群。
   * @returns 何も返さない。
   */
  private createLambdaErrorAlarms(
    config: GuppyStackConfig,
    functions: BackendFunctions,
  ): void {
    Object.entries(functions).forEach(([key, backendFunction]) => {
      new cloudwatch.Alarm(this, `${key}ErrorAlarm`, {
        alarmName: `${config.resourceNamePrefix}-${key}-lambda-errors`,
        metric: backendFunction.metricErrors({
          period: Duration.minutes(5),
          statistic: 'sum',
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      })
    })
  }

  /**
   * HTTP API 5xx の基本アラームを作成する。
   *
   * @param config Guppy stack 設定。
   * @param httpApi HTTP API。
   * @returns 何も返さない。
   */
  private createHttpApiAlarm(
    config: GuppyStackConfig,
    httpApi: apigatewayv2.HttpApi,
  ): void {
    new cloudwatch.Alarm(this, 'HttpApi5xxAlarm', {
      alarmName: `${config.resourceNamePrefix}-http-api-5xx`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5xx',
        dimensionsMap: {
          ApiId: httpApi.apiId,
        },
        period: Duration.minutes(5),
        statistic: 'sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
  }
}
