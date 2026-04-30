---
paths:
  - "src/lib/prisma.ts"
  - "src/env.ts"
  - "prisma.config.ts"
---

# Prisma 7 — Client Setup & Instanciation

## À faire
- Instancier `PrismaClient` en **singleton global** pour éviter l'épuisement du pool de connexions pendant le HMR Next.js en dev
- Utiliser `@prisma/adapter-pg` : driver adapter **obligatoire** pour PostgreSQL en Prisma 7
- Charger `.env` dans `prisma.config.ts` via **`@next/env`** (`loadEnvConfig(process.cwd())` en tête de fichier) — recommandation officielle Next.js pour charger les env vars hors runtime Next, pas de dep dotenv supplémentaire à ajouter (déjà transitif via `next`)
- Lire `DATABASE_URL` dans `src/lib/prisma.ts` via **`env.DATABASE_URL`** importé depuis `@/env` (createEnv `@t3-oss/env-nextjs` + Zod, voir `nextjs/configuration.md`) — Next.js charge automatiquement `.env*` au runtime, pas besoin de `dotenv/config` dans le module Prisma
- Créer un fichier `prisma.config.ts` à la racine pour centraliser la config (`schema`, `datasource.url` via **`process.env.DATABASE_URL!`**, `migrations.path`). L'**adapter** (`PrismaPg`) n'est **pas** dans ce fichier — il se configure à l'instanciation du `PrismaClient` (dans `src/lib/prisma.ts`)
- Déclarer `"type": "module"` dans `package.json` : Prisma 7 est **ESM-only**
- Ajouter `"postinstall": "prisma generate"` dans `package.json` (convention standard Prisma 7)
- Importer le client dans le code depuis le chemin `output` déclaré dans le generator (ex: `@/generated/prisma/client`), et **non plus** depuis `@prisma/client` (ancien chemin v6). Le package `@prisma/client` reste néanmoins requis comme dépendance runtime dans `package.json` (non déprécié en v7, adapter également requis via `@prisma/adapter-pg`)
- Utiliser `moduleResolution: "bundler"` dans `tsconfig.json` (requis par Prisma 7)
- Activer Node.js **20.19+** minimum (ou 22+/24+), TypeScript **5.4+** minimum

## À éviter
- Instancier `new PrismaClient()` dans chaque module : multiplie les pools de connexions, épuise Postgres
- Utiliser `$use()` pour les middlewares : **supprimé** en Prisma 7, migrer vers `$extends()`
- Compter sur le chargement auto de `.env` au runtime : supprimé en Prisma 7, charger explicitement via `@next/env` dans `prisma.config.ts`
- Importer `dotenv/config` dans `src/lib/prisma.ts` ou tout autre module runtime Next.js : redondant (Next.js charge déjà `.env*` automatiquement au boot du serveur), source d'incohérence avec le pattern `@/env` t3-env. Réservé aux scripts standalone hors Next sans `@next/env`
- Laisser `provider = "prisma-client-js"` : **renommé** `prisma-client` en v7 dans le generator
- Omettre le champ `output` dans le generator : **obligatoire** en v7
- Utiliser le helper **`env('DATABASE_URL')`** de `prisma/config` dans `prisma.config.ts` : cette fonction throw `PrismaConfigEnvError` **au chargement du fichier config**, ce qui casse toute commande CLI (y compris `prisma generate` qui n'a pas besoin de l'URL) sans `DATABASE_URL` set. Utiliser `process.env.DATABASE_URL!` à la place (lecture paresseuse, seules les commandes qui utilisent vraiment l'URL échouent si absente)

## Gotchas
- Prisma 7 + Better Auth + Next 16 : erreur P1010 "User was denied access" vient presque toujours d'une `DATABASE_URL` non chargée (pas d'un bug Prisma). Vérifier que `prisma.config.ts` charge bien `.env` via `loadEnvConfig` (`@next/env`), que `src/lib/prisma.ts` lit `env.DATABASE_URL` depuis `@/env`, et que la var est définie dans Dokploy en prod
- **Prisma 7 + Turbopack build** : issue WASM connue (`query_compiler_fast_bg.postgresql.mjs` not found) — Turbopack est le défaut en Next 16 pour `next build`. Workaround jusqu'à correction : opt-out via `next build --webpack` dans le Dockerfile
- Pas concerné par l'issue CI hash mismatch (#29025) : Dokploy build directement sur le serveur, pas de split CI/deploy
- Client Rust-free v7 : bundle ~90% plus petit, queries ~3x plus rapides, perf TS ~70% plus rapide
- Generation **dans le code source** en v7 (plus dans `node_modules`) : ajouter le dossier `output` au `.gitignore`
- Datasource v7 sans `url` : le bloc `datasource db` ne contient plus que `provider = "postgresql"`, l'URL vient de `prisma.config.ts`
- **Prisma 7 + `env()` + build CI/Docker** : `env('DATABASE_URL')` throw au chargement du config même si la commande CLI n'utilise pas la DB. Position officielle Prisma (jkomyno, [issue #28590](https://github.com/prisma/prisma/issues/28590), 2025-11-24) : *« If your environment variable isn't guaranteed to exist, you should not use the env() utility from prisma/config »*. Utiliser `process.env.DATABASE_URL!` qui est lu paresseusement, aucun impact runtime

## Exemples
```typescript
// ✅ singleton via globalThis + driver adapter PG + env validé via @/env (chemins critiques v7)
import 'server-only'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@/env'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

```typescript
// ❌ instanciation directe sans singleton ni adapter (épuise le pool en HMR + casse en v7)
import { PrismaClient } from '@prisma/client' // ancien chemin v6
export const prisma = new PrismaClient()
```

```typescript
// ✅ prisma.config.ts — schema + datasource + migrations (v7 stable)
// @next/env : chargement .env hors runtime Next (reco officielle Next.js)
// process.env.DATABASE_URL! (pas env()) : ne casse pas prisma generate au build CI/Docker (#28590)
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
  },
})
```

```typescript
// ❌ env() throw PrismaConfigEnvError au chargement du config, casse prisma generate (#28590)
import { defineConfig, env } from 'prisma/config'
export default defineConfig({
  datasource: { url: env('DATABASE_URL') }, // ← throw sans DATABASE_URL set
})
```

```json
// ✅ package.json
{
  "type": "module",
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```
