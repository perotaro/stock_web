import type { AuthProviderProps } from 'react-oidc-context'

import { WebStorageStateStore } from 'oidc-client-ts'

import type { AuthMode } from '@/lib/env/clientEnv'

type OidcAuthProviderConfigInput = {
  authMode: AuthMode
  oidcAuthority: string
  oidcClientId: string
  oidcRedirectUri: string
  oidcPostLogoutRedirectUri: string
  oidcScope: string
}

/**
 * OIDC Provider 用の認証設定を組み立てる。
 *
 * @param input 環境変数から取得した OIDC 設定。
 * @returns react-oidc-context に渡す Provider 設定。
 */
export function buildOidcAuthProviderConfig(
  input: OidcAuthProviderConfigInput,
): AuthProviderProps {
  return {
    authority: input.oidcAuthority,
    client_id: input.oidcClientId,
    redirect_uri: input.oidcRedirectUri,
    post_logout_redirect_uri: input.oidcPostLogoutRedirectUri,
    response_type: 'code',
    scope: input.oidcScope,
    automaticSilentRenew: input.authMode === 'oidc',
    loadUserInfo: true,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    onSigninCallback: () => {
      window.history.replaceState({}, document.title, '/auth/callback')
    },
  }
}
