---
paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "prisma/seed.ts"
  - "prisma.config.ts"
---

# Prisma 7 — Schema & Migrations

## À faire
- Déclarer `provider = "prisma-client"` dans le generator (plus `prisma-client-js` en v7)
- Déclarer un champ `output` **obligatoire** dans le generator, pointant vers un dossier du code source (ex: `../src/generated/prisma`)
- Versionner les migrations dans `prisma/migrations/` générées via `prisma migrate dev --name <description>`
- Exécuter `pnpm prisma generate` manuellement ou via `postinstall` après chaque modification du schema (ne s'exécute plus auto après `migrate dev`)
- Exécuter `pnpm prisma db seed` explicitement : le seeding automatique est supprimé en v7
- Migrer les middlewares `$use()` vers `$extends()` : nouvelle API Prisma Client Extensions
- Ajouter le dossier `output` généré au `.gitignore` (le client est généré, pas versionné)
- Utiliser les nested transaction rollbacks via savepoints (disponibles depuis v7.5.0)
- Pour pgvector (post-MVP) : utiliser `Unsupported("vector")` dans le schema + migrations SQL manuelles (`CREATE EXTENSION IF NOT EXISTS vector`) + TypedSQL pour les queries
- Utiliser **`@default(uuid(7))`** pour les IDs : UUID v7 est ordonné temporellement, meilleure localité B-tree que cuid/uuid v4
- Préférer **`TEXT`** à `VARCHAR(n)` et **`TIMESTAMPTZ`** à `TIMESTAMP` dans les types Prisma/PostgreSQL
- Pour les index créés en prod sur des tables peuplées : utiliser **`CREATE INDEX CONCURRENTLY`** (dans une migration SQL raw) pour éviter le lock exclusif qui bloque les écritures
- Retirer `url = env("DATABASE_URL")` du `datasource db` : l'URL vient de `prisma.config.ts` en v7, le bloc datasource ne garde que `provider = "postgresql"`

## À éviter
- Omettre `output` dans le generator : erreur de validation en v7
- Compter sur `prisma migrate dev` pour lancer `prisma generate` automatiquement : **comportement retiré** en v7
- Utiliser `$use()` : **supprimé** en v7, non-breaking codemod pour passer à `$extends()`
- Mettre la `url` directement dans `schema.prisma` : **déprécié**, utiliser `prisma.config.ts`
- Attendre un support natif pgvector : support partiel en v7, pas de GA, utiliser `Unsupported`

## Gotchas
- Breaking v6→v7 : ESM-only (`"type": "module"` requis), Node 20.19+ minimum, TypeScript 5.4+ minimum
- pgvector 0.8.2 + PostgreSQL 18 : ✅ compatible, utiliser l'image Docker `pgvector/pgvector:pg18`
- CVE-2026-3172 : buffer overflow dans HNSW parallèles, **corrigé** en pgvector 0.8.2 (upgrader si version antérieure)
- Ne **pas** upgrader Prisma et Next.js simultanément (règle PRODUCTION.md) : isoler les upgrades pour isoler les régressions

## Exemples
```prisma
// ✅ prisma/schema.prisma — generator v7
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Item {
  id        String   @id @default(uuid(7))
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```typescript
// ✅ $extends() au lieu de $use() (v7, supprimé)
const prisma = new PrismaClient().$extends({
  query: {
    item: {
      findMany({ args, query }) { ... },
    },
  },
})

// ❌ $use() : supprimé en v7
prisma.$use(async (params, next) => { ... })
```

```prisma
// ✅ pgvector post-MVP avec Unsupported
model Embedding {
  id        String                      @id @default(cuid())
  content   String
  embedding Unsupported("vector(1536)")
}
// + migration SQL manuelle : CREATE EXTENSION IF NOT EXISTS vector;
```
