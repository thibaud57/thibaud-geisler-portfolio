# Content bilingue FR/EN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre tout le content DB bilingue FR/EN via colonnes jumelées `*Fr`/`*En` sur `Project` et `Tag`, helper pur `localize*()` côté query, seed bilingue (case studies en `.fr.md` / `.en.md`), queries `findManyPublished` / `findPublishedBySlug` qui exigent un paramètre `locale`, composants UI qui consomment les champs déjà résolus.

**Architecture:** Colonnes jumelées sur les modèles Prisma (`titleFr`/`titleEn`, `descriptionFr`/`descriptionEn`, `caseStudyMarkdownFr`/`caseStudyMarkdownEn` sur `Project` ; `nameFr`/`nameEn` sur `Tag`). Helper pur `src/lib/i18n/localize-content.ts` qui pick le bon champ selon la `Locale` passée et expose un `LocalizedProject` / `LocalizedTag` avec des champs résolus (`title`, `description`, `name`, `caseStudyMarkdown`). Queries `projects.ts` piped via ce helper. Seed lit deux fichiers markdown par projet (`<slug>.fr.md` + `<slug>.en.md`) et hydrate les 2 colonnes. Composants consomment les champs résolus sans connaître la locale.

**Tech Stack:** Prisma 7, PostgreSQL 18, TypeScript 6 strict, Next.js 16 App Router (Server Components), next-intl 4, Vitest 4, Zod 4.

**Spec source:** [docs/superpowers/specs/projets/07-i18n-content-bilingue-design.md](../../specs/projets/07-i18n-content-bilingue-design.md)

**Prérequis externes :** sub-projects 01 (schema initial), 02 (queries `findManyPublished` / `findPublishedBySlug`), 03 (seed + case studies markdown), 05 (page liste + composants `ProjectCard` / `TagBadge` / `ProjectsList`) doivent être **implémentés**. Sub-project 06 (page case study) est encore en draft et sera aligné à la fin de ce plan (Tasks 12–13).

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `prisma/schema.prisma` | Modify | Duplique `title`/`description`/`caseStudyMarkdown` (Project) et `name` (Tag) en colonnes `*Fr`/`*En` |
| `prisma/migrations/<timestamp>_content_bilingual/migration.sql` | Create (via `prisma migrate dev`) | Migration versionnée avec backfill FR |
| `src/types/project.ts` | Modify | Ajoute `LocalizedTag`, `LocalizedProject` (tags localisés + champs résolus) |
| `src/lib/i18n/localize-content.ts` | Create | Helpers purs `localizeProject`, `localizeTag` |
| `src/lib/i18n/localize-content.test.ts` | Create | 4 tests unitaires sur les helpers |
| `src/server/queries/projects.ts` | Modify | `findManyPublished({ type?, locale })` + `findPublishedBySlug(slug, locale)` retournent `LocalizedProject[]` / `LocalizedProject \| null` |
| `src/server/queries/projects.integration.test.ts` | Modify | Fixtures bilingues + 3 nouveaux cas (locale FR, locale EN, tags nested) |
| `prisma/seed-data/tags.ts` | Modify | Remplace `name` par `nameFr` + `nameEn` sur les 41 tags |
| `prisma/seed-data/projects.ts` | Modify | Remplace `title`/`description` par `titleFr`/`titleEn` + `descriptionFr`/`descriptionEn` sur les 9 projets |
| `prisma/seed-data/case-studies/client/<slug>.md` | Rename → `<slug>.fr.md` | 4 fichiers CLIENT (webapp-gestion-sinistres, saas-gestion-paie, erp-odoo-android, referent-ia-automatisation) |
| `prisma/seed-data/case-studies/client/<slug>.en.md` | Create | 4 fichiers EN (copies des FR à traduire) |
| `prisma/seed-data/case-studies/personal/<slug>.md` | Rename → `<slug>.fr.md` | 5 fichiers PERSONAL (portfolio, techno-scraper, crm-leads-n8n, flight-search-api, skill-prof) |
| `prisma/seed-data/case-studies/personal/<slug>.en.md` | Create | 5 fichiers EN (copies des FR à traduire) |
| `prisma/seed.ts` | Modify | Lit `<slug>.fr.md` + `<slug>.en.md`, hydrate `caseStudyMarkdownFr` + `caseStudyMarkdownEn` ; upsert `Tag` avec `nameFr`/`nameEn` ; upsert `Project` avec `titleFr`/`titleEn` / `descriptionFr`/`descriptionEn` |
| `src/components/features/projects/ProjectCard.tsx` | Modify | Consomme `project.title`, `project.description` (résolus) + `project.tags[n].tag.name` (résolu) |
| `src/components/features/projects/TagBadge.tsx` | Modify | Typage `LocalizedTag` (pick `name`, `icon`) au lieu de `Tag` brut |
| `src/components/features/projects/ProjectsList.tsx` | Modify | `projects: LocalizedProject[]` |
| `src/components/features/projects/ProjectsList.test.tsx` | Modify | Fixture `LocalizedProject` (pas `ProjectWithRelations`) |
| `src/app/[locale]/(public)/projets/page.tsx` | Modify | Passe `locale` à `findManyPublished({ locale })` |
| `docs/adrs/010-i18n.md` | Modify | Ajoute section "Content bilingue — colonnes jumelées" |
| `.claude/rules/prisma/schema-migrations.md` | Modify | Mentionne convention `champFr`/`champEn` |
| `.claude/rules/next-intl/translations.md` | Modify | Mentionne "UI chrome via messages/*.json vs content DB via colonnes jumelées" + pattern `localize*()` |
| `docs/superpowers/specs/projets/06-page-case-study-design.md` | Modify | Aligne les sections Architecture approach + Files touched sur `LocalizedProject` |
| `docs/superpowers/plans/projets/06-page-case-study.md` | Modify | Idem |

---

## Task 1: Prérequis — vérifier l'environnement

**Files:** (aucune modif)

- [ ] **Step 1: Vérifier que les sub-projects 01/02/03/05 sont implémentés**

Run:
```bash
ls prisma/schema.prisma src/server/queries/projects.ts src/types/project.ts prisma/seed.ts src/components/features/projects/ProjectCard.tsx 2>&1
```
Expected : les 5 fichiers existent. Si absent : `/implement-subproject projets 01` (puis 02/03/05).

- [ ] **Step 2: Vérifier DB accessible + schéma actuel**

Run:
```bash
docker compose ps postgres && pnpm prisma db pull --print 2>&1 | head -80
```
Expected : `postgres` UP, schéma introspecté affiche `Project.title`, `Project.description`, `Project.caseStudyMarkdown`, `Tag.name` en colonnes simples (pas encore de `titleFr`).

- [ ] **Step 3: Vérifier qu'il n'y a pas de worktree en cours + git status clean**

Run:
```bash
git status --porcelain
```
Expected : une seule ligne `?? docs/superpowers/specs/projets/07-i18n-content-bilingue-design.md` (le spec source non committé) ou branche propre. Si modifs pending : commit/stash avant de continuer.

---

## Task 2: Migrer le schéma Prisma (colonnes jumelées)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Éditer `Project` pour dupliquer les 3 champs texte éditoriaux**

Dans `prisma/schema.prisma`, remplacer le bloc `model Project { ... }` actuel par :

```prisma
model Project {
  id                  String          @id @default(uuid(7))
  slug                String          @unique
  titleFr             String
  titleEn             String
  descriptionFr       String
  descriptionEn       String
  type                ProjectType
  status              ProjectStatus   @default(DRAFT)
  formats             ProjectFormat[]
  startedAt           DateTime?       @db.Timestamptz
  endedAt             DateTime?       @db.Timestamptz
  githubUrl           String?
  demoUrl             String?
  coverFilename       String?
  caseStudyMarkdownFr String?
  caseStudyMarkdownEn String?
  displayOrder        Int             @default(0)
  tags                ProjectTag[]
  clientMeta          ClientMeta?
  createdAt           DateTime        @default(now()) @db.Timestamptz
  updatedAt           DateTime        @updatedAt @db.Timestamptz
}
```

- [ ] **Step 2: Éditer `Tag` pour dupliquer `name`**

Dans `prisma/schema.prisma`, remplacer le bloc `model Tag { ... }` actuel par :

```prisma
model Tag {
  id        String       @id @default(uuid(7))
  slug      String       @unique
  nameFr    String
  nameEn    String
  kind      TagKind
  icon      String?
  projects  ProjectTag[]
  createdAt DateTime     @default(now()) @db.Timestamptz
  updatedAt DateTime     @updatedAt @db.Timestamptz
}
```

- [ ] **Step 3: Vérifier qu'aucun autre modèle ne référence les anciens champs**

Run:
```bash
grep -rn "\.title\b\|\.description\b\|\.caseStudyMarkdown\b\|tag\.name\b" prisma/ src/ --include="*.ts" --include="*.tsx" --include="*.prisma"
```
Expected : lister les occurrences à mettre à jour dans les tâches suivantes (attendu : `prisma/seed.ts`, `src/server/queries/projects.ts`, `src/types/project.ts`, `src/components/features/projects/*.tsx`, tests). Pas d'occurrence en dehors — si surprise (ex: action `/admin`), noter pour Task 10.

- [ ] **Step 4: Commit schema-only (migration générée au step suivant)**

```bash
git add prisma/schema.prisma
git commit -m "refactor(prisma): colonnes jumelées titleFr/titleEn, descriptionFr/descriptionEn, caseStudyMarkdownFr/En sur Project + nameFr/nameEn sur Tag"
```

---

## Task 3: Générer la migration SQL avec backfill FR

**Files:**
- Create: `prisma/migrations/<timestamp>_content_bilingual/migration.sql` (générée par Prisma puis éditée)

- [ ] **Step 1: Générer la migration en mode create-only pour pouvoir éditer le SQL avant exécution**

Run:
```bash
pnpm prisma migrate dev --create-only --name content_bilingual
```
Expected : création de `prisma/migrations/<timestamp>_content_bilingual/migration.sql` avec des `ALTER TABLE` qui ajoutent directement les colonnes `*Fr`/`*En` en NOT NULL + drops des anciennes. Cette version brute ferait perdre les données existantes — on la remplace au step suivant.

- [ ] **Step 2: Remplacer intégralement le contenu du `migration.sql` par la version avec backfill**

Ouvrir `prisma/migrations/<timestamp>_content_bilingual/migration.sql` et remplacer son contenu par :

