# Schéma Prisma — Modèles Project, ClientMeta, Company, Tag, ProjectTag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déclarer les modèles Prisma `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag` (table de jointure explicite portant `displayOrder` par-projet) et les 10 enums associés (`ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind` à 6 valeurs dont `EXPERTISE`, `CompanySize`, `CompanySector`, `CompanyLocation`), créer `prisma.config.ts` (règle Prisma 7), générer la migration initiale, valider via `prisma studio`, et mettre à jour `BRAINSTORM.md` pour refléter la modélisation élargie.

**Architecture:** Prisma 7 ESM-only, PostgreSQL 18. Provider `prisma-client` avec `output = "../src/generated/prisma"`. URL DB déclarée dans `prisma.config.ts` (plus dans `datasource db`). IDs UUID v7 ordonnés temporellement. Timestamps en `TIMESTAMPTZ`. Relation m:n Project ↔ Tag via **table de jointure explicite `ProjectTag`** portant `displayOrder Int @default(0)` pour piloter l'ordre d'affichage des tags **par-projet** (un même tag peut être en position 0 sur un projet et en position 3 sur un autre). `Tag` n'a plus de champ `displayOrder` global. Relation 1:1 optionnelle Project ↔ ClientMeta avec `onDelete: Cascade`. Relation N:1 required ClientMeta → Company avec `onDelete: Restrict` (une entreprise peut être réutilisée par plusieurs missions). Champ array `formats ProjectFormat[]` natif Postgres sur Project. Champ required `workMode WorkMode` sur ClientMeta.

**Tech Stack:** Node.js 24 + TypeScript 6 strict + Next.js 16 App Router + PostgreSQL 18 + Prisma 7 + pnpm 10.33 + Just (Justfile).

**Spec source:** [docs/superpowers/specs/projets/01-schema-prisma-project-design.md](../../specs/projets/01-schema-prisma-project-design.md)

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `prisma.config.ts` | Create | Config Prisma v7 : chemin schema, URL DB via `env('DATABASE_URL')`, chemin migrations |
| `prisma/schema.prisma` | Modify (overwrite body) | Déclarer les 5 modèles (Project, ClientMeta, Company, Tag, ProjectTag) + 10 enums + generator + datasource |
| `prisma/migrations/<ts>_add_project_schema/migration.sql` | Create (auto via CLI) | Migration SQL générée par `prisma migrate dev` |
| `.env.example` | Verify | Vérifier que `DATABASE_URL` est présente (déjà le cas a priori) |
| `.env` | Verify | Vérifier que `DATABASE_URL` est définie localement |
| `docs/BRAINSTORM.md` | Modify | Mettre à jour la section Feature 2 : `published (boolean)` → `status (enum ProjectStatus)`, mentionner `clientMeta`, `Company` (modèle référentiel séparé), relation `tags` via table de jointure explicite `ProjectTag` (`displayOrder` par-projet), TagKind inclut EXPERTISE, dimension `formats ProjectFormat[]`, champ `workMode` required sur ClientMeta |
| `.gitignore` | Verify | Confirmer que `/src/generated/` y est (déjà présent à la ligne 45) |

---

### Task 1: Créer `prisma.config.ts` (config Prisma v7)

Règle appliquée : [.claude/rules/prisma/client-setup.md](../../../../.claude/rules/prisma/client-setup.md) — "Créer un fichier `prisma.config.ts` à la racine pour centraliser la config (`schema`, `datasource.url` via helper `env()`, `migrations.path`)". L'adapter `PrismaPg` n'est **pas** dans ce fichier (il sera configuré dans `src/lib/prisma.ts` au sub-project 02).

**Files:**
- Create: `prisma.config.ts`

- [ ] **Step 1: Vérifier que le fichier n'existe pas déjà**

Run:
```bash
ls prisma.config.ts 2>/dev/null && echo "EXISTS" || echo "OK, à créer"
```
Expected: `OK, à créer`

- [ ] **Step 2: Créer `prisma.config.ts` avec la config v7**

