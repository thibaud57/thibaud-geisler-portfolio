---
paths:
  - "src/lib/prisma.ts"
  - "prisma.config.ts"
  - "package.json"
---

# Prisma 7 — Client Setup & Instanciation

## À faire
- Instancier `PrismaClient` en **singleton global** pour éviter l'épuisement du pool de connexions pendant le HMR Next.js en dev
- Utiliser `@prisma/adapter-pg` : driver adapter **obligatoire** pour PostgreSQL en Prisma 7
- Appeler `import 'dotenv/config'` au runtime (ou configurer via `prisma.config.ts`) : Prisma 7 ne charge **plus** `.env` automatiquement
- Créer un fichier `prisma.config.ts` à la racine pour centraliser la config (`schema`, `datasource.url` via helper `env()`, `migrations.path`). L'**adapter** (`PrismaPg`) n'est **pas** dans ce fichier — il se configure à l'instanciation du `PrismaClient` (dans `src/lib/prisma.ts`)
- Déclarer `"type": "module"` dans `package.json` : Prisma 7 est **ESM-only**
- Ajouter `"postinstall": "prisma generate"` dans `package.json` (convention standard Prisma 7)
- Importer le client dans le code depuis le chemin `output` déclaré dans le generator (ex: `@/generated/prisma/client`), et **non plus** depuis `@prisma/client` (ancien chemin v6). Le package `@prisma/client` reste néanmoins requis comme dépendance runtime dans `package.json` (non déprécié en v7, adapter également requis via `@prisma/adapter-pg`)
- Utiliser `moduleResolution: "bundler"` dans `tsconfig.json` (requis par Prisma 7)
- Activer Node.js **20.19+** minimum (ou 22+/24+), TypeScript **5.4+** minimum

## À éviter
- Instancier `new PrismaClient()` dans chaque module : multiplie les pools de connexions, épuise Postgres
- Utiliser `$use()` pour les middlewares : **supprimé** en Prisma 7, migrer vers `$extends()`
- Compter sur le chargement auto de `.env` au runtime : supprimé en Prisma 7, charger explicitement via `dotenv.config()` ou `prisma.config.ts`
- Laisser `provider = "prisma-client-js"` : **renommé** `prisma-client` en v7 dans le generator
- Omettre le champ `output` dans le generator : **obligatoire** en v7

## Gotchas
- Prisma 7 + Better Auth + Next 16 : erreur P1010 "User was denied access" vient presque toujours d'une `DATABASE_URL` non chargée (pas d'un bug Prisma), vérifier `dotenv.config()` au runtime
- **Prisma 7 + Turbopack build** : issue WASM connue (`query_compiler_fast_bg.postgresql.mjs` not found) — Turbopack est le défaut en Next 16 pour `next build`. Workaround jusqu'à correction : opt-out via `next build --webpack` dans le Dockerfile
- Pas concerné par l'issue CI hash mismatch (#29025) : Dokploy build directement sur le serveur, pas de split CI/deploy
- Client Rust-free v7 : bundle ~90% plus petit, queries ~3x plus rapides, perf TS ~70% plus rapide
- Generation **dans le code source** en v7 (plus dans `node_modules`) : ajouter le dossier `output` au `.gitignore`
- Datasource v7 sans `url` : le bloc `datasource db` ne contient plus que `provider = "postgresql"`, l'URL vient de `prisma.config.ts`

## Exemples
```typescript
// ✅ singleton via globalThis + driver adapter PG (chemins critiques v7)
import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })

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
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
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
