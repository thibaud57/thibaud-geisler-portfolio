import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': new URL('./__mocks__/server-only.ts', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    setupFiles: ['./vitest.env-loader.ts', './vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.integration.test.{ts,tsx}'],
          // next-intl ESM-only importe `next/navigation` sans extension `.js` (cf. vercel/next.js#77200) ;
          // inline force Vite (pas Node strict ESM) à résoudre. Solution officielle next-intl.dev/docs/environments/testing
          server: { deps: { inline: ['next-intl'] } },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.integration.test.{ts,tsx}'],
          pool: 'forks',
          maxWorkers: 1,
          fileParallelism: false,
        },
      },
    ],
  },
})
