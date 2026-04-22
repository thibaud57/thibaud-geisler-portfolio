# Seed Prisma — Upsert projets + tags + companies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Peupler `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag` depuis des fichiers TypeScript déclaratifs + des fichiers markdown séparés (case studies), via un script `prisma/seed.ts` idempotent exécutable par `pnpm prisma db seed`. Le plan est **100% automatisable** par subagent-driven-development une fois les prérequis externes (curation pré-plan) satisfaits.

**Architecture:** 3 fichiers TypeScript + 1 dossier markdown scindé en 2 sous-dossiers. `prisma/seed-data/tags.ts` (array `TagInput[]`, sans `displayOrder`). `prisma/seed-data/companies.ts` (array `CompanyInput[]` avec sectors/size/locations multi-enums FR). `prisma/seed-data/projects.ts` (array `ProjectInput[]` avec `formats`, `clientMeta` nested référençant une Company par `companySlug`, `tagSlugs: string[]` **ordonné** — pas de champ `caseStudyMarkdown` inline). `prisma/seed-data/case-studies/client/<slug>.md` + `prisma/seed-data/case-studies/personal/<slug>.md` (deux sous-dossiers miroirs de `ProjectType`, contenu narratif par projet). `prisma/seed.ts` (orchestration : PrismaClient dédié + upsert tags + upsert companies PUIS upsert projets avec synchronisation `ProjectTag` via `tags: { deleteMany: {}, create: tagSlugs.map((slug, index) => ({ displayOrder: index, tag: { connect: { slug } } })) }` + `clientMeta.upsert` nested qui connecte la company via `company: { connect: { slug: ... } }` + résolution `caseStudyMarkdown` via helper `readCaseStudy(slug, type)` qui lit le `.md` correspondant).

**Tech Stack:** Prisma 7 ESM-only, PostgreSQL 18, Node.js 24, TypeScript 6, `tsx` pour exécution directe TS.

**Spec source:** [docs/superpowers/specs/projets/03-seed-projets-design.md](../../specs/projets/03-seed-projets-design.md)

**Prérequis externes :**
1. Sub-project `01-schema-prisma-project` implémenté (schéma Prisma appliqué, client généré dans `src/generated/prisma/client`, table `ProjectTag` présente). `02-client-prisma-queries` peut être indépendant (pas utilisé par le seed).
2. **Curation pré-plan terminée** : les 3 fichiers `prisma/seed-data/tags.ts`, `companies.ts`, `projects.ts` et les fichiers `prisma/seed-data/case-studies/client/*.md` + `case-studies/personal/*.md` doivent être remplis avec le contenu réel AVANT d'exécuter ce plan. Cette curation est une session séparée avec validation manuelle du user, non automatisable par subagent et hors scope de ce plan.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `package.json` | Modify | Ajout `"prisma": { "seed": "tsx prisma/seed.ts" }` + `tsx` en devDependencies |
| `prisma/seed-data/tags.ts` | Create | `TagInput` type (sans `displayOrder`) + `export const tags: TagInput[]` |
| `prisma/seed-data/companies.ts` | Create | `CompanyInput` type + `export const companies: CompanyInput[]` |
| `prisma/seed-data/projects.ts` | Create | `ProjectInput` type (avec `formats` + `clientMeta.companySlug` + `tagSlugs: string[]` ordonné, **sans** `caseStudyMarkdown`) + `export const projects: ProjectInput[]` |
| `prisma/seed-data/case-studies/client/.gitkeep` | Create | Garantit que Git versionne le sous-dossier vide si aucun `.md` CLIENT n'est encore commité |
| `prisma/seed-data/case-studies/personal/.gitkeep` | Create | Garantit que Git versionne le sous-dossier vide si aucun `.md` PERSONAL n'est encore commité |
| `prisma/seed-data/case-studies/client/*.md` | Create (curation pré-plan) | Un fichier par projet `ProjectType.CLIENT` ayant un case study. Peuplé lors de la curation externe, pas par ce plan. |
| `prisma/seed-data/case-studies/personal/*.md` | Create (curation pré-plan) | Un fichier par projet `ProjectType.PERSONAL` ayant un case study. Peuplé lors de la curation externe, pas par ce plan. |
| `prisma/seed.ts` | Create | Orchestration : upsert tags + upsert companies PUIS upsert projets (nested `clientMeta` avec `company.connect`, synchro `ProjectTag` via `deleteMany + create` ordonné, helper `readCaseStudy(slug, type)` pour les `.md`) |
| `Justfile` | Modify | Recette `seed:` dans `[group('db')]` |

