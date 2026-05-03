import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: 'prisma/migrations',
    // tsx doit rester en `dependencies` (pas devDependencies) tant qu'on lance
    // `prisma db seed` depuis le container prod (Dokploy). Quand le CRUD admin
    // post-MVP remplacera le seed manuel, tsx pourra revenir en devDependencies.
    seed: 'tsx prisma/seed.ts',
  },
})
