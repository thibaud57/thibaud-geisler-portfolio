# Client Prisma Singleton + Queries Projects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fournir un singleton `PrismaClient` + 2 queries de lecture (`findManyPublished`, `findPublishedBySlug`) testées par 7 tests d'intégration Vitest contre une BDD PostgreSQL dédiée `portfolio_test`.

**Architecture:** Singleton PrismaClient avec driver adapter `@prisma/adapter-pg` (obligatoire Prisma v7), import depuis `@/generated/prisma/client`. Queries dans `src/server/queries/projects.ts` include par défaut `tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } }` (via `ProjectTag`, chaque row portant son `displayOrder` par-projet et la relation `tag`) + `clientMeta: { include: { company: true } }` (Company nested), tri serveur `Project.displayOrder asc` (0 en premier). Tests d'intégration avec TRUNCATE CASCADE entre tests pour isolation (tables `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag`), environnement Vitest `node` (pas jsdom), chargement `.env.test`.

**Tech Stack:** Node.js 24, TypeScript 6 strict, Next.js 16, Prisma 7 (ESM-only), Vitest 4, PostgreSQL 18, pnpm 10.33.

**Spec source:** [docs/superpowers/specs/projets/02-client-prisma-queries-design.md](../../specs/projets/02-client-prisma-queries-design.md)

**Prérequis externe:** Le sub-project `01-schema-prisma-project` doit être implémenté ET la migration appliquée (Project, ClientMeta, Company, Tag, ProjectTag visibles dans Prisma Studio). Sans ça, `import { PrismaClient } from '@/generated/prisma/client'` échoue (client non généré).

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/lib/prisma.ts` | Create | Singleton PrismaClient + adapter PG + `'server-only'` + log minimal |
| `src/types/project.ts` | Create | Type alias `ProjectWithRelations` |
| `src/server/queries/projects.ts` | Create | `findManyPublished` + `findPublishedBySlug` |
| `tests/integration/setup.ts` | Create | `resetDatabase(prisma)` helper + chargement `.env.test` |
| `tests/integration/projects-queries.integration.test.ts` | Create | 7 tests Vitest |
| `.env.test` | Create | `DATABASE_URL` pointant sur `portfolio_test` |
| `__mocks__/server-only.ts` | Create | No-op pour Vitest (`'server-only'` inimportable en contexte test) |
| `vitest.config.ts` | Modify | Ajout alias `server-only` → `__mocks__/server-only.ts` |
| `compose.yaml` | Verify | Service `postgres` expose port 5432 (déjà OK, ligne 13) |

Note : la directive `// @vitest-environment node` reste en tête de chaque fichier `*.integration.test.ts` ; elle ne concerne pas la résolution `server-only`, qui se règle via alias.

---

### Task 1: Prérequis — s'assurer que le sub-project 01 est implémenté

**Files:** (vérifications uniquement)

- [ ] **Step 1: Vérifier que le client Prisma est généré**

Run:
```bash
ls src/generated/prisma/client/index.d.ts
```
Expected : le fichier existe. Si absent → sub-project 01 pas implémenté, exécuter `/implement-subproject projets 01` d'abord puis revenir ici.

- [ ] **Step 2: Vérifier que la BDD `portfolio_dev` contient les tables attendues**

Run:
```bash
docker compose exec postgres psql -U portfolio -d portfolio -c "\dt"
```
Expected : liste contenant `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag`, `_prisma_migrations`.

Si erreur de connexion : `just docker-up` puis attendre le healthcheck.

---

### Task 2: Créer la BDD de test `portfolio_test` + appliquer le schéma

**Files:** (infrastructure, aucun fichier tracké créé ici)

- [ ] **Step 1: Créer la BDD `portfolio_test`**

Run:
```bash
docker compose exec postgres psql -U portfolio -c "CREATE DATABASE portfolio_test;"
```
Expected : `CREATE DATABASE` (si déjà créée : `ERROR: database "portfolio_test" already exists`, non-bloquant pour la suite).

- [ ] **Step 2: Appliquer le schéma Prisma sur `portfolio_test`**