```sql
-- Content bilingual : dupliquer title/description/caseStudyMarkdown (Project) + name (Tag)
-- en colonnes <champ>Fr / <champ>En avec backfill depuis la version FR existante.

-- 1. Project : ADD COLUMN nullable (pour permettre le backfill avant NOT NULL)
ALTER TABLE "Project"
  ADD COLUMN "titleFr" TEXT,
  ADD COLUMN "titleEn" TEXT,
  ADD COLUMN "descriptionFr" TEXT,
  ADD COLUMN "descriptionEn" TEXT,
  ADD COLUMN "caseStudyMarkdownFr" TEXT,
  ADD COLUMN "caseStudyMarkdownEn" TEXT;

-- 2. Project : backfill FR depuis les anciennes colonnes
UPDATE "Project" SET
  "titleFr" = "title",
  "descriptionFr" = "description",
  "caseStudyMarkdownFr" = "caseStudyMarkdown";

-- 3. Project : backfill EN = FR (placeholder, sera écrasé par le seed ou édition manuelle)
UPDATE "Project" SET
  "titleEn" = "titleFr",
  "descriptionEn" = "descriptionFr",
  "caseStudyMarkdownEn" = "caseStudyMarkdownFr";

-- 4. Project : rétablir les contraintes NOT NULL
ALTER TABLE "Project"
  ALTER COLUMN "titleFr" SET NOT NULL,
  ALTER COLUMN "titleEn" SET NOT NULL,
  ALTER COLUMN "descriptionFr" SET NOT NULL,
  ALTER COLUMN "descriptionEn" SET NOT NULL;

-- 5. Project : DROP des anciennes colonnes
ALTER TABLE "Project"
  DROP COLUMN "title",
  DROP COLUMN "description",
  DROP COLUMN "caseStudyMarkdown";

-- 6. Tag : ADD COLUMN nullable
ALTER TABLE "Tag"
  ADD COLUMN "nameFr" TEXT,
  ADD COLUMN "nameEn" TEXT;

-- 7. Tag : backfill FR depuis l'ancienne colonne, EN = FR placeholder
UPDATE "Tag" SET "nameFr" = "name", "nameEn" = "name";

-- 8. Tag : NOT NULL + DROP de l'ancienne colonne
ALTER TABLE "Tag"
  ALTER COLUMN "nameFr" SET NOT NULL,
  ALTER COLUMN "nameEn" SET NOT NULL,
  DROP COLUMN "name";
```

- [ ] **Step 3: Exécuter la migration**

Run:
```bash
pnpm prisma migrate dev
```
Expected : `✔ Applied migration(s) ... content_bilingual`. Si erreur NOT NULL : vérifier qu'aucune row `Project.title IS NULL` n'existait avant (ne devrait pas, `title` était déjà NOT NULL).

- [ ] **Step 4: Regénérer le client Prisma**

Run:
```bash
pnpm prisma generate
```
Expected : `✔ Generated Prisma Client ... to ./src/generated/prisma`. Les types `Project.titleFr`, `Tag.nameFr` sont maintenant disponibles.

- [ ] **Step 5: Sanity check que les anciennes colonnes ont disparu + nouvelles présentes**

Run:
```bash
docker compose exec -T postgres psql -U portfolio -d portfolio -c "\d \"Project\"" | grep -E "title|description|caseStudy"
docker compose exec -T postgres psql -U portfolio -d portfolio -c "\d \"Tag\"" | grep -E "name"
```
Expected : voir `titleFr`, `titleEn`, `descriptionFr`, `descriptionEn`, `caseStudyMarkdownFr`, `caseStudyMarkdownEn` sur `Project` et `nameFr`, `nameEn` sur `Tag`. Pas de colonnes `title`, `description`, `caseStudyMarkdown`, `name` simples.

- [ ] **Step 6: Commit migration SQL**

```bash
git add prisma/migrations/
git commit -m "feat(prisma): migration content_bilingual (backfill FR + ajout colonnes *Fr/*En)"
```

---

## Task 4: Créer le helper `localize-content.ts` (TDD)

**Files:**
- Create: `src/lib/i18n/localize-content.ts`
- Create: `src/lib/i18n/localize-content.test.ts`

- [ ] **Step 1: Écrire les 4 tests en premier (RED)**

Créer `src/lib/i18n/localize-content.test.ts` :

```typescript
import { describe, expect, it } from 'vitest'
import { localizeProject, localizeTag } from './localize-content'

const baseTag = {
  id: 'tag-1',
  slug: 'docker',
  nameFr: 'Docker',
  nameEn: 'Docker',
  kind: 'INFRA' as const,
  icon: 'simple-icons:docker',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseProject = {
  id: 'proj-1',
  slug: 'webapp-gestion-sinistres',
  titleFr: 'Webapp Gestion Sinistres',
  titleEn: 'Claims Management Web App',
  descriptionFr: 'Description FR',
  descriptionEn: 'Description EN',
  caseStudyMarkdownFr: '# Contexte FR',
  caseStudyMarkdownEn: '# Context EN',
  type: 'CLIENT' as const,
  status: 'PUBLISHED' as const,
  formats: [],
  startedAt: null,
  endedAt: null,
  githubUrl: null,
  demoUrl: null,
  coverFilename: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  clientMeta: null,
}

describe('localizeTag', () => {
  it('retourne name = nameFr et omet nameFr/nameEn quand locale = fr', () => {
    const result = localizeTag(baseTag, 'fr')
    expect(result.name).toBe('Docker')
    expect(result).not.toHaveProperty('nameFr')
    expect(result).not.toHaveProperty('nameEn')
    expect(result.slug).toBe('docker')
    expect(result.icon).toBe('simple-icons:docker')
  })

  it('retourne name = nameEn quand locale = en', () => {
    const tag = { ...baseTag, nameFr: 'Automatisation', nameEn: 'Automation' }
    expect(localizeTag(tag, 'en').name).toBe('Automation')
    expect(localizeTag(tag, 'fr').name).toBe('Automatisation')
  })
})

describe('localizeProject', () => {
  it('résout title/description/caseStudyMarkdown depuis les champs FR quand locale = fr', () => {
    const result = localizeProject(baseProject, 'fr')
    expect(result.title).toBe('Webapp Gestion Sinistres')
    expect(result.description).toBe('Description FR')
    expect(result.caseStudyMarkdown).toBe('# Contexte FR')
    expect(result).not.toHaveProperty('titleFr')
    expect(result).not.toHaveProperty('titleEn')
    expect(result).not.toHaveProperty('descriptionFr')
    expect(result).not.toHaveProperty('caseStudyMarkdownFr')
  })

  it('résout title/description/caseStudyMarkdown depuis les champs EN quand locale = en', () => {
    const result = localizeProject(baseProject, 'en')
    expect(result.title).toBe('Claims Management Web App')
    expect(result.description).toBe('Description EN')
    expect(result.caseStudyMarkdown).toBe('# Context EN')
  })

  it('applique localizeTag récursivement sur les tags nested et préserve displayOrder', () => {
    const project = {
      ...baseProject,
      tags: [
        {
          projectId: 'proj-1',
          tagId: 'tag-1',
          displayOrder: 0,
          tag: { ...baseTag, nameFr: 'Automatisation', nameEn: 'Automation' },
        },
        {
          projectId: 'proj-1',
          tagId: 'tag-2',
          displayOrder: 1,
          tag: { ...baseTag, id: 'tag-2', slug: 'scraping', nameFr: 'Scraping', nameEn: 'Scraping' },
        },
      ],
    }
    const result = localizeProject(project, 'en')
    expect(result.tags).toHaveLength(2)
    expect(result.tags[0]?.displayOrder).toBe(0)
    expect(result.tags[0]?.tag.name).toBe('Automation')
    expect(result.tags[0]?.tag).not.toHaveProperty('nameFr')
    expect(result.tags[1]?.tag.name).toBe('Scraping')
  })
})
```

- [ ] **Step 2: Lancer les tests — ils doivent tous échouer en RED**

Run:
```bash
pnpm vitest run src/lib/i18n/localize-content.test.ts
```
Expected : 4 tests FAIL avec `Cannot find module './localize-content'` ou équivalent. **Ne pas continuer tant que les tests ne sont pas en RED** : c'est la preuve que les tests vont réellement exécuter la logique attendue.

- [ ] **Step 3: Implémenter `src/lib/i18n/localize-content.ts`**

Créer `src/lib/i18n/localize-content.ts` :

```typescript
import type { Locale } from 'next-intl'

type TagBilingual = {
  nameFr: string
  nameEn: string
}

type ProjectBilingual = {
  titleFr: string
  titleEn: string
  descriptionFr: string
  descriptionEn: string
  caseStudyMarkdownFr: string | null
  caseStudyMarkdownEn: string | null
}

export type LocalizedTag<T extends TagBilingual> = Omit<T, 'nameFr' | 'nameEn'> & {
  name: string
}

type ProjectTagBilingual<TTag extends TagBilingual> = {
  tag: TTag
}

export type LocalizedProject<
  TTag extends TagBilingual,
  T extends ProjectBilingual & { tags: ProjectTagBilingual<TTag>[] },
> = Omit<
  T,
  'titleFr' | 'titleEn' | 'descriptionFr' | 'descriptionEn' | 'caseStudyMarkdownFr' | 'caseStudyMarkdownEn' | 'tags'
> & {
  title: string
  description: string
  caseStudyMarkdown: string | null
  tags: Array<Omit<T['tags'][number], 'tag'> & { tag: LocalizedTag<TTag> }>
}

export function localizeTag<T extends TagBilingual>(tag: T, locale: Locale): LocalizedTag<T> {
  const { nameFr, nameEn, ...rest } = tag
  return {
    ...rest,
    name: locale === 'fr' ? nameFr : nameEn,
  } as LocalizedTag<T>
}

export function localizeProject<
  TTag extends TagBilingual,
  T extends ProjectBilingual & { tags: ProjectTagBilingual<TTag>[] },
>(project: T, locale: Locale): LocalizedProject<TTag, T> {
  const {
    titleFr,
    titleEn,
    descriptionFr,
    descriptionEn,
    caseStudyMarkdownFr,
    caseStudyMarkdownEn,
    tags,
    ...rest
  } = project
  return {
    ...rest,
    title: locale === 'fr' ? titleFr : titleEn,
    description: locale === 'fr' ? descriptionFr : descriptionEn,
    caseStudyMarkdown: locale === 'fr' ? caseStudyMarkdownFr : caseStudyMarkdownEn,
    tags: tags.map((pt) => ({ ...pt, tag: localizeTag(pt.tag, locale) })),
  } as LocalizedProject<TTag, T>
}
```

