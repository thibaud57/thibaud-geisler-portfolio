---
feature: "Feature 2 — Projets (liste + case studies)"
subproject: "client-prisma-queries"
goal: "Fournir un singleton PrismaClient et les queries de lecture des projets publiés, filtrables par type, pour les pages publiques"
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["01-schema-prisma-project-design.md"]
date: "2026-04-22"
---

# Client Prisma singleton + queries de lecture des projets

## Scope

Créer le singleton PrismaClient partagé (`src/lib/prisma.ts`) avec driver adapter `@prisma/adapter-pg` (obligatoire Prisma v7), pattern cache global dev pour éviter l'épuisement du pool de connexions en HMR Next.js, et logging minimal (`['warn', 'error']`). Créer le module de queries `src/server/queries/projects.ts` exposant deux fonctions : `findManyPublished({ type? })` (liste projets `status = PUBLISHED` avec filtre type optionnel, tri `Project.displayOrder asc`, include nested `tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } }` + `clientMeta.company` par défaut) et `findPublishedBySlug(slug)` (case study, include identique, `null` si slug inexistant ou projet non publié). Définir le type alias `ProjectWithRelations` dans `src/types/project.ts` (Tags passant par `ProjectTag` nested, nested Company via ClientMeta), réutilisé par les consommateurs UI. Configurer Vitest pour supporter les tests d'intégration contre une BDD PostgreSQL dédiée `portfolio_test`, avec helper de reset par TRUNCATE CASCADE. Écrire 7 tests d'intégration ciblés sur les règles métier du projet. **Exclus** : mutations (pas de dashboard admin MVP), pagination, cache Next.js / `revalidateTag` (géré par les consommateurs sub-projects 05/06), tests e2e, logging Pino custom slow-queries (YAGNI).

### État livré

À la fin de ce sub-project, on peut : lancer `just test-integration` (ou `pnpm vitest run integration.test`) et observer les 7 tests `projects-queries.integration.test.ts` passer en vert, confirmant que `findManyPublished()` exclut bien les projets `DRAFT`/`ARCHIVED`, respecte le filtre `type`, applique `Project.displayOrder asc` + `ProjectTag.displayOrder asc` nested, inclut bien les tags via `ProjectTag` + `clientMeta.company` nested, et que `findPublishedBySlug` retourne `null` sur slug inexistant ou projet non publié.

## Dependencies

