---
feature: "Feature 7 — Conformité légale"
subproject: "Schema Prisma LegalEntity + Publisher + DataProcessing + Address, seed idempotent et queries cachées"
goal: "Modéliser et seeder en Postgres l'identité légale du site (éditeur LCEN + sous-traitants RGPD avec adresses réutilisables) et exposer des queries cachées comme source unique pour les surfaces consommatrices (pages mentions/confidentialité, footer SIRET, JSON-LD enrichi)"
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: []
date: "2026-04-28"
---

# Schema Prisma LegalEntity + Publisher + DataProcessing + Address, seed idempotent et queries cachées

## Scope

Migration Prisma ajoutant 4 modèles (`Address`, `LegalEntity`, `Publisher`, `DataProcessing`) et 4 enums (`VatRegime`, `ProcessingKind`, `OutsideEuFramework`, `LegalBasis`). Composition par extension : `LegalEntity` est le tronc commun (entité légale réelle, identifiants partagés), `Publisher` est une extension 1-1 obligatoire pour l'éditeur du site (LCEN art. 6-III), `DataProcessing` est une extension 1-N pour les sous-traitants RGPD (art. 28). Adresse réutilisable via `Address` lié 1-1 à chaque `LegalEntity`. **Relation optionnelle 1-1 entre `Company` (modèle existant pour les sociétés clientes du portfolio) et `LegalEntity`** : ajout d'une colonne `legalEntityId String? @unique` à `Company` + back-relation `company Company?` sur `LegalEntity`, permettant à terme d'enrichir les sociétés clientes (Foyer, CloudSmart, etc.) avec leurs données légales (siret, adresse précise, capital, legalForm) pour exposition Schema.org `Organization` JSON-LD post-MVP. Pour MVP : `legalEntityId` reste null sur toutes les Company seedées (zéro modification du seed actuel). Seed idempotent (`upsert` nested) avec valeurs INSEE Thibaud + IONOS officielles 2026 + Calendly Inc. Queries `getPublisher()`, `getDataProcessors()`, `getHostingProvider()` cachées via `'use cache'` + `cacheTag('legal-entity')` et exposées depuis `src/server/queries/legal.ts`. Stratégie i18n : `purposeFr/En` Fr/En BDD (contenu éditorial libre par sous-traitant), tout le reste en keys i18n + `messages/{fr,en}.json` namespace `Legal` (enums bornées : `legalStatusKey`, `retentionPolicyKey`, `apeCode`, enums Prisma). **Exclut** les UI consommatrices (pages, footer, JSON-LD : sub-projects 4, 6, 7), les mutations dashboard (post-MVP), la validation Zod côté API (pas de mutation MVP), le bandeau cookies (sub 3), et le seed effectif des `LegalEntity` des sociétés clientes (tâche post-MVP qui collectera les vraies données légales de Foyer/CloudSmart/etc.).

### État livré

À la fin de ce sub-project, on peut : (a) lancer `pnpm db:migrate` et `pnpm db:seed`, observer en BDD `Address × 3`, `LegalEntity × 3`, `Publisher × 1`, `DataProcessing × 3` (sous-traitants : `ionos-hosting`, `ionos-smtp`, `calendly-embedded`) ; (b) appeler `await getPublisher()` depuis un Server Component et obtenir l'objet typé contenant `siret = "88041912200036"` + `address.street = "11 rue Gouvy"` + `publisher.siren = "880419122"` ; (c) relancer `pnpm db:seed` une seconde fois sans duplication ni erreur (upsert idempotent garanti par `slug @unique`) ; (d) `pnpm test src/server/queries/legal.integration.test.ts` retourne vert sur tous les scénarios listés en Tests.

## Dependencies

Aucune. Ce sub-project est autoporté. Il introduit son propre schéma sans dépendre des sub-projects suivants. Il utilise des patterns déjà établis dans le projet (`prisma/seed.ts` upsert idempotent, `src/server/queries/projects.ts` cache pattern, `src/lib/prisma-test-setup.ts` reset DB) sans les modifier au-delà de l'extension du `TRUNCATE` test.

## Files touched

