# Socle MCP multi-domaine et tags du portfolio : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** rendre les outils MCP génériques communs à plusieurs domaines et ouvrir le domaine `portfolio` avec l'entité tag, sur une logique métier des tags commune à l'admin.

**Architecture :** trois tâches. La première sort le socle des outils de `src/server/mcp/crm/` vers `src/server/mcp/` sans rien changer au contrat `crm_*` (snapshot identique). La deuxième sort la création et la modification des tags des Server Actions vers `src/server/portfolio/tags.ts`. La troisième ouvre le domaine `portfolio` sur le socle avec l'entité tag.

**Tech Stack :** Next.js 16.4, Prisma 7, Zod 4, `@modelcontextprotocol/server` 2.4.0, Vitest 5.

**Spec :** `docs/superpowers/specs/outils-de-l-app-pour-les-agents/06-socle-mcp-multi-domaine-design.md`

## Global Constraints

- Contrat `crm_*` gelé : `src/server/mcp/crm/tools-list.snapshot.json` inchangé à l'octet (`git diff --exit-code` sur ce fichier), titres, descriptions, schémas et messages d'erreur des outils `crm_*` identiques
- Domaine `portfolio`, outils `portfolio_search`, `portfolio_fetch`, `portfolio_query`, `portfolio_create`, `portfolio_update`, libellé « Portfolio » ; aucun outil de suppression ni de réordonnancement
- L'écran des clés propose `portfolio` sans le présélectionner : la valeur par défaut reste `["crm"]` (`ApiKeyFormDialog.tsx:52`)
- Slug d'un tag fixé à la création ; ordre d'affichage non exposé à l'outil (fin de catégorie à la création et au changement de catégorie)
- Invalidation : `updateTag` dans l'action admin, `revalidateTag(tag, "max")` dans l'outil, pour `tags` et `projects`, plus `revalidatePath(ADMIN_TAGS_PATH)` (`.claude/rules/nextjs/rendering-caching.md`)
- Comportement de l'admin des tags inchangé : codes `slug_taken`, `tag_not_found`, textes, ordre, invalidations
- Schémas d'outil en `z.strictObject`, écrits pour JSON (`.claude/rules/zod/schemas.md`, `.claude/rules/modelcontextprotocol-server/input-schema.md`)
- Données de test fictives : slugs et noms inventés (`acme-framework`, « Acme Framework »), `example.com`
- Tests MCP sur le handler réel avec `next/cache` mocké (`.claude/rules/modelcontextprotocol-server/tests.md`)
- Commandes : `just test-unit` ou `just test-integration` aux étapes intermédiaires, `just test` (couverture 80 %) au gate final
- Aucun commit intermédiaire : `/implement-subproject` commite à la fin

## Review Focus

- **Snapshot régénéré par erreur** (`-u`) qui masquerait un changement du contrat CRM : la vérification de la Task 1 exige `git diff --exit-code src/server/mcp/crm/tools-list.snapshot.json`
- **`icon: ""` envoyé par l'agent** : refusé avec un message qui dit d'envoyer `null` pour effacer, jamais stocké vide. Test en Task 3
- **Recherche insensible à la casse et aux accents** (« next.js », « NEXTJS ») : le tag `nextjs` est trouvé par son nom ou son slug. Test en Task 3
- **Patch qui renvoie la catégorie actuelle** : le tag garde sa position, aucune renumérotation. Test en Task 2
- **Clé portant `portfolio` mais pas `crm`** : 403 sur `/api/mcp/crm`, symétrique du refus d'une clé `crm` seule sur `/api/mcp/portfolio`. Test en Task 3

---

### Task 1 : socle des outils commun aux domaines

**Files :**
- Create : `src/server/mcp/domain-tools.ts`, `src/server/mcp/crm/domain.ts`
- Create (déplacés de `src/server/mcp/crm/`, `git mv`) : `src/server/mcp/entity-definition.ts`, `src/server/mcp/results.ts`, `src/server/mcp/query-page.ts`, `src/server/mcp/update-input.ts`
- Delete : `src/server/mcp/crm/tools.ts`
- Modify : `src/server/mcp/crm/entities/*.ts`, `src/server/mcp/crm/registry.ts`, `src/server/mcp/crm/person-write-tool.ts`, `src/server/mcp/crm/person-fields.ts`, `src/server/mcp/crm/fields.ts`, `src/server/mcp/server.ts`
- Test : `src/server/mcp/crm/tools.integration.test.ts` (imports seulement)

