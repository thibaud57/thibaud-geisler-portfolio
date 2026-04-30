---
feature: "Feature 2 — Projets (liste + case studies)"
subproject: "i18n-content-bilingue"
goal: "Rendre tout le content DB bilingue FR/EN (titres, descriptions, noms de tags, case studies markdown) via colonnes jumelées fr/en + helper de localisation côté query"
status: "implemented"
complexity: "L"
tdd_scope: "partial"
depends_on: ["01-schema-prisma-project-design.md", "02-client-prisma-queries-design.md", "03-seed-projets-design.md", "05-page-liste-projets-filtres-design.md"]
date: "2026-04-22"
---

# Content bilingue FR/EN — Schéma Prisma + helper locale + seed bilingue

## Scope

Migrer le schéma Prisma pour dupliquer les champs texte longs/courts en colonnes jumelées `*Fr` + `*En` : `Project.titleFr/titleEn`, `Project.descriptionFr/descriptionEn`, `Project.caseStudyMarkdownFr/caseStudyMarkdownEn`, `Tag.nameFr/nameEn`. Introduire un helper pur `localizeProject(project, locale)` et `localizeTag(tag, locale)` qui renvoie une version du record avec les champs `title`/`description`/`caseStudyMarkdown`/`name` localisés (pick FR ou EN selon la locale d'appel). Adapter les queries (`findManyPublished`, `findPublishedBySlug`) pour accepter un paramètre `locale` et appliquer la localisation avant retour au caller. Mettre à jour le seed pour fournir les 2 versions (FR déjà écrite + EN à traduire : 9 projets + 41 tags + 9 case studies en fichiers `.fr.md` / `.en.md`). Mettre à jour les composants qui affichent du content DB (`ProjectCard`, `TagBadge`) pour consommer les champs localisés déjà résolus. Amender l'ADR-010 pour documenter la stratégie content bilingue (complément au slug bilingue déjà traité). **Exclus** : i18n des enums Prisma (`CompanySector`, `CompanyLocation`, `WorkMode`, `ContractStatus` — à traiter séparément via map i18n dans `messages/{fr,en}.json` au moment où un composant affichera ces enums, probablement dans sub-project 06), traduction automatique via LLM (rejeté), gestion de locales supplémentaires au-delà de FR/EN (post-MVP via abstraction cacheHandler si besoin), UI de traduction dans le dashboard (post-MVP).

### État livré

À la fin de ce sub-project, on peut : accéder à `/en/projets` et voir les 9 projets seedés affichés avec **titre anglais** (ex: "Claims Management Web App" au lieu de "Webapp Gestion Sinistres"), **description anglaise** et **noms de tags anglais** (ex: "Automation" au lieu de "Automatisation"). Accéder à `/fr/projets` et retrouver les mêmes projets avec leurs labels français d'origine. Les 2 tests intégration `findManyPublished` et `findPublishedBySlug` vérifient que le helper de localisation pick le bon champ selon la locale passée. La page `/[locale]/projets/[slug]` (sub-project 06, à venir) rendra le bon markdown case study selon la locale en lisant `caseStudyMarkdownFr` ou `caseStudyMarkdownEn` (bilingue prête côté schema).

## Dependencies

- `01-schema-prisma-project-design.md` (statut: implemented) — migration du schéma Prisma existant (Project + Tag). Les champs `title`, `description`, `caseStudyMarkdown`, `name` actuels sont renommés/doublés ; aucun ajout de nouveau modèle
- `02-client-prisma-queries-design.md` (statut: implemented) — update de `findManyPublished` et `findPublishedBySlug` pour accepter un paramètre `locale` obligatoire et pipe le résultat à travers les helpers `localizeProject` / `localizeTag`
- `03-seed-projets-design.md` (statut: implemented) — seed étendu avec les 2 colonnes par champ texte, les case studies splittés en `.fr.md` et `.en.md`
- `05-page-liste-projets-filtres-design.md` (statut: implemented) — `ProjectCard` et `TagBadge` consomment les champs résolus (`project.title`, `tag.name`) sans connaître la locale eux-mêmes

## Files touched

- **À modifier** : `prisma/schema.prisma` — remplacer `Project.title: String` par `titleFr: String` + `titleEn: String`, idem `description`, `caseStudyMarkdown` ; remplacer `Tag.name: String` par `nameFr: String` + `nameEn: String` ; ne pas toucher à `Company.name` (nom de marque, non traduit)
- **À créer** : `prisma/migrations/<timestamp>_content_bilingual/migration.sql` — migration générée via `prisma migrate dev --name content-bilingual` (DROP puis ADD COLUMN avec backfill depuis l'ancienne colonne vers `*Fr` avant DROP de l'ancienne)
- **À modifier** : `src/types/project.ts` — `ProjectWithRelations` devient le type Prisma brut avec colonnes jumelées ; ajouter `LocalizedProject` et `LocalizedTag` pour le résultat après passage par le helper (seuls les champs `title`, `description`, `caseStudyMarkdown`, `name` sont exposés, sans les colonnes `*Fr`/`*En`)
- **À créer** : `src/lib/i18n/localize-content.ts` (+ `.test.ts`) — helper pur `localizeProject(project, locale)` et `localizeTag(tag, locale)`. Importe le type `Locale` depuis `next-intl`. Pure fonction, zéro dépendance DB/I/O
- **À modifier** : `src/server/queries/projects.ts` — `findManyPublished({ type?, locale })` et `findPublishedBySlug(slug, locale)` reçoivent `locale: Locale` obligatoire. Le corps reste la même query Prisma mais le résultat est mappé via `localizeProject` avant retour. Idem pour les tags nested (relation `tags.tag` → `localizeTag`)
- **À modifier** : `prisma/seed-data/projects.ts` — chaque entrée du tableau `projects` remplace `title` par `titleFr` + `titleEn`, `description` par `descriptionFr` + `descriptionEn`. Le champ `caseStudyMarkdown` n'est plus dans le seed : lu depuis fichiers `.md` à l'exécution du seed (voir ci-dessous)
- **À modifier** : `prisma/seed-data/tags.ts` — chaque entrée du tableau `tags` remplace `name` par `nameFr` + `nameEn`
- **À modifier** : `prisma/seed-data/case-studies/client/<slug>.md` → à renommer `<slug>.fr.md` pour les 4 projets CLIENT, créer `<slug>.en.md` en parallèle ; idem pour `personal/<slug>.md` sur les 5 projets PERSONAL. Convention : le fichier de traduction EN démarre en copie FR que l'utilisateur adapte manuellement
- **À modifier** : `prisma/seed.ts` — lire les 2 versions du markdown (`<slug>.fr.md` + `<slug>.en.md`) et hydrater `caseStudyMarkdownFr` + `caseStudyMarkdownEn` sur chaque Project
- **À modifier** : `src/components/features/projects/ProjectCard.tsx` — consomme `project.title`, `project.description` directement (déjà résolus côté query) ; zéro changement d'API, zéro lookup i18n
- **À modifier** : `src/components/features/projects/TagBadge.tsx` — consomme `tag.name` directement (déjà résolu)
- **À modifier** : `src/app/[locale]/(public)/projets/page.tsx` — passe `locale` à `findManyPublished({ locale })` (le Server Component a déjà accès à `locale` via les params route)
- **À modifier** : `src/components/features/projects/ProjectsList.test.tsx` — fixtures adaptées aux champs `titleFr`/`titleEn` sur `ProjectWithRelations` brut OU simplifiées au type `LocalizedProject` si le mock suit le flux post-helper
- **À modifier** : `src/server/queries/projects.integration.test.ts` — 2 nouveaux cas : `findManyPublished({ locale: 'fr' })` retourne les titres FR, `findManyPublished({ locale: 'en' })` retourne les titres EN ; idem pour les tags. Les fixtures DB créées dans les tests utilisent les colonnes jumelées
- **À modifier** : `docs/adrs/010-i18n.md` — ajouter une section "Content bilingue : colonnes jumelées `*Fr`/`*En` sur les modèles Prisma concernés" en complément de la décision existante sur le slug bilingue
- **À modifier** : `.claude/rules/prisma/schema-migrations.md` (optionnel) — mentionner la convention `champFr`/`champEn` pour les modèles multilingues
- **À modifier** : `.claude/rules/next-intl/translations.md` — mentionner la distinction "UI chrome via `messages/*.json`" vs "content DB via colonnes jumelées Prisma" + pattern du helper `localize*()`
- **À modifier** : `docs/superpowers/specs/projets/06-page-case-study-design.md` (draft) — aligner le spec 06 pour consommer le content déjà localisé (impact sur les sections Architecture approach et Files touched)
- **À modifier** : `docs/superpowers/plans/projets/06-page-case-study.md` (draft) — idem

## Architecture approach

### Schéma Prisma — colonnes jumelées

- Pattern `<champ>Fr` + `<champ>En` sur les modèles contenant du texte traduisible. Règle : un champ texte court ou long destiné à être affiché à l'utilisateur final doit être bilingue si la page consommatrice est routée sous `/[locale]/`. Les champs techniques (slugs, enums, identifiants externes) restent non-localisés
- `Company.name` volontairement non-traduit : marques commerciales (ex: "Foyer Group", "PaySystem") conservent leur orthographe d'origine quelle que soit la locale
- Conforme à [`.claude/rules/prisma/schema-migrations.md`](../../../../.claude/rules/prisma/schema-migrations.md) : migration versionnée, ESM-only, Node 20.19+

### Helper `localizeProject` / `localizeTag`

- Fonctions pures, fichier `src/lib/i18n/localize-content.ts`, zéro side-effect
- Signature : `localizeProject<T extends { titleFr: string; titleEn: string; descriptionFr: string; descriptionEn: string; caseStudyMarkdownFr: string | null; caseStudyMarkdownEn: string | null }>(project: T, locale: Locale): LocalizedProject & Omit<T, 'titleFr'|'titleEn'|...>`
- Pattern discriminated au niveau du type via `Locale = 'fr' | 'en'`. Narrow via `switch(locale)` dans le corps : `return { ...rest, title: locale === 'fr' ? project.titleFr : project.titleEn, ... }`
- Réutilisable pour les tags nested : `localizeProject` appelle `localizeTag` récursivement sur `project.tags[n].tag`
- Conforme à [`.claude/rules/typescript/conventions.md`](../../../../.claude/rules/typescript/conventions.md) : pas de `any`, narrowing via discriminant, types dérivés depuis Prisma (`Prisma.ProjectGetPayload`)

### Queries — API `locale` obligatoire

- `findManyPublished({ type?, locale })` : `locale` devient un paramètre obligatoire. Pas de valeur par défaut — force le caller (Server Component de la page) à passer la locale de la route explicitement
- Le corps reste la même query Prisma (include `tags.tag` et `clientMeta.company` via `PROJECT_INCLUDE`), mais `.then(projects => projects.map(p => localizeProject(p, locale)))` en sortie
- Idem `findPublishedBySlug(slug, locale)` — retourne `LocalizedProject | null`
- Les types returned changent : `Promise<LocalizedProject[]>` au lieu de `Promise<ProjectWithRelations[]>`
- Conforme à [`.claude/rules/nextjs/data-fetching.md`](../../../../.claude/rules/nextjs/data-fetching.md) : query Prisma unique, `include` nested, pas de N+1

### Case studies markdown — fichiers séparés `.fr.md` + `.en.md`

- Convention : `prisma/seed-data/case-studies/<type>/<slug>.<locale>.md`
- Le seed (`prisma/seed.ts`) lit les deux fichiers par projet, hydrate `caseStudyMarkdownFr` et `caseStudyMarkdownEn` de l'entité Project
- Avantage vs stockage DB-only : édition des case studies dans l'IDE avec syntax highlighting markdown, diff git lisible, pas besoin de re-seed pour une petite correction de texte (en dev tu pourrais hot-reload si tu veux, mais le seed suffit)
- Le fichier `.en.md` est créé en copie du `.fr.md` puis édité manuellement. Un script utilitaire optionnel (`scripts/bootstrap-en-case-studies.ts`) peut dupliquer les fichiers FR en fichiers EN stub avec un en-tête `<!-- TODO: translate -->` pour amorcer la traduction

### Migration Prisma

- `prisma migrate dev --name content-bilingual` génère une migration SQL qui :
  1. ADD COLUMN `titleFr`, `titleEn`, `descriptionFr`, `descriptionEn`, `caseStudyMarkdownFr`, `caseStudyMarkdownEn` (nullable au départ)
  2. Copy `UPDATE "Project" SET "titleFr" = title, "descriptionFr" = description, "caseStudyMarkdownFr" = "caseStudyMarkdown"` (backfill FR depuis l'ancienne colonne)
  3. ALTER COLUMN `titleFr` + `descriptionFr` → NOT NULL (contrainte rétablie)
  4. DROP COLUMN `title`, `description`, `caseStudyMarkdown`
- Idem pour `Tag` : ADD `nameFr`, `nameEn`, backfill `nameFr`, NOT NULL, DROP `name`
- Après migration, le seed est re-run pour écraser avec les valeurs EN manuellement écrites (sinon les `*En` restent à NULL post-backfill, ce qui casse les rendus `/en/`)
- Conforme à [`.claude/rules/prisma/schema-migrations.md`](../../../../.claude/rules/prisma/schema-migrations.md) : migration versionnée, idempotente via upsert côté seed
- `generated/prisma/client` à régénérer via `pnpm prisma generate` après modification du schéma

### Stratégie i18n des enums (hors scope ici)

- Les enums Prisma (`CompanySector`, `CompanyLocation`, `WorkMode`, `ContractStatus`) exposent des valeurs machine (`ASSURANCE`, `REMOTE`) qui ne sont pas encore affichées sur la page `/projets` (sub-project 05). Elles seront affichées sur la page case study (sub-project 06)
- Décision : pour ces enums, on ajoutera une section dédiée dans `messages/{fr,en}.json` au sub-project 06 (ex: `CompanySectors.ASSURANCE: "Assurance" / "Insurance"`). Pas de colonnes jumelées sur les enums
- Cette stratégie mixte (colonnes jumelées pour le content éditorial long, `messages/*.json` pour les labels d'enum bornés) est documentée dans le rationale de la décision A ci-dessous

## Acceptance criteria

### Scénario 1 : Affichage des titres projets en FR

**GIVEN** la BDD migrée et re-seedée avec les 9 projets bilingues, visiteur accède à `/fr/projets`
**WHEN** la page est rendue
**THEN** les cards affichent les titres FR (ex: "Webapp Gestion Sinistres", "Référent Technique IA & Automatisation")
**AND** les descriptions sont en FR
**AND** les noms de tags sont en FR (ex: "Automatisation", "Scraping")

### Scénario 2 : Affichage des titres projets en EN

**GIVEN** la BDD migrée et re-seedée avec les 9 projets bilingues, visiteur accède à `/en/projets`
**WHEN** la page est rendue
**THEN** les cards affichent les titres EN (ex: "Claims Management Web App", "Technical Lead AI & Automation")
**AND** les descriptions sont en EN
**AND** les noms de tags sont en EN (ex: "Automation", "Scraping" — certains noms techniques restent identiques)

### Scénario 3 : Bascule FR ↔ EN sans reload serveur

**GIVEN** visiteur sur `/fr/projets`
**WHEN** il clique sur le sélecteur de langue et bascule en EN
**THEN** next-intl change la locale de la route (`/en/projets`), la page est re-rendue côté serveur avec les champs EN
**AND** aucun état client (filtre sélectionné) n'est perdu si le composant est remonté avec ses props (détail UX secondaire, impact possible mais pas bloquant)

### Scénario 4 : Tags localisés sur les cards

**GIVEN** un projet avec 3 tags visibles ordonnés par `ProjectTag.displayOrder`
**WHEN** la page est rendue en `/en/projets`
**THEN** chaque `TagBadge` affiche le `nameEn` du tag correspondant (ex: "Automation" au lieu de "Automatisation")
**AND** l'icône (Simple Icons ou Lucide) reste identique quelle que soit la locale

### Scénario 5 : Page case study bilingue (prérequis pour sub-project 06)

**GIVEN** un projet avec `caseStudyMarkdownFr` et `caseStudyMarkdownEn` seedés depuis `webapp-gestion-sinistres.fr.md` et `webapp-gestion-sinistres.en.md`
**WHEN** visiteur accède à `/en/projets/webapp-gestion-sinistres` (page case study du sub-project 06)
**THEN** le markdown EN est rendu
**AND** le pattern `prisma/seed-data/case-studies/<type>/<slug>.<locale>.md` permet d'ajouter une nouvelle langue sans changer le code, juste en créant un nouveau fichier + une nouvelle colonne `caseStudyMarkdown<Locale>` (extension future, hors scope immédiat)

### Scénario 6 : Query `findManyPublished` exige la locale

**GIVEN** un développeur appelle `findManyPublished()` sans passer `locale`
**WHEN** le code est compilé via `tsc --noEmit`
**THEN** TypeScript lève une erreur (paramètre obligatoire manquant)
**AND** cela force tous les callers à adopter explicitement l'i18n, évitant les rendus accidentels FR-only en prod

## Tests à écrire

### Unit

- `src/lib/i18n/localize-content.test.ts` :
  - **Test 1** : `localizeProject(projectFr, 'fr')` retourne les champs `title`, `description`, `caseStudyMarkdown` égaux à `titleFr`, `descriptionFr`, `caseStudyMarkdownFr` et omet les colonnes brutes
  - **Test 2** : `localizeProject(projectFr, 'en')` retourne les champs egaux à `titleEn`, `descriptionEn`, `caseStudyMarkdownEn`
  - **Test 3** : `localizeTag(tag, locale)` applique la même logique sur `name`/`nameFr`/`nameEn`
  - **Test 4** : `localizeProject` sur un projet avec `tags: [{ tag, displayOrder }]` applique `localizeTag` récursivement sur chaque `tag` nested

### Integration

- `src/server/queries/projects.integration.test.ts` (existant, à étendre) :
  - **Test existant** : renommer les fixtures en `titleFr`/`titleEn` + pass `locale: 'fr'` aux appels existants
  - **Test nouveau** : `findManyPublished({ locale: 'en' })` retourne un array où `result[0].title === <titleEn de la fixture>`
  - **Test nouveau** : `findPublishedBySlug('webapp-gestion-sinistres', 'en')` retourne `result.title === 'Claims Management Web App'` (ou équivalent depuis la fixture)
  - **Test nouveau** : les tags nested dans le retour sont aussi localisés (vérifie que `tags[0].tag.name === tag.nameEn` quand `locale='en'`)

→ `tdd_scope = partial` : les tests du helper `localizeProject` couvrent la logique métier critique, les tests intégration valident le pipe query + helper, les composants front sont couverts indirectement par la re-exécution du test existant `ProjectsList.test.tsx` (qui consomme le nouveau type `LocalizedProject` via fixtures adaptées).

## Edge cases

- **Un champ EN non rempli (null)** : si `titleEn` est NULL en BDD (seed incomplet), `localizeProject` retourne `title = null` → coerce en fallback sur `titleFr`. Décision : le helper **fallback systématique sur FR** si le champ locale demandé est null, pour éviter un crash UI. À logger en warn pour détecter les trous de traduction
- **Seed sans fichier `.en.md`** : le seed skip silencieusement et hydrate `caseStudyMarkdownEn = null` → render EN de la page case study fallback sur FR (warning log). Le sub-project 06 affiche alors la version FR avec un petit banner "(Traduction à venir)". Décision UX à confirmer au sub-project 06
- **Locale non supportée** (ex: `/de/projets`) : bloqué en amont par le middleware next-intl + `hasLocale(routing.locales, locale)` (déjà en place sub-project support-multilingue). Le sub-project 07 n'a pas à gérer cette erreur
- **Company.name dans un contexte EN** : pas de changement, reste "Foyer Group" / "PaySystem" partout. Les marques ne se traduisent pas
- **Enums Prisma (`ASSURANCE`, `REMOTE`, etc.)** : non localisés dans ce sub-project. Affichage via map i18n au moment où le sub-project 06 en aura besoin. Pas de colonne jumelée sur les enums

## Architectural decisions

### Décision : Colonnes jumelées `*Fr`/`*En` vs table de traduction normalisée

**Options envisagées :**
- **A. Colonnes jumelées sur chaque modèle** : `Project { titleFr, titleEn, descriptionFr, descriptionEn }`, `Tag { nameFr, nameEn }`. Même fichier, même ligne seed. Helper pur picke selon locale
- **B. Table `Translation` normalisée** : table séparée `Translation { entityId, entityType, locale, field, value }`. Queries plus complexes (JOIN + pivot), plus scalable pour N locales
- **C. JSON multilingue dans une seule colonne** : `Project.title: { fr: "...", en: "..." }` stocké en JSONB Postgres

**Choix : A**

**Rationale :**
- Portfolio single-user visant 2 locales (FR, EN) stables. Pas de roadmap vers 5+ locales. Surcoût structurel (B) non justifié
- Queries restent simples (pas de JOIN translation), types Prisma auto-générés cleanly, IDE autocomplete sur `titleFr` / `titleEn`
- Le helper `localizeProject` isole l'implémentation : si on migre vers B post-MVP, l'API publique côté queries reste stable (elles continuent à retourner `LocalizedProject` avec `title`)
- Prisma 7 support natif JSON mais typage faible en bout de chaîne (JSON → any sans Zod validation runtime) — (C) rejeté pour cette raison

### Décision : Paramètre `locale` obligatoire sur les queries (pas de default)

**Options envisagées :**
- **A. `locale: Locale` obligatoire** : chaque appel doit passer la locale explicitement depuis la route
- **B. `locale?: Locale` avec default `'fr'`** : simplicité des appels, mais risque d'oublier et de rendre du contenu FR sur `/en/`

**Choix : A**

**Rationale :**
- TypeScript force le caller à réfléchir à la locale. Un oubli = erreur de compilation, pas un bug silencieux en prod
- Le Server Component de la page a déjà la locale dans `params.locale`, le passage est mécanique. Zéro surcoût DX
- Aligne avec la philosophie "no-lib-test" du projet : on teste la règle métier (quel champ est retourné pour quelle locale), pas des branches défaut implicite difficiles à identifier

### Décision : Case studies markdown en fichiers `.fr.md` / `.en.md` séparés

**Options envisagées :**
- **A. Fichiers séparés par locale** : `webapp-gestion-sinistres.fr.md` + `webapp-gestion-sinistres.en.md` dans le même dossier. Seed lit les 2 et hydrate 2 colonnes DB
- **B. Un seul fichier avec délimiteurs de section** : `webapp-gestion-sinistres.md` contenant `<!-- [fr] -->...<!-- [en] -->`. Seed parse les sections
- **C. Tout dans la BDD via un éditeur dashboard post-MVP** : zéro fichier markdown en dev, tout est en table

**Choix : A**

**Rationale :**
- 2 fichiers séparés = diff git propre par locale, édition indépendante, VSCode ouvre le markdown approprié dans son propre tab
- (B) fragile côté parsing, augmente le risque d'un fichier mal formé cassant le seed
- (C) trop ambitieux pour le MVP (pas de dashboard admin encore). La migration vers B post-dashboard reste possible sans rien changer au schéma (on ajoute juste un endpoint POST qui écrase `caseStudyMarkdown<Locale>` en DB)
- Convention simple à retenir : `<slug>.<locale>.md`. Claire pour tout dev rejoignant le projet

## Open questions

- [ ] Stratégie de fallback quand `titleEn = null` en prod : fallback sur FR silencieux OU render un warning dev + FR en prod ? À trancher lors de l'implémentation
