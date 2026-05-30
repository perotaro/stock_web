type BuildOidcLogoutUrlInput = {
  logoutEndpoint: string
  clientId: string
  logoutUri: string
}

/**
 * Cognito Hosted UI のログアウト URL を組み立てる。
 *
 * @param input ログアウトエンドポイント、クライアント ID、戻り先 URL。
 * @returns Cognito logout endpoint に渡す完全な URL。
 */
export function buildOidcLogoutUrl(input: BuildOidcLogoutUrlInput): string {
  const logoutUrl = new URL(input.logoutEndpoint)
  logoutUrl.searchParams.set('client_id', input.clientId)
  logoutUrl.searchParams.set('logout_uri', input.logoutUri)
  return logoutUrl.toString()
}
