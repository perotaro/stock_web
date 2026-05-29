import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'

import type { GuppyStackConfig } from './config.js'

export type AuthStackProps = StackProps & {
  config: GuppyStackConfig
}

export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient

  /**
   * Cognito 認証基盤を定義する。
   *
   * @param scope Construct scope。
   * @param id Stack ID。
   * @param props Stack props と Guppy 設定。
   * @returns なし。
   */
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props)

    this.userPool = this.createUserPool(props.config)
    this.userPoolClient = this.createUserPoolClient(
      this.userPool,
      props.config,
    )
    this.userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: props.config.cognitoDomainPrefix,
      },
    })

    this.createParameters(props.config)
    this.createOutputs()
  }

  /**
   * Cognito User Pool を作成する。
   *
   * @param config Guppy stack 設定。
   * @returns Cognito User Pool。
   */
  private createUserPool(config: GuppyStackConfig): cognito.UserPool {
    return new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${config.resourceNamePrefix}-users`,
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      removalPolicy: RemovalPolicy.RETAIN,
    })
  }

  /**
   * SPA 用 Cognito User Pool client を作成する。
   *
   * @param userPool Cognito User Pool。
   * @param config Guppy stack 設定。
   * @returns Cognito User Pool client。
   */
  private createUserPoolClient(
    userPool: cognito.UserPool,
    config: GuppyStackConfig,
  ): cognito.UserPoolClient {
    return new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `${config.resourceNamePrefix}-frontend`,
      generateSecret: false,
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.EMAIL,
        ],
        callbackUrls: [config.cognitoCallbackUrl],
        logoutUrls: [config.cognitoLogoutUrl],
      },
    })
  }

  /**
   * 認証リソースの非機密値を SSM Parameter Store に保存する。
   *
   * @param config Guppy stack 設定。
   * @returns 何も返さない。
   */
  private createParameters(config: GuppyStackConfig): void {
    new ssm.StringParameter(this, 'UserPoolIdParameter', {
      parameterName: `/${config.resourceNamePrefix}/auth/user-pool-id`,
      stringValue: this.userPool.userPoolId,
    })
    new ssm.StringParameter(this, 'UserPoolClientIdParameter', {
      parameterName: `/${config.resourceNamePrefix}/auth/user-pool-client-id`,
      stringValue: this.userPoolClient.userPoolClientId,
    })
  }

  /**
   * Cognito の主要値を CloudFormation output に出力する。
   *
   * @returns 何も返さない。
   */
  private createOutputs(): void {
    new CfnOutput(this, 'CognitoUserPoolId', {
      value: this.userPool.userPoolId,
    })
    new CfnOutput(this, 'CognitoUserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
    })
  }
}
