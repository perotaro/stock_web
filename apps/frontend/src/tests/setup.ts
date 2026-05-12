import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import { resetSharedAppQueryClient } from '@/app/providers/queryClient'
import { resetCurrentAccessToken } from '@/features/auth/accessTokenStore'
import { resetClientEnvCache } from '@/lib/env/clientEnv'

afterEach(() => {
  cleanup()
  resetCurrentAccessToken()
  resetClientEnvCache()
  resetSharedAppQueryClient()
})
