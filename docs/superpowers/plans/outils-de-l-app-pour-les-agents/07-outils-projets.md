# Outils du portfolio, projets : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** exposer aux agents les projets du portfolio (recherche, lecture, liste, création, modification, statut de publication compris) sur la logique métier commune à l'admin.

**Architecture :** deux tâches. La première sort la création et la modification des projets des Server Actions vers `src/server/portfolio/projects.ts`, l'action devenant un adaptateur. La seconde ajoute l'entité `project` au registre du domaine `portfolio` posé par le sub-project 06, avec ses lectures sans cache.

**Tech Stack :** Next.js 16.4, Prisma 7, Zod 4, `@modelcontextprotocol/server` 2.4.0, Vitest 5.

**Spec :** `docs/superpowers/specs/outils-de-l-app-pour-les-agents/07-outils-projets-design.md`

## Global Constraints

- Prérequis du sub-project 06 (bloc Interfaces de `06-socle-mcp-multi-domaine.md`) : `defineEntity`, `RegisteredEntity`, `WriteContext`, `SearchHit`, `joinHint`, `writeRecord`, `byId`, `notFoundMessage("portfolio", noun)`, `writeTexts`, `updateSchemaWithoutDetailsOf`, `pageQueryShape`, `idOrderBy`, `PORTFOLIO_ENTITY_BY_NAME`, `tagIdSchema`
- Contrat `crm_*` gelé : `git diff --exit-code src/server/mcp/crm/tools-list.snapshot.json` à chaque gate
- Statut `DRAFT` par défaut à la création ; `PUBLISHED` et `ARCHIVED` modifiables ; une modification d'un projet publié part en ligne aussitôt
- Slug fixé à la création ; ordre d'affichage non exposé (dernier à la création, rang conservé en modification)
- `tagIds` absent conservé, présent remplace la liste dans l'ordre envoyé ; `null` efface un champ nullable
- `companyId` et `workMode` requis pour tout projet ; l'entreprise s'obtient par `crm_search`, rendue par `companyRefSelect` seulement
- Couverture : `isProjectAssetKey` (`projets/client/` ou `projets/personal/`) ; aucun téléversement
- Invalidation : `updateTag` dans l'action, `revalidateTag("projects", "max")` dans l'outil, plus `revalidatePath` des pages admin des projets (`"layout"`) et de la page des tags
- Comportement de l'admin des projets inchangé (codes `slug_taken`, `company_not_found`, `tag_not_found`, `project_not_found`, textes, ordre), à une évolution près, voulue : son invalidation gagne `revalidatePath(ADMIN_PROJECTS_PATH, "layout")` (sous-pages client, perso, fiche) et `revalidatePath(ADMIN_TAGS_PATH)` (nombre de projets par tag), par `invalidateProjectCaches` partagée
- Données de test fictives : « Acme », « Plateforme data », slugs inventés, `example.com`
- Commandes : `just test-unit` ou `just test-integration` aux étapes intermédiaires, `just test` (couverture 80 %) au gate final ; aucun commit intermédiaire

## Review Focus

- **Modification d'un projet sans position** : il garde son rang, les autres projets ne bougent pas. Test en Task 1
- **Fin avant début avec seule la fin envoyée** : refusée contre la date de début en base. Test en Task 1
- **Correction d'un projet publié sans `tagIds`** : les tags et l'autre étude de cas restent. Test en Task 2
- **Entreprise de l'autre domaine inconnue** : message qui renvoie à `crm_search`, jamais une erreur interne. Test en Task 2
- **`startedAt` envoyé en instant** (`2026-05-01T10:00:00Z`) au lieu d'un jour : refusé avec un message qui demande `YYYY-MM-DD`. Test en Task 2

---

### Task 1 : logique des projets hors des Server Actions

**Files :**
- Create : `src/server/portfolio/projects.ts`, `src/server/portfolio/projects.integration.test.ts`
- Modify : `src/server/actions/projects.ts`, `src/server/actions/projects.test.ts`, `src/server/actions/projects.integration.test.ts`, `src/lib/ids.ts`