Run (en bash shell, variable d'environnement one-shot) :
```bash
DATABASE_URL="postgresql://portfolio:portfolio@localhost:5432/portfolio_test" pnpm prisma migrate deploy
```
Expected :
```
Applying migration `<ts>_add_project_schema`
The following migration(s) have been applied:
...
All migrations have been successfully applied.
```

- [ ] **Step 3: Vérifier que les tables existent dans `portfolio_test`**

Run:
```bash
docker compose exec postgres psql -U portfolio -d portfolio_test -c "\dt"
```
Expected : même liste que Task 1 step 2 (`Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag`, `_prisma_migrations`).

---

### Task 3: Créer `.env.test`

**Files:**
- Create: `.env.test`

- [ ] **Step 1: Créer `.env.test` à la racine**

Contenu exact :

```
# .env.test — variables utilisées par Vitest en tests d'intégration
# NE PAS committer si des secrets sont ajoutés (les .env* sont déjà ignorés, cf .gitignore ligne 34-35)
DATABASE_URL=postgresql://portfolio:portfolio@localhost:5432/portfolio_test
```

- [ ] **Step 2: Vérifier que `.env.test` n'est pas tracké par git**

Run:
```bash
git check-ignore -v .env.test
```
Expected : `.gitignore:34:.env*      .env.test` (ou équivalent, prouvant que le fichier matche le pattern `.env*`).

---

### Task 4: Créer le singleton `src/lib/prisma.ts`

Règle appliquée : [.claude/rules/prisma/client-setup.md](../../../../.claude/rules/prisma/client-setup.md) (singleton global, adapter PG, `dotenv/config`, import depuis output path).

**Files:**
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Créer le fichier**

Contenu exact :

```typescript
import 'server-only'
import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 2: Vérifier la compilation TS**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur. Si erreur "cannot find module '@/generated/prisma/client'" → prérequis Task 1 non satisfait, exécuter `pnpm prisma generate`.

---

### Task 5: Créer le type alias `src/types/project.ts`

Règle appliquée : [.claude/rules/typescript/conventions.md](../../../../.claude/rules/typescript/conventions.md) (`Prisma.ModelGetPayload` pour types avec relations incluses, import depuis `@/generated/prisma/client`).

**Files:**
- Create: `src/types/project.ts`

- [ ] **Step 1: Créer le fichier**

Contenu exact :

```typescript
import type { Prisma } from '@/generated/prisma/client'

/**
 * Type d'un Project incluant ses relations `tags` (via ProjectTag, chaque row expose
 * `displayOrder` + relation `tag`) et `clientMeta` (1:1 optionnel avec Company nested).
 * Utilisé par les consommateurs UI (page liste, page case study) et par les queries qui
 * l'exposent comme shape de sortie.
 *
 * Accès aux tags côté UI : `project.tags.map(pt => pt.tag)` ou itération directe sur
 * `project.tags` en exposant `projectTag.displayOrder` + `projectTag.tag.name/icon/kind`.
 * Le tableau est déjà trié `displayOrder asc` côté query (cf. `findManyPublished`).
 */
export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    tags: { include: { tag: true } }
    clientMeta: { include: { company: true } }
  }
}>
```

- [ ] **Step 2: Vérifier la compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 6: Setup Vitest (mock `server-only`) + helper `tests/integration/setup.ts`

**Files:**
- Create: `__mocks__/server-only.ts`
- Modify: `vitest.config.ts`
- Create: `tests/integration/setup.ts`

Contexte : `import 'server-only'` (présent dans `src/lib/prisma.ts` Task 4) fait échouer le run Vitest parce que le package bloque tout import hors contexte serveur Next.js. Solution projet : fournir un mock no-op et l'aliaser depuis `vitest.config.ts` dès ce setup, avant d'écrire le moindre test.

- [ ] **Step 1: Créer le mock `server-only`**

Run:
```bash
mkdir -p __mocks__
```

Créer `__mocks__/server-only.ts` avec ce contenu exact :

```typescript
// No-op mock pour Vitest : en contexte test, 'server-only' n'a pas de garde à faire appliquer.
export {}
```

- [ ] **Step 2: Ajouter l'alias dans `vitest.config.ts`**

Éditer `vitest.config.ts` et s'assurer que la clé `test.resolve.alias` contient :

```typescript
    alias: {
      'server-only': new URL('./__mocks__/server-only.ts', import.meta.url).pathname,
    },