---

### Task 1: Prérequis

- [ ] **Step 1: Vérifier que le client Prisma est généré**

Run:
```bash
ls src/generated/prisma/client/index.d.ts
```
Expected : fichier présent. Si absent : `/implement-subproject projets 01` d'abord.

- [ ] **Step 2: Vérifier que la BDD a les tables**

Run:
```bash
docker compose exec postgres psql -U portfolio -d portfolio -c "\dt"
```
Expected : `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag`, `_prisma_migrations` présents (pas de `_ProjectToTag` — on a migré vers `ProjectTag` explicite).

---

### Task 2: Installer `tsx` + configurer `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer `tsx`**

Run:
```bash
pnpm add -D tsx
```
Expected : `tsx` dans devDependencies.

- [ ] **Step 2: Ajouter la clé `prisma.seed`**

Ouvrir `package.json`, ajouter au niveau racine (même niveau que `scripts`) :

```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
```

- [ ] **Step 3: Vérifier que Prisma reconnaît**

Run:
```bash
pnpm prisma db seed --help
```
Expected : output mentionne `tsx prisma/seed.ts`.

---

### Task 3: Créer `prisma/seed-data/tags.ts` (structure + types, tableau initialement vide)

**Files:**
- Create: `prisma/seed-data/tags.ts`

- [ ] **Step 1: Créer le dossier + fichier**

Run:
```bash
mkdir -p prisma/seed-data
```

Créer `prisma/seed-data/tags.ts` avec ce contenu exact :

```typescript
import type { TagKind } from '@/generated/prisma/client'

export type TagInput = {
  slug: string
  name: string
  kind: TagKind
  /**
   * Format `"<lib>:<slug>"` où lib ∈ { 'simple-icons', 'lucide' }.
   * Ex techno : 'simple-icons:react' | 'simple-icons:postgresql'
   * Ex expertise : 'lucide:spider' | 'lucide:ghost'
   * null = fallback texte seul dans le badge UI.
   * Validation du format runtime via Zod dans `prisma/seed.ts`.
   */
  icon: string | null
  // pas de displayOrder : l'ordre d'affichage des tags est par-projet via
  // `ProjectTag.displayOrder`, lui-même dérivé de l'index du slug dans
  // `ProjectInput.tagSlugs[]`. Cf. spec 01 + spec 03.
}

/**
 * Référentiel unifié des tags affichés sur le portfolio (technos + infra + outils + expertises).
 * Source : curation pré-plan (cf. section "Prérequis externes").
 *
 * icon (format `"<lib>:<slug>"`) :
 * - Technos / infra / outils : `simple-icons:<slug>` depuis https://simpleicons.org
 *   (ex: React → 'simple-icons:react', PostgreSQL → 'simple-icons:postgresql')
 * - Expertises : `lucide:<slug>` depuis https://lucide.dev/icons
 *   (ex: Scraping → 'lucide:spider', Anonymisation → 'lucide:ghost')
 *
 * Ordre d'affichage : PAS de champ `displayOrder` ici. L'ordre des tags **par-projet**
 * est défini par la position du slug dans `ProjectInput.tagSlugs[]` (premier slug = premier
 * affiché sur la card, displayOrder 0). Cf. `prisma/seed-data/projects.ts`.
 *
 * Il doit être non-vide AVANT d'exécuter le plan 03 (cf. section "Prérequis externes").
 * Exemples d'entrées valides :
 *   { slug: 'scraping', name: 'Scraping', kind: 'EXPERTISE', icon: 'lucide:spider' }
 *   { slug: 'react', name: 'React', kind: 'FRAMEWORK', icon: 'simple-icons:react' }
 */
export const tags: TagInput[] = []
```

- [ ] **Step 2: Vérifier la compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur (même avec tableau vide — TypeScript accepte `TagInput[]`).

---

### Task 4: Créer `prisma/seed-data/companies.ts` (tableau initialement vide)

**Files:**
- Create: `prisma/seed-data/companies.ts`

- [ ] **Step 1: Créer le fichier**

Créer `prisma/seed-data/companies.ts` avec ce contenu exact :