- [ ] **Step 4: Lancer les tests — tous GREEN**

Run:
```bash
pnpm vitest run src/lib/i18n/localize-content.test.ts
```
Expected : 4 tests PASS.

- [ ] **Step 5: Commit helper + tests**

```bash
git add src/lib/i18n/localize-content.ts src/lib/i18n/localize-content.test.ts
git commit -m "feat(i18n): helpers purs localizeProject / localizeTag + tests unitaires"
```

---

## Task 5: Adapter `src/types/project.ts` + queries (locale obligatoire)

**Files:**
- Modify: `src/types/project.ts`
- Modify: `src/server/queries/projects.ts`

- [ ] **Step 1: Éditer `src/types/project.ts` pour exposer les types localisés**

Remplacer intégralement le contenu de `src/types/project.ts` par :

```typescript
import type { Prisma } from '@/generated/prisma/client'
import type { LocalizedProject, LocalizedTag } from '@/lib/i18n/localize-content'

export const PROJECT_INCLUDE = {
  tags: {
    include: { tag: true },
    orderBy: { displayOrder: 'asc' },
  },
  clientMeta: {
    include: { company: true },
  },
} as const satisfies Prisma.ProjectInclude

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_INCLUDE
}>

type ProjectTagRaw = ProjectWithRelations['tags'][number]
type TagRaw = ProjectTagRaw['tag']

export type LocalizedProjectWithRelations = LocalizedProject<TagRaw, ProjectWithRelations>
export type LocalizedProjectTag = LocalizedProjectWithRelations['tags'][number]
export type LocalizedTagRecord = LocalizedTag<TagRaw>
```

- [ ] **Step 2: Éditer `src/server/queries/projects.ts` pour rendre `locale` obligatoire**

Remplacer intégralement le contenu de `src/server/queries/projects.ts` par :

```typescript
import 'server-only'
import type { Locale } from 'next-intl'
import { prisma } from '@/lib/prisma'
import type { ProjectType } from '@/generated/prisma/client'
import { localizeProject } from '@/lib/i18n/localize-content'
import { PROJECT_INCLUDE, type LocalizedProjectWithRelations } from '@/types/project'

export async function findManyPublished(params: {
  type?: ProjectType
  locale: Locale
}): Promise<LocalizedProjectWithRelations[]> {
  const projects = await prisma.project.findMany({
    where: {
      status: 'PUBLISHED',
      ...(params.type && { type: params.type }),
    },
    include: PROJECT_INCLUDE,
    orderBy: { displayOrder: 'asc' },
  })
  return projects.map((p) => localizeProject(p, params.locale))
}

export async function findPublishedBySlug(
  slug: string,
  locale: Locale,
): Promise<LocalizedProjectWithRelations | null> {
  const project = await prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: PROJECT_INCLUDE,
  })
  return project ? localizeProject(project, locale) : null
}
```

- [ ] **Step 3: Vérifier typecheck — les call-sites existants doivent afficher les bonnes erreurs**

Run:
```bash
pnpm typecheck
```
Expected : erreurs TypeScript qui révèlent les call-sites à adapter :
- `src/app/[locale]/(public)/projets/page.tsx` : `findManyPublished()` appelé sans `locale`
- `src/components/features/projects/ProjectsList.tsx` : `projects: ProjectWithRelations[]` à renommer en `LocalizedProjectWithRelations[]`
- `src/components/features/projects/ProjectCard.tsx` : `project: ProjectWithRelations` idem
- `src/components/features/projects/ProjectsList.test.tsx` : fixture utilise `title`/`description` (OK après adaptation mais sans `titleFr` actuellement — à refactorer)
- `src/server/queries/projects.integration.test.ts` : `findManyPublished()` sans `locale`, fixtures utilisent `title` / `description` / `name`

Noter la liste — elle est corrigée aux Tasks 8, 9, 10.

- [ ] **Step 4: Commit types + queries (les call-sites cassés seront corrigés dans les tâches suivantes)**

```bash
git add src/types/project.ts src/server/queries/projects.ts
git commit -m "refactor(queries): locale obligatoire sur findManyPublished / findPublishedBySlug + pipe localizeProject"
```

---

## Task 6: Adapter le seed-data (`tags.ts` + `projects.ts`)

**Files:**
- Modify: `prisma/seed-data/tags.ts`
- Modify: `prisma/seed-data/projects.ts`

- [ ] **Step 1: Réécrire `prisma/seed-data/tags.ts` — renommer `name` → `nameFr` + ajouter `nameEn`**

Remplacer intégralement le contenu de `prisma/seed-data/tags.ts` par :

```typescript
import type { TagKind } from '@/generated/prisma/client'

export type TagInput = {
  slug: string
  nameFr: string
  nameEn: string
  kind: TagKind
  icon: string | null
}

export const tags: TagInput[] = [
  // === LANGUAGE (5) ===
  { slug: 'typescript', nameFr: 'TypeScript', nameEn: 'TypeScript', kind: 'LANGUAGE', icon: 'simple-icons:typescript' },
  { slug: 'scala', nameFr: 'Scala', nameEn: 'Scala', kind: 'LANGUAGE', icon: 'simple-icons:scala' },
  { slug: 'java', nameFr: 'Java', nameEn: 'Java', kind: 'LANGUAGE', icon: 'simple-icons:openjdk' },
  { slug: 'python', nameFr: 'Python', nameEn: 'Python', kind: 'LANGUAGE', icon: 'simple-icons:python' },
  { slug: 'php', nameFr: 'PHP', nameEn: 'PHP', kind: 'LANGUAGE', icon: 'simple-icons:php' },

  // === FRAMEWORK (11) ===
  { slug: 'nextjs', nameFr: 'Next.js', nameEn: 'Next.js', kind: 'FRAMEWORK', icon: 'simple-icons:nextdotjs' },
  { slug: 'react', nameFr: 'React', nameEn: 'React', kind: 'FRAMEWORK', icon: 'simple-icons:react' },
  { slug: 'nodejs', nameFr: 'Node.js', nameEn: 'Node.js', kind: 'FRAMEWORK', icon: 'simple-icons:nodedotjs' },
  { slug: 'nestjs', nameFr: 'NestJS', nameEn: 'NestJS', kind: 'FRAMEWORK', icon: 'simple-icons:nestjs' },
  { slug: 'angular', nameFr: 'Angular', nameEn: 'Angular', kind: 'FRAMEWORK', icon: 'simple-icons:angular' },
  { slug: 'fastapi', nameFr: 'FastAPI', nameEn: 'FastAPI', kind: 'FRAMEWORK', icon: 'simple-icons:fastapi' },
  { slug: 'spring-boot', nameFr: 'Spring Boot', nameEn: 'Spring Boot', kind: 'FRAMEWORK', icon: 'simple-icons:springboot' },
  { slug: 'spring', nameFr: 'Spring', nameEn: 'Spring', kind: 'FRAMEWORK', icon: 'simple-icons:spring' },
  { slug: 'play', nameFr: 'Play', nameEn: 'Play', kind: 'FRAMEWORK', icon: 'lucide:chevron-right' },
  { slug: 'android', nameFr: 'Android', nameEn: 'Android', kind: 'FRAMEWORK', icon: 'simple-icons:android' },
  { slug: 'odoo', nameFr: 'Odoo', nameEn: 'Odoo', kind: 'FRAMEWORK', icon: 'simple-icons:odoo' },

  // === DATABASE (2) ===
  { slug: 'postgresql', nameFr: 'PostgreSQL', nameEn: 'PostgreSQL', kind: 'DATABASE', icon: 'simple-icons:postgresql' },
  { slug: 'mongodb', nameFr: 'MongoDB', nameEn: 'MongoDB', kind: 'DATABASE', icon: 'simple-icons:mongodb' },

  // === AI (5) ===
  { slug: 'anthropic', nameFr: 'Claude (Anthropic)', nameEn: 'Claude (Anthropic)', kind: 'AI', icon: 'simple-icons:anthropic' },
  { slug: 'openai', nameFr: 'ChatGPT (OpenAI)', nameEn: 'ChatGPT (OpenAI)', kind: 'AI', icon: 'simple-icons:openai' },
  { slug: 'n8n', nameFr: 'n8n', nameEn: 'n8n', kind: 'AI', icon: 'simple-icons:n8n' },
  { slug: 'perplexity', nameFr: 'Perplexity', nameEn: 'Perplexity', kind: 'AI', icon: 'simple-icons:perplexity' },
  { slug: 'piagent', nameFr: 'PiAgent', nameEn: 'PiAgent', kind: 'AI', icon: 'lucide:bot' },

  // === INFRA (10) ===
  { slug: 'docker', nameFr: 'Docker', nameEn: 'Docker', kind: 'INFRA', icon: 'simple-icons:docker' },
  { slug: 'github-actions', nameFr: 'GitHub Actions', nameEn: 'GitHub Actions', kind: 'INFRA', icon: 'simple-icons:githubactions' },
  { slug: 'kubernetes', nameFr: 'Kubernetes', nameEn: 'Kubernetes', kind: 'INFRA', icon: 'simple-icons:kubernetes' },
  { slug: 'dokploy', nameFr: 'Dokploy', nameEn: 'Dokploy', kind: 'INFRA', icon: 'lucide:ship' },
  { slug: 'vercel', nameFr: 'Vercel', nameEn: 'Vercel', kind: 'INFRA', icon: 'simple-icons:vercel' },
  { slug: 'kafka', nameFr: 'Kafka', nameEn: 'Kafka', kind: 'INFRA', icon: 'simple-icons:apachekafka' },
  { slug: 'sentry', nameFr: 'Sentry', nameEn: 'Sentry', kind: 'INFRA', icon: 'simple-icons:sentry' },
  { slug: 'datadog', nameFr: 'Datadog', nameEn: 'Datadog', kind: 'INFRA', icon: 'simple-icons:datadog' },
  { slug: 'sonarqube', nameFr: 'SonarQube', nameEn: 'SonarQube', kind: 'INFRA', icon: 'simple-icons:sonarqube' },
  { slug: 'local', nameFr: 'Local', nameEn: 'Local', kind: 'INFRA', icon: 'lucide:monitor' },

  // === EXPERTISE (8) ===
  { slug: 'scraping', nameFr: 'Scraping', nameEn: 'Scraping', kind: 'EXPERTISE', icon: 'lucide:bug' },
  { slug: 'anti-bot', nameFr: 'Anti-bot', nameEn: 'Anti-bot', kind: 'EXPERTISE', icon: 'lucide:shield-ban' },
  { slug: 'anonymisation', nameFr: 'Anonymisation', nameEn: 'Anonymization', kind: 'EXPERTISE', icon: 'lucide:ghost' },
  { slug: 'rag', nameFr: 'RAG', nameEn: 'RAG', kind: 'EXPERTISE', icon: 'lucide:database' },
  { slug: 'mcp', nameFr: 'MCP', nameEn: 'MCP', kind: 'EXPERTISE', icon: 'lucide:plug' },
  { slug: 'agents-ia', nameFr: 'Agents IA', nameEn: 'AI Agents', kind: 'EXPERTISE', icon: 'lucide:brain-circuit' },
  { slug: 'skills', nameFr: 'Skills', nameEn: 'Skills', kind: 'EXPERTISE', icon: 'lucide:sparkles' },
  { slug: 'automatisation', nameFr: 'Automatisation', nameEn: 'Automation', kind: 'EXPERTISE', icon: 'lucide:workflow' },
]
```

