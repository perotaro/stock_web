let currentAccessToken: string | undefined

/**
 * 現在の Access Token を保存する。
 *
 * @param accessToken 保存する Access Token。
 * @returns 何も返さない。
 */
export function setCurrentAccessToken(accessToken: string | undefined): void {
  currentAccessToken = accessToken
}

/**
 * 現在の Access Token を返す。
 *
 * @returns 保存済みの Access Token。
 */
export function getCurrentAccessToken(): string | undefined {
  return currentAccessToken
}

/**
 * テストやログアウト後のために Access Token を破棄する。
 *
 * @returns 何も返さない。
 */
export function resetCurrentAccessToken(): void {
  currentAccessToken = undefined
}
