---
feature: "Feature 2 — Projets (liste + case studies)"
subproject: "migration-tags-et-seed-realiste"
goal: "Ajouter Tag.displayOrder + Project.deliverablesCount au schema, étoffer le seed tags (elasticsearch in, vercel out, ordre custom par TagKind) et mettre à jour les labels stats /a-propos pour refléter la réalité du parcours sans multiplier les rows Project."
status: "implemented"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-04-25"
---

# Migration `Tag.displayOrder` + `Project.deliverablesCount` + curation seed tags

## Scope

Quatre changements complémentaires, regroupés car ils touchent le couple `prisma/schema.prisma` + `prisma/seed-data/*` + `src/server/queries/about.ts` + `messages/{fr,en}.json` :

1. **Schema `Tag.displayOrder`** : ajouter `displayOrder Int @default(0)` sur model `Tag` via migration Prisma + adapter `findPublishedTags` pour `orderBy: [{ displayOrder: 'asc' }, { slug: 'asc' }]`. ProjectTag.displayOrder reste inchangé (ordre par-projet, complémentaire).
2. **Schema `Project.deliverablesCount`** : ajouter `deliverablesCount Int @default(1)` sur model `Project`. Permet de déclarer manuellement le nombre de réalisations livrées au sein d'une mission (ex: 3 chez Foyer pour 3 applications, 2 chez Cloudsmart pour ERP Odoo + App Android, 1 par défaut). Adapter `countMissionsDelivered` pour faire `SUM(deliverablesCount)` au lieu de `COUNT(*)`.
3. **Seed tags curation** : ajouter `elasticsearch` (utilisé chez Foyer, à confirmer dans `webapp-gestion-sinistres.tagSlugs`). Supprimer `vercel` (jamais déployé dessus). Conserver `local`, `piagent`, `rag`, `spring`, `spring-boot` avec positions actées. Définir `displayOrder` selon ordre custom user par TagKind, en incréments de 1 (0, 1, 2, ...).
4. **i18n labels stats `/a-propos`** : renommer `stats.clients.label` de `clients servis` → `clients accompagnés` (FR) / `clients supported` (EN). Le label `stats.missions.label` reste `projets clients livrés` mais le chiffre derrière = SUM(deliverablesCount).

**Exclu** : refonte UI des pages /a-propos ou /projets (déjà livrées) ; ajout de nouveaux projets ou companies (le seed actuel couvre tout le parcours réel via `webapp-gestion-sinistres` mission Foyer + `erp-odoo-android` Cloudsmart + `saas-gestion-paie` Paysystem + `referent-ia-automatisation` Wanted Design) ; modification des case studies markdown existants.

### État livré

À la fin de ce sub-project, on peut : exécuter `pnpm prisma migrate dev` pour appliquer les 2 colonnes (`Tag.displayOrder`, `Project.deliverablesCount`), lancer `pnpm prisma db seed` pour reseeder, naviguer sur `/a-propos` et voir : (1) la stack technique groupée par TagKind dans l'ordre custom (n8n avant Claude, AGENTS-IA avant MCP, etc.) au lieu de l'ordre alpha actuel ; (2) le compteur passer de "3 projets clients livrés" à "6 projets clients livrés" (3 Foyer + 1 Paysystem + 2 Cloudsmart, en sommant les `deliverablesCount`) ; (3) le label "clients servis" remplacé par "clients accompagnés".

## Dependencies

Aucune — ce sub-project est autoporté. Les éléments réutilisés sont déjà livrés :
- `01-schema-prisma-project-design.md` (statut: implemented) — model `Tag` + `Project` + `Company` + `ClientMeta` + `ProjectTag`.
- `03-seed-projets-design.md` (statut: implemented) — pattern de seed dans `prisma/seed-data/{tags,companies,projects}.ts` et convention case studies markdown bilingues.
- `02-client-prisma-queries-design.md` (statut: implemented) — pattern queries Prisma cachées avec `'use cache'` + `cacheTag('projects')`.
- Query `findPublishedTags` + `countMissionsDelivered` + `countClientsServed` livrées dans Feature 1 sub 02 (`src/server/queries/about.ts`, statut: implemented) — à mettre à jour.

