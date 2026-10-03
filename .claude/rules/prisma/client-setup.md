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
- Charger la configuration d'environnement dans `prisma.config.ts` via **`@next/env`** (`loadEnvConfig(process.cwd())` en tête de fichier, avant les autres imports) : recommandation officielle Next.js hors runtime Next, sans dépendance de plus (déjà transitive via `next`)
- Lire `DATABASE_URL` dans `src/lib/prisma.ts` via **`env.DATABASE_URL`** importé depuis `@/env` (t3-env + Zod, voir `nextjs/configuration.md`) : Next.js charge déjà la configuration au runtime
- Centraliser la config CLI dans `prisma.config.ts` à la racine (`schema`, `datasource.url` via **`process.env["DATABASE_URL"] ?? ""`**, `migrations.path`). L'**adapter** (`PrismaPg`) n'y est **pas** : il se configure à l'instanciation du `PrismaClient`
- Déclarer `"type": "module"` dans `package.json` : Prisma 7 est **ESM-only**
- Ajouter `"postinstall": "prisma generate"` dans `package.json`
- Importer le client depuis le chemin `output` du generator (`@/generated/prisma/client`), plus depuis `@prisma/client` (chemin v6). Le paquet `@prisma/client` reste une dépendance runtime, avec `@prisma/adapter-pg`
- Utiliser `moduleResolution: "bundler"` dans `tsconfig.json` (requis par Prisma 7)
- Node.js **20.19+** minimum (ou 22+/24+), TypeScript **5.4+** minimum

## À éviter
- Instancier `new PrismaClient()` dans chaque module : multiplie les pools de connexions, épuise Postgres
- Compter sur le chargement automatique de la configuration au runtime de la CLI : supprimé en Prisma 7, d'où `@next/env` dans `prisma.config.ts`
- Importer `dotenv/config` dans un module runtime Next.js : redondant avec le chargement de Next, et incohérent avec `@/env`. Réservé aux scripts standalone hors Next
- Utiliser le helper **`env('DATABASE_URL')`** de `prisma/config` : il throw `PrismaConfigEnvError` au chargement du fichier, ce qui casse toute commande CLI, `prisma generate` compris, quand la variable manque ([issue #28590](https://github.com/prisma/prisma/issues/28590))

## Gotchas
- Prisma 7 + Better Auth + Next 16 : l'erreur P1010 "User was denied access" vient presque toujours d'une `DATABASE_URL` non chargée, pas d'un bug Prisma. Vérifier `loadEnvConfig` dans `prisma.config.ts`, `env.DATABASE_URL` dans `src/lib/prisma.ts`, et la variable dans Dokploy en prod
- **Prisma 7 + Turbopack build** : l'erreur WASM `query_compiler_fast_bg.postgresql.mjs` qui avait motivé un opt-out `next build --webpack` ne se reproduit plus (opt-out retiré le 3 septembre 2026, build de l'image revérifié sur Next 16.3.6 le 3 octobre 2026). Le relancer à chaque montée de Next ou de Prisma
- Le repli `?? ""` de `prisma.config.ts` sert le stage `deps` du Dockerfile, qui génère le client sans `DATABASE_URL`
- Issue CI hash mismatch (#29025) : garder la même version Prisma et la même image Node entre le build CI et le runtime
- Génération **dans le code source** en v7 (plus dans `node_modules`) : le dossier `output` va dans `.gitignore`
- Generator, datasource, migrations et `$extends()` : voir `prisma/schema-migrations.md`

## Exemples
```typescript
// ✅ singleton via globalThis + driver adapter PG + env validé
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ❌ instanciation directe, ancien chemin v6, sans adapter
import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()
```

```typescript
// ✅ prisma.config.ts : @next/env d'abord, lecture paresseuse de l'URL
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { defineConfig } from 'prisma/config'
export default defineConfig({ datasource: { url: process.env["DATABASE_URL"] ?? "" } })

// ❌ env() throw au chargement, casse prisma generate
export default defineConfig({ datasource: { url: env('DATABASE_URL') } })
```
