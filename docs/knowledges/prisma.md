---
title: "Prisma ORM — Type-safe database toolkit"
version: "7.7.0"
description: "Référence technique pour Prisma 7 : schéma, driver adapter PostgreSQL, migrations et queries type-safe."
date: "2026-04-13"
keywords: ["prisma", "orm", "postgresql", "migrations", "type-safe"]
scope: ["docs"]
technologies: ["PostgreSQL", "Next.js", "TypeScript"]
---

# Description

`Prisma` 7 est l'ORM TypeScript du portfolio, utilisé pour accéder à PostgreSQL (projets, assets, leads post-MVP). La v7 rend le client Rust-free (TypeScript pur, 90% plus léger, 3x plus rapide), impose les driver adapters (pour PostgreSQL : `@prisma/adapter-pg`), passe en ESM-only, ne charge plus `.env` automatiquement au runtime, et centralise la config dans `prisma.config.ts`.

---

# Concepts Clés

## Schema Prisma (v7)

### Description

Le fichier `prisma/schema.prisma` définit les modèles, relations et la datasource. En v7, le bloc `generator` utilise `provider = "prisma-client"` (pas `prisma-client-js`) avec un `output` obligatoire. L'URL de connexion n'est plus dans `datasource` : elle est dans `prisma.config.ts`.

### Exemple

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Project {
  id          String   @id @default(uuid(7))
  slug        String   @unique
  title       String
  description String
  content     String
  stack       String[]
  githubUrl   String?
  demoUrl     String?
  type        ProjectType
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  assets      Asset[]
}

model Asset {
  id        String   @id @default(uuid(7))
  filename  String
  mimeType  String
  project   Project? @relation(fields: [projectId], references: [id])
  projectId String?
  createdAt DateTime @default(now())
}

enum ProjectType {
  CLIENT
  PERSONAL
}
```

### Points Importants

- `provider = "prisma-client"` en v7 (l'ancien `prisma-client-js` déprécié)
- `output` obligatoire : les imports pointent vers `@/generated/prisma`
- L'URL de datasource vient de `prisma.config.ts`, pas du schema
- `@default(uuid(7))` : UUID v7 ordonné temporellement (meilleur pour les index B-tree)

---

## prisma.config.ts

### Description

Nouveau fichier de configuration centralisé en v7, remplace la dispersion des flags CLI et le chargement implicite de `.env`. Définit la datasource, le chemin du schema, les migrations, le seed.

### Exemple

```ts
// prisma.config.ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
```

### Points Importants

- Importer `dotenv/config` explicitement (Prisma 7 ne charge plus `.env` automatiquement)
- `env('DATABASE_URL')` lit depuis `process.env` au moment de l'exécution CLI
- Les flags `--schema` et `--url` sont supprimés en v7
- Configurer `seed: 'tsx prisma/seed.ts'` pour `prisma db seed`

---

## PrismaClient avec driver adapter

### Description

En v7, toute connexion passe par un driver adapter explicite. Pour PostgreSQL : `@prisma/adapter-pg` (basé sur `node-postgres`). Sans adapter, `PrismaClient` lève une erreur au démarrage.

### Exemple

```ts
// src/lib/prisma.ts
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### Points Importants

- Pattern singleton via `globalThis` pour éviter les multiples instances en dev (hot reload Next.js)
- Importer depuis le chemin `output` du generator (`@/generated/prisma/client`)
- `@prisma/adapter-pg` et `pg` sont des dépendances runtime obligatoires
- En prod (Next.js build), une seule instance est créée par worker

---

## Queries type-safe

### Description

Prisma génère des types TypeScript stricts pour tous les modèles. Les queries (`findMany`, `findUnique`, `create`, `update`, `delete`, `upsert`) sont entièrement typées, y compris le retour avec `include` ou `select`.

### Exemple

```ts
// src/server/queries/projects.ts
import 'server-only'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'

export async function getProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      stack: true,
      type: true,
    },
  })
}

export async function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({
    where: { slug },
    include: { assets: true },
  })
}

// Type avec relations incluses
type ProjectWithAssets = Prisma.ProjectGetPayload<{
  include: { assets: true }
}>
```

### Points Importants

- `select` pour limiter les champs retournés (perf + typage)
- `include` pour charger les relations
- `Prisma.ProjectGetPayload<T>` pour les types avec relations
- `Prisma.ProjectCreateInput` pour le type attendu par `create`
- `import 'server-only'` protège l'import côté client

---

## Seed et données de développement

### Description

Pattern pour peupler la base avec des données de test. Le script est référencé dans `prisma.config.ts` via `migrations.seed` et exécuté via `pnpm exec prisma db seed`.