```typescript
import type {
  CompanyLocation,
  CompanySector,
  CompanySize,
} from '@/generated/prisma/client'

export type CompanyInput = {
  slug: string
  name: string
  /**
   * Nom de fichier du logo (placé manuellement dans `/assets/` comme les covers projets).
   * null si pas de logo disponible → le badge UI affiche le nom seul.
   */
  logoFilename: string | null
  websiteUrl: string | null
  sectors: CompanySector[]
  size: CompanySize | null
  locations: CompanyLocation[]
}

/**
 * Référentiel des entreprises clientes (réutilisables entre plusieurs projets).
 * Source : curation pré-plan.
 *
 * Le tableau est initialisé vide ici. Les entrées réelles sont peuplées lors de la
 * curation externe. Exemple d'entrée valide :
 *   {
 *     slug: 'foyer',
 *     name: 'Foyer Group',
 *     logoFilename: 'foyer-logo.png',
 *     websiteUrl: 'https://www.foyer.lu',
 *     sectors: ['ASSURANCE'],
 *     size: 'ETI',
 *     locations: ['LUXEMBOURG'],
 *   }
 */
export const companies: CompanyInput[] = []
```

- [ ] **Step 2: Vérifier la compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 5: Créer `prisma/seed-data/projects.ts`

**Files:**
- Create: `prisma/seed-data/projects.ts`

- [ ] **Step 1: Créer le fichier**

Créer `prisma/seed-data/projects.ts` avec ce contenu exact :

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
  title: string
  description: string
  type: ProjectType
  status: ProjectStatus
  /**
   * Type(s) technique(s) du projet : API / Web App / App Mobile / Desktop App / CLI / IA.
   * Multi-valeurs (un projet peut être "Web App + API"). Badge outline sans icône sur l'UI.
   */
  formats: ProjectFormat[]
  startedAt: Date | null
  endedAt: Date | null
  githubUrl: string | null
  demoUrl: string | null
  coverFilename: string | null
  /**
   * Ordre d'affichage du projet sur la page liste /projets (tri ASC, 0 en premier).
   * Ne concerne PAS l'ordre des tags du projet (cf. `tagSlugs` ci-dessous).
   */
  displayOrder: number
  /**
   * Liste ORDONNÉE des slugs de tags à lier au projet. Chaque slug doit exister dans `tags.ts`.
   * L'index du slug dans le tableau = `ProjectTag.displayOrder` créé en BDD par le seed :
   *   tagSlugs[0] → ProjectTag { displayOrder: 0 } (premier tag affiché sur la card)
   *   tagSlugs[1] → ProjectTag { displayOrder: 1 }
   *   etc.
   * Donne aux tags phares les premières positions. Un même tag peut avoir un ordre différent
   * selon le projet (c'est l'intérêt de la table de jointure explicite `ProjectTag`).
   */
  tagSlugs: string[]
  /**
   * Méta-données CLIENT uniquement. null pour les projets PERSONAL.
   * `companySlug` référence une entrée de `companies.ts` (required si clientMeta non-null).
   * `workMode` required (PRESENTIEL / HYBRIDE / REMOTE).
   */
  clientMeta: {
    companySlug: string
    teamSize: number | null
    contractStatus: ContractStatus | null
    workMode: WorkMode
  } | null
  // pas de champ `caseStudyMarkdown` : le contenu est résolu au seed depuis
  // `./case-studies/client/<slug>.md` (type CLIENT) ou `./case-studies/personal/<slug>.md`
  // (type PERSONAL) via helper `readCaseStudy(slug, type)` dans `prisma/seed.ts`.
}

/**
 * Projets affichés sur le portfolio.
 * Source : curation pré-plan.
 *
 * displayOrder : numérotation simple de 0 à N (tri ASC, 0 en premier sur la page liste).
 *
 * tagSlugs : tableau ORDONNÉ. Le premier slug apparaîtra en premier sur la card (3 max visibles).
 * Les expertises (kind=EXPERTISE) représentant la valeur métier gagnent souvent à être en tête.
 *
 * Il doit être non-vide AVANT d'exécuter le plan 03 (cf. section "Prérequis externes").
 * Exemple d'entrée valide :
 *   {
 *     slug: 'digiclaims',
 *     title: 'Digiclaims - Gestion Sinistres',
 *     description: 'Webapp Scala/Angular de gestion des dossiers sinistres pour Foyer.',
 *     type: 'CLIENT',
 *     status: 'PUBLISHED',
 *     formats: ['WEB_APP', 'API'],
 *     startedAt: new Date('2022-04-01'),
 *     endedAt: new Date('2025-10-16'),
 *     githubUrl: null,
 *     demoUrl: null,
 *     coverFilename: 'digiclaims-cover.png',
 *     displayOrder: 0,
 *     tagSlugs: ['scala', 'angular', 'kafka', 'mongodb', 'docker'],
 *     clientMeta: {
 *       companySlug: 'foyer',
 *       teamSize: 6,
 *       contractStatus: 'CDI',
 *       workMode: 'HYBRIDE',
 *     },
 *   }
 * Le case study narratif du projet ci-dessus serait lu depuis
 * `prisma/seed-data/case-studies/client/digiclaims.md` (car type='CLIENT').
 */