- **À modifier** : `prisma/schema.prisma` (ajout des 4 enums + 4 modèles + 2 lignes de relation optionnelle sur le modèle `Company` existant : `legalEntityId String? @unique` + `legalEntity LegalEntity? @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)`)
- **À créer** : `prisma/migrations/<timestamp>_add_legal_entity/migration.sql` (auto-générée par `prisma migrate dev`)
- **À créer** : `prisma/seed-data/legal.ts` (constantes typées `legalEntities`, `dataProcessings`, schéma Zod `AddressSchema`, factories `buildLegalSeedItem`)
- **À modifier** : `prisma/seed.ts` (ajout d'un bloc `seedLegal()` après les blocs existants `tags` / `companies` / `projects`)
- **À créer** : `src/server/queries/legal.ts` (fonctions cachées `getPublisher`, `getDataProcessors`, `getHostingProvider` + types dérivés Prisma `Prisma.LegalEntityGetPayload<...>`)
- **À créer** : `src/server/queries/legal.integration.test.ts` (tests intégration Vitest project `integration` avec DB test)
- **À modifier** : `src/lib/prisma-test-setup.ts` (extension `TRUNCATE` avec `"DataProcessing"`, `"Publisher"`, `"LegalEntity"`, `"Address"` dans cet ordre, cascade depuis les feuilles)
- **À modifier** : `messages/fr.json` (extension namespace `Legal` : `legalStatus.*`, `ape.*`, `retention.*`, `legalBasis.*`, `outsideEuFramework.*`, `processingKind.*`)
- **À modifier** : `messages/en.json` (idem traductions EN)

**Non touchés** : `next.config.ts` (sub 2 CSP), `src/components/layout/Footer.tsx` (sub 7), pages `/[locale]/(public)/mentions-legales` et `/confidentialite` (sub 4), `src/lib/seo/json-ld.ts` (sub 6), `src/components/features/contact/CalendlyWidget.tsx` (sub 5), corps des modèles `Project`, `Tag`, `ClientMeta`, `ProjectTag` (le modèle `Company` reçoit uniquement 2 lignes de relation optionnelle vers LegalEntity, ses champs et sa logique restent inchangés), seed `prisma/seed-data/companies.ts` (les Company existantes gardent `legalEntityId = null` au seed initial).

## Architecture approach

- **Conventions Prisma 7 du projet** : tous les modèles utilisent `@id @default(uuid(7))` (UUID v7 ordonné temporellement), `createdAt DateTime @default(now()) @db.Timestamptz` + `updatedAt DateTime @updatedAt @db.Timestamptz`. Generator `provider = "prisma-client"` + `output = "../src/generated/prisma"` (déjà en place). Imports types via `@/generated/prisma/client`. Migration via `pnpm prisma migrate dev --name add_legal_entity` puis `pnpm prisma generate` manuellement (Prisma 7 : `migrate dev` ne lance plus `generate` automatiquement). Voir `.claude/rules/prisma/schema-migrations.md` (uuid(7), Timestamptz, generator output, breakings v6→v7) et `.claude/rules/prisma/client-setup.md` (singleton client en dev, types générés).
- **Composition par extension (4 modèles vs 1 modèle unifié)** : `LegalEntity` héberge les champs communs à toute entité légale (nom, slug, identifiants partagés, adresse), `Publisher` étend pour l'éditeur unique avec ses champs FR-spécifiques NOT NULL (`siren`, `apeCode`, `vatRegime`, `publicEmail`...), `DataProcessing` étend pour chaque traitement RGPD avec son `kind` + `purpose` + `legalBasis` + `retentionPolicyKey`. Cette structure préserve la sémantique métier (une entité légale a 1 ou N rôles) et garantit le typage strict Prisma : les champs publisher-required sont NOT NULL au niveau DB, contrairement à un modèle unifié où ils devraient tous être nullable. Voir `Architectural decisions` ci-dessous pour les options envisagées.
- **`Address` réutilisable, relation 1-1 obligatoire depuis `LegalEntity`** : modèle séparé pour permettre la réutilisation par d'autres entités futures (User, Client, etc., il suffira d'ajouter une back-relation à `Address`). FK `addressId @unique` côté `LegalEntity`, back-relation `legalEntity LegalEntity?` côté `Address` (purement déclarative, pas de FK supplémentaire). `onDelete: Cascade` pour que la suppression d'une `LegalEntity` supprime son `Address` orpheline.
- **Singleton via `slug @unique`** : `LegalEntity.slug` est l'index utilisé pour `upsert` au seed (pattern aligné avec `Tag.slug`, `Company.slug`, `Project.slug` du projet). Singletons : `slug = "thibaud"` (le publisher), `slug = "ionos-sarl"` (hébergeur + SMTP), `slug = "calendly-inc"`. Pas de risque de duplication grâce à la contrainte UNIQUE.
- **Relation 1-N entre `LegalEntity` et `DataProcessing`** : IONOS SARL est UNE entité légale qui assure 2 rôles distincts (HOSTING + EMAIL_PROVIDER). Modélisé par `DataProcessing.legalEntityId` FK simple (pas `@unique`), permettant N traitements pour 1 entité. Chaque `DataProcessing` a son propre `slug @unique` (`"ionos-hosting"`, `"ionos-smtp"`, `"calendly-embedded"`).
- **Relation 1-1 entre `LegalEntity` et `Publisher`** : un seul publisher dans le système, modélisé par `Publisher.legalEntityId @unique`. La sémantique "le publisher est une LegalEntity particulière" est exprimée par la nullabilité de la back-relation `LegalEntity.publisher: Publisher?`.
- **Relation 1-1 optionnelle entre `Company` (modèle existant) et `LegalEntity`** : ajout de `legalEntityId String? @unique` côté `Company` + back-relation `company Company?` côté `LegalEntity` + **`onDelete: SetNull` explicite** sur la FK pour garantir que la suppression d'une `LegalEntity` reset `Company.legalEntityId` à null (Company préservée avec son historique de missions ClientMeta) plutôt que de cascader la suppression de Company elle-même. Les attributs business de `Company` (`sectors`, `size`, `locations`, `logoFilename`, `websiteUrl`, `clientMetas`) restent intacts et continuent d'alimenter `/projets` exactement comme avant. Aucune pollution de `Company` avec des champs légaux (siret, capital, etc. qui n'ont aucune valeur tant qu'on n'expose pas Organization JSON-LD). Pour MVP : `legalEntityId = null` sur les 5 Company seedées (Foyer, CloudSmart, PaySystem, Wanted Design, Personnel). Post-MVP (Organization JSON-LD pour rich snippets sur `/projets/[slug]`) : on créera une `LegalEntity` par société cliente (avec siret/adresse/capital/legalStatusKey via le modèle déjà prêt) et on liera via `Company.legalEntityId`. Pattern de composition propre, zéro refacto destructive plus tard, helpers Schema.org du sub 6 (`buildPostalAddress`) directement réutilisables. Voir Architectural decisions ci-dessous.
- **Idempotence du seed via `upsert` nested** : `prisma.legalEntity.upsert({ where: { slug }, create: { ..., address: { create }, publisher: { create } }, update: { ..., address: { update }, publisher: { update } } })`. Pattern Prisma standard, déjà utilisé dans `prisma/seed.ts` ligne 72-77 pour les Tags. Permet de relancer `pnpm db:seed` autant de fois que nécessaire sans duplication.
- **Queries cachées Next 16** : chaque query consommatrice (`getPublisher`, `getDataProcessors`, `getHostingProvider`) déclare `'use cache'` + `cacheLife('days')` + `cacheTag('legal-entity')`. Données quasi-immuables (SIRET, adresse) donc TTL long ; `cacheTag` permet l'invalidation manuelle via `revalidateTag('legal-entity', 'max')` post-édition Prisma Studio. Pattern aligné avec `src/server/queries/about.ts` existant. Voir `.claude/rules/nextjs/data-fetching.md` (`'use cache'` + `cacheLife` + `cacheTag` Next 16) et `.claude/rules/nextjs/rendering-caching.md` (Data Cache, invalidation `revalidateTag(tag, 'max')` signature Next 16).
- **`include: { address, publisher }` ou `{ address, processing }` systématique** : les queries retournent toujours les relations résolues, le caller ne fait jamais de second appel. Évite les waterfalls et les N+1.
- **Stratégie i18n stricte (3 catégories, alignée ADR-010)** :
  - **Fr/En BDD** uniquement pour `DataProcessing.purposeFr/En` : contenu éditorial libre par sous-traitant (analogue à `Project.descriptionFr/En` existant)
  - **key + messages.json** pour les enums bornées :
    - `LegalEntity.legalStatusKey: String` → `messages.Legal.legalStatus.{key}` (ex: `"entrepreneurIndividuel"`, `"sarl"`, `"incorporated"`)
    - `Publisher.apeCode: String` sert de key directe → `messages.Legal.ape.{code}` (ex: `apeCode = "6201Z"` mappe `messages.Legal.ape["6201Z"] = "Programmation informatique"`)
    - `DataProcessing.retentionPolicyKey: String` → `messages.Legal.retention.{key}` (ex: `"contactForm3Years"`, `"logs3Years"`, `"session13Months"`)
    - Enums Prisma (`LegalBasis`, `OutsideEuFramework`, `ProcessingKind`) → `messages.Legal.legalBasis.{enum}`, etc.
  - **String simple mono-langue** pour identifiants/codes/noms propres : `slug`, `siret`, `siren`, `vatNumber`, `rcsNumber`, `Address.street/city/...`, `LegalEntity.name`, `registrationType` (acronyme universel "RNE"/"RCS"/"RM")
- **Validation des keys au seed via Zod** : un schéma Zod `AddressSchema` valide les données d'adresse avant insert (pattern aligné avec `IconSchema` ligne 15-21 du seed.ts existant). Voir `.claude/rules/zod/schemas.md` (validators top-level v4, `z.infer` source unique de vérité).
- **Module `server-only` + alias `@/*`** : `src/server/queries/legal.ts` débute par `import 'server-only'` (garde-fou build-time pour empêcher l'import depuis un Client Component). Tous les imports utilisent l'alias `@/*` (jamais relatif). Voir `.claude/rules/typescript/conventions.md` et `.claude/rules/nextjs/data-fetching.md` (`server-only` package).
- **Tests d'intégration sur le project Vitest `integration`** : convention `<file>.integration.test.ts` à plat à côté du fichier testé, environnement `node`, sérialisation totale (`pool: 'forks'`, `maxWorkers: 1`) car DB partagée avec les autres tests d'intégration. Reset DB entre tests via `resetDatabase()` du `prisma-test-setup.ts` (qui doit être étendu pour inclure les 4 nouvelles tables dans le `TRUNCATE`). Pas de mock de Prisma (règle no-lib-test du `~/.claude/CLAUDE.md` global). Voir `.claude/rules/vitest/setup.md` (projects unit/integration séparés) et `.claude/rules/nextjs/tests.md` (factory pattern, pas de mock Prisma).
- **Mock `next/cache` dans le test** : `vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn() }))` (pattern aligné avec `src/server/queries/about.integration.test.ts` ligne 3-7).
- **ADRs liés** : `ADR-001` (monolithe Next.js), `ADR-004` (PostgreSQL dès MVP, applicable aux 4 nouvelles tables), `ADR-010` (i18n next-intl, colonnes Fr/En BDD pour contenu éditorial libre + messages.json pour enums bornées). Aucun ADR `proposed` bloquant.

## Acceptance criteria

### Scénario 1 : Migration Prisma applicable et idempotente

**GIVEN** un repo `thibaud-geisler-portfolio` à jour avec PostgreSQL local lancé via `just db`
**WHEN** je lance `pnpm prisma migrate dev --name add_legal_entity`
**THEN** Prisma génère un fichier `prisma/migrations/<timestamp>_add_legal_entity/migration.sql` versionnable
**AND** Postgres contient 4 nouvelles tables `Address`, `LegalEntity`, `Publisher`, `DataProcessing` avec les colonnes attendues, FK et contraintes UNIQUE
**AND** Postgres contient 4 nouveaux types enum `VatRegime`, `ProcessingKind`, `OutsideEuFramework`, `LegalBasis`
**AND** `pnpm prisma generate` régénère `src/generated/prisma/client` sans erreur
**AND** un second `pnpm prisma migrate dev` ne génère pas de nouvelle migration (état stable)

### Scénario 2 : Seed initial avec valeurs INSEE + IONOS + Calendly

**GIVEN** une DB fraîchement migrée et vide
**WHEN** je lance `pnpm db:seed`
**THEN** le script termine sans erreur et logue 3 entrées `Address`, 3 entrées `LegalEntity` (`thibaud`, `ionos-sarl`, `calendly-inc`), 1 entrée `Publisher`, 3 entrées `DataProcessing` (`ionos-hosting`, `ionos-smtp`, `calendly-embedded`)
**AND** la requête SQL `SELECT siret FROM "LegalEntity" WHERE slug = 'thibaud'` retourne `'88041912200036'`
**AND** la requête `SELECT siren FROM "Publisher"` retourne `'880419122'`
**AND** la requête `SELECT street, "postalCode", city FROM "Address" JOIN "LegalEntity" ON "Address".id = "LegalEntity"."addressId" WHERE "LegalEntity".slug = 'thibaud'` retourne `('11 rue Gouvy', '57000', 'Metz')`
**AND** la requête `SELECT count(*) FROM "DataProcessing" WHERE "legalEntityId" = (SELECT id FROM "LegalEntity" WHERE slug = 'ionos-sarl')` retourne `2` (HOSTING + EMAIL_PROVIDER)

### Scénario 3 : Seed idempotent (run 2x)

**GIVEN** une DB déjà seedée une première fois
**WHEN** je relance `pnpm db:seed` une seconde fois consécutive
**THEN** le script termine sans erreur ni duplication
**AND** le total `SELECT count(*)` reste identique pour chacune des 4 tables (3 Address, 3 LegalEntity, 1 Publisher, 3 DataProcessing)
**AND** les `id` UUID v7 des entrées existantes restent inchangés (pas de re-création, juste update des champs non-clé)

### Scénario 4 : `getPublisher()` retourne le publisher avec relations résolues

**GIVEN** une DB seedée
**WHEN** un Server Component appelle `await getPublisher()`
**THEN** le retour est un objet typé `LegalEntity & { address: Address, publisher: Publisher }` (publisher non-nullable grâce au `include`)
**AND** `result.slug === 'thibaud'`
**AND** `result.siret === '88041912200036'`
**AND** `result.legalStatusKey === 'entrepreneurIndividuel'`
**AND** `result.address.street === '11 rue Gouvy'`
**AND** `result.publisher.siren === '880419122'`
**AND** `result.publisher.apeCode === '6201Z'`
**AND** `result.publisher.registrationType === 'RNE'`
**AND** `result.publisher.vatRegime === 'FRANCHISE'`

### Scénario 5 : `getDataProcessors()` retourne tous les sous-traitants triés

**GIVEN** une DB seedée avec 3 DataProcessing : `ionos-hosting` (displayOrder 0), `calendly-embedded` (displayOrder 1), `ionos-smtp` (displayOrder 2)
**WHEN** un Server Component appelle `await getDataProcessors()`
**THEN** le retour est un array de 3 objets typés `LegalEntity & { address: Address, processing: DataProcessing }`
**AND** les éléments sont triés par `processing.displayOrder` ascendant
**AND** chaque élément a `processing.legalBasis` non-null (LEGITIMATE_INTERESTS pour IONOS, CONSENT pour Calendly)
**AND** l'élément Calendly a `processing.outsideEuFramework === 'DATA_PRIVACY_FRAMEWORK'`
**AND** les éléments IONOS ont `processing.outsideEuFramework === null`

### Scénario 6 : `getHostingProvider()` retourne IONOS hosting spécifiquement

**GIVEN** une DB seedée
**WHEN** un Server Component appelle `await getHostingProvider()`
**THEN** le retour est un objet typé avec `processing.kind === 'HOSTING'`
**AND** `result.slug === 'ionos-sarl'`
**AND** `result.name === 'IONOS SARL'`
**AND** `result.address.city === 'Sarreguemines'`
**AND** `result.processing.purposeFr` contient une description non vide

### Scénario 7 : Cascade delete

**GIVEN** une DB seedée
**WHEN** je supprime manuellement `LegalEntity` slug `'ionos-sarl'` via `prisma.legalEntity.delete`
**THEN** la `Address` liée est aussi supprimée (FK `onDelete: Cascade`)
**AND** les 2 `DataProcessing` liés (hosting + smtp) sont aussi supprimés (FK `onDelete: Cascade`)
**AND** les autres entités (`thibaud`, `calendly-inc`, leurs adresses, `publisher`) restent intactes

### Scénario 8 : Tests `pnpm test` verts

**GIVEN** le sub-project complètement implémenté (migration appliquée, seed run, queries écrites)
**WHEN** je lance `pnpm test src/server/queries/legal.integration.test.ts`
**THEN** Vitest exécute le fichier dans le project `integration` (env node, sérialisation single worker)
**AND** tous les `it(...)` du fichier passent (vert)
**AND** la console n'émet aucun warning Prisma ni erreur de cache

## Tests à écrire

### Integration

`src/server/queries/legal.integration.test.ts` :

- **`getPublisher()` retourne l'éditeur seedé avec relations** : seed un `LegalEntity` `thibaud` + `Address` Metz + `Publisher` Thibaud Pierre Geisler, appelle `getPublisher()`, attend `result.siret = '88041912200036'`, `result.address.street = '11 rue Gouvy'`, `result.publisher.siren = '880419122'`
- **`getPublisher()` lance `NotFoundError` si pas de publisher seedé** : DB vide, appelle `getPublisher()`, attend `expect(...).rejects.toThrow()` (`findUniqueOrThrow` lance si slug inexistant)
- **`getDataProcessors()` retourne array vide si aucun seedé** : seed uniquement le publisher, appelle `getDataProcessors()`, attend `result.length === 0`
- **`getDataProcessors()` retourne tous les processors triés par displayOrder** : seed 3 DataProcessing avec `displayOrder` 0, 1, 2 mélangés, appelle, attend `result.map(p => p.slug)` dans l'ordre 0/1/2
- **`getDataProcessors()` inclut address et processing pour chaque entrée** : seed Calendly + IONOS hosting, appelle, attend chaque élément a `address` et `processing` non-null
- **`getHostingProvider()` retourne IONOS quand kind=HOSTING** : seed les 3 processors, appelle, attend `result.processing.kind === 'HOSTING'` et `result.slug === 'ionos-sarl'`
- **`getHostingProvider()` lance si aucun HOSTING seedé** : seed uniquement Calendly (EMBEDDED_SERVICE), appelle, attend `expect(...).rejects.toThrow()`
- **Idempotence : run du seed 2x ne duplique pas** : exécute la fonction `seedLegal()` deux fois consécutivement, vérifie `prisma.legalEntity.count()` reste à 3, `prisma.address.count()` reste à 3, `prisma.dataProcessing.count()` reste à 3
- **Cascade delete supprime Address + DataProcessing liés** : seed les 3 LegalEntity (Thibaud + IONOS + Calendly) et les 3 DataProcessing, supprime `prisma.legalEntity.delete({ where: { slug: 'ionos-sarl' } })`, vérifie `prisma.address.count() === 2` (Thibaud + Calendly restants), `prisma.dataProcessing.count() === 1` (Calendly restant), `prisma.legalEntity.findUnique({ where: { slug: 'ionos-sarl' } }) === null`
- **`getPublisher()` retourne le `legalStatusKey` exact** : seed avec `legalStatusKey: 'entrepreneurIndividuel'`, appelle, attend `result.legalStatusKey === 'entrepreneurIndividuel'` (vérifie que la key est bien stockée et non substituée)
- **`getDataProcessors()` retourne `outsideEuFramework: 'DATA_PRIVACY_FRAMEWORK'` pour Calendly et `null` pour IONOS** : seed les 3 entrées, appelle, vérifie pour chaque entrée la valeur attendue
- **`getDataProcessors()` retourne `legalBasis: 'CONSENT'` pour Calendly et `'LEGITIMATE_INTERESTS'` pour IONOS** : idem

Setup commun :
- `vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn() }))` en tête de fichier (pattern aligné `about.integration.test.ts:3-7`)
- `beforeEach(async () => { await resetDatabase() })` reset complet entre chaque test
- Helper `seedLegalForTest(overrides?)` exporté depuis `src/server/queries/legal.integration.test.ts` (factory function évitant la mutation partagée, voir `.claude/rules/nextjs/tests.md`) qui prend des overrides partiels et insère les valeurs canoniques par défaut

Tests délibérément exclus (no-lib-test, voir `~/.claude/CLAUDE.md` § Code > Tests) :
- Test unitaire de la signature des modèles Prisma (testerait la lib Prisma, pas la logique projet)
- Test du contenu de `messages/{fr,en}.json` (testerait next-intl, pas la query)
- Test de `cacheLife('days')` ou `cacheTag('legal-entity')` (testerait Next.js cache, pas la query)
- Test de la migration SQL elle-même (testerait Prisma migrate, pas le projet)
- Test des back-relations Prisma `Address.legalEntity?` (testerait la lib Prisma)

## Edge cases

- **Seed idempotent run 3x ou plus** : `upsert` Prisma garantit l'idempotence sur N runs. Couvert par le test "Idempotence run 2x" extensible.
- **`Address` orpheline si LegalEntity supprimée** : `onDelete: Cascade` côté `LegalEntity.address` supprime l'Address liée. Couvert par scénario 7.
- **Slug en doublon au seed** : `slug @unique` côté Prisma + DB → erreur 23505 PostgreSQL au seed. Le seed doit utiliser `upsert` (pas `create`) pour gérer ce cas. Couvert par le pattern et le test idempotence.
- **`DataProcessing.outsideEuFramework` null vs non-null** : sémantique cohérente, null signifie "pas de transfert hors UE" (cas IONOS UE), non-null signifie "transfert encadré par ce framework" (cas Calendly DPF). Couvert par scénario 5.
- **`Publisher` créé sans `LegalEntity` parent** : impossible techniquement, FK `legalEntityId @unique` obligatoire sans valeur par défaut. Le compilateur Prisma + DB le garantissent.
- **Plus d'1 `Publisher` créé** : impossible, contrainte `Publisher.legalEntityId @unique` empêche d'avoir 2 publishers liés à des LegalEntity différentes (côté schema), et `LegalEntity.slug = 'thibaud'` UNIQUE empêche la duplication du publisher cible.
- **`legalStatusKey` ou `retentionPolicyKey` pointant vers une key inexistante dans `messages/*.json`** : non détectable au seed (les messages ne sont pas accessibles côté Prisma). Sera couvert par un test côté pages consommatrices au sub 4 (vérifier que `t('Legal.legalStatus.${key}')` ne retourne pas le placeholder brut). Pour ce sub, on garantit la cohérence par convention de seed (les valeurs sont définies en parallèle dans `prisma/seed-data/legal.ts` et `messages/{fr,en}.json`, validées manuellement par lecture).
- **Seed sur DB de prod via Dokploy** : `prisma migrate deploy` applique la migration au boot du container (pattern projet, voir `PRODUCTION.md` agent). Le seed initial se lance manuellement via `docker exec ... pnpm db:seed` post-deploy first time (à documenter en spec mais hors scope code).
- **Capital IONOS qui change** : `capitalAmount: 100000` + `capitalCurrency: "EUR"` sur LegalEntity. Si IONOS change son capital légal, modifier le seed + relancer `pnpm db:seed` (idempotent → met à jour le champ via `upsert.update`).

## Architectural decisions

### Décision : Stockage 4 modèles vs 1 modèle unifié vs 2 modèles séparés

**Options envisagées :**
- **A. 1 modèle unifié `LegalEntity` avec enum `role: PUBLISHER | HOSTING | ...`** : tous les champs nullable (siren, apeCode, vatRegime nullable au schema). Économie d'1 table mais perte du typage strict NOT NULL sur les champs publisher-required.
- **B. 2 modèles séparés `LegalEntity` (= éditeur) + `LegalHostingProvider` (= hébergeur uniquement)** : duplication des champs partagés (siret, vatNumber, address) et impossibilité de modéliser Calendly + IONOS SMTP sans ajouter d'autres modèles.
- **C. 4 modèles avec composition par extension** : `Address` réutilisable, `LegalEntity` tronc commun, `Publisher` extension 1-1 obligatoire (singleton), `DataProcessing` extension 1-N (sous-traitants). Chacun a un rôle clair, les champs publisher-required sont NOT NULL au DB level via le modèle séparé `Publisher`.

**Choix : C**

**Rationale :**
- L'option A perd la garantie NOT NULL sur les champs publisher-required (siren, apeCode, vatRegime). Au runtime, le code consommateur devrait faire des assertions/casts TypeScript pour récupérer un publisher "complet". Avec C, le compilateur Prisma + DB garantissent la complétude via le modèle `Publisher` dédié.
- L'option B ne permet pas de modéliser plusieurs traitements pour la même entité légale (IONOS SARL = HOSTING + EMAIL_PROVIDER). Forcerait à dupliquer IONOS en 2 lignes ou à créer un sous-modèle séparé pour les rôles, ce qui revient à C.
- L'option C exprime correctement la sémantique métier RGPD/LCEN : "1 entité légale réelle, 1 ou N traitements RGPD, parmi lesquels exactement 1 est l'éditeur du site". Address réutilisable pour autres entités futures.
- Le coût de C (3 inserts par entité au seed via `nested write`) est mitigé par le pattern Prisma `upsert` avec `address: { create }, publisher: { create }` qui produit une seule transaction logique.

### Décision : `Address` modèle Prisma vs colonnes flat vs Json

**Options envisagées :**
- **A. Colonnes flat `addressStreet`, `addressPostalCode`, `addressCity`, `addressCountry` dans LegalEntity et DataProcessing** : pas de jointure, simple, pattern aligné avec les modèles `Project`, `Tag`, `Company` existants. Mais duplication des 4 colonnes sur N modèles consommateurs.
- **B. `address Json`** : champ JSON dans LegalEntity, validé par Zod côté code. Pas de jointure ni de modèle séparé. Mais pas de typage Prisma fort, et diverge du pattern projet.
- **C. Modèle `Address` séparé avec relation 1-1 obligatoire** : DRY, modèle réutilisable pour d'autres entités futures (User, etc.), typé Prisma. Coût : 1 jointure obligatoire (`include: { address: true }`).

**Choix : C**

**Rationale :**
- L'option A duplique 4 colonnes sur 2 (puis 3, puis N) modèles consommateurs. Pour ce projet, c'est limité (LegalEntity + futur User éventuel) mais le user a explicitement demandé un modèle séparé pour pouvoir réutiliser sans friction. C est la bonne réponse à cette intention.
- L'option B (Json) perd le typage Prisma, casse les conventions projet (les autres modèles utilisent des relations explicites), et complique les queries (filtrage sur ville impossible sans cast).
- L'option C est cohérente avec les autres relations 1-1 du projet (`ClientMeta`, `Publisher`). La back-relation `Address.legalEntity LegalEntity?` est purement déclarative (Prisma exige les relations bilatérales) sans coût DB. Si on ajoute un modèle `User` plus tard, il suffira d'ajouter `Address.user User?` à `Address` (1 ligne).

### Décision : Stratégie i18n des champs textuels (`legalStatus`, `apeLabel`, `retentionPeriod`)

**Options envisagées :**
- **A. Tout en colonnes Fr/En BDD (`legalStatusFr` + `legalStatusEn`, `apeLabelFr` + `apeLabelEn`, `retentionPeriodFr` + `retentionPeriodEn`)** : aligné mécaniquement avec `Tag.nameFr/En` et `Project.titleFr/En` du projet. Mais sur-engineering car ces champs sont des enums bornées (~5-6 valeurs réutilisables), pas du contenu éditorial libre.
- **B. Tout en string mono-langue (FR uniquement)** : page EN affiche le texte FR. Diverge de l'objectif bilingue (ADR-010).
- **C. Stratégie mixte : enums bornées via key + `messages/{fr,en}.json`, contenu éditorial libre par entité via Fr/En BDD** : `legalStatusKey`, `retentionPolicyKey`, `apeCode` (qui sert de key directe) en BDD pointent vers `messages.Legal.{...}`. Seul `purposeFr/En` (libre par sous-traitant) reste en Fr/En BDD.

**Choix : C**

**Rationale :**
- ADR-010 distingue explicitement "UI chrome / enums bornées" (messages.json) du "contenu éditorial libre" (BDD Fr/En). Le `legalStatus` ("Entrepreneur Individuel" / "SARL" / "Incorporated"...) est une enum bornée d'environ 6 valeurs réutilisables, pas un contenu unique par entité. Idem `retentionPolicy` (5 cas types) et `apeLabel` (codes APE INSEE).
- L'option A (tout Fr/En BDD) crée de la duplication réelle (si demain 2 entités EI partagent `legalStatus`, on duplique le wording français en 2 endroits). L'option C permet à 1 message de servir N entités. Modification du wording via PR sur `messages/*.json`, sans migration BDD.
- Le `purpose` (description du traitement RGPD) est analogue à `Project.descriptionFr/En` : libre par entité, pas d'enum bornée. Donc on garde Fr/En BDD pour cohérence avec le pattern projet existant.
- Coût : un test post-seed qui vérifie que chaque key insérée existe dans `messages/{fr,en}.json` éviterait la désynchro. Ce test n'est PAS dans ce sub (il vit côté pages consommatrices au sub 4) mais le risque est mitigé par le seed et messages.json édités ensemble dans la même PR.
- Pas de refacto rétroactif sur `Tag.nameFr/En` (hors scope, voir backlog post-MVP).

### Décision : `cacheLife('days')` vs autres TTL

**Options envisagées :**
- **A. `cacheLife('hours')`** : aligné avec `src/server/queries/about.ts` existant. Revalidation toutes les heures.
- **B. `cacheLife('days')`** : revalidation quotidienne. Données quasi-immuables (SIRET, adresse) donc TTL plus long acceptable.
- **C. Profil custom `cacheLife({ stale: 7d, revalidate: 30d, expire: 90d })`** : maximise le hit rate, suppose que les données ne changent quasi jamais.

**Choix : B**

**Rationale :**
- Les données légales (SIRET, adresse, RCS, capital) changent au mieux 1-2 fois sur 5 ans. Hours est trop conservateur (revalidations inutiles). Days est un bon compromis : si on édite via Prisma Studio, la donnée est rafraîchie sous 24h pour les caches partagés, et `revalidateTag('legal-entity', 'max')` permet l'invalidation immédiate sur demande.
- L'option C (custom profile weeks/months) maximise le hit rate mais oblige à se rappeler de `revalidateTag` après chaque édition manuelle, sinon donnée périmée jusqu'à 30j. Coût mental supérieur au gain pour ce volume.
- L'option A (hours) est cohérente avec le pattern existant mais ne reflète pas la nature plus statique des données légales par rapport aux compteurs de l'about (`countMissionsDelivered` change quand un projet est livré).

### Décision : Relation `Company` ↔ `LegalEntity` ajoutée maintenant vs différée post-MVP

**Options envisagées :**
- **A. Ajouter dès maintenant `Company.legalEntityId String? @unique` + back-relation `company Company?` sur `LegalEntity`, valeur null pour MVP** : 2 lignes Prisma + migration auto, zéro modification du seed Company existant, prépare l'architecture pour Organization JSON-LD post-MVP.
- **B. Différer la relation à un sub-project post-MVP dédié (Feature 8 SEO Organization)** : ne rien toucher à `Company` maintenant, ajouter la relation au moment où on en a besoin.
- **C. Fusionner `Company` dans `LegalEntity` avec un enum `kind` discriminant (PUBLISHER, PROCESSOR, CLIENT_COMPANY)** : un seul modèle pour tout, sémantiques mélangées.

**Choix : A**

**Rationale :**
- L'option C casse la séparation des concerns : `Company` représente une entité d'expérience professionnelle (CV, badges sectors/size/locations, logo, missions associées) et `LegalEntity` représente une identité de responsabilité légale (siret, adresse précise, capital). Sémantiques distinctes, fusion = anti-pattern (champs nullables partout, perte de typage strict, queries complexes avec discriminant runtime).
- L'option B est défendable au sens YAGNI strict, mais le coût de NE PAS le faire maintenant est supérieur : si on découvre dans 2 mois qu'il faut Organization JSON-LD pour rich snippets sur `/projets/[slug]`, on devra faire une 2e migration Prisma (Company.legalEntityId) après que la 1ère (Address+LegalEntity+Publisher+DataProcessing) soit déjà en prod, possiblement re-seed si entre-temps on aurait backfillé. Coût futur > coût actuel (~3 lignes Prisma + 0 ligne de seed à modifier).
- L'option A applique le pattern de composition propre déjà retenu pour `Publisher` et `DataProcessing` (extensions optionnelles via FK 1-1 ou 1-N pointant vers `LegalEntity`). `Company` rejoint la même architecture sans pollution de ses attributs business. Pour MVP, `legalEntityId = null` sur les 5 Company seedées (Foyer, CloudSmart, PaySystem, Wanted Design, Personnel). Aucune valeur légale n'est forcée tant qu'on ne l'expose pas. Quand Feature 8 SEO post-MVP arrivera, il suffira de seeder une `LegalEntity` "foyer-sa" avec ses vraies données légales et de lier `Company.foyer.legalEntityId = foyerSa.id`. Le helper `buildPostalAddress()` du sub 6 sera directement réutilisable côté `buildOrganization()` futur. Zéro refacto destructive plus tard.
- Coût immédiat : 3 lignes Prisma (+1 colonne Company + 1 ligne back-relation LegalEntity + 0 ligne de seed à modifier), 1 ligne dans la migration auto-générée par Prisma. Bénéfice : architecture cohérente day-1, préparation propre pour 3 cas d'usage post-MVP (Organization JSON-LD pour Company clientes, mini-CRM Lead → LegalEntity prospect, dashboard CRUD identités légales unique pour tous les domaines).
- Trade-off accepté : 1 colonne nullable ajoutée à un modèle existant (Company). Cohérent avec l'esprit du sub-project (préparation architecturale) et explicitement validé par l'utilisateur lors du brainstorming.