Contenu exact :

```typescript
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

- [ ] **Step 3: Vérifier la syntaxe TypeScript**

Run:
```bash
pnpm typecheck
```
Expected: 0 erreur (ou les mêmes erreurs pré-existantes, aucune nouvelle erreur introduite par ce fichier).

---

### Task 2: Vérifier `.env.example` et `.env` pour `DATABASE_URL`

**Files:**
- Verify: `.env.example`
- Verify: `.env`

- [ ] **Step 1: Vérifier que `.env.example` contient `DATABASE_URL`**

Run:
```bash
grep -E '^DATABASE_URL=' .env.example
```
Expected: `DATABASE_URL=postgresql://portfolio:portfolio@postgres:5432/portfolio` (ou valeur équivalente, ligne 10 du fichier).

Si absente, l'ajouter sous la section `# === Database ===` :
```
DATABASE_URL=postgresql://portfolio:portfolio@localhost:5432/portfolio
```

- [ ] **Step 2: Vérifier que `.env` local a une `DATABASE_URL` valide**

Run:
```bash
grep -E '^DATABASE_URL=' .env
```
Expected: une ligne `DATABASE_URL=postgresql://...` non vide.

Si absente ou vide, la copier depuis `.env.example` et adapter le host/port selon le contexte dev (ex: `localhost:5432` si pgconteneur exposé, `postgres:5432` si exécution dans le même réseau Docker).

---

### Task 3: Écrire le schéma Prisma complet

Règle appliquée : [.claude/rules/prisma/schema-migrations.md](../../../../.claude/rules/prisma/schema-migrations.md) — provider `prisma-client`, `output` obligatoire, `@default(uuid(7))`, `@db.Timestamptz`, `datasource db` sans `url`.