export const projects: ProjectInput[] = []
```

- [ ] **Step 2: Vérifier la compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 5bis: Créer le dossier `prisma/seed-data/case-studies/` avec ses 2 sous-dossiers

Justification : les case studies sont stockées dans des fichiers `.md` séparés (1 fichier par projet), rangés dans 2 sous-dossiers `client/` et `personal/` miroirs de `ProjectType`. Les fichiers `.md` eux-mêmes sont peuplés **hors de ce plan** lors de la curation pré-plan (cf. section "Prérequis externes"). Ce plan se contente de créer les dossiers + des `.gitkeep` pour que Git les versionne même vides (le temps que les `.md` arrivent).

**Files:**
- Create: `prisma/seed-data/case-studies/client/.gitkeep` (fichier vide)
- Create: `prisma/seed-data/case-studies/personal/.gitkeep` (fichier vide)

- [ ] **Step 1: Créer les deux sous-dossiers + `.gitkeep`**

Run:
```bash
mkdir -p prisma/seed-data/case-studies/client prisma/seed-data/case-studies/personal
touch prisma/seed-data/case-studies/client/.gitkeep prisma/seed-data/case-studies/personal/.gitkeep
```

- [ ] **Step 2: Vérifier la structure**

Run:
```bash
ls -la prisma/seed-data/case-studies/
ls -la prisma/seed-data/case-studies/client/
ls -la prisma/seed-data/case-studies/personal/
```
Expected : les 2 sous-dossiers `client/` et `personal/` existent et contiennent chacun un fichier `.gitkeep` (taille 0).

- [ ] **Step 3: Confirmer que `.gitkeep` est tracké**

Run:
```bash
git status prisma/seed-data/case-studies/ 2>&1 | head -5
```
Expected : les 2 fichiers `.gitkeep` apparaissent en untracked (ou tracked après add). Si aucun apparait, vérifier qu'aucune règle `.gitignore` n'exclut `*.gitkeep` ou le dossier.

---

Cette task ne modifie aucun fichier. Elle **vérifie** que les prérequis externes (curation pré-plan avec validation user) sont satisfaits AVANT d'exécuter le reste du plan. Si les fichiers sont vides, l'implémenteur (subagent) doit s'arrêter et signaler que la session de curation doit être menée séparément.

**Rappel, ce qui doit être fait hors de ce plan** : les 3 fichiers `prisma/seed-data/tags.ts`, `companies.ts`, `projects.ts` doivent être remplis avec le contenu réel (tags, entreprises, projets avec `tagSlugs[]` ordonnés). Les fichiers `prisma/seed-data/case-studies/client/<slug>.md` et `case-studies/personal/<slug>.md` doivent exister pour chaque projet PUBLISHED ayant un case study à publier. Cette curation est une session interactive séparée, pas une task de ce plan.

**Files:** (lecture seule)

- [ ] **Step 1: Vérifier que `tags.ts` est non-vide**

Run:
```bash
grep -c "^\s*{" prisma/seed-data/tags.ts
```
Expected : un nombre > 0 (au moins 1 entrée `TagInput`).

Si 0 : **STOP**. La curation pré-plan n'a pas été menée. Signaler à l'utilisateur que les fichiers seed-data doivent être remplis via une session de curation séparée avant de poursuivre le plan 03.

- [ ] **Step 2: Vérifier que `companies.ts` est non-vide**

Run:
```bash
grep -c "^\s*{" prisma/seed-data/companies.ts
```
Expected : un nombre > 0.

Si 0 : **STOP** (même raison que Step 1).

- [ ] **Step 3: Vérifier que `projects.ts` est non-vide**

Run:
```bash
grep -c "^\s*{" prisma/seed-data/projects.ts
```
Expected : un nombre > 0.

Si 0 : **STOP**.

- [ ] **Step 4: Vérifier qu'il y a au moins 1 fichier `.md` dans les sous-dossiers case-studies (optionnel mais recommandé)**

Run:
```bash
ls prisma/seed-data/case-studies/client/*.md prisma/seed-data/case-studies/personal/*.md 2>/dev/null | wc -l
```
Expected : au moins 1 fichier `.md` (hors `.gitkeep`). Un 0 n'est pas bloquant (le seed accepte `caseStudyMarkdown = null`), mais suggère que la curation est encore incomplète — poursuivre avec prudence.

- [ ] **Step 5: Vérifier la cohérence `tagSlugs[]` ↔ `tags.ts`**

Run :
```bash
pnpm typecheck
```
Expected : 0 erreur. Si erreur "Type '\"xxxx\"' is not assignable to type 'TagKind|ProjectFormat|CompanySize|etc.'" : la curation a introduit une valeur hors-enum, signaler au user pour correction.

Si typecheck passe mais qu'un `tagSlugs[]` référence un slug absent de `tags.ts`, l'erreur sera levée au runtime du seed (Task 9 step 2) sous forme de contrainte FK `ProjectTag.tagId`. Documentation Step 2 de Task 9 couvre ce cas.

---

### Task 7: Créer `prisma/seed.ts` (orchestration)

Règles : [.claude/rules/prisma/client-setup.md](../../../../.claude/rules/prisma/client-setup.md), [.claude/rules/prisma/schema-migrations.md](../../../../.claude/rules/prisma/schema-migrations.md).

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Créer le script**

Créer `prisma/seed.ts` avec ce contenu exact :

```typescript
import 'dotenv/config'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { PrismaClient, type ProjectType } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { tags } from './seed-data/tags.js'
import { companies } from './seed-data/companies.js'
import { projects } from './seed-data/projects.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Validation du format `icon` : "<lib>:<slug>" avec lib ∈ { simple-icons, lucide }
// (ou null). Garantit que le composant TagBadge trouve toujours une paire parseable.
const IconSchema = z
  .string()
  .regex(
    /^(simple-icons|lucide):[a-z0-9-]+$/,
    'icon must match "simple-icons:<slug>" or "lucide:<slug>" (lowercase, hyphens allowed)',
  )
  .nullable()

/**
 * Résout le case study markdown d'un projet depuis le dossier `seed-data/case-studies/`.
 * Routage par type : CLIENT → sous-dossier `client/`, PERSONAL → sous-dossier `personal/`.
 * Retourne `null` si le fichier `<slug>.md` n'existe pas (la page case study affichera
 * les autres sections sans bloc markdown).
 */