- [ ] **Step 2: Réécrire `prisma/seed-data/projects.ts` — `title` → `titleFr`+`titleEn`, `description` → `descriptionFr`+`descriptionEn`**

Remplacer intégralement le contenu de `prisma/seed-data/projects.ts` par :

```typescript
import type {
  ContractStatus,
  ProjectFormat,
  ProjectStatus,
  ProjectType,
  WorkMode,
} from '@/generated/prisma/client'

export type ProjectInput = {
  slug: string
  titleFr: string
  titleEn: string
  descriptionFr: string
  descriptionEn: string
  type: ProjectType
  status: ProjectStatus
  formats: ProjectFormat[]
  startedAt: Date | null
  endedAt: Date | null
  githubUrl: string | null
  demoUrl: string | null
  coverFilename: string | null
  displayOrder: number
  tagSlugs: string[]
  clientMeta: {
    companySlug: string
    teamSize: number | null
    contractStatus: ContractStatus | null
    workMode: WorkMode
  } | null
}

export const projects: ProjectInput[] = [
  {
    slug: 'webapp-gestion-sinistres',
    titleFr: 'Webapp Gestion Sinistres',
    titleEn: 'Claims Management Web App',
    descriptionFr:
      'Webapp Scala/Angular de gestion des sinistres chez Foyer (assurance Luxembourg), architecture microservices CQRS/Event Sourcing. Réduction de 50% du temps de traitement, utilisée par 100+ courtiers.',
    descriptionEn:
      'Scala/Angular web app for claims management at Foyer (Luxembourg insurance), microservices CQRS/Event Sourcing architecture. 50% reduction in processing time, used by 100+ brokers.',
    type: 'CLIENT',
    status: 'PUBLISHED',
    formats: ['WEB_APP', 'API'],
    startedAt: new Date('2022-04-01'),
    endedAt: new Date('2025-10-16'),
    githubUrl: null,
    demoUrl: null,
    coverFilename: 'projets/client/foyer/cover.webp',
    displayOrder: 0,
    tagSlugs: [
      'scala',
      'angular',
      'kafka',
      'mongodb',
      'play',
      'docker',
      'kubernetes',
      'github-actions',
      'sentry',
      'datadog',
      'sonarqube',
    ],
    clientMeta: {
      companySlug: 'foyer',
      teamSize: 6,
      contractStatus: 'CDI',
      workMode: 'HYBRIDE',
    },
  },
  {
    slug: 'referent-ia-automatisation',
    titleFr: 'Référent Technique IA & Automatisation',
    titleEn: 'Technical Lead AI & Automation',
    descriptionFr:
      "Référent technique et stratégique IA/automatisation pour une agence digitale. Structuration des offres IA et marketing automation, architecture d'agents IA, cadrage avant-vente, mentorat technique, infrastructure et ops.",
    descriptionEn:
      'Technical and strategic lead on AI / automation for a digital agency. Building the AI and marketing automation service catalog, AI agents architecture, pre-sales framing, technical mentoring, infrastructure and ops.',
    type: 'CLIENT',
    status: 'PUBLISHED',
    formats: ['IA'],
    startedAt: new Date('2026-01-15'),
    endedAt: null,
    githubUrl: null,
    demoUrl: null,
    coverFilename: 'projets/client/wanted-design/cover.webp',
    displayOrder: 1,
    tagSlugs: [
      'agents-ia',
      'skills',
      'automatisation',
      'anthropic',
      'openai',
      'perplexity',
      'n8n',
      'dokploy',
    ],
    clientMeta: {
      companySlug: 'wanted-design',
      teamSize: 4,
      contractStatus: 'FREELANCE',
      workMode: 'REMOTE',
    },
  },
  {
    slug: 'saas-gestion-paie',
    titleFr: 'SaaS Gestion de Paie',
    titleEn: 'Payroll Management SaaS',
    descriptionFr:
      "Plateforme SaaS de gestion de la paie (Angular/Node.js). Développement de features frontend (stepper d'ajout employé) et d'un module de scraping automatisé (PHP, Puppeteer) pour pré-remplir les fiches de paie depuis un site gouvernemental.",
    descriptionEn:
      'Payroll management SaaS platform (Angular / Node.js). Developed frontend features (employee-creation stepper) and an automated scraping module (PHP, Puppeteer) to prefill payslips from a government website.',
    type: 'CLIENT',
    status: 'PUBLISHED',
    formats: ['WEB_APP'],
    startedAt: new Date('2021-10-01'),
    endedAt: new Date('2022-04-30'),
    githubUrl: null,
    demoUrl: null,
    coverFilename: 'projets/client/paysystem/cover.webp',
    displayOrder: 6,
    tagSlugs: ['angular', 'nodejs', 'mongodb', 'scraping', 'php'],
    clientMeta: {
      companySlug: 'paysystem',
      teamSize: 4,
      contractStatus: 'CDI',
      workMode: 'HYBRIDE',
    },
  },
  {
    slug: 'erp-odoo-android',
    titleFr: 'ERP Odoo & App Android',
    titleEn: 'Odoo ERP & Android App',
    descriptionFr:
      "Développement de modules Odoo ERP personnalisés et d'une application Android de scan de médicaments intégrée à l'ERP, déployée en test chez des pharmacies partenaires.",
    descriptionEn:
      'Developed custom Odoo ERP modules and an Android drug-scanning app integrated with the ERP, deployed in pilot at partner pharmacies.',
    type: 'CLIENT',
    status: 'PUBLISHED',
    formats: ['WEB_APP', 'MOBILE_APP'],
    startedAt: new Date('2020-10-01'),
    endedAt: new Date('2021-09-30'),
    githubUrl: null,
    demoUrl: null,
    coverFilename: 'projets/client/cloudsmart/cover.webp',
    displayOrder: 7,
    tagSlugs: ['python', 'odoo', 'android'],
    clientMeta: {
      companySlug: 'cloudsmart',
      teamSize: 5,
      contractStatus: 'ALTERNANCE',
      workMode: 'PRESENTIEL',
    },
  },
  {
    slug: 'portfolio',
    titleFr: 'Thibaud Geisler Portfolio',
    titleEn: 'Thibaud Geisler Portfolio',
    descriptionFr:
      'Plateforme personnelle Next.js/TypeScript servant de vitrine professionnelle et de fondation technique pour une plateforme freelance évolutive (dashboard admin, chatbot RAG, mini-CRM, blog) à venir post-MVP.',
    descriptionEn:
      'Personal Next.js / TypeScript platform acting as a professional showcase and a technical foundation for an evolving freelance platform (admin dashboard, RAG chatbot, mini-CRM, blog) coming post-MVP.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['WEB_APP'],
    startedAt: new Date('2026-04-19'),
    endedAt: null,
    githubUrl: 'https://github.com/thibaud57/thibaud-geisler-portfolio',
    demoUrl: 'https://thibaud-geisler.com',
    coverFilename: null,
    displayOrder: 2,
    tagSlugs: [
      'nextjs',
      'typescript',
      'react',
      'postgresql',
      'nodejs',
      'docker',
      'dokploy',
      'github-actions',
    ],
    clientMeta: null,
  },
  {
    slug: 'techno-scraper',
    titleFr: 'Techno-Scraper',
    titleEn: 'Techno-Scraper',
    descriptionFr:
      'API Python/FastAPI pour scraper 3 plateformes musicales (Soundcloud, Beatport, Bandcamp) et exposer les données via REST puis via un serveur MCP pour intégration native avec des agents IA.',
    descriptionEn:
      'Python / FastAPI API scraping 3 music platforms (SoundCloud, Beatport, Bandcamp) and exposing the data via REST, then through an MCP server for native integration with AI agents.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['API'],
    startedAt: new Date('2025-04-17'),
    endedAt: new Date('2025-04-21'),
    githubUrl: 'https://github.com/thibaud57/techno-scraper',
    demoUrl: null,
    coverFilename: null,
    displayOrder: 4,
    tagSlugs: [
      'mcp',
      'scraping',
      'anti-bot',
      'python',
      'fastapi',
      'docker',
      'dokploy',
      'github-actions',
    ],
    clientMeta: null,
  },
  {
    slug: 'crm-leads-n8n',
    titleFr: 'CRM Leads - Relance Automatisée (n8n)',
    titleEn: 'CRM Leads - Automated Follow-up (n8n)',
    descriptionFr:
      "Workflow n8n qui automatise la relance de leads CRM : mise à jour d'une date dans Notion déclenche un agent Claude qui rédige un message personnalisé, puis upsert idempotent d'une tâche TickTick de rappel.",
    descriptionEn:
      'n8n workflow that automates CRM lead follow-ups: updating a date in Notion triggers a Claude agent to draft a personalized message, then idempotently upserts a TickTick reminder task.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['IA'],
    startedAt: new Date('2025-12-08'),
    endedAt: new Date('2025-12-08'),
    githubUrl:
      'https://github.com/thibaud57/n8n-backups/blob/main/workflows/work/ybAxfufVGPJPln2i.json',
    demoUrl: null,
    coverFilename: null,
    displayOrder: 5,
    tagSlugs: [
      'agents-ia',
      'automatisation',
      'n8n',
      'anthropic',
      'docker',
      'dokploy',
    ],
    clientMeta: null,
  },
  {
    slug: 'flight-search-api',
    titleFr: 'Flight Search API',
    titleEn: 'Flight Search API',
    descriptionFr:
      'API Python/FastAPI pour trouver les vols multi-destinations les moins chers en testant toutes les combinaisons de dates possibles, avec anti-détection avancé (Crawl4AI, Patchright, proxies résidentiels) face aux protections anti-bot de Google Flights et Kayak.',
    descriptionEn:
      'Python / FastAPI API finding the cheapest multi-destination flights by testing every possible date combination, with advanced anti-detection (Crawl4AI, Patchright, residential proxies) against Google Flights and Kayak anti-bot protections.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['API'],
    startedAt: new Date('2025-11-16'),
    endedAt: new Date('2025-12-06'),
    githubUrl: 'https://github.com/thibaud57/flight-search-api',
    demoUrl: null,
    coverFilename: null,
    displayOrder: 3,
    tagSlugs: [
      'anti-bot',
      'scraping',
      'anonymisation',
      'python',
      'fastapi',
      'docker',
      'dokploy',
      'github-actions',
    ],
    clientMeta: null,
  },
  {
    slug: 'skill-prof',
    titleFr: 'Skill prof - Leçons programmation',
    titleEn: 'Skill prof - Programming Lessons',
    descriptionFr:
      "Skill Claude Code et workflow multi-agents pour générer et maintenir automatiquement des fiches de révision techniques denses, calibrées pour développeurs mid/senior, avec audit qualité multi-couche (format, exactitude technique, cohérence cross-leçons).",
    descriptionEn:
      'Claude Code skill and multi-agent workflow that automatically generates and maintains dense technical review sheets, calibrated for mid/senior developers, with multi-layer quality auditing (format, technical accuracy, cross-lesson consistency).',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['IA'],
    startedAt: new Date('2026-04-06'),
    endedAt: new Date('2026-04-10'),
    githubUrl: 'https://github.com/thibaud57/lessons',
    demoUrl: null,
    coverFilename: null,
    displayOrder: 8,
    tagSlugs: ['skills', 'anthropic', 'local'],
    clientMeta: null,
  },
]
```

