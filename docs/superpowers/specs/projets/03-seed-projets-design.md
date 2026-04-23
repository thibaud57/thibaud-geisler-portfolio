---
feature: "Feature 2 — Projets (liste + case studies)"
subproject: "seed-projets"
goal: "Peupler les tables Project, ClientMeta, Company, Tag et ProjectTag via un script prisma/seed.ts idempotent alimenté par des fichiers TypeScript déclaratifs"
status: "implemented"
complexity: "M"
tdd_scope: "none"
depends_on: ["01-schema-prisma-project-design.md"]
date: "2026-04-22"
---

# Seed Prisma — Upsert projets + tags + companies depuis fichiers TS

## Scope

Créer le script `prisma/seed.ts` (orchestration) qui lit trois fichiers TypeScript déclaratifs (`prisma/seed-data/tags.ts`, `companies.ts`, `projects.ts`) plus un dossier `prisma/seed-data/case-studies/` scindé en deux sous-dossiers `client/` et `personal/` (miroir de l'enum `ProjectType`) contenant chacun un fichier `.md` par projet ayant un case study. `tags.ts` : référentiel unifié avec `slug`, `name`, `kind` dont `EXPERTISE`, `icon` au format `"<lib>:<slug>"` (plus de champ `displayOrder` global). `companies.ts` : référentiel entreprises avec `slug`, `name`, `logoFilename`, `websiteUrl`, `sectors[]`, `size`, `locations[]`. `projects.ts` : projets à seeder avec leurs champs Prisma scalaires + `formats[]` + `clientMeta` imbriqué référençant une Company par `companySlug` + `tagSlugs: string[]` (**tableau ordonné** qui pilote le `ProjectTag.displayOrder` par-projet via l'index). `case-studies/<type>/<slug>.md` : contenu markdown narratif par projet (type = `client` pour `ProjectType.CLIENT`, `personal` pour `ProjectType.PERSONAL`), lu via `readFileSync` au seed selon le `project.type`. Upsert les trois via `prisma.tag.upsert`, `prisma.company.upsert`, `prisma.project.upsert` (idempotents par `slug`). Les liaisons `ProjectTag` sont synchronisées par-projet via `tags: { deleteMany: {}, create: tagSlugs.map((slug, index) => ({ displayOrder: index, tag: { connect: { slug } } })) }` pour garantir l'idempotence de l'ordre à chaque re-seed. Ordre critique : tags + companies **AVANT** projects (FK required sur `ClientMeta.companyId` et sur `ProjectTag.tagId`). Configurer `package.json` (clé `"prisma": { "seed": "tsx prisma/seed.ts" }` + `tsx` en devDependencies si absent), ajouter une recette `just seed` dans le `Justfile`. **Le contenu concret** (noms de projets, entreprises, dates, tags, expertises, formats, fichiers `.md` des case studies) **est rempli via une session de curation séparée** avec validation user, c'est un **prérequis externe** au plan d'implémentation (voir section "Prérequis externe" ci-dessous). Le spec ne définit que la **structure** et le **processus**. **Exclus** : connexion live à Notion au runtime (jamais), snapshot JSON intermédiaire, mapping Notion → Prisma automatique sans curation, assets binaires (sub-project 04 + upload manuel), rendu markdown (sub-project 06), session de curation interactive (sortie du scope du plan 03).

### État livré

À la fin de ce sub-project, on peut : exécuter `pnpm prisma db seed` (ou `just seed`) sur une BDD `portfolio_dev` déjà migrée, et voir dans Prisma Studio les N projets (avec `caseStudyMarkdown` rempli depuis les fichiers `.md`), M tags (mélange technos + expertises), K companies et les rows `ProjectTag` avec `displayOrder` cohérent avec l'index du tag dans le `tagSlugs[]` du projet. Ré-exécuter la commande laisse l'état BDD inchangé (idempotence par `slug` + synchronisation complète des liaisons `ProjectTag`), ou met à jour les champs si le contenu des fichiers TS/MD a été modifié entre temps.

## Prérequis externe (hors scope du plan 03)