function readCaseStudy(slug: string, type: ProjectType): string | null {
  const folder = type === 'CLIENT' ? 'client' : 'personal'
  const path = join(__dirname, 'seed-data', 'case-studies', folder, `${slug}.md`)
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    console.log(
      `→ Seed démarré. ${tags.length} tags, ${companies.length} companies, ${projects.length} projets.`,
    )

    // 1. Upsert tags (doit passer avant les projets qui les référencent).
    //    Validation Zod du format `icon` pour chaque tag avant upsert.
    //    Plus de champ `displayOrder` sur Tag : l'ordre est par-projet via ProjectTag.
    let nbExpertises = 0
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
          name: t.name,
          kind: t.kind,
          icon: iconParse.data,
        },
        update: {
          name: t.name,
          kind: t.kind,
          icon: iconParse.data,
        },
      })

      if (t.kind === 'EXPERTISE') nbExpertises++
    }
    console.log(`✔ ${tags.length} tags upsertés (dont ${nbExpertises} expertises)`)

    // 2. Upsert companies (doit passer avant les projets CLIENT qui les référencent via ClientMeta).
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

    // 3. Upsert projets avec caseStudyMarkdown résolu depuis les .md, clientMeta nested
    //    (connect company par slug), et synchro ProjectTag ordonné (deleteMany + create).
    let nbClients = 0
    let nbPerso = 0
    for (const p of projects) {
      // Case study résolu depuis le fichier .md approprié au type (client/ ou personal/).
      const caseStudyMarkdown = readCaseStudy(p.slug, p.type)

      // ClientMeta data si projet CLIENT (inclut la connexion Company via companySlug)
      const clientMetaData = p.clientMeta
        ? {
            teamSize: p.clientMeta.teamSize,
            contractStatus: p.clientMeta.contractStatus,
            workMode: p.clientMeta.workMode,
            company: { connect: { slug: p.clientMeta.companySlug } },
          }
        : undefined

      const clientMetaUpsert = clientMetaData
        ? { upsert: { create: clientMetaData, update: clientMetaData } }
        : undefined

      // Rows ProjectTag à créer avec displayOrder = index dans tagSlugs[] (0 en premier).
      // L'ordre du tableau est la source de vérité : premier slug → ProjectTag.displayOrder=0.
      const projectTagCreate = p.tagSlugs.map((slug, index) => ({
        displayOrder: index,
        tag: { connect: { slug } },
      }))

      await prisma.project.upsert({
        where: { slug: p.slug },
        create: {
          slug: p.slug,
          title: p.title,
          description: p.description,
          type: p.type,
          status: p.status,
          formats: p.formats,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          githubUrl: p.githubUrl,
          demoUrl: p.demoUrl,
          coverFilename: p.coverFilename,
          caseStudyMarkdown,
          displayOrder: p.displayOrder,
          tags: { create: projectTagCreate },
          clientMeta: clientMetaData ? { create: clientMetaData } : undefined,
        },
        update: {
          title: p.title,
          description: p.description,
          type: p.type,
          status: p.status,
          formats: p.formats,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          githubUrl: p.githubUrl,
          demoUrl: p.demoUrl,
          coverFilename: p.coverFilename,
          caseStudyMarkdown,
          displayOrder: p.displayOrder,
          // deleteMany + create garantit que l'ordre final en BDD correspond toujours
          // à l'ordre du tableau TS, même si le user retire / réordonne des tags.
          tags: { deleteMany: {}, create: projectTagCreate },
          clientMeta: clientMetaUpsert,
        },
      })

      if (p.type === 'CLIENT') nbClients++
      else nbPerso++
    }

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

