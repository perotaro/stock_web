import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'

import type { GuppyStackConfig } from './config.js'

export type GithubOidcStackProps = StackProps & {
  config: GuppyStackConfig
  frontendBucket: s3.Bucket
  distribution: cloudfront.Distribution
}

export class GithubOidcStack extends Stack {
  public readonly deployRole: iam.Role

  /**
   * GitHub Actions OIDC とデプロイ権限を定義する。
   *
   * @param scope Construct scope。
   * @param id Stack ID。
   * @param props Stack props、Guppy 設定、デプロイ対象リソース。
   * @returns なし。
   */
  constructor(scope: Construct, id: string, props: GithubOidcStackProps) {
    super(scope, id, props)

    const provider = this.createGithubOidcProvider()
    this.deployRole = this.createDeployRole(props.config, provider)
    this.attachFrontendDeployPolicy(
      this.deployRole,
      props.frontendBucket,
      props.distribution,
      props.config,
    )
    this.attachBackendDeployPolicy(this.deployRole)
    this.createOutputs(props.config)
  }

  /**
   * GitHub OIDC Provider を作成する。
   *
   * @returns GitHub OIDC Provider。
   */
  private createGithubOidcProvider(): iam.OpenIdConnectProvider {
    return new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    })
  }

  /**
   * GitHub Actions が引き受ける環境別 IAM Role を作成する。
   *
   * @param config Guppy stack 設定。
   * @param provider GitHub OIDC Provider。
   * @returns GitHub Actions 用 IAM Role。
   */
  private createDeployRole(
    config: GuppyStackConfig,
    provider: iam.OpenIdConnectProvider,
  ): iam.Role {
    return new iam.Role(this, 'GithubActionsDeployRole', {
      roleName: `${config.resourceNamePrefix}-github-actions-deploy`,
      assumedBy: new iam.FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub':
              config.githubActionsSubject,
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })
  }

  /**
   * フロントエンドデプロイ用の最小権限 Policy を追加する。
   *
   * @param role GitHub Actions 用 IAM Role。
   * @param frontendBucket フロントエンド bucket。
   * @param distribution CloudFront distribution。
   * @param config Guppy stack 設定。
   * @returns 何も返さない。
   */
  private attachFrontendDeployPolicy(
    role: iam.Role,
    frontendBucket: s3.Bucket,
    distribution: cloudfront.Distribution,
    config: GuppyStackConfig,
  ): void {
    role.attachInlinePolicy(
      new iam.Policy(this, 'FrontendDeployPolicy', {
        policyName: 'frontend-deploy',
        statements: [
          new iam.PolicyStatement({
            actions: ['s3:ListBucket'],
            resources: [frontendBucket.bucketArn],
          }),
          new iam.PolicyStatement({
            actions: [
              's3:DeleteObject',
              's3:GetObject',
              's3:PutObject',
              's3:PutObjectTagging',
            ],
            resources: [frontendBucket.arnForObjects('*')],
          }),
          new iam.PolicyStatement({
            actions: ['cloudfront:CreateInvalidation'],
            resources: [
              `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
            ],
          }),
          new iam.PolicyStatement({
            actions: ['ssm:GetParameter', 'ssm:GetParameters'],
            resources: [
              `arn:aws:ssm:${this.region}:${this.account}:parameter/${config.resourceNamePrefix}/frontend/*`,
            ],
          }),
        ],
      }),
    )
  }

  /**
   * バックエンド CDK deploy 用 Policy を追加する。
   *
   * @param role GitHub Actions 用 IAM Role。
   * @returns 何も返さない。
   */
  private attachBackendDeployPolicy(role: iam.Role): void {
    role.attachInlinePolicy(
      new iam.Policy(this, 'BackendDeployPolicy', {
        policyName: 'backend-deploy',
        statements: [
          new iam.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: [
              `arn:aws:iam::${this.account}:role/cdk-*-deploy-role-${this.account}-${this.region}`,
              `arn:aws:iam::${this.account}:role/cdk-*-file-publishing-role-${this.account}-${this.region}`,
              `arn:aws:iam::${this.account}:role/cdk-*-lookup-role-${this.account}-${this.region}`,
            ],
          }),
          new iam.PolicyStatement({
            actions: [
              'cloudformation:DescribeStacks',
              'cloudformation:DescribeStackEvents',
              'cloudformation:DescribeStackResources',
              'cloudformation:GetTemplate',
              'cloudformation:ListStacks',
              'ssm:GetParameter',
            ],
            resources: ['*'],
          }),
        ],
      }),
    )
  }

  /**
   * GitHub Actions role ARN を SSM Parameter Store と output に出力する。
   *
   * @param config Guppy stack 設定。
   * @returns 何も返さない。
   */
  private createOutputs(config: GuppyStackConfig): void {
    new ssm.StringParameter(this, 'GithubActionsDeployRoleArnParameter', {
      parameterName: `/${config.resourceNamePrefix}/github/actions-deploy-role-arn`,
      stringValue: this.deployRole.roleArn,
    })
    new CfnOutput(this, 'GithubActionsDeployRoleArn', {
      value: this.deployRole.roleArn,
    })
  }
}