**Interfaces :**
- Consumes : `DomainResult`, `ok`, `fail` (`src/server/result.ts`) ; `computeIdsAtPosition`, `renumberEntities` (`src/lib/reorder.ts`) ; `violatedConstraint`, `isPrismaError` (`src/lib/server-utils.ts`)
- Produces :
  - `projectIdSchema` et `type ProjectId` dans `src/lib/ids.ts`
  - `type ProjectWriteData` : le type de sortie de `projectSchema` (`src/lib/schemas/project.ts`) sans `displayOrder`
  - `type ProjectPatch = Partial<ProjectWriteData>`, `slug` compris : l'admin modifie le slug, seul le schéma de l'outil le refuse
  - `type ProjectWriteError = { code: "slug_taken" } | { code: "company_not_found" } | { code: "tag_not_found" } | { code: "dates_out_of_order" } | { code: "not_found" }`
  - `createProject(data: ProjectWriteData, position?: number): Promise<DomainResult<{ id: ProjectId; slug: string; titleFr: string }, ProjectWriteError>>`
  - `updateProject(id: ProjectId, patch: ProjectPatch, position?: number): Promise<DomainResult<{ id: ProjectId; slug: string; titleFr: string }, ProjectWriteError>>`
  - `invalidateProjectCaches(invalidate: (tag: string) => void): void`

- [ ] **Step 1 : tests qui échouent**

```ts
// src/server/portfolio/projects.integration.test.ts
it("creates a project last without a position, with its ClientMeta and ordered tags")
it("creates a project at the given position and renumbers all projects")
it("keeps the rank of a project updated without a position")
it("merges a partial patch of project and ClientMeta fields with the stored values")
it("keeps the tags when tagIds is absent and replaces them in order when present")
it("returns slug_taken, company_not_found, tag_not_found and not_found")
it("returns dates_out_of_order when only endedAt is sent and precedes the stored startedAt")
```

Chaque test relit la base : `displayOrder` de tous les projets en suite 1..n, `ClientMeta`, `ProjectTag.displayOrder`.

- [ ] **Step 2 : lancer les tests**

Run : `just test-integration`
Expected : FAIL, module `@/server/portfolio/projects` introuvable

- [ ] **Step 3 : implémenter `createProject`, `updateProject` et `invalidateProjectCaches`**

Reprendre la transaction de `createProjectWithRelations` et `updateProjectWithRelations` (`src/server/actions/projects.ts`). Ordre lu dans la transaction, `slug_taken` par `violatedConstraint` contenant `slug`, `company_not_found` et `tag_not_found` par P2003 sur `companyId` et `tagId`. En modification sans position, pas de renumérotation. Le `ClientMeta` se met à jour sans upsert (invariant du spec). `dates_out_of_order` se compare aux dates fusionnées.

- [ ] **Step 4 : réduire `createProject` et `updateProject` de l'action à des adaptateurs**

L'action importe les fonctions de domaine sous alias (`createProject as createProjectRecord`, `updateProject as updateProjectRecord`), passe `data.displayOrder` en position et traduit chaque code en état de formulaire avec les textes actuels (`not_found` → `project_not_found`). La règle « fin pas avant début » reste aussi dans `projectSchema` pour l'erreur de champ immédiate du formulaire. Les cas de règle métier de `src/server/actions/projects.integration.test.ts` passent au test du module de domaine, et `projects.test.ts` mocke `@/server/portfolio/projects` (`.claude/rules/nextjs/tests.md`) ; ses assertions d'invalidation attendent les deux nouveaux `revalidatePath`.

- [ ] **Step 5 : lancer les tests**

Run : `just test-unit && just test-integration`
Expected : PASS

---

### Task 2 : entité projet du domaine `portfolio`

**Files :**
- Create : `src/server/mcp/portfolio/entities/project.ts`
- Move (`git mv`) : `src/server/mcp/crm/day-fields.ts` et `day-fields.test.ts` vers `src/server/mcp/`, imports du CRM corrigés
- Modify : `src/server/mcp/portfolio/registry.ts`, `src/server/queries/projects.ts`
- Modify : `src/server/mcp/portfolio/tools.integration.test.ts`, `src/server/mcp/portfolio/tools-list.snapshot.json` (régénéré)
- Modify : `docs/ARCHITECTURE.md`, `docs/PRODUCTION.md`

**Interfaces :**
- Consumes : Task 1 (`createProject`, `updateProject`, `invalidateProjectCaches`, `ProjectWriteError`, `projectIdSchema`) ; socle du 06 ; `dateColumnDay`, `withDays`
- Produces :
  - `projectEntity`, ajouté à `PORTFOLIO_ENTITY_BY_NAME` (`entity` du domaine : `tag`, `project`)
  - dans `src/server/queries/projects.ts`, sans `'use cache'` : `findProjectSearchRows()` (id, slug, titres, statut), `findProjectForTool(id)` (tous les champs, `clientMeta` avec `company` en `companyRefSelect`, tags ordonnés avec id, slug, `nameFr`), `findProjectsPage({ where, orderBy, take, skip })`