- [ ] **Step 3: Commit seed-data bilingue (les .md sont traités au Task 7, seed.ts au Task 8)**

```bash
git add prisma/seed-data/tags.ts prisma/seed-data/projects.ts
git commit -m "refactor(seed-data): tags et projects bilingues (nameFr/nameEn, titleFr/titleEn, descriptionFr/descriptionEn)"
```

---

## Task 7: Renommer les case studies `.md` → `.fr.md` + créer les stubs `.en.md`

**Files:**
- Rename: `prisma/seed-data/case-studies/client/{webapp-gestion-sinistres,saas-gestion-paie,erp-odoo-android,referent-ia-automatisation}.md` → `<slug>.fr.md`
- Rename: `prisma/seed-data/case-studies/personal/{portfolio,techno-scraper,crm-leads-n8n,flight-search-api,skill-prof}.md` → `<slug>.fr.md`
- Create: `prisma/seed-data/case-studies/client/<slug>.en.md` (×4)
- Create: `prisma/seed-data/case-studies/personal/<slug>.en.md` (×5)

- [ ] **Step 1: Renommer les 9 fichiers FR (garde l'historique git via `git mv`)**

Run:
```bash
git mv prisma/seed-data/case-studies/client/webapp-gestion-sinistres.md                 prisma/seed-data/case-studies/client/webapp-gestion-sinistres.fr.md
git mv prisma/seed-data/case-studies/client/saas-gestion-paie.md          prisma/seed-data/case-studies/client/saas-gestion-paie.fr.md
git mv prisma/seed-data/case-studies/client/erp-odoo-android.md           prisma/seed-data/case-studies/client/erp-odoo-android.fr.md
git mv prisma/seed-data/case-studies/client/referent-ia-automatisation.md prisma/seed-data/case-studies/client/referent-ia-automatisation.fr.md
git mv prisma/seed-data/case-studies/personal/portfolio.md          prisma/seed-data/case-studies/personal/portfolio.fr.md
git mv prisma/seed-data/case-studies/personal/techno-scraper.md     prisma/seed-data/case-studies/personal/techno-scraper.fr.md
git mv prisma/seed-data/case-studies/personal/crm-leads-n8n.md      prisma/seed-data/case-studies/personal/crm-leads-n8n.fr.md
git mv prisma/seed-data/case-studies/personal/flight-search-api.md  prisma/seed-data/case-studies/personal/flight-search-api.fr.md
git mv prisma/seed-data/case-studies/personal/skill-prof.md         prisma/seed-data/case-studies/personal/skill-prof.fr.md
```
Expected : 9 fichiers renommés, aucune erreur. `git status` doit les afficher en `renamed:`.

- [ ] **Step 2: Créer les 9 stubs `.en.md` en copiant chaque version FR**

Run:
```bash
cp prisma/seed-data/case-studies/client/webapp-gestion-sinistres.fr.md                 prisma/seed-data/case-studies/client/webapp-gestion-sinistres.en.md
cp prisma/seed-data/case-studies/client/saas-gestion-paie.fr.md          prisma/seed-data/case-studies/client/saas-gestion-paie.en.md
cp prisma/seed-data/case-studies/client/erp-odoo-android.fr.md           prisma/seed-data/case-studies/client/erp-odoo-android.en.md
cp prisma/seed-data/case-studies/client/referent-ia-automatisation.fr.md prisma/seed-data/case-studies/client/referent-ia-automatisation.en.md
cp prisma/seed-data/case-studies/personal/portfolio.fr.md          prisma/seed-data/case-studies/personal/portfolio.en.md
cp prisma/seed-data/case-studies/personal/techno-scraper.fr.md     prisma/seed-data/case-studies/personal/techno-scraper.en.md
cp prisma/seed-data/case-studies/personal/crm-leads-n8n.fr.md      prisma/seed-data/case-studies/personal/crm-leads-n8n.en.md
cp prisma/seed-data/case-studies/personal/flight-search-api.fr.md  prisma/seed-data/case-studies/personal/flight-search-api.en.md
cp prisma/seed-data/case-studies/personal/skill-prof.fr.md         prisma/seed-data/case-studies/personal/skill-prof.en.md
```
Expected : 9 fichiers créés. Ils contiennent la même version FR pour le moment (marqueurs TODO à ajouter au step suivant).

- [ ] **Step 3: Ajouter un en-tête `<!-- TODO: translate to English -->` en première ligne de chaque `.en.md`**

Run:
```bash
for f in prisma/seed-data/case-studies/client/*.en.md prisma/seed-data/case-studies/personal/*.en.md; do
  tmp="$(mktemp)"
  printf '<!-- TODO: translate to English -->\n\n' > "$tmp"
  cat "$f" >> "$tmp"
  mv "$tmp" "$f"
done
```
Expected : chaque `.en.md` démarre par `<!-- TODO: translate to English -->` suivi d'une ligne vide, puis le contenu FR copié. L'utilisateur traduira manuellement post-merge (hors scope de ce plan, marqueur visible dans l'éditeur).

- [ ] **Step 4: Vérifier l'arborescence finale**

Run:
```bash
ls prisma/seed-data/case-studies/client/ prisma/seed-data/case-studies/personal/
```
Expected : 8 fichiers `client/` (4 `.fr.md` + 4 `.en.md`) et 10 fichiers `personal/` (5 `.fr.md` + 5 `.en.md`). Aucun fichier nu (`.md` sans suffixe locale).

- [ ] **Step 5: Commit case studies bilingues**

```bash
git add prisma/seed-data/case-studies/
git commit -m "feat(seed-data): case studies bilingues (.fr.md + .en.md stubs avec marqueur TODO)"
```

---

## Task 8: Adapter `prisma/seed.ts` pour hydrater les colonnes bilingues

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Remplacer la logique de lecture markdown et les upserts**

Remplacer intégralement le contenu de `prisma/seed.ts` par :

```typescript
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { PrismaClient, type ProjectType } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { tags } from './seed-data/tags.js'
import { companies } from './seed-data/companies.js'
import { projects } from './seed-data/projects.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const IconSchema = z
  .string()
  .regex(
    /^(simple-icons|lucide):[a-z0-9-]+$/,
    'icon must match "simple-icons:<slug>" or "lucide:<slug>" (lowercase, hyphens allowed)',
  )
  .nullable()

type CaseStudyLocale = 'fr' | 'en'

function readCaseStudy(
  slug: string,
  type: ProjectType,
  locale: CaseStudyLocale,
): string | null {
  const folder = type === 'CLIENT' ? 'client' : 'personal'
  const path = join(
    __dirname,
    'seed-data',
    'case-studies',
    folder,
    `${slug}.${locale}.md`,
  )
  try {
    return readFileSync(path, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    console.log(
      `→ Seed démarré. ${tags.length} tags, ${companies.length} companies, ${projects.length} projets.`,
    )

    for (const t of tags) {
      const iconParse = IconSchema.safeParse(t.icon)
      if (!iconParse.success) {
        throw new Error(
          `Tag "${t.slug}" has an invalid icon "${t.icon ?? 'null'}": ${iconParse.error.issues[0]?.message ?? 'format invalide'}`,
        )
      }

      await prisma.tag.upsert({
        where: { slug: t.slug },
        create: {
          slug: t.slug,
          nameFr: t.nameFr,
          nameEn: t.nameEn,
          kind: t.kind,
          icon: iconParse.data,
        },
        update: {
          nameFr: t.nameFr,
          nameEn: t.nameEn,
          kind: t.kind,
          icon: iconParse.data,
        },
      })
    }
    const nbExpertises = tags.filter((t) => t.kind === 'EXPERTISE').length
    console.log(`✔ ${tags.length} tags upsertés (dont ${nbExpertises} expertises)`)

    for (const c of companies) {
      await prisma.company.upsert({
        where: { slug: c.slug },
        create: {
          slug: c.slug,
          name: c.name,
          logoFilename: c.logoFilename,
          websiteUrl: c.websiteUrl,
          sectors: c.sectors,
          size: c.size,
          locations: c.locations,
        },
        update: {
          name: c.name,
          logoFilename: c.logoFilename,
          websiteUrl: c.websiteUrl,
          sectors: c.sectors,
          size: c.size,
          locations: c.locations,
        },
      })
    }
    console.log(`✔ ${companies.length} companies upsertées`)

    const missingEnStubs: string[] = []

    for (const p of projects) {
      const caseStudyMarkdownFr = readCaseStudy(p.slug, p.type, 'fr')
      const caseStudyMarkdownEn = readCaseStudy(p.slug, p.type, 'en')

      if (caseStudyMarkdownFr !== null && caseStudyMarkdownEn === null) {
        missingEnStubs.push(p.slug)
      }

      const clientMetaData = p.clientMeta
        ? {
            teamSize: p.clientMeta.teamSize,
            contractStatus: p.clientMeta.contractStatus,
            workMode: p.clientMeta.workMode,
            company: { connect: { slug: p.clientMeta.companySlug } },
          }
        : undefined

      const projectTagCreate = p.tagSlugs.map((slug, index) => ({
        displayOrder: index,
        tag: { connect: { slug } },
      }))

      await prisma.project.upsert({
        where: { slug: p.slug },
        create: {
          slug: p.slug,
          titleFr: p.titleFr,
          titleEn: p.titleEn,
          descriptionFr: p.descriptionFr,
          descriptionEn: p.descriptionEn,
          type: p.type,
          status: p.status,
          formats: p.formats,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          githubUrl: p.githubUrl,
          demoUrl: p.demoUrl,
          coverFilename: p.coverFilename,
          caseStudyMarkdownFr,
          caseStudyMarkdownEn,
          displayOrder: p.displayOrder,
          tags: { create: projectTagCreate },
          clientMeta: clientMetaData ? { create: clientMetaData } : undefined,
        },
        update: {
          titleFr: p.titleFr,
          titleEn: p.titleEn,
          descriptionFr: p.descriptionFr,
          descriptionEn: p.descriptionEn,
          type: p.type,
          status: p.status,
          formats: p.formats,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          githubUrl: p.githubUrl,
          demoUrl: p.demoUrl,
          coverFilename: p.coverFilename,
          caseStudyMarkdownFr,
          caseStudyMarkdownEn,
          displayOrder: p.displayOrder,
          tags: { deleteMany: {}, create: projectTagCreate },
          clientMeta: clientMetaData
            ? { upsert: { create: clientMetaData, update: clientMetaData } }
            : undefined,
        },
      })
    }

    if (missingEnStubs.length > 0) {
      console.warn(
        `⚠ ${missingEnStubs.length} projet(s) sans case study EN (FR seule présente) : ${missingEnStubs.join(', ')}. caseStudyMarkdownEn = null.`,
      )
    }

    const nbClients = projects.filter((p) => p.type === 'CLIENT').length
    const nbPerso = projects.length - nbClients
    console.log(
      `✔ ${projects.length} projets upsertés (${nbClients} CLIENT + ${nbPerso} PERSONAL)`,
    )
    console.log(`→ Seed terminé avec succès.`)
  } catch (err) {
    console.error(`✖ Seed échoué:`, err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
```

- [ ] **Step 2: Lancer le seed pour écraser le placeholder backfill (Task 3 step 2 avait mis `nameEn = nameFr`)**

Run:
```bash
pnpm prisma db seed
```
Expected : `✔ 41 tags upsertés (dont 8 expertises)` + `✔ 9 projets upsertés` + `→ Seed terminé avec succès.` Pas de warning `missingEnStubs` (les 9 `.en.md` ont été créés au Task 7).

- [ ] **Step 3: Vérifier en BDD que les colonnes EN sont bien remplies**

Run:
```bash
docker compose exec -T postgres psql -U portfolio -d portfolio -c 'SELECT slug, "titleFr", "titleEn" FROM "Project" WHERE slug IN (E'\''webapp-gestion-sinistres'\'', E'\''referent-ia-automatisation'\'');'
docker compose exec -T postgres psql -U portfolio -d portfolio -c 'SELECT slug, "nameFr", "nameEn" FROM "Tag" WHERE slug IN (E'\''automatisation'\'', E'\''agents-ia'\'');'
```
Expected :
- `webapp-gestion-sinistres` → `Webapp Gestion Sinistres` / `Claims Management Web App`
- `referent-ia-automatisation` → `Référent Technique IA & Automatisation` / `Technical Lead AI & Automation`
- `automatisation` → `Automatisation` / `Automation`
- `agents-ia` → `Agents IA` / `AI Agents`

- [ ] **Step 4: Commit seed bilingue**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): hydrate caseStudyMarkdownFr/En depuis <slug>.{fr,en}.md + upsert bilingue Tag/Project"
```

---

## Task 9: Adapter les composants front (`ProjectCard`, `TagBadge`, `ProjectsList`) + la page

**Files:**
- Modify: `src/components/features/projects/TagBadge.tsx`
- Modify: `src/components/features/projects/ProjectCard.tsx`
- Modify: `src/components/features/projects/ProjectsList.tsx`
- Modify: `src/app/[locale]/(public)/projets/page.tsx`

- [ ] **Step 1: Adapter `TagBadge.tsx` pour typer un tag localisé (`name` résolu)**

Dans `src/components/features/projects/TagBadge.tsx`, remplacer les lignes 5 et 13-16 :

```typescript
// Remplacer :
import type { Tag } from '@/generated/prisma/client'
// ...
type Props = {
  tag: Pick<Tag, 'name' | 'icon'>
  className?: string
}

// Par :
type Props = {
  tag: { name: string; icon: string | null }
  className?: string
}
```

Le reste du fichier (`resolveTagIcon`, render) reste identique — il consommait déjà `tag.name` et `tag.icon`.

- [ ] **Step 2: Adapter `ProjectCard.tsx` pour typer un projet localisé**

Dans `src/components/features/projects/ProjectCard.tsx`, remplacer la ligne 7 :

```typescript
// Remplacer :
import type { ProjectWithRelations } from '@/types/project'
// ...
type Props = {
  project: ProjectWithRelations
}

// Par :
import type { LocalizedProjectWithRelations } from '@/types/project'
// ...
type Props = {
  project: LocalizedProjectWithRelations
}
```

Le reste du fichier reste identique — `project.title`, `project.description`, `project.tags[n].tag.name` sont déjà lus tels quels (le helper `localizeProject` les expose avec les mêmes noms).

- [ ] **Step 3: Adapter `ProjectsList.tsx` pour typer un array localisé**

Dans `src/components/features/projects/ProjectsList.tsx`, remplacer la ligne 5 :

```typescript
// Remplacer :
import type { ProjectWithRelations } from '@/types/project'
// ...
type Props = {
  projects: ProjectWithRelations[]
}

// Par :
import type { LocalizedProjectWithRelations } from '@/types/project'
// ...
type Props = {
  projects: LocalizedProjectWithRelations[]
}
```

Le corps du composant (filter sur `p.type`, render) reste identique.

- [ ] **Step 4: Adapter la page `projets/page.tsx` pour passer la locale**

Dans `src/app/[locale]/(public)/projets/page.tsx`, modifier la fonction `ProjetsPage` pour passer `locale` à `findManyPublished`. Remplacer les lignes 28-31 :

```typescript
// Remplacer :
export default async function ProjetsPage({ params }: PageProps<'/[locale]/projets'>) {
  await setupLocalePage(params)
  const t = await getTranslations('Projects')
  const projects = await findManyPublished()

// Par :
export default async function ProjetsPage({ params }: PageProps<'/[locale]/projets'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('Projects')
  const projects = await findManyPublished({ locale })
```

Le reste de la fonction (JSX) reste inchangé.

- [ ] **Step 5: Vérifier typecheck**

Run:
```bash
pnpm typecheck
```
Expected : zéro erreur liée aux composants/page. S'il reste des erreurs, elles concernent uniquement le test (`ProjectsList.test.tsx`) et l'intégration (`projects.integration.test.ts`) — corrigés au Task 10.

- [ ] **Step 6: Commit composants + page**

```bash
git add src/components/features/projects/TagBadge.tsx src/components/features/projects/ProjectCard.tsx src/components/features/projects/ProjectsList.tsx src/app/\[locale\]/\(public\)/projets/page.tsx
git commit -m "refactor(components): consomme LocalizedProjectWithRelations (champs title/description/name résolus)"
```

---

## Task 10: Adapter les tests (unit + integration)

**Files:**
- Modify: `src/components/features/projects/ProjectsList.test.tsx`
- Modify: `src/server/queries/projects.integration.test.ts`

- [ ] **Step 1: Adapter `ProjectsList.test.tsx` à la fixture localisée**

Dans `src/components/features/projects/ProjectsList.test.tsx`, remplacer les lignes 4-43 (import type + `baseProject`) par :

```typescript
import type { LocalizedProjectWithRelations } from '@/types/project'
import { ProjectsList } from './ProjectsList'

vi.mock('next-intl', async (orig) => {
  const actual = await orig<typeof import('next-intl')>()
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
  }
})

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}))