- [ ] **Step 2: Vérifier la compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur. Note : imports avec `./seed-data/tags.js`, `./seed-data/companies.js`, `./seed-data/projects.js` (extension `.js` obligatoire en ESM Node.js).

---

### Task 8: Ajouter recette `just seed`

**Files:**
- Modify: `Justfile`

- [ ] **Step 1: Ajouter la recette**

Ouvrir `Justfile`, trouver la section `# ─── Database ──` (ligne ~63), ajouter à la fin du groupe `db` (après la recette `db:`) :

```
[group('db')]
seed:
    pnpm prisma db seed
```

- [ ] **Step 2: Vérifier**

Run:
```bash
just --list
```
Expected : recette `seed` apparaît dans le groupe `db`.

---

### Task 9: Exécution + vérification idempotence

- [ ] **Step 1: Vérifier que les fichiers seed-data sont remplis**

Run:
```bash
grep -c "slug:" prisma/seed-data/tags.ts
grep -c "slug:" prisma/seed-data/projects.ts
grep -c "slug:" prisma/seed-data/companies.ts
```
Expected : > 0 pour les 3 fichiers. Si 0, retour Task 6 (prérequis externe non satisfait — la curation pré-plan doit être menée).

- [ ] **Step 2: Première exécution**

Run:
```bash
just seed
```
Expected :
```
→ Seed démarré. N tags, M projets.
✔ N tags upsertées
✔ M projets upsertés (X CLIENT + Y PERSONAL)
→ Seed terminé avec succès.
```