- [ ] **Step 1 : tests qui échouent**

```ts
// src/server/mcp/portfolio/tools.integration.test.ts
it("lists tag and project in the portfolio tools and matches the contract snapshot")
it("creates a draft project last with its client and ordered tags, then fetches it")
it("finds a project by slug, French title or English title")
it("lists projects filtered by status, type, company and tag, sorted by display order")
it("publishes a draft and invalidates projects and the admin pages")
it("corrects the French case study of a published project without touching its tags or English case study")
it("replaces the tags in the order sent")
it("renders startedAt and endedAt as YYYY-MM-DD days and instants in Paris time")
it.each([
  ["a slug change", { slug: "other" }, "slug"],
  ["a cover outside the project folders", { coverFilename: "freelance/crm/x.png" }, "coverFilename"],
  ["an unknown company", { companyId: "missing-company" }, "crm_search"],
  ["an unknown tag", { tagIds: ["missing-tag"] }, "portfolio_search"],
  ["an end before the stored start", { endedAt: "2020-01-01" }, "endedAt"],
  ["an instant instead of a day", { startedAt: "2026-05-01T10:00:00Z" }, "YYYY-MM-DD"],
  ["an empty patch", {}, "fields"],
])("refuses %s without writing", ...)
it("answers an unknown id with a message that points to portfolio_search")
it("logs project:created and project:updated with the project id")
```

Les invalidations attendues sont `revalidateTag("projects", "max")` puis `revalidatePath(ADMIN_PROJECTS_PATH, "layout")` et `revalidatePath(ADMIN_TAGS_PATH)` après un succès, et aucune après un refus.

- [ ] **Step 2 : lancer les tests**

Run : `just test-integration`
Expected : FAIL, entité `project` absente du registre

- [ ] **Step 3 : déplacer `day-fields.ts` au socle et implémenter l'entité**

Le schéma reprend les bornes et enums de `src/lib/schemas/project.ts` (slug 80 au motif `SLUG_PATTERN`, titres 120, enums Prisma, `formats` d'au moins un, URL http ou https, `teamSize` d'au moins 1, `deliverablesCount` d'au moins 0 avec défaut 1). `isProjectAssetKey` borne la couverture, `dateColumnDay` les dates. `slug` n'existe que dans `createSchema`. `updateSchemaWithoutDetailsOf` est utilisé, faute de Détails. Les fragments `docs` disent qu'un statut `PUBLISHED` met le projet en ligne aussitôt, avec le logo de son entreprise, qu'une modification d'un projet publié part en ligne aussitôt, et qu'un projet personnel se rattache à la société de type `MA_SOCIETE`. Le tri `name` suit `displayOrder`. Pour la recherche, le libellé est `titleFr` et l'indice « slug · statut ». Les messages d'erreur : entreprise inconnue → `crm_search`, tag inconnu → `portfolio_search`, `dates_out_of_order` nomme `endedAt`.

- [ ] **Step 4 : lancer les tests et régénérer le snapshot du domaine**

Run : `just test-integration && git diff --exit-code src/server/mcp/crm/tools-list.snapshot.json`
Expected : PASS, snapshot `portfolio` avec `project`, snapshot CRM inchangé

- [ ] **Step 5 : docs**

Dans `docs/ARCHITECTURE.md`, les entités du domaine `portfolio` et le module `server/portfolio/projects.ts`. Dans `docs/PRODUCTION.md`, la checklist de release avec la lecture d'un projet par `portfolio_fetch` et la clé du poste.

- [ ] **Step 6 : preuve runtime confiée à `/verify`**

Le Scénario 2 du spec (page publique en 200 à la seconde requête après publication) se prouve par `/verify` sur le serveur de dev, jamais en production : un projet de test publié par `portfolio_update`, deux `GET /fr/projets/<slug>`, puis suppression du projet dans l'admin. Ajouter cette séquence à `.claude/skills/verify/SKILL.md` si `/verify` la découvre.

- [ ] **Step 7 : gate**

Run : `just lint && just typecheck && just test && just build`
Expected : PASS, couverture au-dessus du plancher