Avant d'exécuter le plan `03-seed-projets`, une session de curation séparée doit avoir rempli :
1. `prisma/seed-data/tags.ts` : référentiel unifié complet
2. `prisma/seed-data/companies.ts` : entreprises clientes
3. `prisma/seed-data/projects.ts` : projets avec `tagSlugs[]` ordonnés
4. `prisma/seed-data/case-studies/client/<slug>.md` (pour les projets `ProjectType.CLIENT`) et/ou `prisma/seed-data/case-studies/personal/<slug>.md` (pour les `ProjectType.PERSONAL`) : un fichier par projet ayant un case study à publier

La curation est conduite en session dédiée avec validation manuelle du user (source externe : fiches projets/entreprises, fichiers textes prêts à être commités). Une fois les 4 prérequis satisfaits, le plan 03 est **100% automatisable** par subagent-driven-development (aucune interaction user requise en cours d'exécution).

## Dependencies

- `01-schema-prisma-project-design.md` (statut: draft) — seed dépend des 5 modèles `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag` (table de jointure explicite portant `displayOrder` par-projet) et des 10 enums (`ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `CompanySize`, `CompanySector`, `CompanyLocation`)

## Files touched

- **À créer** : `prisma/seed.ts` (orchestration : upsert tags + companies puis projects avec clientMeta nested + synchronisation ProjectTag ordonné + lecture des fichiers `.md` via `readFileSync` en routant selon `project.type`)
- **À créer** : `prisma/seed-data/tags.ts` (array constant `TagInput[]` typé, couvre technos + infra + outils + expertises métier via `kind`, pas de champ `displayOrder` — l'ordre est par-projet via `tagSlugs[]`)
- **À créer** : `prisma/seed-data/companies.ts` (array constant `CompanyInput[]` typé, entreprises clientes avec logo/website/sectors/size/locations)
- **À créer** : `prisma/seed-data/projects.ts` (array constant `ProjectInput[]` typé, avec `formats`, `clientMeta` imbriqué référençant une Company par `companySlug`, `tagSlugs: string[]` **ordonné** — pas de champ `caseStudyMarkdown` inline, résolu au seed depuis `./case-studies/<type>/<slug>.md`)
- **À créer** : `prisma/seed-data/case-studies/client/` + `prisma/seed-data/case-studies/personal/` (deux sous-dossiers miroirs de `ProjectType`, contenant chacun un fichier `<slug>.md` par projet ayant un case study à publier ; fichiers peuplés lors de la curation pré-plan)
- **À modifier** : `package.json` (ajout clé `"prisma": { "seed": "tsx prisma/seed.ts" }` ; `tsx` en devDependencies si absent)
- **À modifier** : `Justfile` (ajout recette `seed:` sous `[group('db')]` qui exécute `pnpm prisma db seed`)

## Architecture approach

### Orchestration `prisma/seed.ts`

- **Import Prisma v7** : `import { PrismaClient } from '@/generated/prisma/client'` + `PrismaPg` adapter + `import 'dotenv/config'`. Client dédié au script (pas le singleton `src/lib/prisma.ts` qui dépend de `'server-only'`). Conforme à [.claude/rules/prisma/client-setup.md](../../../../.claude/rules/prisma/client-setup.md).
- **Validation du format `icon`** : avant chaque upsert Tag, chaque entrée passe par un schéma Zod `TagInputSchema` qui valide `icon` au format `"<lib>:<slug>"` (regex `/^(simple-icons|lucide):[a-z0-9-]+$/` ou `null`). Motivation : garantir que le composant `TagBadge` (sub-project 05) trouve toujours une paire lib/slug parseable, attraper tôt les typos manuelles. Conforme à [.claude/rules/zod/validation.md](../../../../.claude/rules/zod/validation.md).
- **Ordre d'exécution** : (1) import `tags` depuis `prisma/seed-data/tags.ts`, validation Zod du format `icon`, upsert par `slug`. (2) import `companies` depuis `prisma/seed-data/companies.ts`, upsert par `slug`. (3) import `projects` depuis `prisma/seed-data/projects.ts`, pour chaque projet : upsert `Project` par `slug` avec `caseStudyMarkdown` résolu via `readCaseStudy(project.slug, project.type)` (helper qui lit `./case-studies/client/<slug>.md` si `type === 'CLIENT'` ou `./case-studies/personal/<slug>.md` si `type === 'PERSONAL'`, via `readFileSync` si le fichier existe, sinon `null`) + nested `clientMeta.upsert` si le projet a un `clientMeta` + synchronisation des liaisons `ProjectTag` via `tags: { deleteMany: {}, create: tagSlugs.map((slug, index) => ({ displayOrder: index, tag: { connect: { slug } } })) }`. L'usage de `deleteMany: {}` + `create` garantit que l'ordre final en BDD correspond toujours à l'ordre du tableau TS, même si le user retire / réordonne des tags entre deux re-seeds.
- **Idempotence** : `upsert` sur `slug` pour Tag, Company, Project, ClientMeta. Re-exécution = même état final. Les tags absents des fichiers TS ne sont PAS supprimés (retrait manuel si besoin), cohérent avec la décision "pas de DELETE automatique". En revanche, les liaisons `ProjectTag` d'un projet sont entièrement re-créées à chaque seed pour refléter exactement le contenu de `tagSlugs[]` (cf. décision "tags.set-like via deleteMany + create").
- **Logs minimaux** : `console.log` des compteurs (`✔ N tags upsertés (dont X expertises)`, `✔ M projets upsertés (X CLIENT + Y PERSONAL)`). Pas d'instrumentation Pino (script dev, pas runtime).
- **Déconnexion propre** : `prisma.$disconnect()` dans un `finally`. Exit code 0 succès, 1 erreur.
- **Conforme** à [.claude/rules/prisma/schema-migrations.md](../../../../.claude/rules/prisma/schema-migrations.md) ("Exécuter `pnpm prisma db seed` explicitement : le seeding automatique est supprimé en v7").

### Fichier `prisma/seed-data/tags.ts`

Array constant TypeScript typé. Chaque entrée est un `TagInput` avec `slug` (kebab-case), `name` (label affiché), `kind` (enum `TagKind` importé de `@/generated/prisma/client`, une des 6 valeurs dont `EXPERTISE`), `icon` (string ou null, format `"<lib>:<slug>"` avec `lib ∈ { simple-icons, lucide }`). **Plus de champ `displayOrder`** : l'ordre d'affichage des tags est piloté par-projet via `ProjectTag.displayOrder`, lui-même dérivé de l'index du slug dans `ProjectInput.tagSlugs[]`. Rempli via curation pré-plan.

### Fichier `prisma/seed-data/companies.ts`

Array constant TypeScript typé. Chaque entrée est un `CompanyInput` avec `slug` (kebab-case dérivé du nom, ex: `"foyer"`, `"wanted-design"`), `name` (ex: "Foyer Group", "Wanted Design"), `logoFilename` (nullable, nom du fichier placé manuellement dans `/assets` comme les covers projets), `websiteUrl` (nullable), `sectors: CompanySector[]` (multi depuis enum FR 11 valeurs), `size: CompanySize | null` (TPE/PME/ETI/GROUPE), `locations: CompanyLocation[]` (multi depuis enum 8 valeurs). Rempli via curation pré-plan.

### Fichier `prisma/seed-data/projects.ts`

Array constant TypeScript typé. Chaque entrée est un `ProjectInput` avec tous les champs scalaires de `Project` (slug, title, description, type, status, `formats: ProjectFormat[]`, dates, URLs, coverFilename, displayOrder) — **sans** `caseStudyMarkdown` (résolu au seed depuis `./case-studies/<slug>.md`). Plus `tagSlugs: string[]` (référence au référentiel `tags.ts`, mélange libre de technos + expertises ; **tableau ordonné** : le premier slug est rendu en premier sur la card, le seed crée les rows `ProjectTag` avec `displayOrder = index`) et `clientMeta` imbriqué nullable pour les projets CLIENT. Le `clientMeta` contient `companySlug: string` (référence à une entrée de `companies.ts`), `teamSize: number | null`, `contractStatus: ContractStatus | null`, `workMode: WorkMode` (required : présentiel/hybride/remote). Plus de champ `companyName` (remplacé par la relation Company via `companySlug`).

### Dossier `prisma/seed-data/case-studies/` (deux sous-dossiers `client/` + `personal/`)

Structure :

```
prisma/seed-data/case-studies/
├── client/
│   └── <slug>.md        # un fichier par projet ProjectType.CLIENT à publier
└── personal/
    └── <slug>.md        # un fichier par projet ProjectType.PERSONAL à publier
```

Un fichier `<slug>.md` par projet publié ayant un case study riche, rangé dans le sous-dossier correspondant à son `type`. Naming des sous-dossiers **en anglais** (`client/` / `personal/`) pour miroir direct de l'enum Prisma `ProjectType.CLIENT` / `ProjectType.PERSONAL` (évite un mapping FR/EN). Contenu narratif markdown pur (pas de frontmatter YAML), rendu sur la page `/projets/[slug]` via `react-markdown` au sub-project 06. Images inline via `![alt](/api/assets/filename.png)`. Les sections privées (données RH, ressenti personnel, notes internes) sont **exclues** par le rédacteur lors de la curation pré-plan (responsabilité éditoriale user, pas vérifiée automatiquement au seed). Si un projet n'a pas de fichier `.md` correspondant dans son sous-dossier : `caseStudyMarkdown` en BDD reste `null` et la section markdown est omise sur la page case study.

**Helper de résolution** (dans `prisma/seed.ts`) :

```typescript
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ProjectType } from '@/generated/prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readCaseStudy(slug: string, type: ProjectType): string | null {
  const folder = type === 'CLIENT' ? 'client' : 'personal'
  const path = join(__dirname, 'seed-data', 'case-studies', folder, `${slug}.md`)
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}
```

Le seed appelle `readCaseStudy(project.slug, project.type)` pour remplir le champ `caseStudyMarkdown` au moment de l'upsert `Project`. Le champ reste un `String?` sur `Project` côté Prisma — aucun changement de schéma. Le routage par-type garantit qu'un slug `foo` en CLIENT et un slug `foo` en PERSONAL (hypothétiquement, puisque `slug` est unique côté `Project` toutes collections confondues) seraient lus depuis leurs dossiers respectifs — le routage reste sans ambiguïté même en cas de futurs partitionnements éditoriaux.

### Où viennent les données ?

Les 3 fichiers TS (`tags.ts`, `companies.ts`, `projects.ts`) et les fichiers `.md` case studies sont peuplés **avant l'exécution du plan** via la session de curation pré-plan (cf. section Prerequisites).

**Le seed n'a aucune dépendance runtime externe** : pas de token, pas d'appel réseau. Les valeurs typées dans les fichiers TS sont consommées telles quelles à l'upsert. Les valeurs d'enums sont directement écrites en forme finale au moment de la curation (les enums Prisma sont auto-explicites côté IDE).

### Ordre des tags par-projet via `tagSlugs[]`

Pas de `displayOrder` global sur `Tag`. L'ordre d'apparition des tags sur un projet est dicté par l'**index** du slug dans le tableau `tagSlugs[]` de `ProjectInput`. Le seed crée les rows `ProjectTag` avec `displayOrder = index`. Les tags phares occupent les premières positions (`tagSlugs[0]`, `tagSlugs[1]`, `tagSlugs[2]` = 3 premiers tags visibles sur la card).

Un même tag peut apparaître en 1ʳᵉ position sur un projet et en 3ᵉ sur un autre, c'est le storytelling éditorial par-projet. Les expertises (kind=EXPERTISE) représentant la valeur métier gagnent souvent à être en tête.

### Case studies `.md`, résolution au seed

Chaque fichier `prisma/seed-data/case-studies/<client|personal>/<slug>.md` est lu via `readFileSync` et placé tel quel dans `Project.caseStudyMarkdown` en BDD. Pas de transformation au seed. Si le fichier `<slug>.md` n'existe pas : `caseStudyMarkdown` reste `null` en BDD (section markdown omise à l'affichage). Les sections privées (données RH, ressenti personnel, notes libres) sont exclues **lors de la curation pré-plan** par le rédacteur, pas par le seed.

## Acceptance criteria

### Scénario 1 : Première exécution avec données remplies

**GIVEN** une BDD `portfolio_dev` migrée (tables vides), les fichiers `prisma/seed-data/tags.ts` + `prisma/seed-data/companies.ts` + `prisma/seed-data/projects.ts` remplis avec N tags (mélange technos + expertises), K companies et M projets, et au moins 1 fichier `prisma/seed-data/case-studies/<slug>.md` pour un projet PUBLISHED
**WHEN** on exécute `pnpm prisma db seed` (ou `just seed`)
**THEN** le script termine exit code 0
**AND** la table `Tag` contient exactement N rows, chacune avec les champs `slug`, `name`, `kind`, `icon` spécifiés (pas de champ `displayOrder` global)
**AND** la table `Company` contient exactement K rows, chacune avec les champs `slug`, `name`, `logoFilename`, `websiteUrl`, `sectors`, `size`, `locations` spécifiés
**AND** la table `Project` contient exactement M rows, chacune avec les champs du fichier TS y compris `formats` ; les projets dont un fichier `case-studies/<slug>.md` existe ont `caseStudyMarkdown` non null (contenu du fichier), les autres `null`
**AND** pour chaque projet de type CLIENT ayant un `clientMeta` non-null, une row correspondante existe dans `ClientMeta` avec les champs `teamSize`, `contractStatus`, `workMode` et `companyId` pointant vers la Company liée par `companySlug`
**AND** la table `ProjectTag` contient une row par tag lié à un projet avec `displayOrder` correspondant à l'index du slug dans `tagSlugs[]` du projet (0 pour le premier slug, 1 pour le suivant, etc.)

### Scénario 2 : Idempotence

**GIVEN** la BDD peuplée par une première exécution
**WHEN** on ré-exécute `pnpm prisma db seed` sans modifier les fichiers TS ni les `.md`
**THEN** le nombre de rows dans `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag` reste identique
**AND** les `displayOrder` des rows `ProjectTag` sont inchangés (même index dans `tagSlugs[]` → même `displayOrder` en BDD)
**AND** aucune erreur de contrainte unique n'est levée

### Scénario 3 : Mise à jour d'un champ

**GIVEN** la BDD peuplée, et un projet dont le `title` a été modifié dans `projects.ts` (même `slug`)
**WHEN** on ré-exécute le seed
**THEN** le `title` en BDD est mis à jour pour ce projet
**AND** les autres projets restent inchangés

### Scénario 4 : Ajout d'un projet

**GIVEN** la BDD peuplée et un nouveau projet ajouté au tableau `projects` (nouveau `slug`)
**WHEN** on ré-exécute le seed
**THEN** le nouveau projet est ajouté en BDD
**AND** les projets pré-existants restent intacts

### Scénario 5 : Projet ARCHIVED non visible côté queries

**GIVEN** un projet avec `status: 'ARCHIVED'` dans `projects.ts`, seedé en BDD
**WHEN** on appelle `findManyPublished()` (sub-project 02)
**THEN** le projet n'est pas retourné (filtre `status = PUBLISHED`)

### Scénario 6 : Liaison tag inconnue

**GIVEN** un projet avec `tagSlugs: ['inexistent-tag']` et aucune row `Tag` avec ce slug
**WHEN** on exécute le seed
**THEN** le script lève une erreur explicite (foreign key constraint via `tags.set`)
**AND** l'utilisateur est invité à ajouter le tag manquant à `tags.ts` avant de relancer

### Scénario 7 : Validation Zod du format `icon`

**GIVEN** un tag dans `tags.ts` avec `icon: 'heroicons:spider'` (lib non supportée)
**WHEN** on exécute le seed
**THEN** le script lève une erreur Zod explicite avant tout upsert
**AND** le message indique le slug du tag fautif et le format attendu (`simple-icons:<slug>` ou `lucide:<slug>`)

### Scénario 8 : `companySlug` inconnu dans ClientMeta

**GIVEN** un projet CLIENT avec `clientMeta.companySlug: 'foyer'` dans `projects.ts`, mais aucune row `Company` avec ce slug dans `companies.ts`
**WHEN** on exécute le seed
**THEN** le script lève une erreur foreign key (`ClientMeta.companyId` → `Company.id` non résolu)
**AND** l'utilisateur est invité à ajouter l'entreprise manquante à `companies.ts` avant de relancer

### Scénario 9 : `Company` réutilisée par plusieurs projets

**GIVEN** 2 projets CLIENT `p1` et `p2` avec `clientMeta.companySlug: 'foyer'` chacun, et une seule entrée Company `{ slug: 'foyer', name: 'Foyer', ... }` dans `companies.ts`
**WHEN** on exécute le seed
**THEN** les 2 projets référencent le MÊME `Company.id` (une seule row dans la table Company)
**AND** `prisma.company.findUnique({ where: { slug: 'foyer' }, include: { clientMetas: true } })` retourne 2 clientMetas liés

### Scénario 10 : Ordre des tags par-projet via `tagSlugs[]`

**GIVEN** un projet avec `tagSlugs: ['typescript', 'react', 'docker']` et un second projet avec `tagSlugs: ['docker', 'kubernetes', 'typescript']` (même tag `typescript` à 2 positions différentes)
**WHEN** on exécute le seed
**THEN** la row `ProjectTag { projectId: <p1>, tagId: <typescript> }` a `displayOrder = 0`, et la row `ProjectTag { projectId: <p2>, tagId: <typescript> }` a `displayOrder = 2`
**AND** une query `prisma.project.findUnique({ where: { slug: <p1> }, include: { tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } } } })` retourne les tags dans l'ordre `typescript → react → docker`
**AND** la même query sur `p2` retourne `docker → kubernetes → typescript`

### Scénario 11 : Ré-ordonnancement via édition de `tagSlugs[]`

**GIVEN** un projet p1 seedé avec `tagSlugs: ['a', 'b', 'c']`, puis édition du fichier TS pour passer à `tagSlugs: ['c', 'a', 'b']`
**WHEN** on ré-exécute le seed
**THEN** les rows `ProjectTag` pour p1 sont entièrement re-créées (via `deleteMany: {}` + `create`)
**AND** `ProjectTag { projectId: <p1>, tagId: <c>, displayOrder: 0 }`, `{ <a>, displayOrder: 1 }`, `{ <b>, displayOrder: 2 }` reflètent le nouvel ordre
**AND** aucune row orpheline ou doublonnée ne subsiste

### Scénario 12 : Projet avec case study `.md` manquant

**GIVEN** un projet `p1 (slug='mon-projet', type='CLIENT')` dans `projects.ts` mais aucun fichier `prisma/seed-data/case-studies/client/mon-projet.md`
**WHEN** on exécute le seed
**THEN** le script termine sans erreur (pas de fichier requis)
**AND** `p1.caseStudyMarkdown` en BDD est `null`

### Scénario 13 : Projet CLIENT avec case study `.md` présent dans `client/`

**GIVEN** un projet `p1 (slug='mon-projet', type='CLIENT')` et un fichier `prisma/seed-data/case-studies/client/mon-projet.md` contenant `## Contexte\n\nLorem ipsum`
**WHEN** on exécute le seed
**THEN** `p1.caseStudyMarkdown` en BDD contient exactement `## Contexte\n\nLorem ipsum` (lecture brute, pas de transformation)

