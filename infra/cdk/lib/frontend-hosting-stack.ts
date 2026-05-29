import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'

import type { GuppyStackConfig } from './config.js'

export type FrontendHostingStackProps = StackProps & {
  config: GuppyStackConfig
  httpApi: apigatewayv2.HttpApi
}

export class FrontendHostingStack extends Stack {
  public readonly frontendBucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution

  /**
   * フロントエンド配信基盤を定義する。
   *
   * @param scope Construct scope。
   * @param id Stack ID。
   * @param props Stack props、Guppy 設定、HTTP API。
   * @returns なし。
   */
  constructor(scope: Construct, id: string, props: FrontendHostingStackProps) {
    super(scope, id, props)

    this.frontendBucket = this.createFrontendBucket(props.config)
    this.distribution = this.createDistribution(
      this.frontendBucket,
      props.httpApi,
    )

    this.createParameters(props.config)
    this.createOutputs()
  }

  /**
   * フロントエンド配信用 S3 bucket を作成する。
   *
   * @param config Guppy stack 設定。
   * @returns フロントエンド bucket。
   */
  private createFrontendBucket(config: GuppyStackConfig): s3.Bucket {
    return new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${config.resourceNamePrefix}-frontend-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    })
  }

  /**
   * CloudFront distribution を作成する。
   *
   * @param frontendBucket フロントエンド bucket。
   * @param httpApi HTTP API。
   * @returns CloudFront distribution。
   */
  private createDistribution(
    frontendBucket: s3.Bucket,
    httpApi: apigatewayv2.HttpApi,
  ): cloudfront.Distribution {
    const apiDomainName = `${httpApi.apiId}.execute-api.${this.region}.${this.urlSuffix}`

    return new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiDomainName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
      ],
    })
  }

  /**
   * フロントエンド配信基盤の非機密値を SSM Parameter Store に保存する。
   *
   * @param config Guppy stack 設定。
   * @returns 何も返さない。
   */
  private createParameters(config: GuppyStackConfig): void {
    new ssm.StringParameter(this, 'FrontendBucketNameParameter', {
      parameterName: `/${config.resourceNamePrefix}/frontend/bucket-name`,
      stringValue: this.frontendBucket.bucketName,
    })
    new ssm.StringParameter(this, 'CloudFrontDistributionIdParameter', {
      parameterName: `/${config.resourceNamePrefix}/frontend/cloudfront-distribution-id`,
      stringValue: this.distribution.distributionId,
    })
    new ssm.StringParameter(this, 'CloudFrontDomainNameParameter', {
      parameterName: `/${config.resourceNamePrefix}/frontend/cloudfront-domain-name`,
      stringValue: this.distribution.distributionDomainName,
    })
  }

  /**
   * フロントエンド配信基盤の主要値を CloudFormation output に出力する。
   *
   * @returns 何も返さない。
   */
  private createOutputs(): void {
    new CfnOutput(this, 'FrontendBucketName', {
      value: this.frontendBucket.bucketName,
    })
    new CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
    })
    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
    })
  }
}
