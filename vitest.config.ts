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
          // Sérialisation des fichiers unit : workaround documenté de 3 bugs Vitest 4 ouverts qui empêchent
          // `vi.mock('@/env')` (seo.test.ts) et `vi.mock('@/lib/rate-limiter')` (contact.test.ts) de s'appliquer en parallèle.
          //   - vitest#6258 : `isolate: true` (default) IGNORÉ quand la config utilise `projects` (notre cas)
          //   - vitest#4894 : `vi.mock` hoisté après `setupFiles` → mock pas appliqué si module déjà cached
          //   - vitest#8861 : `fileParallelism: false` validé comme workaround officiel pour les inconsistencies forks pool
          // Vérification empirique : 116/116 avec, 19 fails sans (vi.mock @/env et @/lib/rate-limiter inopérants en parallèle).
          // Coût ~10s vs ~3s. À retirer dès que les bugs upstream sont fix.
          pool: 'forks',
          fileParallelism: false,
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
