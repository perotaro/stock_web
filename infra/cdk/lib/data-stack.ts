import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import type { Construct } from 'constructs'

import type { GuppyStackConfig } from './config.js'

export type BackendTables = {
  publicSummary: dynamodb.Table
  systemLatestStatus: dynamodb.Table
  systemLatestSignals: dynamodb.Table
  watchlist: dynamodb.Table
}

export type DataStackProps = StackProps & {
  config: GuppyStackConfig
}

export class DataStack extends Stack {
  public readonly tables: BackendTables

  /**
   * DynamoDB table 群を定義する。
   *
   * @param scope Construct scope。
   * @param id Stack ID。
   * @param props Stack props と Guppy 設定。
   * @returns なし。
   */
  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props)

    this.tables = this.createTables(props.config)
    this.createOutputs()
  }

  /**
   * API が参照する DynamoDB table を作成する。
   *
   * @param config Guppy stack 設定。
   * @returns バックエンド API 用 table 群。
   */
  private createTables(config: GuppyStackConfig): BackendTables {
    const publicSummary = new dynamodb.Table(this, 'PublicSummaryTable', {
      tableName: config.tableNames.publicSummary,
      partitionKey: {
        name: 'summary_scope',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'summary_key',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    })

    const systemLatestStatus = new dynamodb.Table(
      this,
      'SystemLatestStatusTable',
      {
        tableName: config.tableNames.systemLatestStatus,
        partitionKey: {
          name: 'system_code',
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.RETAIN,
      },
    )

    const systemLatestSignals = new dynamodb.Table(
      this,
      'SystemLatestSignalsTable',
      {
        tableName: config.tableNames.systemLatestSignals,
        partitionKey: {
          name: 'system_code',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'record_key',
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.RETAIN,
      },
    )

    const watchlist = new dynamodb.Table(this, 'WatchlistTable', {
      tableName: config.tableNames.watchlist,
      partitionKey: {
        name: 'ticker',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    })
    watchlist.addGlobalSecondaryIndex({
      indexName: 'gsi_active_updated_at',
      partitionKey: {
        name: 'is_active',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'updated_at_epoch',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    })

    return {
      publicSummary,
      systemLatestStatus,
      systemLatestSignals,
      watchlist,
    }
  }

  /**
   * DynamoDB table 名を CloudFormation output に出力する。
   *
   * @returns 何も返さない。
   */
  private createOutputs(): void {
    new CfnOutput(this, 'PublicSummaryTableName', {
      value: this.tables.publicSummary.tableName,
    })
    new CfnOutput(this, 'SystemLatestStatusTableName', {
      value: this.tables.systemLatestStatus.tableName,
    })
    new CfnOutput(this, 'SystemLatestSignalsTableName', {
      value: this.tables.systemLatestSignals.tableName,
    })
    new CfnOutput(this, 'WatchlistTableName', {
      value: this.tables.watchlist.tableName,
    })
  }
}