### Scénario 14 : Projet PERSONAL avec case study `.md` présent dans `personal/`

**GIVEN** un projet `p2 (slug='mon-cli', type='PERSONAL')` et un fichier `prisma/seed-data/case-studies/personal/mon-cli.md` contenant `## Objectif\n\n...`
**WHEN** on exécute le seed
**THEN** `p2.caseStudyMarkdown` en BDD contient le contenu du fichier `personal/mon-cli.md` (pas le fichier `client/mon-cli.md` même s'il existe par erreur — le routage suit strictement `project.type`)

## Edge cases

- **Fichiers `tags.ts` / `projects.ts` vides** : le seed tourne sans erreur, résultat = BDD vide (ou inchangée si déjà peuplée). Utile pour un premier run avant contenu réel.
- **Projet sans `clientMeta`** (perso, ou client sans info entreprise) : `clientMeta: null` dans le TS → pas de nested create côté Prisma, pas de row dans `ClientMeta`.
- **`coverFilename` null** : projet sans cover image affichée. La page liste (sub-project 05) doit gérer ce cas avec un placeholder.
- **Slug collision** (2 projets avec le même slug, ou 2 tags avec le même slug) : Prisma lève une erreur unique constraint dès le 2e upsert. Documenter : slugs doivent être uniques au sein de leur table.
- **`startedAt` null** : projet sans date début (rare). `Project.displayOrder` explicite dans le TS évite de dépendre de la date.
- **Tag sans `icon`** : `null` valide. La card UI affiche le badge avec fallback texte (pas de glyphe).
- **Tag avec `kind: EXPERTISE` mais `icon` au format `simple-icons:*`** : techniquement valide côté Zod (les 2 libs sont acceptées pour tout kind), mais incohérent sémantiquement. Pas de validation croisée — responsabilité du remplisseur de choisir la lib appropriée (Lucide pour les expertises, Simple Icons pour les technos).
- **Tag dupliqué dans `tagSlugs`** (ex: `['react', 'react']`) : la clé primaire composite `(projectId, tagId)` empêche le doublon en BDD ; Prisma lève une erreur unique constraint lors du `create`. Documenter : les slugs dans `tagSlugs[]` doivent être distincts.
- **Fichier `.md` présent mais projet absent de `projects.ts`** : le `.md` orphelin n'est jamais lu. Pas d'erreur. Utile si le user prépare un case study en amont d'un projet pas encore formalisé.
- **Fichier `.md` vide** (`""`) : `caseStudyMarkdown` en BDD = chaîne vide. Côté UI (sub-project 06), `CaseStudyMarkdown` vérifie `if (project.caseStudyMarkdown)` → la chaîne vide est falsy, section omise. Comportement OK.

## Architectural decisions

### Décision : Fichiers TypeScript en dur plutôt que snapshot JSON ou connexion live Notion

**Options envisagées :**
- **A. Fichiers TS déclaratifs (`tags.ts`, `projects.ts`)** : type-safe, auto-complétés par l'IDE, commités au repo, remplis manuellement (ou avec assistance IA en amont).
- **B. Snapshot JSON** (`notion-snapshot.json`) + importer TypeScript : étape intermédiaire de génération depuis Notion. Utile si on voulait versionner des snapshots.
- **C. Connexion live Notion** depuis le script seed : le script lit Notion au runtime via SDK Notion officiel.

**Choix : A**

**Rationale :**
- Pas de dépendance runtime Notion : le script fonctionne en offline, aucun token à gérer.
- Type-safety native TypeScript : IDE autocomplete sur `ProjectStatus`, `TagKind`, etc. (impossible avec JSON).
- Source de vérité = le code commité au repo. Pas d'état fantôme dans un JSON déconnecté.
- L'utilisateur peut éditer à la main (projet sensible, override, ajustement) sans regénérer de snapshot.
- La curation pré-plan (hors scope du plan d'implémentation) peut être menée manuellement ou assistée par Claude en amont. Pas besoin de logique d'import complexe dans le seed lui-même.

### Décision : 3 fichiers (seed.ts + tags.ts + projects.ts) plutôt qu'un monolithe

**Options envisagées :**
- **A. 3 fichiers éclatés** : orchestration / tags / projets séparés.
- **B. Monolithique `seed.ts`** : tout dans un fichier.

**Choix : A**

**Rationale :**
- Lisibilité : ouvrir `projects.ts` pour ajouter un projet ne nécessite pas de scroller dans le script d'orchestration.
- Responsabilités isolées : `seed.ts` = logique (upsert, ordre), `*-data.ts` = données pures.
- Convention classique de l'écosystème Prisma (`seed.ts` + `seed-data/` séparés).
- Évite qu'un fichier de 500 lignes de données rende l'orchestration illisible.

### Décision : `tags: { deleteMany: {}, create: [...] }` (replace ordonné) plutôt que `connect` (add)

**Options envisagées :**
- **A. `tags: { deleteMany: {}, create: tagSlugs.map((slug, index) => ({ displayOrder: index, tag: { connect: { slug } } })) }`** : supprime toutes les rows `ProjectTag` du projet puis les re-crée dans l'ordre du tableau TS. Re-seed = sync complet avec ordre garanti.
- **B. `tags: { connect: tagSlugs.map(...) }`** : ajoute seulement les liaisons manquantes. Re-seed n'enlève pas les liaisons anciennes si un tag a été retiré du TS **et** ne peut pas re-ordonner — inadapté à une table de jointure explicite avec `displayOrder`.
- **C. Boucle `upsert` par row `ProjectTag`** : upsert par `(projectId, tagId)`, update `displayOrder` si diffère. Plus fin mais complexe (gérer les suppressions nécessite un diff explicite).

**Choix : A**

**Rationale :**
- Idempotence forte : le fichier TS = source de vérité des relations m:n **et** de leur ordre. Retirer `kafka` de `tagSlugs` d'un projet ou changer l'ordre `['a', 'b', 'c']` → `['c', 'a', 'b']` est reflété exactement en BDD après re-seed.
- Option A nécessaire pour piloter `ProjectTag.displayOrder` : avec `connect`, on ne peut pas spécifier les champs additionnels de la table de jointure (Prisma exige un `create` dans une relation explicite).
- Évite la dérive silencieuse BDD vs code et la dérive d'ordre (important car l'UI lit `displayOrder` pour trier).
- Coût runtime acceptable : 2 opérations SQL par projet (DELETE + INSERT batch) au lieu d'1, mais volume ~10 projets × ~5-10 tags = négligeable.

### Décision : Case studies en fichiers `.md` séparés dans 2 sous-dossiers `client/` + `personal/` plutôt qu'inline dans `projects.ts`

**Options envisagées :**
- **A. `caseStudyMarkdown: string | null` inline dans chaque `ProjectInput`** : template string multi-lignes TypeScript. Un seul fichier à éditer.
- **B. Fichiers `.md` séparés dans un dossier flat `prisma/seed-data/case-studies/<slug>.md`** : un fichier par projet, lu par le seed via `readFileSync`.
- **C. Fichiers `.md` séparés dans deux sous-dossiers `case-studies/client/<slug>.md` + `case-studies/personal/<slug>.md`** : routage par `ProjectType`, le seed lit le fichier via `readCaseStudy(slug, type)`.
- **D. Champ MDX** : flexibilité JSX inline. Écarté par ADR-013 (MDX non choisi pour cohérence avec la gestion projets en BDD).

**Choix : C**

**Rationale :**
- L'option A concentre toutes les prose case studies dans `projects.ts` → fichier TypeScript géant (potentiellement 500-2000 lignes), mélange metadata + contenu narratif, pas de coloration markdown dans l'IDE, diff git moche à chaque édition.
- L'option B aligne le format au contenu : le markdown vit dans un `.md` (coloration syntaxique native VSCode, preview markdown, diff git lisible). `projects.ts` reste centré sur la metadata (slug, dates, tags, formats, company, …).
- L'option C conserve tous les bénéfices de B et ajoute un **partitionnement éditorial** par-type : les case studies clients (potentiellement sous NDA, ton plus corporate) sont rangées à part des case studies perso (ton plus libre, souvent plus techniques). Ce sépartement reflète aussi le discriminant principal du modèle (`ProjectType`) et facilite la navigation dans l'arbre de fichiers.
- Naming anglais `client/` + `personal/` : miroir direct de l'enum Prisma `ProjectType.CLIENT` / `ProjectType.PERSONAL`, évite un mapping FR/EN supplémentaire dans le helper.
- Le helper `readCaseStudy(slug, type)` résout chaque fichier via `existsSync` + `readFileSync` au moment de l'upsert. Si le fichier n'existe pas → `null` → section markdown omise sur la page case study (sub-project 06).
- Le champ en BDD reste `caseStudyMarkdown String?` sur `Project` — **aucun changement de schéma Prisma**, seul le chemin d'alimentation change (fichier `.md` rangé par `type` au lieu de string inline).
- Bénéfice éditorial : un projet peut avoir sa case study éditée indépendamment (commit dédié `docs(projets): réécrit le case study Foyer`) sans toucher au fichier TS des metadata.
- Coût : +2 sous-dossiers, +1 helper de ~6 lignes (avec dérivation `folder = type === 'CLIENT' ? 'client' : 'personal'`), +N fichiers `.md`. Acceptable pour le gain de lisibilité et de partitionnement.

### Décision : Validation Zod ciblée sur le format `icon` uniquement

**Options envisagées :**
- **A. Pas de validation** : TypeScript strict garantit la correctness des champs scalaires.
- **B. Validation Zod runtime complète** : tous les champs `TagInput` et `ProjectInput` passent par un schéma Zod avant upsert.
- **C. Validation Zod ciblée sur `icon`** : seul le champ `icon` a une structure interne (`"<lib>:<slug>"`) qui n'est pas garantie par le type `string` de TypeScript. Le reste est couvert par TS strict.

**Choix : C**

**Rationale :**
- Le champ `icon` est une string formatée : TypeScript ne peut pas catcher `"heroicons:spider"` (lib non supportée) ou `"simple-iconsreact"` (séparateur manquant) à la compilation. Une regex Zod le catche avant que le composant `TagBadge` tombe en fallback silencieux.
- Tous les autres champs sont des scalaires typés par Prisma (`TagKind`, `string`, `number`, `null`) — TS strict les garantit.
- Coût : 1 schéma Zod de 3 lignes + 1 parse par tag à l'upsert. Overhead négligeable sur ~30 tags.
- Alternative considérée : template literal type TypeScript `type IconRef = `simple-icons:${string}` | `lucide:${string}``. Trop restrictif côté IDE pour les éditions manuelles (suggère un backtick interpolé au lieu d'une string brute). Zod runtime = meilleur DX.