**Interfaces :**
- Produces :
  - `defineEntity`, `RegisteredEntity<E>`, `ToolDocs`, `WriteContext`, `SearchHit<E>`, `joinHint` dans `src/server/mcp/entity-definition.ts` (renommages de `defineCrmEntity`, `RegisteredCrmEntity`, `CrmToolDocs`, `CrmWriteContext`, même forme)
  - `toolJson`, `toolError`, `guardTool`, `writeRecord`, `byId` inchangés dans `src/server/mcp/results.ts` ; `notFoundMessage(prefix: McpDomain, noun: string): string` et `writeTexts({ prefix, key, noun, pronoun }, createCheck)` paramétrés par le préfixe (« Call `${prefix}_search` », « Call `${prefix}_fetch` ») ; `detailsErrorMessage` déménage dans `src/server/mcp/crm/fields.ts`, seul le CRM a des Détails
  - `interface DomainToolTexts` : `recordNoun` (« CRM record »), `fetchNotFound(entity, id)`, `readFailure`, `queryOrderDescription`, et pour chacun des cinq outils `{ title, description }`
  - `interface McpDomainConfig<E extends string>` : `prefix: McpDomain`, `entities: readonly RegisteredEntity<E>[]`, `byName: Record<E, RegisteredEntity<E>>`, `texts: DomainToolTexts`, `detailsSectionDescription?: string` (présent : le `detailsSection` racine de `_update` est déclaré avec ce texte ; le CRM reprend le sien mot pour mot), `registerExtraTools?: (server: McpServer, logger: (ctx: ServerContext) => McpLogger) => void`
  - `domainToolsOf(domain: McpDomainConfig<string>): (server: McpServer) => void` dans `src/server/mcp/domain-tools.ts`
  - `crmDomain: McpDomainConfig<CrmEntity>` dans `src/server/mcp/crm/domain.ts`, avec l'outil `crm_fetch_company_logo` en `registerExtraTools`
  - `docsOf(entities, pick)` exporté par le socle pour assembler les descriptions à partir des fragments `docs`
  - `entityTable(table)` (aujourd'hui local à `src/server/mcp/crm/registry.ts`) exporté par `src/server/mcp/entity-definition.ts`, pour que chaque registre de domaine garde la garde de typage clé = nom d'entité

- [ ] **Step 1 : vérifier la ligne de base**

Run : `just test-integration`
Expected : PASS, dont `src/server/mcp/crm/tools.integration.test.ts` et son test de snapshot

- [ ] **Step 2 : déplacer les quatre modules du socle par `git mv`, renommer les types génériques et corriger les imports du CRM**

Les fragments propres au CRM restent dans `src/server/mcp/crm/`. `date-range.ts`, `day-fields.ts`, `fields.ts`, `person-*` et `entities/` ne bougent pas.

- [ ] **Step 3 : écrire `domainToolsOf` et `crmDomain`**

La logique de `src/server/mcp/crm/tools.ts` devient générique : `perEntityPart`, `matchRank` et `rankHits`, `guardRead`, et la répartition vers `byName[entity]`. Les noms d'outils sont `${prefix}_search` et la suite, le logger est `mcpLoggerFor(prefix, ctx.http?.authInfo)`. Le `detailsSection` racine de `_update` n'est déclaré que si `detailsSectionDescription` est fourni. `crmDomain` reprend mot pour mot les textes et titres actuels. `server.ts` pose `registerTools: domainToolsOf(crmDomain)`.

- [ ] **Step 4 : prouver le contrat inchangé**

Run : `just test-integration && git diff --exit-code src/server/mcp/crm/tools-list.snapshot.json`
Expected : PASS, puis code de sortie 0 sans diff sur le snapshot

- [ ] **Step 5 : lint et typecheck**

Run : `just lint && just typecheck`
Expected : PASS

---

### Task 2 : logique des tags hors des Server Actions

**Files :**
- Create : `src/server/portfolio/tags.ts`, `src/server/portfolio/tags.integration.test.ts`
- Modify : `src/server/actions/tags.ts`, `src/server/actions/tags.test.ts`, `src/lib/ids.ts`

**Interfaces :**
- Consumes : `DomainResult`, `ok`, `fail` (`src/server/result.ts`) ; `computeIdsAtPosition`, `removeId`, `renumberEntities` (`src/lib/reorder.ts`)
- Produces :
  - `type TagWriteData = { slug: string; nameFr: string; nameEn: string; kind: TagKind; icon: TagIconKey | null }`
  - `type TagWriteError = { code: "slug_taken" } | { code: "not_found" }`
  - `createTag(data: TagWriteData, position?: number): Promise<DomainResult<{ id: TagId; slug: string }, TagWriteError>>` : sans position, le tag va en fin de sa catégorie
  - `updateTag(id: TagId, patch: Partial<TagWriteData>, position?: number): Promise<DomainResult<{ id: TagId; slug: string }, TagWriteError>>` : un changement de `kind` sans position place le tag en fin de la nouvelle catégorie et renumérote l'ancienne
  - `invalidateTagCaches(invalidate: (tag: string) => void): void`, qui invalide `tags` et `projects` et appelle `revalidatePath(ADMIN_TAGS_PATH)`
  - `findCategoryIds` et `renumberTags` exportés pour `deleteTag` et `reorderTags`, qui restent dans l'action
  - `tagIdSchema` et `type TagId` dans `src/lib/ids.ts`, sur le motif des autres identifiants

- [ ] **Step 1 : tests qui échouent**

```ts
// src/server/portfolio/tags.integration.test.ts
it("creates a tag at the end of its category without a position")
it("creates a tag at the given position and renumbers the category")
it("moves a tag to the end of its new category and closes the gap in the old one")
it("keeps the position of a tag whose patch repeats its current category")
it("returns slug_taken on a taken slug and not_found on an unknown id")
```

Chaque test relit les `displayOrder` de la catégorie en base et attend une suite 1..n sans trou.

- [ ] **Step 2 : lancer les tests**

Run : `just test-integration`
Expected : FAIL, module `@/server/portfolio/tags` introuvable

- [ ] **Step 3 : implémenter `createTag`, `updateTag` et `invalidateTagCaches` dans `src/server/portfolio/tags.ts`**

`slug_taken` s'attribue par la contrainte violée (`violatedConstraint(err)` contient `slug`), comme les entreprises. Un P2025 sur un id disparu rend `not_found`.

- [ ] **Step 4 : réduire `createTag` et `updateTag` de l'action à des adaptateurs**

L'action importe les fonctions de domaine sous alias (`createTag as createTagRecord`, `updateTag as updateTagRecord`), sur le modèle de `src/server/actions/companies.ts`, `updateTag` de `next/cache` restant aliasé en `updateCacheTag`. Elle passe `data.displayOrder` en position. Elle traduit `slug_taken` en erreur de champ (« Ce slug est déjà utilisé. ») et `not_found` en `tag_not_found`, puis invalide par `invalidateTagCaches(updateCacheTag)`. Les tests de `src/server/actions/tags.test.ts` mockent `@/server/portfolio/tags` et ne gardent que l'adaptation (`FormData`, état, invalidation) (`.claude/rules/nextjs/tests.md`).

- [ ] **Step 5 : lancer les tests**

Run : `just test-unit && just test-integration`
Expected : PASS

---

### Task 3 : domaine `portfolio` et entité tag

**Files :**
- Create : `src/server/mcp/portfolio/registry.ts`, `src/server/mcp/portfolio/domain.ts`, `src/server/mcp/portfolio/entities/tag.ts`
- Create : `src/server/mcp/portfolio/tools.integration.test.ts`, `src/server/mcp/portfolio/tools-list.snapshot.json` (généré)
- Modify : `src/lib/mcp-domains.ts`, `src/server/mcp/server.ts`, `src/app/api/mcp/[domain]/route.ts`, `src/server/queries/tags.ts`
- Modify : `src/app/api/mcp/[domain]/route.integration.test.ts`
- Modify : `docs/ARCHITECTURE.md`, `docs/PRODUCTION.md`

**Interfaces :**
- Consumes : `domainToolsOf`, `McpDomainConfig`, `defineEntity`, `docsOf` (Task 1) ; `createTag`, `updateTag`, `invalidateTagCaches`, `TagWriteError` (Task 2)
- Produces :
  - `MCP_DOMAINS = ["crm", "portfolio"]`, `MCP_DOMAIN_LABELS.portfolio = "Portfolio"`
  - `PORTFOLIO_ENTITY_BY_NAME = { tag: tagEntity }`, `PORTFOLIO_ENTITIES`, `PORTFOLIO_ENTITY_NAMES`, `type PortfolioEntity`, sur le motif de `src/server/mcp/crm/registry.ts`. Le sub-project 07 y ajoute `project`
  - `portfolioDomain: McpDomainConfig<PortfolioEntity>` (sans `detailsSectionDescription`, `recordNoun: "portfolio record"`) et ses instructions tirées du registre (« Portfolio of this app, entities: tag. … »)
  - lectures sans cache pour l'outil dans `src/server/queries/tags.ts` : `findTagSearchRows()`, `findTagForTool(id)` (avec les projets qui le portent : id, slug, `titleFr`, statut), `findTagsPage({ where, orderBy, take, skip })`

- [ ] **Step 1 : tests qui échouent**

```ts
// src/server/mcp/portfolio/tools.integration.test.ts
it("lists exactly the five portfolio tools and matches the contract snapshot")
it("creates a tag at the end of its category and invalidates tags, projects and the admin tags page")
it("finds a tag by slug, French name or English name, case and accents ignored")
it("fetches a tag with the projects that carry it")
it("lists tags filtered by kind, sorted like the admin")
it("updates name, icon and kind of a tag partially")
it.each([
  ["a slug change", { slug: "other" }, "slug"],
  ["an icon outside the registry", { icon: "simple-icons:unknown" }, "icon"],
  ["an empty icon", { icon: "" }, "null"],
  ["an empty patch", {}, "fields"],
])("refuses %s without writing", ...)
it("answers an unknown id with a message that points to portfolio_search")
it("logs tag:created and tag:updated with the tag id")

// src/app/api/mcp/[domain]/route.integration.test.ts
it("answers 403 on /api/mcp/portfolio to a key limited to crm")
it("answers 403 on /api/mcp/crm to a key limited to portfolio")
it("serves portfolio tools/list to a key that carries portfolio")
```

Les assertions d'invalidation attendent `revalidateTag("tags", "max")`, `revalidateTag("projects", "max")` et `revalidatePath(ADMIN_TAGS_PATH)` après un succès, aucun appel après un refus.

- [ ] **Step 2 : lancer les tests**

Run : `just test-integration`
Expected : FAIL, domaine `portfolio` inconnu

- [ ] **Step 3 : implémenter l'entité tag, le registre et la configuration du domaine**

Le schéma de l'entité reprend les bornes de `src/lib/schemas/tag.ts` (slug 60 au motif `SLUG_PATTERN`, noms 60, `z.enum(TagKind)`). L'icône est `z.enum(TAG_ICON_KEYS).nullable()`. `slug` n'existe que dans `createSchema`, et le schéma strict de modification le refuse avec un message propre (« The slug of a tag is fixed at creation: … »). Il n'y a ni Détails ni `detailsSection`, donc `updateSchemaWithoutDetailsOf`. Le tri `name` suit l'ordre des catégories de l'admin (`KIND_ORDER` de `src/lib/tags.ts`, pas l'ordre de l'enum Postgres) puis l'ordre d'affichage : le volume des tags étant faible (moins de cent), `findTagsPage` lit les tags filtrés et trie puis pagine en mémoire. La recherche porte sur le slug, `nameFr` et `nameEn` (`normalizeForSearch`) : le libellé est `nameFr`, l'indice « slug · kind ».

- [ ] **Step 4 : brancher le domaine**

Ajouter `portfolio` à `MCP_DOMAINS` et à son libellé, une entrée dans la table de `server.ts` et un handler dans `route.ts`, que le `satisfies Record<McpDomain, …>` impose.

- [ ] **Step 5 : lancer les tests et générer le snapshot du domaine**

Run : `just test-integration && git diff --exit-code src/server/mcp/crm/tools-list.snapshot.json`
Expected : PASS, snapshot `portfolio` écrit à la première exécution, snapshot CRM inchangé

- [ ] **Step 6 : docs**

Dans `docs/ARCHITECTURE.md` : l'arborescence `server/mcp/` (socle et dossiers par domaine) et `server/portfolio/`, la ligne « domaines servis » (`crm` et `portfolio`), et l'invalidation `tags` côté MCP dans la section cache. Dans `docs/PRODUCTION.md`, checklist de release : `POST /api/mcp/portfolio` sans clé → `401`, puis `tools/list` et `portfolio_query` sur `tag` avec la clé du poste. Dans la procédure de création et de rotation des clés, la consigne : le domaine `portfolio` ne se coche que sur la clé du poste, jamais sur celle des jobs d'`agent-os`.

- [ ] **Step 7 : gate**

Run : `just lint && just typecheck && just test && just build`
Expected : PASS, couverture au-dessus du plancher
