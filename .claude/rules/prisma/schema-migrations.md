---
paths:
  - "prisma/**"
  - "prisma.config.ts"
---

# Prisma 7 — Schema & Migrations

## À faire
- Déclarer le generator avec `provider = "prisma-client"` (plus `prisma-client-js`) et un champ **`output` obligatoire** vers le code source (`../src/generated/prisma`)
- Ne garder dans `datasource db` que `provider = "postgresql"` et **`schemas = ["public", "freelance", "auth"]`** : l'URL vient de `prisma.config.ts`
- Annoter **chaque model et chaque enum** par `@@schema("<nom>")` : le schéma PostgreSQL dit à quel domaine appartient la donnée ([ADR-018](../../../docs/adrs/018-cloisonnement-donnees.md))
- Versionner les migrations dans `prisma/migrations/`, générées par `prisma migrate dev --name <description>`
- Lancer `pnpm prisma generate` après chaque modification du schéma, ou laisser `postinstall` le faire : `migrate dev` ne le lance plus en v7
- Aucun seed : `migrations.seed` est absent de `prisma.config.ts`, le contenu vient de l'espace admin et une base locale se remplit par `just db-restore` ([ADR-022](../../../docs/adrs/022-rendu-public-sans-donnee-au-build.md))
- Créer un index sur une table peuplée par **`CREATE INDEX CONCURRENTLY`** (migration SQL raw) : sans lui, le lock exclusif bloque les écritures
- Écrire et modifier **à la main** les modèles Better Auth du schéma `auth` (`User`, `Session`, `Account`, `Verification`), d'après la documentation du schéma Better Auth

## À éviter
- Lancer **`@better-auth/cli generate`** : il réécrit tout `schema.prisma` sans jamais émettre `@@schema`, ce qui casse le multi-schema
- Utiliser `$use()` : **supprimé** en v7, migrer vers `$extends()`
- Mettre la `url` dans `schema.prisma` : elle contredirait `prisma.config.ts`

## Gotchas
- Breaking v6→v7 : ESM-only (`"type": "module"` requis), Node 20.19+ minimum, TypeScript 5.4+ minimum
- Ne **pas** upgrader Prisma et Next.js simultanément (règle PRODUCTION.md) : isoler les upgrades pour isoler les régressions
- Types de colonnes, identifiants, contenu bilingue et pgvector : voir `prisma/data-modeling.md`

## Exemples
```prisma
// ✅ generator v7 + datasource multi-schema, chaque modèle rattaché à son schéma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  schemas  = ["public", "freelance", "auth"]
}

model Item {
  id String @id @default(uuid(7))
  @@schema("public")
}
```

```typescript
// ✅ $extends() au lieu de $use()
const prisma = new PrismaClient().$extends({ query: { item: { findMany({ args, query }) { ... } } } })

// ❌ $use() : supprimé en v7
prisma.$use(async (params, next) => { ... })
```
