import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { App } from 'aws-cdk-lib'

export type TableNameConfig = {
  publicSummary: string
  systemLatestStatus: string
  systemLatestSignals: string
  watchlist: string
}

export type GuppyStackConfig = {
  projectName: string
  environmentName: string
  resourceNamePrefix: string
  awsAccountId: string
  awsRegion: string
  frontendBaseUrl: string
  cognitoCallbackUrl: string
  cognitoLogoutUrl: string
  cognitoDomainPrefix: string
  cursorSigningSecretParameterName: string
  cursorSigningSecretParameterVersion: number
  githubActionsSubject: string
  tableNames: TableNameConfig
}

export type CursorSigningSecretParameter = {
  parameterName: string
  version: number
}

type RawGuppyStackConfig = Partial<
  Omit<GuppyStackConfig, 'tableNames'> & {
    tableNames: Partial<TableNameConfig>
  }
>

const DEFAULT_TABLE_NAMES: TableNameConfig = {
  publicSummary: 'md_public_summary',
  systemLatestStatus: 'md_system_latest_status',
  systemLatestSignals: 'md_system_latest_signals',
  watchlist: 'md_watchlist',
}

/**
 * CDK context から Guppy stack 設定を読み込む。
 *
 * @param app CDK app。
 * @returns 検証済み Guppy stack 設定。
 */
export function loadGuppyStackConfig(app: App): GuppyStackConfig {
  const configPath = app.node.tryGetContext('config')
  if (typeof configPath !== 'string' || configPath.length === 0) {
    throw new Error(
      'CDK context `config` が必要です。例: npm run synth -- -c config=config/dev.example.json',
    )
  }

  const rawConfig = JSON.parse(
    readFileSync(resolve(configPath), 'utf8'),
  ) as RawGuppyStackConfig

  const config: GuppyStackConfig = {
    projectName: requiredString(rawConfig.projectName, 'projectName'),
    environmentName: requiredString(
      rawConfig.environmentName,
      'environmentName',
    ),
    resourceNamePrefix:
      typeof rawConfig.resourceNamePrefix === 'string' &&
      rawConfig.resourceNamePrefix.trim().length > 0
        ? rawConfig.resourceNamePrefix.trim()
        : `${requiredString(rawConfig.projectName, 'projectName')}-${requiredString(rawConfig.environmentName, 'environmentName')}`,
    awsAccountId: requiredString(rawConfig.awsAccountId, 'awsAccountId'),
    awsRegion: requiredString(rawConfig.awsRegion, 'awsRegion'),
    frontendBaseUrl: trimTrailingSlash(
      requiredString(rawConfig.frontendBaseUrl, 'frontendBaseUrl'),
    ),
    cognitoCallbackUrl: requiredString(
      rawConfig.cognitoCallbackUrl,
      'cognitoCallbackUrl',
    ),
    cognitoLogoutUrl: requiredString(
      rawConfig.cognitoLogoutUrl,
      'cognitoLogoutUrl',
    ),
    cognitoDomainPrefix: requiredString(
      rawConfig.cognitoDomainPrefix,
      'cognitoDomainPrefix',
    ),
    cursorSigningSecretParameterName: requiredString(
      rawConfig.cursorSigningSecretParameterName,
      'cursorSigningSecretParameterName',
    ),
    cursorSigningSecretParameterVersion: requiredPositiveInteger(
      rawConfig.cursorSigningSecretParameterVersion,
      'cursorSigningSecretParameterVersion',
    ),
    githubActionsSubject: requiredString(
      rawConfig.githubActionsSubject,
      'githubActionsSubject',
    ),
    tableNames: {
      ...DEFAULT_TABLE_NAMES,
      ...rawConfig.tableNames,
    },
  }

  validateConfig(config)
  return config
}

/**
 * cursor signing secret の参照先 SSM SecureString 情報を返す。
 *
 * @param config Guppy stack 設定。
 * @returns cursor signing secret の parameter name と version。
 */
export function cursorSigningSecretParameter(
  config: GuppyStackConfig,
): CursorSigningSecretParameter {
  return {
    parameterName: config.cursorSigningSecretParameterName,
    version: config.cursorSigningSecretParameterVersion,
  }
}

/**
 * 必須文字列を検証して返す。
 *
 * @param value 検証対象値。
 * @param fieldName フィールド名。
 * @returns 空でない文字列。
 */
function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} は必須です。`)
  }
  return value.trim()
}

/**
 * 必須の正整数を検証して返す。
 *
 * @param value 検証対象値。
 * @param fieldName フィールド名。
 * @returns 正整数。
 */
function requiredPositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new Error(`${fieldName} は 1 以上の整数で指定してください。`)
  }
  return Number(value)
}

/**
 * URL 末尾の slash を取り除く。
 *
 * @param value URL 文字列。
 * @returns 末尾 slash を除去した URL。
 */
function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

/**
 * Guppy stack 設定を検証する。
 *
 * @param config 検証対象設定。
 * @returns 何も返さない。
 */
function validateConfig(config: GuppyStackConfig): void {
  if (!/^https:\/\/.+/.test(config.frontendBaseUrl)) {
    throw new Error('frontendBaseUrl は https URL を指定してください。')
  }
  if (!/^https:\/\/.+/.test(config.cognitoCallbackUrl)) {
    throw new Error('cognitoCallbackUrl は https URL を指定してください。')
  }
  if (!/^https:\/\/.+/.test(config.cognitoLogoutUrl)) {
    throw new Error('cognitoLogoutUrl は https URL を指定してください。')
  }
  if (!config.githubActionsSubject.startsWith('repo:')) {
    throw new Error('githubActionsSubject は repo: で始まる値を指定してください。')
  }
}
