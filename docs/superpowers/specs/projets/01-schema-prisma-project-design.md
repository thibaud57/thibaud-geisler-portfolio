---
feature: "Feature 2 — Projets (liste + case studies)"
subproject: "schema-prisma-project"
goal: "Ajouter les modèles Prisma Project, ClientMeta, Company, Tag, ProjectTag et la migration initiale qui crée les tables en base"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: []
date: "2026-04-22"
---

# Schéma Prisma : modèles Project, ClientMeta, Company, Tag, ProjectTag

## Scope

Déclarer les cinq modèles Prisma qui structurent la donnée des projets du portfolio : `Project` (table principale), `ClientMeta` (relation 1:1 optionnelle, métadonnées propres à la mission CLIENT), `Company` (référentiel 1:N pour les entreprises clientes, réutilisable entre projets), `Tag` (référentiel m:n unifié qui couvre technos / infra / outils / expertises métier, distingués par un discriminant `kind`) et `ProjectTag` (table de jointure explicite Project ↔ Tag portant un `displayOrder` par-projet, permet qu'un même tag soit en position 1 sur un projet et en position 3 sur un autre). Déclarer les huit enums associés : `ProjectType`, `ProjectStatus`, `ProjectFormat` (multi sur Project : API / Web App / App Mobile / Desktop App / CLI / IA), `ContractStatus`, `WorkMode` (présentiel / hybride / remote), `TagKind` (6 valeurs dont `EXPERTISE`), `CompanySize` (TPE / PME / ETI / GROUPE), `CompanySector` (11 valeurs FR), `CompanyLocation` (8 valeurs FR). Générer la migration initiale via `prisma migrate dev --name add_project_schema`, créer `prisma.config.ts` (règle Prisma 7), et mettre à jour `docs/BRAINSTORM.md` pour refléter la modélisation élargie. **Exclus** : singleton PrismaClient et queries (sub-project 02), seed des données (sub-project 03), route API assets (04), pages UI (05, 06), mutations admin (post-MVP).

### État livré

À la fin de ce sub-project, on peut : exécuter `pnpm prisma migrate dev --name add_project_schema` sans erreur, ouvrir `pnpm prisma studio` et voir les tables `Project`, `ClientMeta`, `Company`, `Tag` et `ProjectTag` (table de jointure explicite) avec tous les champs attendus, et constater que `pnpm prisma generate` produit les types TypeScript dans `src/generated/prisma/`.

## Dependencies

Aucune, ce sub-project est autoporté.

## Files touched

- **À modifier** : `prisma/schema.prisma` (remplacer le squelette actuel par les modèles complets)
- **À créer** : `prisma/migrations/<timestamp>_add_project_schema/migration.sql` (généré par `prisma migrate dev`)
- **À créer** : `prisma.config.ts` (règle Prisma 7 : `DATABASE_URL` déclarée ici, plus dans `datasource db`)
- **À modifier** : `.env.example` (ajout `DATABASE_URL="postgresql://..."` si absente)
- **À vérifier / modifier** : `.gitignore` (s'assurer que `src/generated/prisma/` y est, sinon l'ajouter)
- **À modifier** : `docs/BRAINSTORM.md` (section Feature 2 : remplacer `published (boolean)` par `status (enum)`, mentionner la nouvelle dimension `formats ProjectFormat[]` multi-select, le modèle `Company` séparé avec relation depuis ClientMeta, la relation unifiée `tags` avec discriminant `kind` incluant `EXPERTISE`, et le champ `workMode` sur ClientMeta)

## Architecture approach

- **Provider Prisma v7** : `generator client { provider = "prisma-client"; output = "../src/generated/prisma" }`, pas `prisma-client-js` (retiré en v7). Conforme à [.claude/rules/prisma/schema-migrations.md](../../../.claude/rules/prisma/schema-migrations.md), `provider = "prisma-client"` + champ `output` obligatoire.
- **Configuration URL via `prisma.config.ts`** : le bloc `datasource db` ne garde que `provider = "postgresql"`, l'URL vient de `prisma.config.ts` (règle v7, déprécié dans `schema.prisma`). Voir [.claude/rules/prisma/schema-migrations.md](../../../.claude/rules/prisma/schema-migrations.md).
- **IDs UUID v7** : tous les `@id` utilisent `@default(uuid(7))`, ordonnés temporellement, meilleure localité B-tree que UUID v4 ou cuid. Voir [.claude/rules/prisma/schema-migrations.md](../../../.claude/rules/prisma/schema-migrations.md).
- **Types colonnes** : `String` mappe vers `TEXT` par défaut (pas de `VARCHAR(n)`), les timestamps sont explicitement typés `@db.Timestamptz` pour utiliser `TIMESTAMPTZ` plutôt que `TIMESTAMP`. Voir [.claude/rules/prisma/schema-migrations.md](../../../.claude/rules/prisma/schema-migrations.md).
- **Relation m:n Project ↔ Tag via table de jointure explicite `ProjectTag`** : table explicite nécessaire car l'ordre d'affichage des tags varie par-projet (un même tag peut être en 1ʳᵉ position sur un projet et en 3ᵉ sur un autre). Le modèle porte `projectId`, `tagId`, `displayOrder Int @default(0)`, clé primaire composite `@@id([projectId, tagId])`, et index `@@index([projectId, displayOrder])` pour accélérer le tri par-projet. `onDelete: Cascade` côté Project (supprimer le projet retire ses liaisons), `onDelete: Restrict` côté Tag (protège le référentiel). Côté Project et Tag, la relation est `tags ProjectTag[]` / `projects ProjectTag[]` (plus de many-to-many implicite).
- **Relation 1:1 optionnelle Project ↔ ClientMeta** : `clientMeta ClientMeta?` côté Project, `projectId String @unique` + `project Project @relation(...)` côté ClientMeta. Cascade delete : `onDelete: Cascade` pour supprimer ClientMeta automatiquement si le Project est supprimé.
- **Relation N:1 obligatoire ClientMeta → Company** : `companyId String` + `company Company @relation(...)` côté ClientMeta (required : toute mission CLIENT référence une entreprise). `onDelete: Restrict` côté Company pour empêcher la suppression d'une entreprise encore référencée. Reverse : `clientMetas ClientMeta[]` côté Company (une entreprise peut avoir plusieurs missions successives).
- **Champ `formats ProjectFormat[]` sur Project** : stocké comme array Postgres natif (Prisma supporte `enum[]`), un projet a 1-N formats (ex: Webapp Gestion Sinistres = `[WEB_APP, API]`, Flight Search API = `[API]`).
- **Pas d'index secondaire** : volume cible ~10 projets, le scan séquentiel est plus rapide qu'un index scan. Prisma crée déjà les indexes uniques sur `Project.slug`, `Tag.slug`, `Company.slug`.
- **Post-install generate** : configurer `"postinstall": "prisma generate"` dans `package.json` si absent (règle Prisma v7 : `migrate dev` ne lance plus `generate` automatiquement). Voir [.claude/rules/prisma/schema-migrations.md](../../../.claude/rules/prisma/schema-migrations.md).
- **Client généré non versionné** : le dossier `src/generated/prisma/` est ajouté au `.gitignore` (règle Prisma v7). Voir [.claude/rules/typescript/conventions.md](../../../.claude/rules/typescript/conventions.md).
- **Champs par modèle** :
  - `Project` : `id` UUID v7, `slug` unique, `title`, `description`, `type` (enum `ProjectType`), `status` (enum `ProjectStatus`, défaut `DRAFT`), `formats` (enum `ProjectFormat[]`, array multi-valeurs), `startedAt`/`endedAt` nullable, `githubUrl`/`demoUrl` nullable, `coverFilename` nullable, `caseStudyMarkdown` nullable, `displayOrder` int défaut 0 (ordre du projet sur la page liste, **pas** l'ordre des tags du projet), relation `tags` (`ProjectTag[]`) + `clientMeta` (1:1 opt), timestamps `createdAt`/`updatedAt`
  - `ClientMeta` : `id` UUID v7, `projectId` unique FK vers Project avec `onDelete: Cascade`, `companyId` FK required vers Company avec `onDelete: Restrict`, `teamSize` int nullable, `contractStatus` (enum `ContractStatus`, nullable), `workMode` (enum `WorkMode`, required, présentiel/hybride/remote), timestamps. **Note** : plus de champ `companyName` (remplacé par relation `Company`).
  - `Company` : `id` UUID v7, `slug` unique (dérivé du nom), `name`, `logoFilename` nullable (image placée manuellement dans `/assets`), `websiteUrl` nullable, `sectors` (enum `CompanySector[]`, array multi-valeurs), `size` (enum `CompanySize`, nullable), `locations` (enum `CompanyLocation[]`, array multi-valeurs), reverse relation `clientMetas`, timestamps
  - `Tag` : `id` UUID v7, `slug` unique, `name`, `kind` (enum `TagKind` à 6 valeurs : `LANGUAGE`, `FRAMEWORK`, `DATABASE`, `INFRA`, `AI`, `EXPERTISE`), `icon` nullable (format string `"<lib>:<slug>"`, ex: `"simple-icons:react"` pour les technos ou `"lucide:spider"` pour les expertises ; validation du format reportée au seed sub-project 03 via Zod), relation inverse `projects ProjectTag[]`, timestamps. **Note** : plus de champ `displayOrder` global, l'ordre d'affichage est porté par `ProjectTag.displayOrder` par-projet.
  - `ProjectTag` : table de jointure explicite Project ↔ Tag. `projectId` FK vers Project avec `onDelete: Cascade`, `tagId` FK vers Tag avec `onDelete: Restrict`, `displayOrder Int @default(0)` (tri ASC, 0 en premier, pour piloter l'ordre des tags **de ce projet** sur la card liste et dans chaque groupe de la case study). Clé primaire composite `@@id([projectId, tagId])` (un même tag ne peut être lié qu'une fois à un projet). Index `@@index([projectId, displayOrder])` pour accélérer la query typique `orderBy: { displayOrder: 'asc' }` filtrée par projet.
- **Valeurs enum** :
  - `ProjectFormat { API, WEB_APP, MOBILE_APP, DESKTOP_APP, CLI, IA }`
  - `WorkMode { PRESENTIEL, HYBRIDE, REMOTE }` (mixte FR/anglicisme standard)
  - `CompanySize { TPE, PME, ETI, GROUPE }` (nomenclature standard FR)
  - `CompanySector` (11 valeurs FR) : `ASSURANCE`, `FINTECH`, `SAAS`, `SERVICES_RH`, `ESN_CONSEIL`, `LOGICIELS_ENTREPRISE`, `ECOMMERCE`, `IA_AUTOMATISATION`, `EMARKETING`, `BANQUE`, `AUTRE`
  - `CompanyLocation` (8 valeurs) : `LUXEMBOURG`, `PARIS`, `GRAND_EST`, `FRANCE`, `BELGIQUE`, `SUISSE`, `EUROPE`, `MONDE`

## Acceptance criteria

### Scénario 1 : Migration initiale exécutable

**GIVEN** un environnement de développement avec PostgreSQL 18 démarré via `just docker-up` et une BDD vide `portfolio_dev`
**WHEN** on exécute `pnpm prisma migrate dev --name add_project_schema`
**THEN** la commande termine sans erreur et crée un dossier `prisma/migrations/<timestamp>_add_project_schema/` contenant un fichier `migration.sql`
**AND** les tables `Project`, `ClientMeta`, `Company`, `Tag` et la table de jointure explicite `ProjectTag` (avec colonne `displayOrder`) existent dans la BDD
**AND** les 10 enums (`ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `CompanySize`, `CompanySector`, `CompanyLocation`) sont créés côté PostgreSQL
**AND** l'enum `TagKind` contient exactement les 6 valeurs `LANGUAGE`, `FRAMEWORK`, `DATABASE`, `INFRA`, `AI`, `EXPERTISE`
**AND** l'enum `ProjectFormat` contient exactement les 6 valeurs `API`, `WEB_APP`, `MOBILE_APP`, `DESKTOP_APP`, `CLI`, `IA`
**AND** l'enum `CompanySize` contient exactement `TPE`, `PME`, `ETI`, `GROUPE`

### Scénario 2 : Client Prisma généré et typé

**GIVEN** la migration précédente exécutée
**WHEN** on exécute `pnpm prisma generate`
**THEN** le dossier `src/generated/prisma/` est créé et contient les types TypeScript des modèles
**AND** `ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `CompanySize`, `CompanySector`, `CompanyLocation` sont exportés en tant qu'unions TypeScript
**AND** le type `Project` inclut le champ nullable `coverFilename: string | null` (référence le nom du fichier image de cover servi par la route `/api/assets/[filename]` du sub-project 04)
**AND** le type `Project` inclut le champ nullable `caseStudyMarkdown: string | null` (contenu narratif riche en markdown, rendu via react-markdown sur la page case study du sub-project 06 ; images inline via `![alt](/api/assets/filename)`)
**AND** le type `Project` inclut le champ array `formats: ProjectFormat[]` (multi-valeurs, non nullable mais peut être vide)
**AND** le type `Tag` inclut les champs `kind: TagKind` et `icon: string | null` (plus de champ `displayOrder` global)
**AND** le type `ProjectTag` inclut les champs `projectId: string`, `tagId: string`, `displayOrder: number` et les relations `project` + `tag`
**AND** le type `Company` inclut les champs `slug`, `name`, `logoFilename: string | null`, `websiteUrl: string | null`, `sectors: CompanySector[]`, `size: CompanySize | null`, `locations: CompanyLocation[]`
**AND** le type `ClientMeta` inclut le champ `companyId: string` (required) et la relation `company: Company` ; le champ `workMode: WorkMode` est required ; il n'y a PLUS de champ `companyName`

### Scénario 3 : Contrainte unique sur `slug`

**GIVEN** la BDD avec les tables créées et un enregistrement `Project { slug: "mon-projet", ... }`
**WHEN** on tente d'insérer un second `Project { slug: "mon-projet", ... }` via `prisma studio` ou une requête SQL
**THEN** PostgreSQL retourne une erreur de violation de contrainte unique

### Scénario 4 : Relation 1:1 optionnelle Project ↔ ClientMeta avec cascade

**GIVEN** un `Project` avec un `ClientMeta` associé (projectId = id du Project) lui-même lié à une `Company` (companyId)
**WHEN** on supprime le `Project` via `prisma studio` ou SQL
**THEN** le `ClientMeta` associé est automatiquement supprimé (cascade)
**AND** la `Company` liée n'est PAS supprimée (une entreprise peut avoir d'autres projets)
**AND** tenter de supprimer la `Company` tant qu'une `ClientMeta` la référence lève une erreur foreign key (`onDelete: Restrict`)

### Scénario 4bis : Réutilisation d'une `Company` entre plusieurs projets

**GIVEN** 2 projets CLIENT ayant chacun un `ClientMeta` pointant vers la même `Company` (ex: Foyer)
**WHEN** on requête `prisma.company.findUnique({ where: { slug: 'foyer' }, include: { clientMetas: { include: { project: true } } } })`
**THEN** on obtient l'entreprise avec la liste de ses 2 projets liés

### Scénario 5 : Relation m:n Project ↔ Tag via table de jointure explicite `ProjectTag`

**GIVEN** la BDD avec un `Project` et trois `Tag` couvrant des kinds distincts (ex: un `FRAMEWORK` "React", une `EXPERTISE` "Scraping anti-bot", un `INFRA` "Docker")
**WHEN** on crée trois rows `ProjectTag { projectId, tagId, displayOrder }` avec `displayOrder` 0, 1, 2 (ordre souhaité)
**THEN** la requête Prisma `findUnique({ where: { id }, include: { tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } } } })` retourne le project avec ses 3 `ProjectTag` ordonnés (0 → 1 → 2), chaque `ProjectTag.tag` exposant `slug`, `name`, `kind`, `icon`
**AND** supprimer le project retire ses rows `ProjectTag` (cascade) sans toucher aux rows `Tag`
**AND** tenter de supprimer un `Tag` encore référencé par au moins une row `ProjectTag` lève une erreur foreign key (`onDelete: Restrict`)

### Scénario 6 : `prisma.config.ts` fournit l'URL

**GIVEN** le fichier `prisma.config.ts` déclarant `schema` + `url` (lecture via `process.env.DATABASE_URL`)
**AND** le bloc `datasource db` dans `schema.prisma` ne contient que `provider = "postgresql"`
**WHEN** on exécute `pnpm prisma migrate dev`
**THEN** la migration s'exécute sans nécessiter `DATABASE_URL` directement dans `schema.prisma`

## Edge cases

- **BDD déjà peuplée avec des données** : la migration initiale crée les tables vides. Si une exécution précédente a laissé des tables inattendues (mauvaise config locale), `prisma migrate dev` propose un reset. À exécuter en local uniquement, jamais sur prod.
- **`prisma.config.ts` absent en v7** : la CLI v7 refuse d'exécuter si le fichier manque ET que `datasource db` n'a pas d'URL. Vérifier sa présence avant `migrate dev`.
- **Mismatch ESM** : Prisma v7 est ESM-only (`"type": "module"` requis dans `package.json`). Vérifier que le projet est bien en ESM avant d'exécuter les commandes Prisma.
- **Slug vide** : aucune contrainte applicative ici (le check passera par Zod dans le sub-project 02). Le schéma ne garantit que l'unicité, pas la validité du format slug.
- **Suppression d'un `Tag` référencé** : bloquée par `onDelete: Restrict` sur `ProjectTag.tagId`. Pour supprimer un Tag : d'abord retirer les rows `ProjectTag` qui le référencent (suppression manuelle ou retrait du tag des `tagSlugs[]` de tous les projets + re-seed). Comportement voulu : évite les suppressions accidentelles qui videraient silencieusement les tags d'un projet.
- **Deux projets donnent un `displayOrder` identique à leurs `ProjectTag`** : acceptable (c'est la valeur par-projet). Un tag peut être en position 0 sur le projet A et en position 3 sur le projet B, le modèle explicite le supporte nativement. La clé primaire composite `(projectId, tagId)` empêche uniquement le doublon exact d'une liaison projet-tag.
- **Tag avec `icon = null`** : acceptable. Le rendu badge côté UI (sub-projects 05/06) utilisera alors un fallback texte seul (pas de glyphe). Cas typique : une techno sans logo Simple Icons connu (ex: un framework confidentiel), ou une expertise que l'on veut afficher textuellement.
- **Format `icon` invalide** : le schéma Prisma n'impose pas le format `<lib>:<slug>`. La validation est appliquée au seed (sub-project 03) via Zod (`z.string().regex(/^(simple-icons|lucide):[a-z0-9-]+$/).nullable()`). Si un icon invalide atteint la BDD (import direct SQL), le badge UI tombe en fallback texte.
- **Projet avec `formats` vide** (`[]`) : acceptable (ex: donnée historique pas encore catégorisée). Le badge Format sur la card/case study est simplement absent. Le seed devrait toujours remplir au moins 1 format, un lint manuel peut attraper les oublis.
- **Company sans `size` / `locations` / `sectors`** : tous les champs métier de Company sont optionnels sauf `slug` et `name`. Un projet très ancien peut avoir une entreprise minimale. L'UI case study affiche conditionnellement ces champs (si `null` / `[]` → masqué).
- **`companyId` required sur ClientMeta** : si le seed oublie de lier une `Company`, Prisma rejette l'insertion au seed (contrainte FK). Au workflow : toujours créer la `Company` AVANT le `Project` qui la référence (ordre d'upsert dans seed.ts).
- **Suppression d'une `Company` référencée** : bloquée par `onDelete: Restrict`. Pour supprimer : d'abord supprimer les projets CLIENT liés (ou réassigner `ClientMeta.companyId`). Comportement voulu, évite les orphelins silencieux.

## Architectural decisions

### Décision : Boolean `published` remplacé par enum `ProjectStatus { DRAFT, PUBLISHED, ARCHIVED }`

**Options envisagées :**
- **A. `published Boolean`** (modélisation d'origine dans `BRAINSTORM.md`) : deux états seulement, visible ou non. Simple.
- **B. `status ProjectStatus` avec trois valeurs DRAFT / PUBLISHED / ARCHIVED** : trois états, distinction entre brouillon, publié et archivé.

**Choix : B**

**Rationale :**
- Le contenu riche case study (contexte, défis, solution, screenshots) prend du temps à rédiger. Un état `DRAFT` permet de préparer un projet en BDD sans l'exposer publiquement.
- Un projet client qui devient conflictuel (fin de mission, repositionnement) gagne à être `ARCHIVED` plutôt que supprimé, la data et les assets restent récupérables.
- Coût d'ajout maintenant = ~15 min (1 enum + 1 champ). Coût d'une migration `boolean` → `enum` plus tard = migration de données + refactor de toutes les queries.
- `BRAINSTORM.md` sera mis à jour pour refléter la décision (modélisation vivante, pas figée).

### Décision : `ClientMeta` comme modèle enfant au lieu de champs nullables sur `Project`

**Options envisagées :**
- **A. Champs nullables sur `Project`** (`companyName String?`, `teamSize Int?`, `contractStatus ContractStatus?`) : simple, 1 table, 1 query, 1 composant UI.
- **B. Modèle enfant `ClientMeta` en relation 1:1 optionnelle** : propre, extensible sans polluer `Project`.

**Choix : B**

**Rationale :**
- Les métadonnées CLIENT-only ne font sens que pour `type = CLIENT`. Les laisser sur `Project` pollue le modèle et ne garantit pas leur cohérence sémantique.
- Extensibilité future : ajout trivial de `dailyRate`, `clientIndustry`, `role`, `testimonial`, `nda` sans modifier `Project`. Le user a explicitement anticipé que la liste pourrait grossir.
- Cost : +1 jointure à certaines queries (quand on veut afficher la carte "Freelance chez X, équipe de Y, statut Z"). Acceptable vu le volume.
- Relation 1:1 optionnelle côté Prisma : `clientMeta ClientMeta?` sur `Project`, unique index `projectId` sur `ClientMeta`.

### Décision : `Company` comme modèle référentiel séparé (relation N:1 depuis ClientMeta)

**Options envisagées :**
- **A. Champ `companyName String?` sur `ClientMeta`** : simple, pas de relation, data en string libre.
- **B. Modèle `Company` référentiel avec relation N:1 depuis `ClientMeta`** : une entreprise existe une seule fois en BDD, référencée par N missions. Enrichi avec secteur, taille, localisations, logo, site web.
- **C. Enrichir `ClientMeta` avec flat fields (companyLogoFilename, companyWebsite, companySector...)** : tout plat sans nouvelle table. Simple mais duplique la data à chaque nouveau projet chez la même entreprise.

**Choix : B**

**Rationale :**
- Une entreprise peut avoir plusieurs missions (ex: 3 projets chez Foyer). Option B permet de ne remplir `Company.name`, `Company.logoFilename`, `Company.websiteUrl` qu'une seule fois, réutilisés automatiquement.
- Enrichissement portfolio : afficher "Freelance chez Foyer (Assurance, ETI, Luxembourg)" ajoute du contexte fort pour prospects/recruteurs. Impossible avec option A (juste le nom).
- Extensibilité : ajouter `logo`, `testimonial`, `clientRelationship` plus tard est un ALTER TABLE simple sur Company, n'impacte pas les N missions.
- Reverse relation `clientMetas` côté Company permet la query inverse ("liste des projets chez Foyer") utile pour regrouper des réalisations par entreprise si besoin éditorial.
- Coût : +1 table, +1 jointure sur la page case study CLIENT. Négligeable vu le volume.

### Décision : `formats ProjectFormat[]` comme enum Prisma natif (pas modèle Tag avec kind PROJECT_TYPE)

**Options envisagées :**
- **A. Enum Prisma natif `ProjectFormat[]` sur `Project`** : array Postgres natif, 6 valeurs fixes (API, WEB_APP, MOBILE_APP, DESKTOP_APP, CLI, IA), typage fort TypeScript, badge UI sans icône (étiquette catégorique).
- **B. Intégrer comme 7e valeur de `TagKind` (ex: `FORMAT`)** : les formats deviennent des Tags comme les autres, avec icône Lucide et `displayOrder`.
- **C. Champ `formatCsv String` libre** : flexibilité maximale mais perte de typage + validation.

**Choix : A**

**Rationale :**
- Set fermé et stable : 6 valeurs bien définies qui bougent rarement. Un enum Prisma est plus rigoureux qu'un Tag (validation compile-time TypeScript).
- Sémantique différente des Tags : un Format est une **catégorie technique de ce que le projet EST** (API, Web App...), pas un outil ou une expertise. Le mélanger dans Tag dilue la lecture visuelle.
- Affichage voulu : badge UI **sans icône**, `variant="outline"` dans shadcn/ui Badge, positionné à côté ou sous le titre du projet (card + case study header). Visuellement distinct des Tags (qui ont leurs icônes et sont au bottom de la card).
- Pas de gestion complexe de relation ni de seed Tag additionnel : le format est un champ scalaire sur Project.
- Si dans le futur on veut ajouter un 7e format (ex: `CHROME_EXTENSION`), c'est une simple migration enum Postgres.

### Décision : `WorkMode` required sur ClientMeta (mode de travail mission)

**Options envisagées :**
- **A. `workMode WorkMode` required** : enum 3 valeurs (PRESENTIEL / HYBRIDE / REMOTE), obligatoire pour toute mission CLIENT.
- **B. `workMode WorkMode?` nullable** : tolère les missions anciennes sans l'info.
- **C. Pas de champ, info uniquement dans `caseStudyMarkdown`** : pas structuré, pas affichable en méta.

**Choix : A**

**Rationale :**
- Le user confirme avoir l'info pour **toutes ses missions CLIENT**, même anciennes (validé 2026-04-22). Le required est cohérent.
- Affichage structuré dans la grille méta du case study (Entreprise / Équipe / Contrat / Mode / Durée) = lisibilité immédiate pour recruteurs (ex: "Remote" = signal fort pour postes distants).
- Granularité intentionnellement simple (3 valeurs) : les nuances type "2j TT/semaine" restent dans le body markdown si besoin, ne méritent pas un enum plus fin.

### Décision : Référentiel `Tag` unifié avec discriminant `TagKind` à 6 valeurs (incluant `EXPERTISE`)

**Options envisagées :**
- **A. Séparer en deux modèles `Techno` (applicatif/infra/outils) + `Expertise` (métier)** : sémantique forte ("quoi est utilisé" vs "quoi maîtrisé"), deux libs d'icônes distinctes (Simple Icons vs Lucide). Coût : 2 tables quasi-jumelles, 2 relations m:n, 2 seeds, 2 composants badge.
- **B. Un seul modèle `Tag` + enum `TagKind { LANGUAGE, FRAMEWORK, DATABASE, INFRA, AI, EXPERTISE }`** : un seul référentiel unifié, un seul composant badge qui switch la lib d'icônes selon un champ `icon` au format `"<lib>:<slug>"`. Le discriminant `kind` permet de grouper / filtrer à l'affichage (ex: section "Expertises" au-dessus de la "Stack technique" sur la case study).
- **C. Garder `Techno` (sans EXPERTISE) + champ Json `expertise: string[]` sur `Project`** : les expertises restent libres sous forme de tableau de strings. Pas de référentiel, donc pas de dédoublonnage, pas d'icône contrôlée.

**Choix : B**

**Rationale :**
- Expertises et technos partagent 95% de la même structure (slug, name, icon, displayOrder). Un seul modèle = zéro duplication de code (migration, seed, queries, composant badge).
- Le champ `icon` au format string `"<lib>:<slug>"` (ex: `"simple-icons:react"` pour une techno, `"lucide:spider"` pour une expertise) permet au composant `TagBadge` de déléguer dynamiquement au bon renderer sans changer de type côté BDD. Validation du format faite par Zod au seed.
- Le kind discriminant permet un groupement visuel à l'affichage : la card liste (sub-project 05) montre 3 tags triés par `displayOrder` (mélange assumé d'expertises et technos selon le souhait du rédacteur), le case study (sub-project 06) sépare d'abord les `EXPERTISE` en section dédiée en haut, puis groupe le reste par kind.
- Extensibilité future : ajouter un futur kind (ex: `INDUSTRY`, `METHODOLOGY`) = ajouter une valeur à l'enum, zéro migration structurelle.
- `INFRA` regroupe l'hébergement, l'orchestration, le streaming, le monitoring et la CI (Docker, Kubernetes, Dokploy, Vercel, GitHub Actions, Kafka, Sentry, Datadog, SonarQube, Local). `FRAMEWORK` regroupe tout framework applicatif (web, mobile, ERP, etc.), y compris les SDK de plateformes comme Android et les frameworks métier comme Odoo. Cette granularité permet des groupements UI cohérents dans la case study.

### Décision : `displayOrder` par-projet via table de jointure explicite `ProjectTag`

**Options envisagées :**
- **A. Afficher les tags dans l'ordre de la relation (ordre d'insertion Prisma)** : aucune garantie d'ordre stable entre environnements, l'affichage "aléatoire" des 3 premiers tags sur la card est problématique.
- **B. Champ `displayOrder Int @default(0)` sur `Tag`, tri `orderBy: { displayOrder: 'asc' }` à la query** : ordre contrôlé globalement (ex: les technos ou expertises "phares" ont un `displayOrder` bas, 0, 1, 2, pour apparaître en premier si présentes sur un projet). Jointure Prisma implicite (`_ProjectToTag`).
- **C. Ordre défini par projet via table de jointure explicite `ProjectTag { projectId, tagId, displayOrder }`** : ordre par (projet, tag) plutôt que global. Plus flexible : un même tag peut être en position 0 sur le projet A et en position 3 sur le projet B.

**Choix : C**

**Rationale :**
- Le `displayOrder` global (option B) ne permet pas de varier l'ordre d'un tag selon le projet : si `TypeScript` a un `displayOrder = 5` globalement, il apparaîtra toujours après un tag à `displayOrder = 2` sur chacun des projets qui les combinent. Or un projet peut vouloir mettre TypeScript en 1ʳᵉ position (projet centré sur le typage) et un autre en 3ᵉ position (projet centré sur une stack différente où TypeScript est secondaire).
- Option C colle au besoin réel : l'auteur choisit **par projet** quels tags sont phares. C'est un storytelling éditorial plutôt qu'un classement absolu.
- Coût : +1 modèle (`ProjectTag` avec 3 champs), queries Prisma légèrement plus verbeuses (`include: { tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } } }`). Acceptable pour le gain d'expressivité.
- Index composite `@@index([projectId, displayOrder])` garantit que la query triée par projet reste O(log n) même si le volume croît.
- Conséquence : le seed (sub-project 03) lit les `tagSlugs[]` comme un tableau **ordonné** et crée les rows `ProjectTag` avec `displayOrder = index`.

### Décision : Pas d'index secondaire sur `Project`

**Options envisagées :**
- **A. Aucun index secondaire** : seul `@unique` sur `slug` génère un index. Scan séquentiel sur les filtres.
- **B. Index composé `@@index([status, type])`** : optimise la query de la page liste (`status=PUBLISHED AND type=?`).

**Choix : A**

**Rationale :**
- Volume cible MVP ~10 projets. Un scan séquentiel sur 10 rows est plus rapide qu'un index scan (qui implique une lecture de l'index puis un lookup dans la table).
- Ajout d'index trivial plus tard via migration si le volume dépasse ~1000 rows.
- Suit le principe "pas de sur-ingénierie anticipatoire" du `CLAUDE.md` projet.