Si erreur `Foreign key` sur `tags.connect` → un `slug` dans `tagSlugs` n'existe pas dans `tags.ts`. Ajouter le tag manquant (techno ou expertise).
Si erreur `Tag "<slug>" has an invalid icon "<value>"` → le champ `icon` ne respecte pas le format `<lib>:<slug>`. Corriger la valeur dans `tags.ts` (ex: `'react'` → `'simple-icons:react'`, ou `null` si pas d'icône).

- [ ] **Step 3: Vérifier via Prisma Studio**

Run:
```bash
just db-studio &
```
Ouvrir http://localhost:5555 dans le navigateur et vérifier :
- `Project` : N rows (y compris `caseStudyMarkdown` non-null pour les projets ayant un `.md` dans `case-studies/<type>/`).
- `Tag` : M rows (pas de colonne `displayOrder`).
- `Company` : K rows.
- `ClientMeta` : Y rows (1 par CLIENT).
- `ProjectTag` : liaisons visibles (1 row par `(projectId, tagId)`), avec `displayOrder` croissant dans l'ordre `tagSlugs[]` de chaque projet.

Arrêter :
```bash
just stop 2>/dev/null || true
```

- [ ] **Step 4: Deuxième exécution (idempotence)**

Run:
```bash
just seed
```
Expected : mêmes compteurs, pas d'erreur.

- [ ] **Step 5: Compter les rows**

Run:
```bash
docker compose exec postgres psql -U portfolio -d portfolio -c "SELECT COUNT(*) AS projects FROM \"Project\"; SELECT COUNT(*) AS tags FROM \"Tag\"; SELECT COUNT(*) AS companies FROM \"Company\"; SELECT COUNT(*) AS client_meta FROM \"ClientMeta\"; SELECT COUNT(*) AS project_tags FROM \"ProjectTag\";"
```
Expected : compteurs identiques à Step 2. Pas de doublement.

- [ ] **Step 6: Tester `findManyPublished` (end-to-end avec sub-project 02)**

Run:
```bash
pnpm tsx -e "import { findManyPublished } from '@/server/queries/projects'; const r = await findManyPublished(); console.log('PUBLISHED:', r.length); console.log(r.slice(0, 3).map(p => ({ slug: p.slug, type: p.type, tags: p.tags.length, hasClientMeta: !!p.clientMeta })));"
```
Expected : affiche les projets PUBLISHED avec leurs compteurs. Devrait matcher le nombre de rows `status='PUBLISHED'` en BDD.

---

### Task 10: Qualité + commit

- [ ] **Step 1: Lint**

Run:
```bash
just lint
```
Expected : 0 erreur.

- [ ] **Step 2: Typecheck**

Run:
```bash
just typecheck
```
Expected : 0 erreur.

- [ ] **Step 3: Commit**

Run:
```bash
git add package.json pnpm-lock.yaml Justfile prisma/seed.ts prisma/seed-data/
git commit -m "$(cat <<'EOF'
feat(projets): seed Prisma idempotent depuis fichiers TS + case studies .md séparés

- prisma/seed-data/tags.ts : référentiel TagInput[] unifié (technos + expertises) avec kind/icon (pas de displayOrder global)
- prisma/seed-data/companies.ts : référentiel CompanyInput[] (K entreprises avec sectors/size/locations multi-enums FR)
- prisma/seed-data/projects.ts : projets ProjectInput[] avec formats + clientMeta.companySlug + workMode + tagSlugs[] ordonné (sans caseStudyMarkdown inline)
- prisma/seed-data/case-studies/client/ + personal/ : dossiers (+.gitkeep) pour les .md de case studies par type
- prisma/seed.ts : orchestration upsert tags + companies + projets avec validation Zod du format icon, synchro ProjectTag ordonné (deleteMany + create, displayOrder = index dans tagSlugs), helper readCaseStudy(slug, type) pour résoudre les .md, clientMeta nested (company.connect par slug)
- package.json : clé prisma.seed + tsx en devDep
- Justfile : recette just seed

Contenu rempli via session de curation pré-plan (validation user).

Spec: docs/superpowers/specs/projets/03-seed-projets-design.md
EOF
)"
```

- [ ] **Step 4: Vérifier le commit**

Run:
```bash
git log -1 --stat
```
Expected : 1 commit récent listant les fichiers attendus.

---

## Self-Review

**1. Spec coverage** :
- ✅ `Scope` (seed.ts + tags.ts + companies.ts + projects.ts + case-studies/<type>/*.md) → Tasks 3, 4, 5, 5bis, 7
- ✅ `État livré` (2 runs consécutifs = même état, 5 tables dont `ProjectTag` explicite) → Task 9 steps 4-5
- ✅ `Dependencies` 01 → Task 1 (prérequis)
- ✅ `Files touched` tous mappés : `prisma/seed.ts` (T7), `prisma/seed-data/tags.ts` (T3), `prisma/seed-data/companies.ts` (T4), `prisma/seed-data/projects.ts` (T5), `case-studies/client/.gitkeep` + `personal/.gitkeep` (T5bis), `package.json` (T2), `Justfile` (T8). Les fichiers `.md` eux-mêmes sont hors scope (prérequis externe T6).
- ✅ `Architecture approach` (upsert par slug tags + companies AVANT projects, clientMeta.company connect par slug, synchro ProjectTag ordonnée via deleteMany+create, helper readCaseStudy(slug, type), PrismaClient dédié pas singleton) → T7 step 1 applique tous
- ✅ `Acceptance criteria` :
  - Scénario 1 (première exécution avec données, tables peuplées) → T9 steps 2-3
  - Scénario 2 (idempotence incluant displayOrder sur ProjectTag) → T9 steps 4-5
  - Scénario 3 (update champ) → implicite via pattern `upsert`, pas de task dédiée
  - Scénario 4 (ajout projet) → implicite
  - Scénario 5 (ARCHIVED pas retourné) → T9 step 6 valide via findManyPublished
  - Scénario 6 (tag inconnu → erreur foreign key sur `ProjectTag.tagId`) → T7 step 2 + documentation dans T9 fallback erreur
  - Scénario 7 (format icon invalide → Zod throw) → T7 step 1 (validation Zod IconSchema avant upsert)
  - Scénario 8 (companySlug inconnu → erreur FK) → T7 upsert company AVANT project garantit l'ordre, sinon Prisma rejette
  - Scénario 9 (Company réutilisée) → T7 logique companies d'abord garantit l'unicité ; plusieurs clientMetas peuvent connecter le même companySlug
  - Scénario 10 (ordre tags par-projet via `tagSlugs[]`) → T7 projectTagCreate mappe l'index sur `ProjectTag.displayOrder`
  - Scénario 11 (ré-ordonnancement via édition `tagSlugs[]`) → T7 `tags: { deleteMany: {}, create: ... }` garantit la re-création complète à chaque re-seed
  - Scénario 12 (case study `.md` manquant) → helper `readCaseStudy` retourne `null` via `existsSync`
  - Scénario 13-14 (case study `.md` présent dans `client/` ou `personal/`) → routage par `project.type` dans le helper
- ✅ `Edge cases` : fichiers vides (T3/T4/T5 acceptent tableau vide), projet PERSO sans clientMeta (T7 conditionnel), coverFilename/logoFilename null (T4/T5 acceptés), slug collision (erreur Prisma unique), tag sans icon (T7 `IconSchema.nullable()`), tag dupliqué dans `tagSlugs` (PK composite rejette), `.md` manquant → null
- ✅ `Architectural decisions` : fichiers TS en dur (pas snapshot), 3 fichiers TS éclatés + dossier `case-studies/` en 2 sous-dossiers, synchro `ProjectTag` via deleteMany+create ordonné (remplace l'ancien `tags.set`), validation Zod ciblée sur `icon`, curation `caseStudyMarkdown` désormais hors scope du plan (prérequis externe T6) — tous reflétés dans T3/T4/T5/T5bis/T6/T7
- ✅ `tdd_scope = none` → pas de section Tests dans le plan, correctement omise

**2. Placeholder scan** : aucun TBD/TODO. T3, T4, T5 créent les fichiers avec des tableaux initialement vides (pas de commentaire `// À remplir` inline). T5bis crée les dossiers case-studies + `.gitkeep`. T6 ne modifie rien — elle vérifie uniquement que la curation pré-plan est terminée (prérequis externe). Les `.md` eux-mêmes ne font pas partie du plan (ils arrivent via la session de curation séparée).

**3. Type consistency** :
- `TagInput` défini T3 (sans `displayOrder`), importé T7 via `tags.js`
- `CompanyInput` défini T4, importé T7 via `companies.js`
- `ProjectInput` défini T5 (sans `caseStudyMarkdown`, avec `tagSlugs: string[]` ordonné), importé T7 via `projects.js`
- `ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `CompanySize`, `CompanySector`, `CompanyLocation` : imports depuis `@/generated/prisma/client`, cohérent entre T3, T4, T5, T7
- `projectTagCreate` dans T7 : `{ displayOrder: index, tag: { connect: { slug } } }` correspond au shape Prisma de `ProjectTag` (PK composite `(projectId, tagId)`, `displayOrder Int`)
- `readCaseStudy(slug: string, type: ProjectType)` : signature stable, importée dans T7 seul
- `clientMeta.company.connect` avec `{ slug }` référence type cohérent avec `Company.slug` unique du schéma 01
- `ClientMeta.workMode` required (pas null, pas undefined) garantit que le seed échoue si manquant

---

## Prochaine étape

Après exécution de ce plan : passer au sub-project suivant `04-route-api-assets` (indépendant, déjà spec'é). Pour lancer l'implémentation : `/implement-subproject projets 03`.