## Files touched

- **À modifier** : `prisma/schema.prisma` (ajouter `displayOrder Int @default(0)` sur model `Tag` ET `deliverablesCount Int @default(1)` sur model `Project`)
- **À créer** : `prisma/migrations/<timestamp>_add_tag_display_order_and_project_deliverables/migration.sql` (généré par `prisma migrate dev`)
- **À modifier** : `prisma/seed-data/tags.ts` (ajouter `elasticsearch`, supprimer `vercel`, ajouter `displayOrder` sur tous les tags, étendre type `TagInput`)
- **À modifier** : `prisma/seed-data/projects.ts` (ajouter `deliverablesCount` sur chaque projet selon la réalité, étendre type `ProjectInput`)
- **À modifier** : `prisma/seed.ts` (passer `displayOrder` au `prisma.tag.create` et `deliverablesCount` au `prisma.project.create`)
- **À modifier** : `src/server/queries/about.ts` (orderBy `[{ displayOrder: 'asc' }, { slug: 'asc' }]` dans `findPublishedTags` ; `countMissionsDelivered` passe à `prisma.project.aggregate({ _sum: { deliverablesCount: true }, ... })` ; renommer `countClientsServed` en `countClientsSupported` pour cohérence avec le nouveau label)
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx` (renommer la stat `clients` si le slug change, ou seulement updater la query importée)
- **À modifier** : `messages/fr.json` (`stats.clients.label`: "clients accompagnés")
- **À modifier** : `messages/en.json` (`stats.clients.label`: "clients supported")

## Architecture approach

- **Migration combinée additive** : 2 colonnes ajoutées dans la même migration (`displayOrder` Tag, `deliverablesCount` Project). Non-breaking pour les rows existantes (defaults 0 et 1 respectivement). Conforme à `.claude/rules/prisma/schema-migrations.md` (Prisma 7 + `pnpm prisma generate` après migrate manuellement).
- **Pas de revalidateTag('projects') manuel** : le wipe + reseed reset les tables Tag et Project. Les caches Next 16 (`'use cache'` + `cacheTag('projects')`) sont auto-invalidés au prochain `prisma db seed`.
- **`displayOrder` Tag en incréments de 1** : `0, 1, 2, ...` (au lieu de 10, 20, 30). Lisibilité prioritaire sur la flexibilité (peu de tags dans le projet, renumérotation triviale si besoin futur).
- **`deliverablesCount` par défaut = 1** : tout projet existant et futur a au moins 1 livrable. Override manuel dans le seed pour les missions qui couvrent plusieurs réalisations (Foyer = 3, Cloudsmart ERP/Android = 2, etc.).
- **`countMissionsDelivered` via `aggregate _sum`** : `prisma.project.aggregate({ _sum: { deliverablesCount: true }, where: { status: 'PUBLISHED', type: 'CLIENT', endedAt: { not: null } } })`. Wrapper `'use cache'` + `cacheLife('hours')` + `cacheTag('projects')` conservé. Conforme à `.claude/rules/nextjs/data-fetching.md`.
- **Renommage `countClientsServed` → `countClientsSupported`** : aligne le nom de fonction avec le label affiché. Mise à jour de l'import dans `page.tsx` (1 ligne).
- **Convention seed `displayOrder` par TagKind** : ordre user acté (cf. § Acceptance criteria scénario 3). Tous les tags d'un même `TagKind` ont des `displayOrder` croissants à partir de 0.
- **Tag `elasticsearch` à linker dans `webapp-gestion-sinistres.tagSlugs`** : à confirmer (Open question), sinon il sera créé en DB mais filtré par `findPublishedTags` (filtre PUBLISHED).

## Acceptance criteria

### Scénario 1 : migration appliquée et build passant
**GIVEN** le développeur lance `pnpm prisma migrate dev --name add_tag_display_order_and_project_deliverables`
**WHEN** la migration s'exécute
**THEN** la colonne `displayOrder Int NOT NULL DEFAULT 0` est ajoutée à `Tag`
**AND** la colonne `deliverablesCount Int NOT NULL DEFAULT 1` est ajoutée à `Project`
**AND** `pnpm prisma generate` régénère le client avec les nouveaux types
**AND** `pnpm exec tsc --noEmit` passe sans erreur

### Scénario 2 : reseed avec valeurs métier appliquées
**GIVEN** les seeds `tags.ts` et `projects.ts` sont mis à jour
**WHEN** le développeur lance `pnpm prisma db seed`
**THEN** chaque row de `Tag` a un `displayOrder` correspondant à l'ordre custom par TagKind
**AND** le tag `elasticsearch` est créé avec `displayOrder` cohérent dans la catégorie INFRA
**AND** le tag `vercel` n'est plus créé (supprimé du seed)
**AND** le projet `webapp-gestion-sinistres` a `deliverablesCount = 3`, `erp-odoo-android` = 2, `saas-gestion-paie` = 1, les projets perso = 1 chacun

### Scénario 3 : ordre custom appliqué sur /a-propos
**GIVEN** le seed est appliqué et la page `/a-propos` est rechargée
**WHEN** le visiteur observe la section "Stack technique"
**THEN** **AI** : `n8n` → `Claude (Anthropic)` → `ChatGPT (OpenAI)` → `Perplexity` → `PiAgent` (en queue)
**AND** **EXPERTISE** : `Agents IA` → `Automatisation` → `RAG` (avant MCP) → `MCP` → `Skills` → `Scraping` → `Anonymisation` → `Anti-bot`
**AND** **LANGUAGE** : `TypeScript` → `Scala` → `Python` → `Java` → `PHP` (position TBD Open question)
**AND** **FRAMEWORK** : `Angular` → `Play` → `Node.js` → `Express` → `NestJS` → `React` → `Next.js` → `FastAPI` → `Spring` → `Spring Boot` → `Android` → `Odoo`
**AND** **DATABASE** : `MongoDB` → `PostgreSQL`
**AND** **INFRA** : `Kafka` → `Docker` → `Kubernetes` → `Dokploy` → `GitHub Actions` → `Datadog` → `Elasticsearch` → `Sentry` → `SonarQube` → `Local` (en queue)

### Scénario 4 : compteurs /a-propos mis à jour
**GIVEN** le seed est appliqué
**WHEN** le visiteur observe les stats sur `/a-propos`
**THEN** le compteur "projets clients livrés" affiche **6** (3 Foyer + 1 Paysystem + 2 Cloudsmart, en sommant `deliverablesCount`)
**AND** le compteur affiche le label "**clients accompagnés**" (FR) ou "**clients supported**" (EN) au lieu de "clients servis"
**AND** le compteur "années d'expérience" reste calculé via `getYearsOfExperience()` (inchangé)

### Scénario 5 : query findPublishedTags conserve son contrat
**GIVEN** la query `findPublishedTags(locale)` est appelée
**WHEN** elle retourne les tags
**THEN** la signature et le type de retour `LocalizedTag<Tag>[]` sont préservés
**AND** les tags arrivent dans l'ordre `displayOrder asc, slug asc`
**AND** le filtre `projects.some.project.status: 'PUBLISHED'` reste actif (tag orphelin invisible)

## Edge cases

- **Tag orphelin** (présent en seed mais pas dans `tagSlugs` de projets publiés) : `findPublishedTags` filtre déjà sur PUBLISHED, donc invisible sur /a-propos. Comportement déjà conforme.
- **Projet avec `deliverablesCount = 0`** : exclus par `_sum` Prisma (somme = 0 contribution). Acceptable mais conventionnellement on garde `>= 1`.
- **Migration appliquée sans reseed** : `displayOrder = 0` partout → ordre instable (tri secondaire alpha sur slug). Acceptable transitoirement, doit être suivi du reseed.
- **`countMissionsDelivered` retourne `null`** : si aucun projet ne match le `where`, `_sum.deliverablesCount` est `null`. Fallback `?? 0` requis dans la query pour retourner un number.
- **Tag `elasticsearch` non lié à un projet publié** : si on ajoute `elasticsearch` au seed mais qu'il n'est pas dans `webapp-gestion-sinistres.tagSlugs`, il n'apparaîtra pas sur /a-propos (filtre PUBLISHED). À confirmer Open question.

## Architectural decisions

### Décision : `Project.deliverablesCount` vs split en projets séparés

**Options envisagées :**
- **A. `deliverablesCount` sur Project** : 1 row Project = 1 mission, avec un compteur de livrables qui peut être > 1. Le case study markdown détaille les sous-réalisations.
- **B. Split en multiples Project** : 1 row Project = 1 livrable. La mission Foyer se traduit en 3 rows (3 applications distinctes).
- **C. Garder l'état actuel (1 row = 1 mission, COUNT)** : compteur `countMissionsDelivered` reste un COUNT, le chiffre sous-estime la réalité (3 au lieu de 6).

**Choix : A**

**Rationale :**
- Préserve le narratif fort des case studies (la mission Foyer est racontée d'un seul tenant : 3 ans, évolution junior → confirmé, hackathon, 3 apps livrées).
- Évite la perception "spam de cards" sur /projets (3 cards Foyer côte à côte donnerait l'impression de remplissage).
- Honnête : tu déclares manuellement le nombre de livrables, pas de magie cachée.
- Compteur fidèle à la réalité (6 livrables au lieu de 3).
- Coût trivial : 1 colonne additive, defaults rétrocompatibles, agg `_sum` Prisma natif.

### Décision : `displayOrder` Tag en incréments de 1 vs 10

**Options envisagées :**
- **A. Incréments de 1** (0, 1, 2, ...) : lisibilité maximale, simple à comprendre.
- **B. Incréments de 10** (10, 20, 30, ...) : permet d'intercaler un tag futur sans renumérotation.

**Choix : A**

**Rationale :**
- Le projet a une cinquantaine de tags max. Renumérotation triviale si besoin futur.
- Lisibilité primordiale dans le seed (un mainteneur futur lit `displayOrder: 0/1/2` plus naturellement que `10/20/30`).
- Si on doit insérer un tag futur, on accepte la renumérotation locale (1 ligne).

## Open questions

Toutes résolues. Aucun blocker pour démarrer l'implémentation.

**Décisions actées** :
- ✅ `vercel` → supprimer du seed.
- ✅ `local`, `piagent`, `rag`, `spring`, `spring-boot` → conservés.
- ✅ Position `local` (INFRA) : en queue (`displayOrder: 9`).
- ✅ Position `piagent` (AI) : en queue (`displayOrder: 4`).
- ✅ Position `rag` (EXPERTISE) : avant `mcp` (`displayOrder: 2`).
- ✅ Position `spring`, `spring-boot` (FRAMEWORK) : avant `android`, après `fastapi`.
- ✅ Position `php` (LANGUAGE) : en queue (`displayOrder: 4`).
- ✅ Position `elasticsearch` (INFRA) : entre `datadog` et `sentry` (`displayOrder: 6`).
- ✅ Linker `elasticsearch` à `webapp-gestion-sinistres.tagSlugs` (utilisé chez Foyer).
- ✅ Ne PAS ajouter `mcp` à `referent-ia-automatisation.tagSlugs` (laisser le seed actuel intact).
- ✅ `deliverablesCount` pour `referent-ia-automatisation` : `0` (mission de conseil sans livrable mis en prod à ce jour).
- ✅ Label "clients servis" → "clients accompagnés" (FR) / "clients supported" (EN).
- ✅ Label "projets clients livrés" : conservé, chiffre derrière = SUM(deliverablesCount).
- ✅ Pas d'ajout de nouveaux projets (option a — 1 row = 1 mission).

## Suite envisagée (hors scope)

**Mécanisme de masquage de tags pour /a-propos** : à terme, le user souhaite ne pas afficher certains tags publiés (`php`, `local`) sur la page d'agrégation `/a-propos` tout en les conservant dans la DB pour les case studies projets. Pistes : ajouter un flag `Tag.hiddenOnAbout: Boolean` ou un seuil `displayOrder >= N → masqué`. À scoper en sub-project séparé si besoin réel apparaît.