- `01-schema-prisma-project-design.md` (statut: draft) — les queries dépendent des 5 modèles Prisma `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag` (table de jointure explicite avec `displayOrder` par-projet) et des 10 enums (`ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `CompanySize`, `CompanySector`, `CompanyLocation`). Le client Prisma généré (`src/generated/prisma/client`) est l'import source.

## Files touched

- **À créer** : `src/lib/prisma.ts` (singleton PrismaClient + adapter PG)
- **À créer** : `src/types/project.ts` (type alias `ProjectWithRelations`)
- **À créer** : `src/server/queries/projects.ts` (2 fonctions de lecture)
- **À créer** : `tests/integration/projects-queries.integration.test.ts` (7 tests Vitest)
- **À créer** : `tests/integration/setup.ts` (helper reset BDD partagé, import depuis les fichiers de test)
- **À créer** : `__mocks__/server-only.ts` (no-op exporté, ciblé par l'alias Vitest pour permettre l'import des queries depuis les tests)
- **À créer ou modifier** : `vitest.config.ts` (ajouter l'alias `server-only` → `__mocks__/server-only.ts` sous `test.resolve.alias`, et config Vitest avec env `.env.test`, pattern test, setupFiles si fichier absent)
- **À créer** : `.env.test` (variable `DATABASE_URL` pointant sur `portfolio_test`)
- **À modifier** : `docker-compose.yml` (ajouter BDD `portfolio_test` OU variable `POSTGRES_MULTIPLE_DATABASES=portfolio,portfolio_test` avec script init — à trancher à l'implémentation selon l'existant du compose file)
- **À modifier** : `.gitignore` (s'assurer que `.env.test` n'est pas tracké — normalement déjà couvert par `.env*` ligne 34)
- **À modifier** : `Justfile` (ajout éventuel d'une recette `db-test-reset` et adaptation de `db-migrate` si nécessaire pour appliquer le schema à la BDD test)

## Architecture approach

### Singleton PrismaClient

- **Pattern singleton via `globalThis`** conformément à [.claude/rules/prisma/client-setup.md](../../../../.claude/rules/prisma/client-setup.md) — évite la multiplication des pools de connexions pendant le HMR Next.js en dev. En production, une nouvelle instance est créée au démarrage sans cache global.
- **Driver adapter `@prisma/adapter-pg` obligatoire** en Prisma v7 (règle v7). Instancié avec `new PrismaPg({ connectionString: process.env.DATABASE_URL! })` et passé à `new PrismaClient({ adapter })`.
- **Import du client depuis le chemin `output`** : `import { PrismaClient, Prisma } from '@/generated/prisma/client'` (règle v7, plus depuis `@prisma/client`).
- **Chargement explicite de `.env`** via `import 'dotenv/config'` en tête de fichier (Prisma v7 ne charge plus `.env` automatiquement au runtime).
- **Protection `'server-only'`** via l'import `import 'server-only'` en tête du fichier singleton, pour garantir qu'il n'est jamais importé côté client (sinon erreur build claire en Next.js App Router).
- **Logging minimal** : `log: ['warn', 'error']` dans les options PrismaClient. Capture les vrais problèmes (connexion perdue, deadlock) sans bruit. Pas de wrapper Pino custom pour slow queries (YAGNI, volume ~10 projets).
- Règle ESM-only appliquée : `"type": "module"` déjà déclaré dans `package.json`.

### Type alias central

Conformément à la décision architecturale ci-dessous, un type unique `ProjectWithRelations` est défini dans `src/types/project.ts` via `Prisma.ProjectGetPayload` avec un `include` des relations `tags: { include: { tag: true } }` (passant par `ProjectTag`) et `clientMeta` (lui-même imbriquant `company`). Le shape est inféré par Prisma, pas redéclaré à la main. Ce type sert de contrat de sortie aux queries et d'input aux composants UI (sub-projects 05, 06). Les consommateurs accèdent aux tags via `project.tags.map(pt => pt.tag)` — chaque row `ProjectTag` porte son `displayOrder` + la relation `tag` complète (`slug`, `name`, `kind`, `icon`). Pas de DTO, pas de mapping.

### Queries de lecture

- **`findManyPublished({ type? })`** : `where: { status: 'PUBLISHED', ...(type && { type }) }`, `include: { tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } }, clientMeta: { include: { company: true } } }`, `orderBy: { displayOrder: 'asc' }` (au niveau Project — contrôle l'ordre des projets sur la page liste). Signature explicite, pas d'options `include` paramétrables (décision architecturale). Tri ASC des tags (0 en premier) piloté par le rédacteur via `ProjectTag.displayOrder` (par-projet), tri ASC des projets piloté par `Project.displayOrder` (global).
- **`findPublishedBySlug(slug)`** : utilise `findFirst` (pas `findUnique`) pour pouvoir combiner `where: { slug, status: 'PUBLISHED' }`. Include identique (tags via ProjectTag triés par `displayOrder` asc + clientMeta.company nested). Retourne `null` si slug inexistant OU projet non publié (DRAFT/ARCHIVED invisible du public).
- **Typage strict** : le retour est explicitement annoté `Promise<ProjectWithRelations[]>` et `Promise<ProjectWithRelations | null>`. Conforme à [.claude/rules/typescript/conventions.md](../../../../.claude/rules/typescript/conventions.md).
- **`'server-only'` guard** : `import 'server-only'` en tête de `src/server/queries/projects.ts` pour empêcher l'import côté client. Conforme à [.claude/rules/nextjs/data-fetching.md](../../../../.claude/rules/nextjs/data-fetching.md) (queries BDD restent côté serveur).

### Environnement de test

- **BDD dédiée `portfolio_test`** séparée de `portfolio` (dev). Initialisée par Docker ou manuellement (`createdb portfolio_test`), migrations appliquées via `DATABASE_URL=<test-url> pnpm prisma migrate deploy`. Voir [.claude/rules/vitest/setup.md](../../../../.claude/rules/vitest/setup.md).
- **Fichier `.env.test`** : contient la `DATABASE_URL` pointant sur `portfolio_test`. Chargé par Vitest via `vitest.config.ts` (option `env.DATABASE_URL` ou via `setupFiles` qui importe `dotenv/config` avec le fichier cible).
- **Reset par TRUNCATE CASCADE** : `beforeEach` de chaque test appelle `resetDatabase(prisma)` depuis `tests/integration/setup.ts`. La fonction exécute `TRUNCATE "Project", "ClientMeta", "Company", "Tag", "ProjectTag" RESTART IDENTITY CASCADE` via `prisma.$executeRawUnsafe`. Plus rapide que `migrate reset`, compatible avec queries qui ouvrent leurs propres transactions. **Ordre des tables** : Company est inclus car ClientMeta a une FK vers Company ; `ProjectTag` est la table de jointure explicite (plus `_ProjectToTag` implicite).
- **Vitest pattern** : les tests d'intégration ont le suffixe `*.integration.test.ts` pour être matchés par `just test-integration` (voir `Justfile:47-48`) et exclus par `just test-unit`.

## Acceptance criteria

### Scénario 1 : Le singleton PrismaClient est réutilisé entre appels

**GIVEN** l'application Next.js démarrée en mode dev avec HMR actif
**WHEN** on modifie un fichier qui importe `prisma` depuis `@/lib/prisma` et recompile
**THEN** `globalThis.prisma` est réutilisé (pas de nouvelle connexion PG)
**AND** `pg_stat_activity` montre au maximum quelques connexions, pas une accumulation à chaque reload

### Scénario 2 : `findManyPublished` exclut les projets non publiés

**GIVEN** une BDD contenant 3 projets : `p1 (status=PUBLISHED)`, `p2 (status=DRAFT)`, `p3 (status=ARCHIVED)`
**WHEN** on appelle `findManyPublished()`
**THEN** le résultat contient uniquement `p1`
**AND** `p2` et `p3` sont absents

### Scénario 3 : `findManyPublished({ type })` applique le filtre

**GIVEN** une BDD contenant 2 projets PUBLISHED : `cli (type=CLIENT)` et `perso (type=PERSONAL)`
**WHEN** on appelle `findManyPublished({ type: 'CLIENT' })`
**THEN** le résultat contient uniquement `cli`
**WHEN** on appelle `findManyPublished({ type: 'PERSONAL' })`
**THEN** le résultat contient uniquement `perso`
**WHEN** on appelle `findManyPublished()` sans paramètre
**THEN** le résultat contient les deux projets

### Scénario 4 : `findManyPublished` retourne les projets triés `Project.displayOrder asc`

**GIVEN** trois projets PUBLISHED : `a (displayOrder=10)`, `b (displayOrder=0)`, `c (displayOrder=5)`
**WHEN** on appelle `findManyPublished()`
**THEN** le résultat est `[b, c, a]` dans cet ordre (le 0 en premier, tri ASC)

### Scénario 5 : `findManyPublished` inclut les relations `tags` (via ProjectTag ordonné) et `clientMeta.company` nested

**GIVEN** un projet CLIENT PUBLISHED lié à 3 tags via ProjectTag (un FRAMEWORK "React" avec `displayOrder=1`, une EXPERTISE "Scraping anti-bot" avec `displayOrder=0`, un INFRA "Docker" avec `displayOrder=2`), un ClientMeta avec `workMode: REMOTE`, et une Company `Airbus` (sectors: [LOGICIELS_ENTREPRISE], size: GROUPE, locations: [FRANCE])
**WHEN** on appelle `findManyPublished()`
**THEN** chaque élément du résultat a `tags: ProjectTag[]` (array non null, 3 rows ProjectTag triés par `displayOrder` ASC — scraping puis React puis Docker) où chaque `ProjectTag.tag` expose `slug`, `name`, `kind`, `icon` ; et `clientMeta: ClientMeta | null`
**AND** si `clientMeta !== null`, il contient `clientMeta.company: Company` non-null avec le nom "Airbus", `clientMeta.workMode === 'REMOTE'`, `clientMeta.company.sectors === ['LOGICIELS_ENTREPRISE']`, `clientMeta.company.size === 'GROUPE'`

### Scénario 6 : `findPublishedBySlug` retourne le projet avec relations (Company nested, tags ordonnés)

**GIVEN** un projet CLIENT `p1 (slug='mon-projet', status=PUBLISHED)` avec 3 tags liés via ProjectTag (mélange EXPERTISE + techno, ordres 0/1/2), un clientMeta avec workMode, et une Company liée
**WHEN** on appelle `findPublishedBySlug('mon-projet')`
**THEN** le résultat est un objet non-null avec le slug correct, `tags.length === 3`, tags triés par `displayOrder` ASC, `clientMeta !== null`, et `clientMeta.company !== null`

### Scénario 7 : `findPublishedBySlug` retourne `null` pour un slug inexistant

**GIVEN** une BDD qui ne contient pas de projet avec slug `'inexistant'`
**WHEN** on appelle `findPublishedBySlug('inexistant')`
**THEN** le résultat est `null`

### Scénario 8 : `findPublishedBySlug` retourne `null` pour un projet DRAFT

**GIVEN** un projet `p1 (slug='mon-brouillon', status=DRAFT)` en BDD
**WHEN** on appelle `findPublishedBySlug('mon-brouillon')`
**THEN** le résultat est `null` (même si le slug existe, le filtre `status=PUBLISHED` masque le projet)

## Tests à écrire

### Integration

- `tests/integration/projects-queries.integration.test.ts` :
  - **Test 1** : `findManyPublished()` exclut les projets `status=DRAFT` et `status=ARCHIVED` → ne garde que `PUBLISHED` (couvre scénario 2)
  - **Test 2** : `findManyPublished({ type: 'CLIENT' })` retourne uniquement les projets `type=CLIENT` et `status=PUBLISHED` (couvre scénario 3, cas CLIENT)
  - **Test 3** : `findManyPublished({ type: 'PERSONAL' })` retourne uniquement les projets `type=PERSONAL` et `status=PUBLISHED` (couvre scénario 3, cas PERSONAL)
  - **Test 4** : `findManyPublished()` retourne les projets triés par `Project.displayOrder` ascendant, 0 en premier (couvre scénario 4)
  - **Test 5** : `findManyPublished()` inclut les `tags` via `ProjectTag` triés par `displayOrder` asc (chaque `ProjectTag.tag` exposé), `clientMeta`, et `clientMeta.company` nested (avec sectors, size, locations) dans chaque row du résultat (couvre scénario 5)
  - **Test 6** : `findPublishedBySlug('slug-published')` retourne le projet avec ses relations non-null, tags via ProjectTag triés par displayOrder asc, incluant `clientMeta.company` (couvre scénario 6)
  - **Test 7** : `findPublishedBySlug('slug-inexistant')` ET `findPublishedBySlug('slug-draft')` retournent `null` (couvre scénarios 7 + 8, fusionnés en un seul test paramétré)

Chaque test suit le pattern `arrange → act → assert` avec :
- **arrange** : insertion de fixtures via `prisma.company.create({ data: { ... } })` d'abord (une seule Company réutilisable), puis création des `Tag` référentiels, puis `prisma.project.create({ data: { ..., clientMeta: { create: { companyId, workMode, ... } }, tags: { create: [{ tag: { connect: { slug } }, displayOrder: 0 }, ...] } } })`. L'ordre est important : Company et Tag existent avant ClientMeta / ProjectTag (contraintes FK).
- **act** : appel de la query testée
- **assert** : vérification structurée via `expect(result).toMatchObject({ ... })` ou `expect(result.length).toBe(...)` + propriétés ciblées (y compris `result[0].clientMeta?.company?.name === 'Airbus'`)

**Pas de test `none` au-delà de ces 7** (règle no-lib-test) :
- Pas de test "le singleton s'instancie" → c'est du plumbing Prisma
- Pas de test "prisma.$connect réussit" → plumbing driver PG
- Pas de test "les types TypeScript sont correctement inférés" → tâche du compilateur, pas d'un test runtime

→ `tdd_scope = partial` confirmé (7 tests ciblés règles métier, pas exhaustif).

## Edge cases

- **BDD test non initialisée** : si `DATABASE_URL` pointe vers une BDD qui n'a pas les tables créées, `resetDatabase` ou les fixtures crashent avec `PGRST-like` error. Documenter dans le plan que `pnpm prisma migrate deploy` sur `portfolio_test` est un prérequis avant `vitest run`.
- **Projet avec `endedAt = null`** (mission en cours) : `findManyPublished` le renvoie avec `endedAt: null`. Aucun filtrage sur `endedAt`, c'est un champ d'affichage.
- **Projet PUBLISHED sans `clientMeta`** (PERSONAL) : `clientMeta: null` dans le résultat. Le consommateur UI doit gérer `null` (conditionnellement afficher les champs CLIENT-only).
- **Projet PUBLISHED sans `tags`** (edge case improbable mais possible) : `tags: []` (array de `ProjectTag` vide). Les composants UI doivent supporter un tableau vide (pas de crash sur `.map`).
- **Trim / case-sensitivity sur `slug`** : `findPublishedBySlug` utilise une comparaison stricte Postgres (case-sensitive). Si un consommateur passe `'Mon-Projet'` vs `'mon-projet'`, il reçoit `null`. Pas de normalisation interne (responsabilité du consommateur qui reçoit le slug depuis l'URL).
- **Connexion PG perdue en runtime** : PrismaClient lève une erreur (`P1017` ou similaire). Non géré ici (pas de retry, pas de fallback — la page catchera via `error.tsx` de Next.js côté UI).

## Architectural decisions

### Décision : Include `tags` (via ProjectTag, triés par `displayOrder`) + `clientMeta` (avec `company` nested) par défaut dans `findManyPublished`

**Options envisagées :**
- **A. Include toujours les relations nested** : signature `findManyPublished({ type? })`, include fixé côté query (`tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } }, clientMeta: { include: { company: true } }`). Simple, 1 seul consommateur en MVP (page liste) qui a besoin des badges tags ordonnés par-projet et de `clientMeta.company.name` + `logoFilename` + `sectors` + etc.
- **B. Include paramétrable** : signature `findManyPublished({ type?, include?: { tags?, clientMeta?, company? } })`. Flexibilité, pas utilisée en MVP.
- **C. Deux fonctions** : `findManyPublishedSummary` (sans relations) + `findManyPublishedWithRelations` (avec). Explicite, verbeux pour 1 seul usage.

**Choix : A**

**Rationale :**
- 1 seul consommateur MVP (page liste) qui a besoin des 3 relations pour afficher la card CLIENT (badges tags + `clientMeta.workMode` + `clientMeta.company.name` + `clientMeta.company.logoFilename`).
- Volume faible (~10 projets) : le coût de la jointure Company supplémentaire est négligeable.
- Si un besoin divergent apparaît plus tard (ex: API publique sans relations pour alléger), on refactorise à ce moment-là.
- Principe YAGNI.

### Décision : Tri serveur `displayOrder asc` figé, pas de param `sort`

**Options envisagées :**
- **A. Tri serveur figé `displayOrder asc`** : la query retourne toujours dans le même ordre. L'UI gère un re-sort client-side si elle propose un tri alternatif "par date".
- **B. Param `sort` dans la query** : `findManyPublished({ type?, sort?: 'displayOrder' | 'endedAt' })`. Tri serveur pour chaque valeur, SSR cohérent avec l'URL (meilleur SEO sur variantes triées).

**Choix : A**

**Rationale :**
- L'utilisateur pilote manuellement `Project.displayOrder` (0, 1, 2, ...) — tri ASC = le 0 s'affiche en premier, intuitif.
- Volume faible (~10 projets) : re-sort côté client instantané si un tri alternatif est proposé, pas de flash significatif à l'hydratation.
- Simplicité API : pas d'options à maintenir, pas de matrice de tests `sort × type` à écrire.
- Peut évoluer vers l'option B si le volume explose ou si un besoin SEO de tri serveur spécifique apparaît.

### Décision : Type alias `ProjectWithRelations` plutôt que DTO explicites

**Options envisagées :**
- **A. Type alias `ProjectWithRelations = Prisma.ProjectGetPayload<{ include: { tags: { include: { tag: true } }, clientMeta: { include: { company } } } }>`** dans `src/types/project.ts`. Un nom stable, type-safe, pas de mapping. Tags passent par `ProjectTag[]` nested (chaque row expose `displayOrder` + relation `tag`). Company est nested sous clientMeta.
- **B. Types Prisma inline** dans chaque consommateur : `Prisma.ProjectGetPayload<{...}>` répété dans les composants UI. Pas de fichier supplémentaire mais duplication de l'include.
- **C. DTO explicites** : `ProjectCardData`, `ProjectCaseStudyData` avec mapping Prisma → DTO. Découplage fort BDD/UI.

**Choix : A**

**Rationale :**
- Site vitrine single-user : 1 seule vue publique (pas d'admin MVP). Pas de nécessité de découplage BDD/UI.
- Schéma Prisma déjà UI-friendly (`title`, `description`, `slug` — conçus avec l'UI en tête).
- DTO = mapping à chaque évolution sans gain réel. Le gain "changer le schéma sans toucher l'UI" est faux : un changement d'UX implique un changement d'UI de toute façon.
- Type alias = zéro boilerplate, type-safety totale, nom stable. Si un jour un dashboard admin ou une API REST publique s'ajoute, on introduira des DTO pour ces nouveaux consommateurs aux contraintes différentes.

### Décision : BDD de test dédiée `portfolio_test` + TRUNCATE CASCADE

**Options envisagées :**
- **A. BDD dédiée `portfolio_test` + TRUNCATE CASCADE** avant chaque test : `beforeEach` nettoie les tables, isolation forte, rapide (~50ms).
- **B. `prisma migrate reset`** entre suites de tests : plus lent (~2s par reset) mais plus complet (ré-applique les migrations).
- **C. Transaction rollback par test** : chaque test exécute dans `prisma.$transaction` + rollback forcé. Très rapide mais fragile (ne supporte pas les queries testées qui ouvrent leurs propres transactions imbriquées).

**Choix : A**

**Rationale :**
- TRUNCATE CASCADE est la meilleure balance performance / isolation pour un test suite qui a peu de tables (5 : `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag`).
- Compatible avec toute query : nos futures mutations (si un jour on en ajoute) pourront ouvrir leur propre transaction sans conflit.
- Le schéma ne change pas entre tests (les migrations sont appliquées une fois au setup du container), donc pas besoin de `migrate reset` coûteux.
- Conforme aux patterns [.claude/rules/vitest/setup.md](../../../../.claude/rules/vitest/setup.md) (config Vitest pour intégration BDD).

### Décision : `findPublishedBySlug` utilise `findFirst` (pas `findUnique`)

**Options envisagées :**
- **A. `findFirst` avec `where: { slug, status: 'PUBLISHED' }`** : permet de combiner le filtre unique (slug) avec un filtre non-unique (status). Prisma génère un SELECT ... WHERE slug = ? AND status = ? LIMIT 1.
- **B. `findUnique` avec `where: { slug }` + vérification status en code applicatif** : 2 étapes (fetch puis check). Plus explicite mais 2 allers-retours Prisma si on doit fetch complet.

**Choix : A**

**Rationale :**
- Sémantique alignée : on veut "le projet publié dont le slug est X, ou null". `findFirst` exprime ça directement en SQL.
- 1 seule requête BDD au lieu de 2.
- Prisma ne supporte pas `findUnique({ where: { slug, status } })` car `status` n'est pas unique — tentative refusée au typage.

### Décision : Logging Prisma minimal (`['warn', 'error']`)

**Options envisagées :**
- **A. `log: ['warn', 'error']`** : capte les vrais problèmes (connexion perdue, deadlock) sans bruit.
- **B. Wrapper Pino custom pour slow-queries** : mesure durée, log Pino si > seuil (ex: 500ms).
- **C. `log: ['query', 'warn', 'error']` en dev** : logs toutes les queries en dev, utile pour debug.

**Choix : A**

**Rationale :**
- Volume faible (~10 projets) : aucune query ne franchira un seuil de slow-query.
- Pino wrapper custom = overhead dev pour gain nul au MVP. Ajoutable plus tard.
- `log: ['query']` en dev peut être activé ponctuellement à la demande par override d'env var, pas en dur.