```

Si `test.resolve` n'existe pas, l'ajouter. Si un objet `alias` existe déjà, ajouter la clé `'server-only'` dedans (ne pas écraser les alias existants).

- [ ] **Step 3: Créer le dossier tests + le helper**

Run:
```bash
mkdir -p tests/integration
```

Créer `tests/integration/setup.ts` avec ce contenu exact :

```typescript
import { config } from 'dotenv'
import path from 'node:path'

// Charger .env.test en override AVANT tout import de '@/lib/prisma'
// (le singleton lit process.env.DATABASE_URL au moment de l'import).
config({ path: path.resolve(process.cwd(), '.env.test'), override: true })

import { prisma } from '@/lib/prisma'

/**
 * Vide les tables testées sans toucher au schéma ni aux migrations.
 * RESTART IDENTITY reset les séquences (non utilisées avec uuid(7) mais safe).
 * CASCADE nettoie la table de jointure explicite `ProjectTag`.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Project", "ClientMeta", "Company", "Tag", "ProjectTag" RESTART IDENTITY CASCADE',
  )
}

export { prisma }
```

- [ ] **Step 4: Vérifier la compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 7: Écrire les 4 tests pour `findManyPublished` + implémentation minimale (TDD)

**Files:**
- Create: `tests/integration/projects-queries.integration.test.ts`
- Create: `src/server/queries/projects.ts`

- [ ] **Step 1: Créer le fichier de test avec les 4 premiers tests**

Créer `tests/integration/projects-queries.integration.test.ts` :

```typescript
// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { ProjectType } from '@/generated/prisma/client'
import { prisma, resetDatabase } from './setup'
import { findManyPublished } from '@/server/queries/projects'

describe('findManyPublished', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne uniquement les projets status=PUBLISHED (exclut DRAFT et ARCHIVED)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'pub', title: 'Pub', description: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
        { slug: 'draft', title: 'Draft', description: 'd', type: 'PERSONAL', status: 'DRAFT' },
        { slug: 'arch', title: 'Arch', description: 'd', type: 'PERSONAL', status: 'ARCHIVED' },
      ],
    })

    const result = await findManyPublished()

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('pub')
  })

  it('filtre par type=CLIENT quand précisé', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'cli', title: 'Cli', description: 'd', type: 'CLIENT', status: 'PUBLISHED' },
        { slug: 'perso', title: 'Perso', description: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
      ],
    })

    const result = await findManyPublished({ type: 'CLIENT' as ProjectType })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('cli')
  })

  it('filtre par type=PERSONAL quand précisé', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'cli', title: 'Cli', description: 'd', type: 'CLIENT', status: 'PUBLISHED' },
        { slug: 'perso', title: 'Perso', description: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
      ],
    })

    const result = await findManyPublished({ type: 'PERSONAL' as ProjectType })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('perso')
  })

  it('retourne les projets triés par displayOrder asc (0 en premier)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'a', title: 'A', description: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 10 },
        { slug: 'b', title: 'B', description: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 0 },
        { slug: 'c', title: 'C', description: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 5 },
      ],
    })

    const result = await findManyPublished()

    expect(result.map((p) => p.slug)).toEqual(['b', 'c', 'a'])
  })

  it('inclut les relations tags via ProjectTag (triés displayOrder asc, mélange kinds dont EXPERTISE) et clientMeta.company nested', async () => {
    // Company créée en amont (FK required depuis ClientMeta)
    await prisma.company.create({
      data: {
        slug: 'airbus',
        name: 'Airbus',
        sectors: ['LOGICIELS_ENTREPRISE'],
        size: 'GROUPE',
        locations: ['FRANCE'],
      },
    })

    // Tags référentiels créés d'abord (FK required depuis ProjectTag.tagId)
    await prisma.tag.createMany({
      data: [
        { slug: 'react', name: 'React', kind: 'FRAMEWORK', icon: 'simple-icons:react' },
        { slug: 'anti-bot-scraping', name: 'Scraping anti-bot', kind: 'EXPERTISE', icon: 'lucide:spider' },
        { slug: 'docker', name: 'Docker', kind: 'INFRA', icon: 'simple-icons:docker' },
      ],
    })

    await prisma.project.create({
      data: {
        slug: 'full',
        title: 'Full',
        description: 'd',
        type: 'CLIENT',
        status: 'PUBLISHED',
        formats: ['WEB_APP', 'API'],
        tags: {
          // ProjectTag rows : l'ordre (displayOrder) place 'anti-bot-scraping' en 1er (0),
          // puis 'react' (1), puis 'docker' (2). L'UI lira cet ordre tel quel.
          create: [
            { displayOrder: 0, tag: { connect: { slug: 'anti-bot-scraping' } } },
            { displayOrder: 1, tag: { connect: { slug: 'react' } } },
            { displayOrder: 2, tag: { connect: { slug: 'docker' } } },
          ],
        },
        clientMeta: {
          create: {
            teamSize: 15,
            contractStatus: 'FREELANCE',
            workMode: 'REMOTE',
            company: { connect: { slug: 'airbus' } },
          },
        },
      },
    })

    const result = await findManyPublished()

    expect(result).toHaveLength(1)
    expect(result[0]?.tags).toHaveLength(3)
    // Ordre dicté par ProjectTag.displayOrder ASC (0 en premier)
    expect(result[0]?.tags.map((pt) => pt.tag.slug)).toEqual(['anti-bot-scraping', 'react', 'docker'])
    expect(result[0]?.tags.map((pt) => pt.displayOrder)).toEqual([0, 1, 2])
    expect(result[0]?.tags.map((pt) => pt.tag.kind)).toEqual(['EXPERTISE', 'FRAMEWORK', 'INFRA'])
    expect(result[0]?.formats).toEqual(['WEB_APP', 'API'])
    expect(result[0]?.clientMeta?.workMode).toBe('REMOTE')
    expect(result[0]?.clientMeta?.company?.name).toBe('Airbus')
    expect(result[0]?.clientMeta?.company?.size).toBe('GROUPE')
  })
})
```

- [ ] **Step 2: Run les tests — ils doivent FAIL (fonction non implémentée)**

Run:
```bash
pnpm vitest run projects-queries.integration
```
Expected : FAIL, message `Cannot find module '@/server/queries/projects'` ou similaire.

- [ ] **Step 3: Créer l'implémentation `src/server/queries/projects.ts`**

Créer `src/server/queries/projects.ts` :

```typescript
import 'server-only'
import { prisma } from '@/lib/prisma'
import type { ProjectType } from '@/generated/prisma/client'
import type { ProjectWithRelations } from '@/types/project'

const INCLUDE_RELATIONS = {
  tags: {
    include: { tag: true },
    orderBy: { displayOrder: 'asc' },
  },
  clientMeta: {
    include: { company: true },
  },
} as const

export async function findManyPublished(
  params: { type?: ProjectType } = {},
): Promise<ProjectWithRelations[]> {
  return prisma.project.findMany({
    where: {
      status: 'PUBLISHED',
      ...(params.type && { type: params.type }),
    },
    include: INCLUDE_RELATIONS,
    orderBy: { displayOrder: 'asc' },
  })
}
```

- [ ] **Step 4: Run les tests — ils doivent tous PASS**

Run:
```bash
pnpm vitest run projects-queries.integration
```
Expected : 5 tests PASS (les 5 du describe `findManyPublished`).

Si FAIL : vérifier que `.env.test` est chargé (inspect `process.env.DATABASE_URL` dans un `console.log` temporaire), que la BDD test a bien les tables (Task 2 step 3), et que `portfolio_test` accepte les connexions sur `localhost:5432`.

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/integration/setup.ts tests/integration/projects-queries.integration.test.ts src/lib/prisma.ts src/types/project.ts src/server/queries/projects.ts .env.test
```
(note : `.env.test` est ignoré par git via `.env*`, donc `git add .env.test` sera refusé sauf `git add -f`. Ne PAS le forcer — le fichier reste local, non versionné.)

Run plutôt :
```bash
git add tests/integration/setup.ts tests/integration/projects-queries.integration.test.ts src/lib/prisma.ts src/types/project.ts src/server/queries/projects.ts
git commit -m "feat(projets): singleton Prisma + findManyPublished + 5 tests integration"
```
Expected : commit créé.

---

### Task 8: Écrire les 2 tests pour `findPublishedBySlug` + implémentation

**Files:**
- Modify: `tests/integration/projects-queries.integration.test.ts` (ajouter un second `describe`)
- Modify: `src/server/queries/projects.ts` (ajouter la seconde fonction)

- [ ] **Step 1: Ajouter les tests pour `findPublishedBySlug`**

Éditer `tests/integration/projects-queries.integration.test.ts`, ajouter en haut dans les imports :

```typescript
import { findManyPublished, findPublishedBySlug } from '@/server/queries/projects'
```
(remplace la ligne `import { findManyPublished } from '@/server/queries/projects'`)

Puis ajouter ce nouveau `describe` à la fin du fichier (après le `describe('findManyPublished', ...)` existant) :

```typescript
describe('findPublishedBySlug', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne le projet PUBLISHED avec ses relations nested (tags via ProjectTag, company)', async () => {
    await prisma.company.create({
      data: { slug: 'airbus', name: 'Airbus', sectors: ['LOGICIELS_ENTREPRISE'], size: 'GROUPE' },
    })
    await prisma.tag.create({
      data: { slug: 'react', name: 'React', kind: 'FRAMEWORK' },
    })
    await prisma.project.create({
      data: {
        slug: 'mon-projet',
        title: 'Mon Projet',
        description: 'd',
        type: 'CLIENT',
        status: 'PUBLISHED',
        tags: {
          create: [{ displayOrder: 0, tag: { connect: { slug: 'react' } } }],
        },
        clientMeta: {
          create: {
            workMode: 'REMOTE',
            company: { connect: { slug: 'airbus' } },
          },
        },
      },
    })

    const result = await findPublishedBySlug('mon-projet')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('mon-projet')
    expect(result?.tags).toHaveLength(1)
    expect(result?.tags[0]?.tag.slug).toBe('react')
    expect(result?.tags[0]?.displayOrder).toBe(0)
    expect(result?.clientMeta?.workMode).toBe('REMOTE')
    expect(result?.clientMeta?.company?.name).toBe('Airbus')
  })

  it.each([
    ['slug-inexistant', 'slug absent de la BDD'],
    ['mon-brouillon', 'slug existant mais status=DRAFT'],
  ])('retourne null pour %s (%s)', async (slug) => {
    // Seed uniquement un brouillon pour couvrir le 2e cas
    await prisma.project.create({
      data: {
        slug: 'mon-brouillon',
        title: 'Brouillon',
        description: 'd',
        type: 'PERSONAL',
        status: 'DRAFT',
      },
    })

    const result = await findPublishedBySlug(slug)

    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run les tests — les 2 nouveaux doivent FAIL**

Run:
```bash
pnpm vitest run projects-queries.integration
```
Expected : 5 PASS (findManyPublished) + 3 FAIL (findPublishedBySlug, 1 it + 2 paramétrés du `it.each`), message `findPublishedBySlug is not a function` ou export manquant.

- [ ] **Step 3: Ajouter la fonction `findPublishedBySlug` dans `src/server/queries/projects.ts`**

Ajouter à la fin de `src/server/queries/projects.ts` :

```typescript
export async function findPublishedBySlug(
  slug: string,
): Promise<ProjectWithRelations | null> {
  // findFirst (pas findUnique) pour combiner le filtre slug unique avec status=PUBLISHED
  return prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: INCLUDE_RELATIONS,
  })
}
```

- [ ] **Step 4: Run les tests — tous doivent PASS**

Run:
```bash
pnpm vitest run projects-queries.integration
```
Expected : 8 tests PASS (5 findManyPublished + 1 it + 2 it.each = 8 au total).

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/integration/projects-queries.integration.test.ts src/server/queries/projects.ts
git commit -m "feat(projets): findPublishedBySlug + 3 tests integration"
```
Expected : commit créé.

---

### Task 9: Vérifications finales qualité

**Files:** (aucune modification, vérifications uniquement)

- [ ] **Step 1: Lint**

Run:
```bash
just lint
```
Expected : 0 erreur, 0 warning.

- [ ] **Step 2: Typecheck**

Run:
```bash
just typecheck
```
Expected : 0 erreur TS.

- [ ] **Step 3: Full test suite**

Run:
```bash
just test
```
Expected : tous les tests passent (unit + intégration). Si l'ancien test unit échoue, inspecter — ce n'est pas du scope du sub-project 02 à priori.

- [ ] **Step 4: Vérifier que les modules queries sont compilables via typecheck**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur — confirme que `src/server/queries/projects.ts` s'importe correctement avec le type `ProjectWithRelations` de `src/types/project.ts` et que le singleton `src/lib/prisma.ts` exporte bien les fonctions attendues. Le smoke live `findManyPublished()` contre `portfolio_dev` est couvert au sub-project 05 Task 1 (vérification rows BDD) puis par le SSR de la page `/projets`.

---

### Task 10: Commit final + message récap

**Files:** (aucune modification supplémentaire)

- [ ] **Step 1: Vérifier l'état du repo**

Run:
```bash
git status
git log --oneline -5
```
Expected : working tree clean, 2 commits récents correspondants aux Tasks 7 et 8.

- [ ] **Step 2: Vérifier qu'on peut pousser sans conflit**

Run:
```bash
git fetch origin
git log --oneline origin/$(git rev-parse --abbrev-ref HEAD)..HEAD 2>/dev/null || echo "(branche pas encore poussée)"
```

---

## Self-Review

**1. Spec coverage** :
- ✅ `Scope` singleton + queries → Tasks 4, 5, 7, 8
- ✅ `État livré` (just test-integration au vert avec 7 tests) → Task 9 step 3
- ✅ `Dependencies` 01-schema → Task 1 (prérequis)
- ✅ `Files touched` tous mappés : `src/lib/prisma.ts` (T4), `src/types/project.ts` (T5), `src/server/queries/projects.ts` (T7+T8), `tests/integration/*` (T6+T7+T8), `.env.test` (T3), `__mocks__/server-only.ts` + `vitest.config.ts` alias (T6), BDD `portfolio_test` (T2)
- ✅ `Architecture approach` singleton + adapter PG + `'server-only'` + log minimal + type alias + findFirst (pas findUnique) + TRUNCATE CASCADE → tous visibles dans le code des tasks
- ✅ `Acceptance criteria` scénarios 1-8 → test 1 (scénario 2), tests 2+3 (scénario 3), test 4 (scénario 4), test 5 (scénarios 1 implicite via singleton fonctionnel + scénario 5), test 6 (scénario 6), test 7 paramétré (scénarios 7 + 8 fusionnés)
- ✅ `Tests à écrire` = 7 tests listés, tous implémentés dans T7+T8 (1 test paramétré `it.each` couvre 2 cas du spec donc techniquement 8 exécutions mais 7 cas testés)
- ⚠️ `tdd_scope = partial` → déduit du nombre final de tests. 7 tests ciblés règles métier, couverture partielle volontaire (pas de tests sur le singleton, le type alias, les edge cases PG connection). Correct.

**2. Placeholder scan** : aucun "TBD", "TODO", "implement later". Tous les codes sont complets, aucune branche conditionnelle "si erreur" restante (le workaround `server-only` est intégré inconditionnellement dans Task 6).

**3. Type consistency** :
- `findManyPublished({ type? })` : signature identique dans T7 step 1 (test), T7 step 3 (impl), et Task 9 step 4 (smoke test).
- `findPublishedBySlug(slug)` : signature identique dans T8 step 1 (test) et T8 step 3 (impl).
- `ProjectWithRelations` : défini T5, utilisé comme retour dans T7 step 3 et T8 step 3.
- `resetDatabase()` : pas d'argument, défini T6 step 1, utilisé dans `beforeEach` de T7 step 1 et T8 step 1.
- Enum `ProjectType`, `ProjectStatus` : importés depuis `@/generated/prisma/client`, utilisation cohérente.

---

## Prochaine étape

Après exécution de ce plan :
- Passer au sub-project suivant : `03-seed-projets` (spec à générer via `/decompose-feature projets`, puis plan, puis implémentation).
- Pour lancer l'implémentation de ce plan directement : `/implement-subproject projets 02`.