### Exemple

```ts
// prisma/seed.ts
import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.project.createMany({
    data: [
      {
        slug: 'exemple-projet',
        title: 'Projet exemple',
        description: 'Description courte',
        content: '## Contexte\n...',
        stack: ['Next.js', 'Prisma'],
        type: 'PERSONAL',
      },
    ],
    skipDuplicates: true,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

### Points Importants

- Configurer `seed: 'tsx prisma/seed.ts'` dans `prisma.config.ts`
- `skipDuplicates: true` rend le seed idempotent
- Exécuter manuellement : `pnpm exec prisma db seed`
- Ne jamais committer de vraies données (credentials, clients réels)

---

# Commandes Clés

## Initialisation

### Description

Initialisation de Prisma dans un projet existant via `prisma init`. Crée `prisma/schema.prisma` et (en v7) `prisma.config.ts`. La v7.7.0 ajoute `prisma bootstrap` : commande interactive qui orchestre init + link + install deps + migrate + seed en une seule étape, avec templates par framework.

### Syntaxe

```bash
# Init standard pour PostgreSQL (portfolio)
pnpm exec prisma init --datasource-provider postgresql

# Init avec URL de connexion directe (skip .env)
pnpm exec prisma init \
  --datasource-provider postgresql \
  --url "postgresql://user:pass@localhost:5432/portfolio"

# Bootstrap complet Next.js via prisma bootstrap (v7.7.0+)
pnpm dlx prisma@latest bootstrap --template nextjs --yes

# Bootstrap non-interactif pour CI/CD
pnpm dlx prisma@latest bootstrap \
  --api-key "$PRISMA_API_KEY" \
  --database "db_abc123"
```

### Points Importants

- `prisma init` ne touche pas au `package.json` : il faut avoir déjà fait `pnpm add -D prisma` et `pnpm add @prisma/client @prisma/adapter-pg pg`
- `--datasource-provider postgresql` pour le portfolio (pas `prisma+postgres` qui cible le managed Prisma Postgres)
- `prisma bootstrap` (v7.7.0+) est plus complet : scaffolde depuis un template (`nextjs`, `express`, etc.) et orchestre toutes les étapes
- En v7, après `init`, il faut aussi créer `prisma.config.ts` à la racine (la datasource URL n'est plus dans le schema directement)
- Le générateur doit déclarer `output` explicite en v7 (client sort de `node_modules`)

---

## Migrations et génération

### Description

Les commandes principales pour générer le client, créer des migrations en dev, déployer en prod et explorer la base via Prisma Studio.

### Syntaxe

```bash
pnpm exec prisma generate              # génère le client TypeScript
pnpm exec prisma migrate dev -n add_projects  # crée + applique une migration en dev
pnpm exec prisma migrate deploy        # applique les migrations pending en prod
pnpm exec prisma db push               # sync schema sans migration (prototypage)
pnpm exec prisma db seed               # exécute le seed configuré
pnpm exec prisma studio                # GUI web pour explorer la base
```

### Points Importants

- En v7, `migrate dev` et `db push` ne lancent plus `generate` automatiquement
- Toujours appeler `prisma generate` après chaque modification du schema
- `migrate deploy` est idempotent, safe pour la CI/CD
- `db push` uniquement pour le prototypage, pas en prod
- Ajouter `"postinstall": "prisma generate"` dans `package.json` pour les déploiements

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser le driver adapter `@prisma/adapter-pg` (obligatoire en v7)
- Importer `dotenv/config` explicitement dans le code serveur
- Pattern singleton `globalThis` pour éviter les instances multiples en dev
- Séparer `src/server/queries/` (lecture) et `src/server/actions/` (mutations)
- `import 'server-only'` dans les modules qui accèdent à Prisma
- Relancer `prisma generate` après chaque `migrate dev`

## ❌ Anti-Patterns

- Ne pas instancier `PrismaClient` dans un Client Component
- Ne pas oublier `dotenv/config` en v7 (sinon `DATABASE_URL` undefined)
- Ne pas utiliser `db push` en production
- Ne pas exécuter `migrate dev` dans une CI/CD (utiliser `migrate deploy`)
- Ne pas compter sur l'ancien provider `prisma-client-js` (déprécié)

---

# 🔗 Ressources

## Documentation Officielle

- [Prisma — Documentation](https://www.prisma.io/docs/orm)
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [CRUD Reference](https://www.prisma.io/docs/orm/prisma-client/queries/crud)

## Ressources Complémentaires

- [Prisma + Next.js guide](https://www.prisma.io/docs/guides/frameworks/nextjs)
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
