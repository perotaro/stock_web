/// <reference types="vitest/config" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Vite の設定を返す。
 *
 * @param mode 実行モード。
 * @returns 開発・テスト・ビルドで共有する設定。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const srcDirectory = fileURLToPath(new URL('./src', import.meta.url))

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(srcDirectory),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: env.FRONTEND_API_PROXY_TARGET
        ? {
            '/api': {
              target: env.FRONTEND_API_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/tests/setup.ts',
      exclude: ['src/tests/e2e/**', 'node_modules/**'],
      coverage: {
        reporter: ['text', 'lcov'],
      },
    },
  }
})