vi.mock('@/components/magicui/bento-grid', () => ({
  BentoGrid: ({ children }: { children: React.ReactNode }) => <div data-testid="bento-grid">{children}</div>,
  BentoCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const baseProject: LocalizedProjectWithRelations = {
  id: 'id',
  slug: 'slug',
  title: 'Project',
  description: 'Desc',
  type: 'CLIENT',
  status: 'PUBLISHED',
  formats: [],
  startedAt: null,
  endedAt: null,
  githubUrl: null,
  demoUrl: null,
  coverFilename: null,
  caseStudyMarkdown: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  clientMeta: null,
}
```

Le reste du fichier (fixtures `fixtures`, `describe('ProjectsList filter', ...)`, test click sur tabs) reste identique — `title`, `type`, `slug` existent toujours sur `LocalizedProjectWithRelations`.

- [ ] **Step 2: Réécrire `projects.integration.test.ts` avec fixtures bilingues + cas FR/EN**

Remplacer intégralement le contenu de `src/server/queries/projects.integration.test.ts` par :

```typescript
// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDatabase } from '@/lib/prisma-test-setup'
import { findManyPublished, findPublishedBySlug } from '@/server/queries/projects'

describe('findManyPublished', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne uniquement les projets status=PUBLISHED (exclut DRAFT et ARCHIVED)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'pub',   titleFr: 'Pub',   titleEn: 'Pub',   descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
        { slug: 'draft', titleFr: 'Draft', titleEn: 'Draft', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'DRAFT' },
        { slug: 'arch',  titleFr: 'Arch',  titleEn: 'Arch',  descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'ARCHIVED' },
      ],
    })

    const result = await findManyPublished({ locale: 'fr' })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('pub')
  })

  it.each([
    ['CLIENT', 'cli'],
    ['PERSONAL', 'perso'],
  ] as const)('filtre par type=%s quand précisé', async (type, expectedSlug) => {
    await prisma.project.createMany({
      data: [
        { slug: 'cli',   titleFr: 'Cli',   titleEn: 'Cli',   descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT',   status: 'PUBLISHED' },
        { slug: 'perso', titleFr: 'Perso', titleEn: 'Perso', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
      ],
    })

    const result = await findManyPublished({ type, locale: 'fr' })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe(expectedSlug)
  })

  it('retourne les projets triés par displayOrder asc (0 en premier)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'a', titleFr: 'A', titleEn: 'A', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 10 },
        { slug: 'b', titleFr: 'B', titleEn: 'B', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 0 },
        { slug: 'c', titleFr: 'C', titleEn: 'C', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 5 },
      ],
    })

    const result = await findManyPublished({ locale: 'fr' })

    expect(result.map((p) => p.slug)).toEqual(['b', 'c', 'a'])
  })

  it('inclut les relations tags via ProjectTag (triés displayOrder asc, mélange kinds dont EXPERTISE) et clientMeta.company nested', async () => {
    await prisma.company.create({
      data: {
        slug: 'airbus',
        name: 'Airbus',
        sectors: ['LOGICIELS_ENTREPRISE'],
        size: 'GROUPE',
        locations: ['FRANCE'],
      },
    })

    await prisma.tag.createMany({
      data: [
        { slug: 'react',             nameFr: 'React',             nameEn: 'React',             kind: 'FRAMEWORK',  icon: 'simple-icons:react' },
        { slug: 'anti-bot-scraping', nameFr: 'Scraping anti-bot', nameEn: 'Anti-bot scraping', kind: 'EXPERTISE',  icon: 'lucide:spider' },
        { slug: 'docker',            nameFr: 'Docker',            nameEn: 'Docker',            kind: 'INFRA',      icon: 'simple-icons:docker' },
      ],
    })

    await prisma.project.create({
      data: {
        slug: 'full',
        titleFr: 'Full',
        titleEn: 'Full',
        descriptionFr: 'd',
        descriptionEn: 'd',
        type: 'CLIENT',
        status: 'PUBLISHED',
        formats: ['WEB_APP', 'API'],
        tags: {
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

    const result = await findManyPublished({ locale: 'fr' })

    expect(result).toHaveLength(1)
    expect(result[0]?.tags).toHaveLength(3)
    expect(result[0]?.tags.map((pt) => pt.tag.slug)).toEqual(['anti-bot-scraping', 'react', 'docker'])
    expect(result[0]?.tags.map((pt) => pt.displayOrder)).toEqual([0, 1, 2])
    expect(result[0]?.tags.map((pt) => pt.tag.kind)).toEqual(['EXPERTISE', 'FRAMEWORK', 'INFRA'])
    expect(result[0]?.formats).toEqual(['WEB_APP', 'API'])
    expect(result[0]?.clientMeta?.workMode).toBe('REMOTE')
    expect(result[0]?.clientMeta?.company?.name).toBe('Airbus')
    expect(result[0]?.clientMeta?.company?.size).toBe('GROUPE')
  })

  it('résout title/description en FR quand locale = fr', async () => {
    await prisma.project.create({
      data: {
        slug: 'bi',
        titleFr: 'Webapp Gestion Sinistres',
        titleEn: 'Claims Management Web App',
        descriptionFr: 'Desc FR',
        descriptionEn: 'Desc EN',
        type: 'CLIENT',
        status: 'PUBLISHED',
      },
    })

    const result = await findManyPublished({ locale: 'fr' })

    expect(result[0]?.title).toBe('Webapp Gestion Sinistres')
    expect(result[0]?.description).toBe('Desc FR')
    expect(result[0]).not.toHaveProperty('titleFr')
    expect(result[0]).not.toHaveProperty('titleEn')
  })

  it('résout title/description en EN quand locale = en', async () => {
    await prisma.project.create({
      data: {
        slug: 'bi',
        titleFr: 'Webapp Gestion Sinistres',
        titleEn: 'Claims Management Web App',
        descriptionFr: 'Desc FR',
        descriptionEn: 'Desc EN',
        type: 'CLIENT',
        status: 'PUBLISHED',
      },
    })

    const result = await findManyPublished({ locale: 'en' })

    expect(result[0]?.title).toBe('Claims Management Web App')
    expect(result[0]?.description).toBe('Desc EN')
  })

  it('applique la locale sur les tags nested (name résolu selon locale)', async () => {
    await prisma.tag.create({
      data: { slug: 'automatisation', nameFr: 'Automatisation', nameEn: 'Automation', kind: 'EXPERTISE' },
    })
    await prisma.project.create({
      data: {
        slug: 'bi',
        titleFr: 'T',
        titleEn: 'T',
        descriptionFr: 'd',
        descriptionEn: 'd',
        type: 'PERSONAL',
        status: 'PUBLISHED',
        tags: { create: [{ displayOrder: 0, tag: { connect: { slug: 'automatisation' } } }] },
      },
    })

    const resultFr = await findManyPublished({ locale: 'fr' })
    const resultEn = await findManyPublished({ locale: 'en' })

    expect(resultFr[0]?.tags[0]?.tag.name).toBe('Automatisation')
    expect(resultEn[0]?.tags[0]?.tag.name).toBe('Automation')
    expect(resultFr[0]?.tags[0]?.tag).not.toHaveProperty('nameFr')
  })
})

describe('findPublishedBySlug', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne le projet PUBLISHED avec ses relations nested localisées', async () => {
    await prisma.company.create({
      data: { slug: 'airbus', name: 'Airbus', sectors: ['LOGICIELS_ENTREPRISE'], size: 'GROUPE' },
    })
    await prisma.tag.create({
      data: { slug: 'react', nameFr: 'React', nameEn: 'React', kind: 'FRAMEWORK' },
    })
    await prisma.project.create({
      data: {
        slug: 'mon-projet',
        titleFr: 'Mon Projet',
        titleEn: 'My Project',
        descriptionFr: 'd',
        descriptionEn: 'd',
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

    const result = await findPublishedBySlug('mon-projet', 'en')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('mon-projet')
    expect(result?.title).toBe('My Project')
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
    await prisma.project.create({
      data: {
        slug: 'mon-brouillon',
        titleFr: 'Brouillon',
        titleEn: 'Draft',
        descriptionFr: 'd',
        descriptionEn: 'd',
        type: 'PERSONAL',
        status: 'DRAFT',
      },
    })

    const result = await findPublishedBySlug(slug, 'fr')

    expect(result).toBeNull()
  })
})
```

- [ ] **Step 3: Lancer la suite Vitest complète**

Run:
```bash
pnpm test
```
Expected : tous les tests PASS (unit helpers + ProjectsList filter + integration queries). Si un test async timeout sur l'intégration : vérifier que `docker compose ps postgres_test` est UP et que la DB de test est migrée (`just db-migrate-test` ou équivalent — cf. `prisma-test-setup.ts`).

- [ ] **Step 4: Commit tests adaptés**

```bash
git add src/components/features/projects/ProjectsList.test.tsx src/server/queries/projects.integration.test.ts
git commit -m "test(projects): fixtures bilingues + cas locale FR/EN sur findManyPublished / findPublishedBySlug"
```

---

## Task 11: Validation end-to-end (typecheck + lint + dev server)

**Files:** (validations, aucune modif)

- [ ] **Step 1: Typecheck strict sur tout le projet**

Run:
```bash
pnpm typecheck
```
Expected : `✔ No type errors`. Si erreur : corriger AVANT de continuer (souvent un import oublié).

- [ ] **Step 2: Lint**

Run:
```bash
pnpm lint
```
Expected : aucune erreur. Warnings tolérés si pré-existants uniquement.

- [ ] **Step 3: Test complet**

Run:
```bash
pnpm test
```
Expected : tout GREEN.

- [ ] **Step 4: Re-seed propre pour état final**

Run:
```bash
pnpm prisma db seed
```
Expected : `✔ 41 tags upsertés` + `✔ 9 projets upsertés` sans warning `missingEnStubs`.

- [ ] **Step 5: Lancer le serveur dev + tester `/fr/projets` puis `/en/projets` dans un navigateur**

Run:
```bash
just dev
```
Expected : serveur disponible sur `http://localhost:3000`. Ouvrir :
- `http://localhost:3000/fr/projets` → voir "Webapp Gestion Sinistres", "Référent Technique IA & Automatisation", tag "Automatisation"
- `http://localhost:3000/en/projets` → voir "Claims Management Web App", "Technical Lead AI & Automation", tag "Automation"

Vérifier que la bascule entre les deux URLs change bien les titres/descriptions/tags visibles. Si UI identique : inspecter la réponse réseau `/en/projets` et chercher "Claims Management" dans le HTML SSR (si absent, bug de la chaîne locale → query).

- [ ] **Step 6: Stop dev server**

Run:
```bash
just stop
```

- [ ] **Step 7: Commit de validation (no-op si rien à ajouter)**

Si `git status` est clean, passer directement à la Task 12. Sinon :

```bash
git add -u
git commit -m "chore: validation content bilingue FR/EN end-to-end"
```

---

## Task 12: Documenter — ADR-010 + rules + spec/plan 06

**Files:**
- Modify: `docs/adrs/010-i18n.md`
- Modify: `.claude/rules/prisma/schema-migrations.md`
- Modify: `.claude/rules/next-intl/translations.md`
- Modify: `docs/superpowers/specs/projets/06-page-case-study-design.md`
- Modify: `docs/superpowers/plans/projets/06-page-case-study.md`

- [ ] **Step 1: Ajouter la section "Content bilingue" dans l'ADR-010**

Dans `docs/adrs/010-i18n.md`, ajouter juste après la section `## Sous-question ouverte : stratégie des slugs` (en toute fin de fichier) :

```markdown

---

## Sous-décision : content bilingue côté DB

**Options envisagées :**

- **A. Colonnes jumelées `*Fr`/`*En`** sur chaque modèle contenant du texte éditorial (`Project.titleFr`/`titleEn`, `descriptionFr`/`descriptionEn`, `caseStudyMarkdownFr`/`caseStudyMarkdownEn`, `Tag.nameFr`/`nameEn`). Helper pur `localizeProject(project, locale)` / `localizeTag(tag, locale)` côté query qui pick le champ selon la locale.
- **B. Table `Translation` normalisée** (`entityId`, `entityType`, `locale`, `field`, `value`). Scalable pour N locales, plus complexe côté requêtes.
- **C. JSON multilingue** dans une seule colonne (`title: { fr, en }`) en JSONB Postgres.

**Décision : A.**

**Rationale :**
- Portfolio single-user visant 2 locales (FR, EN) stables, pas de roadmap > 5 locales : surcoût structurel de (B) non justifié.
- Queries simples (pas de JOIN translation), types Prisma auto-générés cleanly, IDE autocomplete sur `titleFr` / `titleEn`.
- Le helper `localizeProject` isole l'implémentation : migration post-MVP vers (B) possible sans casser l'API publique (queries continuent de retourner `LocalizedProjectWithRelations` avec `title` résolu).
- (C) rejetée : JSONB → typage faible en bout de chaîne, Zod validation runtime nécessaire pour chaque lecture.

**Convention mixte :**
- **Content éditorial long** (titres, descriptions, markdown, noms de tags) → colonnes jumelées `*Fr`/`*En` sur Prisma.
- **UI chrome et labels bornés** (nav, boutons, labels d'enum comme `CompanySector.ASSURANCE`) → `messages/{fr,en}.json` consommés via `useTranslations` / `getTranslations`.
- **`Company.name`** reste non-traduit (marque commerciale conservée telle quelle, ex : "Foyer Group", "PaySystem").

**Paramètre `locale` obligatoire sur les queries :**
- `findManyPublished({ type?, locale })` et `findPublishedBySlug(slug, locale)` exigent la locale sans valeur par défaut. TypeScript force le caller à passer explicitement la locale de la route (obtenue depuis `setupLocalePage(params)`). Un oubli = erreur de compilation, pas un bug silencieux FR-only en prod.
```

- [ ] **Step 2: Ajouter la convention `champFr`/`champEn` dans les rules Prisma**

Dans `.claude/rules/prisma/schema-migrations.md`, à la fin de la section `## À faire` (juste avant `## À éviter`), ajouter une nouvelle puce :

```markdown
- **Content multilingue** : pour les champs texte éditoriaux traduisibles (titres, descriptions, markdown longs, noms de tags affichés à l'utilisateur), utiliser la convention **colonnes jumelées `<champ>Fr` + `<champ>En`** (ex : `titleFr`/`titleEn`, `caseStudyMarkdownFr`/`caseStudyMarkdownEn`). Pipe le résultat Prisma via les helpers purs `localizeProject` / `localizeTag` (cf. `src/lib/i18n/localize-content.ts`). Ne **pas** appliquer aux enums, slugs, noms de marques (`Company.name`), identifiants techniques — ils restent mono-valeur
```

- [ ] **Step 3: Clarifier "content DB vs UI chrome" dans les rules next-intl**

Dans `.claude/rules/next-intl/translations.md`, à la fin de la section `## À faire` (juste avant `## À éviter`), ajouter une nouvelle puce :

```markdown
- **Séparer UI chrome et content DB** : les labels d'interface (nav, boutons, titres de page statiques, enums bornés) vivent dans `messages/{fr,en}.json` et sont consommés via `useTranslations` / `getTranslations`. Le **content éditorial long** stocké en BDD (titres de projets, descriptions, markdown case study, noms de tags affichés) passe par des **colonnes jumelées Prisma `<champ>Fr`/`<champ>En`** et un helper pur `localize*(entity, locale)` qui résout le bon champ avant render (cf. `src/lib/i18n/localize-content.ts`). Ne jamais dupliquer du content éditorial dans `messages/*.json`
```

- [ ] **Step 4: Aligner le spec 06 sur `LocalizedProjectWithRelations`**

Dans `docs/superpowers/specs/projets/06-page-case-study-design.md`, relire la section **Architecture approach** et **Files touched**. Deux points à ajouter / reformuler :

1. Dans **Dependencies**, remplacer la ligne de `02-client-prisma-queries-design.md` par :

```markdown
- `02-client-prisma-queries-design.md` (statut: implemented) — utilise `findPublishedBySlug(slug, locale)` qui retourne `LocalizedProjectWithRelations | null` (champs `title`, `description`, `caseStudyMarkdown`, `tags[n].tag.name` déjà résolus selon la locale passée)
```

2. Dans **Architecture approach**, ajouter une sous-section en fin de liste :

```markdown
### Consommation du content localisé

- Le Server Component `/[locale]/projets/[slug]/page.tsx` récupère la locale via `setupLocalePage(params)` et la passe à `findPublishedBySlug(slug, locale)`.
- Les champs retournés sont déjà résolus : `project.title`, `project.description`, `project.caseStudyMarkdown`, et pour chaque tag `project.tags[n].tag.name`. Aucun composant case study ne doit lire `titleFr`/`titleEn` directement — ces colonnes brutes ne sont pas exposées par le type `LocalizedProjectWithRelations`.
- `generateStaticParams` pré-génère `tous les slugs PUBLISHED × 2 locales` (déjà prévu dans le spec). Chaque paire `(slug, locale)` obtient le content résolu via la même query.
- Si `caseStudyMarkdownEn` est `null` en BDD (trou de traduction), afficher un banner "Traduction à venir — version FR ci-dessous" et rendre `project.caseStudyMarkdown` en FR en fallback explicite (décision de sub-project 07, edge case).
```

3. Dans **Files touched**, la ligne `src/app/[locale]/(public)/projets/[slug]/page.tsx` précise désormais : "appelle `findPublishedBySlug(slug, locale)` — la locale vient de `setupLocalePage`".

- [ ] **Step 5: Aligner le plan 06 sur `LocalizedProjectWithRelations`**

Ouvrir `docs/superpowers/plans/projets/06-page-case-study.md`, chercher toutes les occurrences de `ProjectWithRelations` et remplacer par `LocalizedProjectWithRelations`. Chercher les call-sites de `findPublishedBySlug(slug)` et remplacer par `findPublishedBySlug(slug, locale)` en ajoutant une étape "obtenir `locale` via `setupLocalePage`". Si le plan n'a pas encore été implémenté (fichier en draft), l'alignement du spec suffit et cette étape se limite à un pointer mentionnant : "Voir sub-project 07 — les queries retournent désormais `LocalizedProjectWithRelations`".

Commande de recherche pour locate rapidement :
```bash
grep -n "ProjectWithRelations\|findPublishedBySlug(" docs/superpowers/plans/projets/06-page-case-study.md
```

- [ ] **Step 6: Commit documentation**

```bash
git add docs/adrs/010-i18n.md .claude/rules/prisma/schema-migrations.md .claude/rules/next-intl/translations.md docs/superpowers/specs/projets/06-page-case-study-design.md docs/superpowers/plans/projets/06-page-case-study.md
git commit -m "docs(i18n): ADR-010 content bilingue + rules Prisma/next-intl + aligne spec/plan 06 sur LocalizedProjectWithRelations"
```

---

## Task 13: Marquer le spec 07 comme implemented

**Files:**
- Modify: `docs/superpowers/specs/projets/07-i18n-content-bilingue-design.md`

- [ ] **Step 1: Faire passer le `status` du spec de `draft` à `implemented`**

Dans le frontmatter de `docs/superpowers/specs/projets/07-i18n-content-bilingue-design.md`, remplacer :

```yaml
status: "draft"
```

par :

```yaml
status: "implemented"
```

- [ ] **Step 2: Répondre à la question ouverte "stratégie de fallback titleEn null"**

Dans la section `## Open questions` du spec, remplacer la puce `- [ ] Stratégie de fallback...` par :

```markdown
- [x] **Fallback `titleEn = null` ou absent** : la convention MVP est que `titleEn`/`descriptionEn` sont **NOT NULL** en BDD (contrainte schéma appliquée via migration `content_bilingual`), donc ce cas ne peut pas survenir sur `title` / `description`. Pour `caseStudyMarkdownEn` qui reste nullable : `localizeProject` retourne `caseStudyMarkdown: null` en EN, et la page case study (sub-project 06) devra afficher un banner "Traduction à venir" + fallback FR. Pas de log warn runtime en MVP (couverture garantie par le seed).
```

- [ ] **Step 3: Commit clôture**

```bash
git add docs/superpowers/specs/projets/07-i18n-content-bilingue-design.md
git commit -m "docs(specs): sub-project 07 i18n-content-bilingue status=implemented"
```

- [ ] **Step 4: Audit final — `git log` et `git status`**

Run:
```bash
git log --oneline develop..HEAD
git status
```
Expected : 11-12 commits logiquement ordonnés (schema → migration → helpers+tests → types+queries → seed-data → case-studies → seed → components → tests → validation → docs → clôture). `git status` clean.

---

## Validation finale (checklist mentale — à cocher avant de proposer un PR)

- [ ] `pnpm typecheck` → 0 erreur
- [ ] `pnpm lint` → 0 erreur
- [ ] `pnpm test` → tous les tests GREEN (unit helpers + ProjectsList filter + integration queries)
- [ ] `pnpm prisma db seed` → sans warning `missingEnStubs`
- [ ] `/fr/projets` affiche les titres FR, tags FR (ex : "Automatisation"), descriptions FR
- [ ] `/en/projets` affiche les titres EN, tags EN (ex : "Automation"), descriptions EN
- [ ] Aucun composant front ne lit `titleFr`/`titleEn` directement (tous consomment `project.title` résolu)
- [ ] `findManyPublished()` sans argument `locale` → erreur de compilation TypeScript
- [ ] ADR-010 + rules Prisma + rules next-intl mentionnent la convention
- [ ] Spec 06 et plan 06 pointent vers `LocalizedProjectWithRelations`
- [ ] Spec 07 passé en `status: implemented`, question ouverte résolue

---

## Notes

- **Post-merge à faire manuellement par l'utilisateur** (hors scope automatisable) : traduire réellement les 9 fichiers `prisma/seed-data/case-studies/**/<slug>.en.md` (actuellement des copies FR avec marqueur `<!-- TODO: translate to English -->`). Après chaque traduction : re-run `pnpm prisma db seed` pour écraser `caseStudyMarkdownEn` en BDD.
- **Enums Prisma** (`CompanySector`, `CompanyLocation`, `WorkMode`, `ContractStatus`) restent non-localisés après ce sub-project. La map i18n dédiée sera ajoutée dans `messages/{fr,en}.json` au sub-project 06 (page case study) au moment où ces enums seront affichés.
- **Locales supplémentaires au-delà de FR/EN** (post-MVP) : ajouter une colonne `<champ><Locale>` par entité + étendre `localize*` avec un `switch(locale)`. La signature du helper reste identique à l'appelant.