**Files:**
- Modify: `prisma/schema.prisma` (remplace le contenu actuel qui n'a que le squelette + TODO commentaire)

- [ ] **Step 1: Lire l'état actuel pour confirmer qu'on remplace bien le squelette**

Run:
```bash
cat prisma/schema.prisma
```
Expected (extrait attendu, ~11 lignes) :
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// TODO: define schema (Project, Asset, etc. — voir docs/ARCHITECTURE.md)
```

- [ ] **Step 2: Remplacer le contenu de `prisma/schema.prisma` par le schéma complet**

Contenu exact à écrire (remplace tout le fichier) :

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum ProjectType {
  CLIENT
  PERSONAL
}

enum ProjectStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum ProjectFormat {
  API
  WEB_APP
  MOBILE_APP
  DESKTOP_APP
  CLI
  IA
}

enum ContractStatus {
  FREELANCE
  CDI
  STAGE
  ALTERNANCE
}

enum WorkMode {
  PRESENTIEL
  HYBRIDE
  REMOTE
}

enum TagKind {
  LANGUAGE
  FRAMEWORK
  DATABASE
  INFRA
  AI
  EXPERTISE
}

enum CompanySize {
  TPE
  PME
  ETI
  GROUPE
}

enum CompanySector {
  ASSURANCE
  FINTECH
  SAAS
  SERVICES_RH
  ESN_CONSEIL
  LOGICIELS_ENTREPRISE
  ECOMMERCE
  IA_AUTOMATISATION
  EMARKETING
  BANQUE
  AUTRE
}

enum CompanyLocation {
  LUXEMBOURG
  PARIS
  GRAND_EST
  FRANCE
  BELGIQUE
  SUISSE
  EUROPE
  MONDE
}

model Project {
  id                String          @id @default(uuid(7))
  slug              String          @unique
  title             String
  description       String
  type              ProjectType
  status            ProjectStatus   @default(DRAFT)
  formats           ProjectFormat[]
  startedAt         DateTime?       @db.Timestamptz
  endedAt           DateTime?       @db.Timestamptz
  githubUrl         String?
  demoUrl           String?
  coverFilename     String?
  caseStudyMarkdown String?
  displayOrder      Int             @default(0)
  tags              ProjectTag[]
  clientMeta        ClientMeta?
  createdAt         DateTime        @default(now()) @db.Timestamptz
  updatedAt         DateTime        @updatedAt @db.Timestamptz
}

model ClientMeta {
  id             String          @id @default(uuid(7))
  projectId      String          @unique
  project        Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  companyId      String
  company        Company         @relation(fields: [companyId], references: [id], onDelete: Restrict)
  teamSize       Int?
  contractStatus ContractStatus?
  workMode       WorkMode
  createdAt      DateTime        @default(now()) @db.Timestamptz
  updatedAt      DateTime        @updatedAt @db.Timestamptz
}

model Company {
  id           String            @id @default(uuid(7))
  slug         String            @unique
  name         String
  logoFilename String?
  websiteUrl   String?
  sectors      CompanySector[]
  size         CompanySize?
  locations    CompanyLocation[]
  clientMetas  ClientMeta[]
  createdAt    DateTime          @default(now()) @db.Timestamptz
  updatedAt    DateTime          @updatedAt @db.Timestamptz
}

model Tag {
  id        String       @id @default(uuid(7))
  slug      String       @unique
  name      String
  kind      TagKind
  icon      String?
  projects  ProjectTag[]
  createdAt DateTime     @default(now()) @db.Timestamptz
  updatedAt DateTime     @updatedAt @db.Timestamptz
}

model ProjectTag {
  projectId    String
  tagId        String
  displayOrder Int      @default(0)
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tag          Tag      @relation(fields: [tagId], references: [id], onDelete: Restrict)

  @@id([projectId, tagId])
  @@index([projectId, displayOrder])
}
```

- [ ] **Step 3: Valider la syntaxe du schéma sans toucher la BDD**

Run:
```bash
pnpm prisma validate
```
Expected: `The schema at prisma/schema.prisma is valid 🚀` (pas d'erreur de syntaxe ni de relation).

Si erreur : relire la section Prisma du spec, corriger dans `prisma/schema.prisma`, re-run.

- [ ] **Step 4: Formater le schéma (convention Prisma)**

Run:
```bash
pnpm prisma format
```
Expected: pas d'erreur, fichier reformaté si nécessaire (alignement des colonnes).

---

### Task 4: Démarrer PostgreSQL et exécuter la migration initiale

**Files:**
- Create: `prisma/migrations/<timestamp>_add_project_schema/migration.sql` (généré par la CLI)
- Create: `prisma/migrations/migration_lock.toml` (généré par la CLI à la première migration)

- [ ] **Step 1: Vérifier que PostgreSQL est accessible**

Run:
```bash
just check
```
Expected (ligne clé) : `✓ PostgreSQL accessible`.

Si `⚠️ PostgreSQL non accessible`, lancer :
```bash
just docker-up
```
Puis attendre ~10s et relancer `just check` pour confirmer.

- [ ] **Step 2: Générer et exécuter la migration initiale**

Run:
```bash
just db-migrate add_project_schema
```
(équivalent : `pnpm prisma migrate dev --name add_project_schema`)

Expected output (extraits clés) :
```
Applying migration `<timestamp>_add_project_schema`
The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ <timestamp>_add_project_schema/
    └─ migration.sql

Your database is now in sync with your schema.
```

Si la commande échoue avec `P1010` ou "User was denied access" : vérifier que `DATABASE_URL` dans `.env` utilise les mêmes credentials que `POSTGRES_USER`/`POSTGRES_PASSWORD` du docker-compose.

Si la commande propose un reset à cause d'une divergence pré-existante : répondre `y` uniquement si la BDD locale ne contient pas de données à préserver (cas nominal en MVP).

- [ ] **Step 3: Générer le client Prisma**

En Prisma 7, `migrate dev` ne lance plus `generate` automatiquement (règle [.claude/rules/prisma/schema-migrations.md](../../../../.claude/rules/prisma/schema-migrations.md)).

Run:
```bash
pnpm prisma generate
```
Expected:
```
✔ Generated Prisma Client (v7.x.x) to ./src/generated/prisma in XXXms
```

- [ ] **Step 4: Inspecter le fichier `migration.sql` généré**

Run:
```bash
ls prisma/migrations/
cat prisma/migrations/*_add_project_schema/migration.sql
```
Expected : le fichier doit contenir tous les enums (`CREATE TYPE "ProjectType"`, `"ProjectStatus"`, `"ProjectFormat"` avec 6 valeurs dont `IA`, `"ContractStatus"`, `"WorkMode"` avec 3 valeurs dont `REMOTE`, `"TagKind"` avec 6 valeurs dont `EXPERTISE`, `"CompanySize"` avec `TPE`/`PME`/`ETI`/`GROUPE`, `"CompanySector"` avec 11 valeurs, `"CompanyLocation"` avec 8 valeurs), toutes les tables (`CREATE TABLE "Project"`, `"ClientMeta"`, `"Company"`, `"Tag"`, `"ProjectTag"` — table de jointure **explicite** avec colonne `displayOrder INTEGER NOT NULL DEFAULT 0`), PK composite `PRIMARY KEY ("projectId", "tagId")` sur ProjectTag, index `CREATE INDEX ... ON "ProjectTag"("projectId", "displayOrder")`, la contrainte `FOREIGN KEY ... ON DELETE CASCADE` pour `ClientMeta.projectId` et `ProjectTag.projectId`, et `FOREIGN KEY ... ON DELETE RESTRICT` pour `ClientMeta.companyId` et `ProjectTag.tagId`.

**Note** : pas de table `_ProjectToTag` implicite (on a migré vers la jointure explicite `ProjectTag`).

---

### Task 5: Vérification visuelle via Prisma Studio

**Files:**
- (aucun, vérification read-only)

- [ ] **Step 1: Ouvrir Prisma Studio**

Run:
```bash
just db-studio &
```
(équivalent : `pnpm prisma studio` en arrière-plan — ouvre http://localhost:5555)

Expected : navigateur ouvre Prisma Studio avec 5 tables visibles dans la sidebar : `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag` (table de jointure explicite).

- [ ] **Step 2: Valider les colonnes de `Project`**

Dans Prisma Studio, cliquer sur `Project`. Vérifier la présence exacte des colonnes :
- `id` (String, PK)
- `slug` (String, unique)
- `title`, `description` (String)
- `type` (ProjectType)
- `status` (ProjectStatus, default DRAFT)
- `formats` (ProjectFormat[], array — visible comme `TEXT[]` dans Studio)
- `startedAt`, `endedAt` (DateTime nullable)
- `githubUrl`, `demoUrl` (String nullable)
- `coverFilename`, `caseStudyMarkdown` (String nullable)
- `displayOrder` (Int, default 0)
- `createdAt`, `updatedAt` (DateTime)
- onglet `tags` (relation) et `clientMeta` (relation)

- [ ] **Step 3: Valider les colonnes de `ClientMeta`**

Dans Prisma Studio, cliquer sur `ClientMeta`. Vérifier :
- `id`, `projectId` (unique), `companyId` (FK required vers Company)
- `teamSize` (nullable), `contractStatus` (ContractStatus, nullable)
- `workMode` (WorkMode, required)
- `createdAt`, `updatedAt`
- onglet `company` (relation required) et `project` (relation)
- **Absence** du champ `companyName` (remplacé par la relation Company)

- [ ] **Step 4: Valider les colonnes de `Company`**

Dans Prisma Studio, cliquer sur `Company`. Vérifier :
- `id`, `slug` (unique), `name`
- `logoFilename`, `websiteUrl` (tous nullables)
- `sectors` (CompanySector[], array)
- `size` (CompanySize, nullable)
- `locations` (CompanyLocation[], array)
- `createdAt`, `updatedAt`
- onglet `clientMetas` (reverse relation — liste des missions liées)

- [ ] **Step 5: Valider les colonnes de `Tag`**

Dans Prisma Studio, cliquer sur `Tag`. Vérifier :
- `id`, `slug` (unique), `name`
- `kind` (TagKind avec 6 valeurs dont `EXPERTISE`)
- `icon` (nullable, format `"<lib>:<slug>"`)
- **Absence** du champ `displayOrder` (il est maintenant porté par `ProjectTag.displayOrder`, par-projet)
- `createdAt`, `updatedAt`
- onglet `projects` (reverse relation vers `ProjectTag`)

- [ ] **Step 5bis: Valider les colonnes de `ProjectTag`**

Dans Prisma Studio, cliquer sur `ProjectTag`. Vérifier :
- `projectId` (String, part of composite PK, FK vers Project avec onDelete Cascade)
- `tagId` (String, part of composite PK, FK vers Tag avec onDelete Restrict)
- `displayOrder` (Int, défaut 0) — pilote l'ordre d'affichage **par-projet**
- onglets `project` et `tag` (relations vers les deux côtés)
- Pas de colonne `id` (la PK est composite `(projectId, tagId)`)

- [ ] **Step 6: Arrêter Prisma Studio**

Run:
```bash
just stop 2>/dev/null || true
```
(ou fermer le processus qui écoute le port 5555)

---

### Task 6: Mettre à jour `docs/BRAINSTORM.md` (Feature 2)

Justification : la modélisation finale diverge de la description initiale dans BRAINSTORM (`published boolean` → `status enum`, ajout de `clientMeta` enfant, modèle référentiel `Company` séparé avec relation depuis ClientMeta, relation unifiée `tags` avec discriminant `kind` incluant `EXPERTISE`, nouvelle dimension `formats ProjectFormat[]` multi-valeurs, champ required `workMode` sur ClientMeta). On garde BRAINSTORM comme source vivante de la vision produit alignée sur l'implémentation.

**Files:**
- Modify: `docs/BRAINSTORM.md` (section "Feature 2 — Projets (liste + case studies)")

- [ ] **Step 1: Localiser la section Feature 2 dans BRAINSTORM.md**

Run:
```bash
grep -n "Feature 2" docs/BRAINSTORM.md
```
Expected : au moins une ligne pointant vers la section "Feature 2 — Projets (liste + case studies)".

- [ ] **Step 2: Remplacer le bloc "Modèle BDD (`Project`)" par la modélisation élargie**

Ouvrir `docs/BRAINSTORM.md`, retrouver le bloc actuel :

```markdown
**Modèle BDD (`Project`) :**
* `slug` (unique, URL-friendly)
* `title`, `description`
* `stack` (badges technologiques)
* `githubUrl`, `demoUrl` (lien vers démo externe)
* `type` : CLIENT / PERSONAL (filtres sur la page)
* `published` (boolean)
```

Le remplacer exactement par :

```markdown
**Modèle BDD (4 tables Prisma) :**

`Project` (table principale) :
* `slug` (unique, URL-friendly, language-agnostic cf. ADR-010)
* `title`, `description` (teaser court affiché card + meta SEO)
* `type` : `ProjectType` (CLIENT / PERSONAL) — filtres sur la page liste
* `status` : `ProjectStatus` (DRAFT / PUBLISHED / ARCHIVED) — défaut DRAFT, seuls PUBLISHED visibles publiquement
* `formats` : `ProjectFormat[]` (API / WEB_APP / MOBILE_APP / DESKTOP_APP / CLI / IA) — multi-valeurs, nature technique du projet (affichée en badge outline à côté du titre)
* `startedAt`, `endedAt` (DateTime nullable) — début et fin de mission (CLIENT) ou début + date de MEP (PERSONAL)
* `githubUrl`, `demoUrl` (nullables — NDA / projet sans démo)
* `coverFilename`, `caseStudyMarkdown` (nullables)
* `displayOrder` (Int, défaut 0) — tri manuel ASC des projets sur la page liste (0 en premier). **Ne concerne pas l'ordre des tags du projet**, qui est porté par `ProjectTag.displayOrder`.
* relation m:n `tags` → `ProjectTag[]` via table de jointure explicite (mélange technos + infra + outils + expertises métier, distingués par `Tag.kind` ; ordre par-projet via `ProjectTag.displayOrder`)
* relation 1:1 optionnelle `clientMeta` → `ClientMeta?`

`ClientMeta` (métadonnées spécifiques aux missions clients, relation 1:1 optionnelle avec Project) :
* `teamSize` (Int nullable), `contractStatus` : `ContractStatus` (FREELANCE / CDI / STAGE / ALTERNANCE, nullable)
* `workMode` : `WorkMode` (PRESENTIEL / HYBRIDE / REMOTE) — required, info toujours connue
* relation N:1 required vers `Company` via `companyId` (une entreprise peut avoir plusieurs missions successives)
* Cascade delete avec le Project parent

`Company` (référentiel entreprises clientes, relation 1:N vers ClientMeta) :
* `slug` (unique, dérivé du nom), `name`
* `logoFilename` (nullable, image dans `/assets`), `websiteUrl` (nullable)
* `sectors` : `CompanySector[]` (Assurance / Fintech / SaaS / ... / Autre — 11 valeurs, multi)
* `size` : `CompanySize?` (TPE / PME / ETI / GROUPE)
* `locations` : `CompanyLocation[]` (Luxembourg / Paris / Grand_Est / France / Belgique / Suisse / Europe / Monde — multi)

`Tag` (référentiel unifié : technos / infra / outils / expertises métier) :
* `slug` (unique), `name`
* `kind` : `TagKind` (LANGUAGE / FRAMEWORK / DATABASE / INFRA / AI / EXPERTISE)
* `icon` (nullable, format `"<lib>:<slug>"` — ex `"simple-icons:react"` pour une techno, `"lucide:spider"` pour une expertise)
* **pas de `displayOrder` global** — l'ordre est par-projet via `ProjectTag.displayOrder`

`ProjectTag` (table de jointure explicite Project ↔ Tag, porte l'ordre d'affichage par-projet) :
* `projectId` + `tagId` — clé primaire composite
* `displayOrder` (Int, défaut 0) — tri ASC des tags **de ce projet** sur la card liste et dans chaque groupe de la case study (0 en premier)
* Cascade delete côté Project (supprimer le projet retire ses liaisons), Restrict côté Tag (protège le référentiel)
* Index composite `(projectId, displayOrder)` pour accélérer la query `orderBy: { displayOrder: 'asc' }`
```

- [ ] **Step 3: Vérifier la cohérence globale du fichier**

Run:
```bash
pnpm lint --max-warnings 0 2>/dev/null || true
```

Rechercher d'autres mentions de `published (boolean)` dans le doc qui auraient besoin d'être mises à jour :
```bash
grep -n "published" docs/BRAINSTORM.md
```
Vérifier chaque occurrence et adapter si elle décrit encore le champ booléen obsolète.

---

### Task 7: Commit final

- [ ] **Step 1: Vérifier le delta complet**

Run:
```bash
git status
git diff --stat
```
Expected : modifications sur `prisma/schema.prisma`, `docs/BRAINSTORM.md` ; nouveaux fichiers `prisma.config.ts`, `prisma/migrations/<ts>_add_project_schema/migration.sql`, `prisma/migrations/migration_lock.toml`.

- [ ] **Step 2: Vérifier qu'aucun fichier généré n'est tracké**

Run:
```bash
git status src/generated/ 2>&1 | head -5
```
Expected : soit `src/generated/` n'apparaît pas dans `git status` (ignoré), soit message "ignored". Confirme que `.gitignore` fonctionne (ligne 45 : `/src/generated/`).

- [ ] **Step 3: Lancer les checks qualité avant commit**

Run:
```bash
just lint
just typecheck
```
Expected : 0 erreur.

- [ ] **Step 4: Stager et committer**

Run:
```bash
git add prisma.config.ts prisma/schema.prisma prisma/migrations/ docs/BRAINSTORM.md
git commit -m "$(cat <<'EOF'
feat(projets): ajoute schéma Prisma Project, ClientMeta, Company, Tag, ProjectTag

- Modèle Project avec 10 enums (ProjectType, ProjectStatus, ProjectFormat, ContractStatus, WorkMode, TagKind, CompanySize, CompanySector, CompanyLocation)
- Project.formats ProjectFormat[] (API/WEB_APP/MOBILE_APP/DESKTOP_APP/CLI/IA) multi-valeurs
- ClientMeta (relation 1:1 optionnelle) + workMode required + companyId required vers Company
- Company (modèle référentiel, relation 1:N depuis ClientMeta) avec sectors/size/locations multi-enum FR
- Relation m:n Project ↔ Tag via table de jointure explicite ProjectTag (displayOrder par-projet, PK composite, index composite) — supporte un même tag à des positions différentes selon le projet
- Tag sans displayOrder global (porté désormais par ProjectTag)
- Migration initiale add_project_schema
- prisma.config.ts (règle Prisma 7)
- BRAINSTORM.md : modélisation alignée

Spec: docs/superpowers/specs/projets/01-schema-prisma-project-design.md
EOF
)"
```

Expected : commit créé, pas d'erreur pre-commit hook.

- [ ] **Step 5: Vérifier le commit**

Run:
```bash
git log -1 --stat
```
Expected : 1 commit affiché, liste des fichiers modifiés cohérente avec le diff précédent.

---

## Self-Review (remplie par l'auteur du plan)

**1. Spec coverage** :
- ✅ `Scope` → Tasks 3 (schema), 4 (migration), 6 (BRAINSTORM)
- ✅ `État livré` (`prisma migrate dev` + `prisma studio`) → Tasks 4 + 5
- ✅ `Dependencies` = aucune → pas de task pré-requise
- ✅ `Files touched` → tous mappés dans les tasks : `prisma/schema.prisma` (T3), `migration.sql` (T4, auto), `prisma.config.ts` (T1), `.env.example` (T2 vérif), `.gitignore` (T7 vérif), `docs/BRAINSTORM.md` (T6)
- ✅ `Architecture approach` (provider prisma-client, UUID v7, TIMESTAMPTZ, relation m:n implicite, cascade 1:1) → tous présents dans le schéma de T3
- ✅ `Acceptance criteria` : scénario 1 (migration exécutable avec table `ProjectTag` explicite) couvert T4 ; scénario 2 (client généré incl. type `ProjectTag`) T4 step 3 ; scénarios 3/4/5 (unicité slug, cascade, relation m:n via `ProjectTag`) vérifiables via Prisma Studio T5 (+ Step 5bis pour valider la PK composite + index) ; scénario 6 (prisma.config.ts URL) T1+T4
- ✅ `tdd_scope = none` → pas de section Tests, correctement omise

**2. Placeholder scan** : aucun "TBD", "TODO", "implement later" dans les tasks. Chaque step a sa commande ou son code exact.

**3. Type consistency** : les noms des 5 modèles (`Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag`) et des 10 enums (`ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind` avec 6 valeurs dont `EXPERTISE`, `CompanySize`, `CompanySector`, `CompanyLocation`) sont identiques dans le spec, le schéma Task 3, les acceptance criteria Task 5 et le commit message Task 7. `ClientMeta` n'a plus de champ `companyName` (remplacé par relation `Company`) ; `workMode` est required ; `formats` est un array sur Project ; `Tag` n'a plus de `displayOrder` global (porté par `ProjectTag.displayOrder` par-projet).

---

## Prochaine étape

Après exécution de ce plan, passer au sub-project suivant : `docs/superpowers/specs/projets/02-client-prisma-queries-design.md` (à générer via la boucle parent `/decompose-feature projets`).

Pour lancer l'implémentation de ce plan, utiliser `/implement-subproject projets 01` (commande du projet, voir [.claude/CLAUDE.md](../../../../.claude/CLAUDE.md)).
