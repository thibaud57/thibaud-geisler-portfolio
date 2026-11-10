# Outils CRM, socle générique et entreprises : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** exposer aux agents les cinq outils génériques du CRM sur l'entité entreprise, avec la logique métier sortie des Server Actions pour servir l'admin comme les outils.

**Architecture :** une couche de domaine `src/server/crm/companies.ts` rend des `DomainResult`. La Server Action et les outils MCP l'adaptent, chacun avec son parse et son invalidation. Les outils génériques s'assemblent depuis un registre d'entités (tuple de définitions génériques sur leurs schémas) qui ne compte ici que `company`.

**Tech Stack :** Next.js 16.4, Prisma 7, Zod 4, `@modelcontextprotocol/server` 2.4.0, Vitest 5.

**Spec :** `docs/superpowers/specs/outils-de-l-app-pour-les-agents/03-outils-crm-entreprises-design.md`

## Global Constraints

- Prérequis livrés par le sub-project 01 : route `/api/mcp/[domain]`, `buildServer(domain)`, `registerCrmTools(server)` dans `src/server/mcp/crm/tools.ts`, handler du domaine `crm` créé une fois au niveau module, appelé par `handler.fetch(request, { authInfo })`, `mcpLoggerFor(domain, authInfo)` et `McpLogger` dans `src/server/mcp/logger.ts`
- Comportement de l'admin inchangé : états de formulaire, erreurs de champ `slug_taken` et `siret_taken`, invalidations `updateTag("projects")`, `updateTag("legal-entity")`, `revalidatePersonLists()`
- Côté outils : `revalidateTag("projects", "max")`, `revalidateTag("legal-entity", "max")`, `revalidatePersonLists()`, jamais `updateTag`
- Aucune écriture de l'entité légale par les outils ; aucune suppression ; aucune vue déduite dans `crm_query`
- `crm_search` : 10 résultats par défaut, 50 au plus. `crm_query` : 20 par défaut, 100 au plus, tri `name | createdAt | updatedAt`
- Messages d'erreur d'outil : nommer la correction (outil à appeler, champ à fournir)
- Logs des écritures par outil : `company:created`, `company:updated`, `company:create_failed`, `company:update_failed`, `company_logo:fetched`, `company_logo:fetch_failed` (ceux de l'action `fetchCompanyLogo`), par `mcpLoggerFor('crm', ctx.http?.authInfo)` du sub-project 01 (`action: 'mcp'`, `domain`, `requestId`, `ip_hash`, `keyId`) ; jamais la valeur de la clé
- Aucun commit intermédiaire : `/implement-subproject` commite à la fin
- Aucune mise en production avant la fin de l'epic (`/finalize-feature`, après le sub-project 04) : les recettes tournent en local
- `tools.integration.test.ts` mocke `next/cache` (`revalidateTag`, `revalidatePath`) sur le motif de `src/server/actions/contacts.integration.test.ts:3-6` (`vi.mock` top-level), et `next/headers` si un module importé le lit. Les plans 04 et 05 reprennent cette contrainte
- Tests des outils : client avec `versionNegotiation: { mode: 'auto' }` (`.claude/rules/modelcontextprotocol-server/tests.md`), logs assertés par `toHaveBeenCalledWith`, jamais par un nombre d'appels
- Gates intermédiaires : `just test-unit` ou `just test-integration`. `just test` (seuil de couverture 80 %) seulement au gate final de la Task 6

## Review Focus

- **Slug avec majuscules ou espaces autour dans `crm_create`** : mis en minuscules comme dans l'admin (` Acme ` donne `acme`), un espace à l'intérieur reste refusé sur le format. Test en Task 4
- **`fields: {}` vide sans `detailsSection`** : `isError`, aucune écriture. Test en Task 4
- **`types: []` dans un patch** : refusé (au moins un type), comme dans l'admin. Test en Task 4
- **`limit: 0`, `limit: 500` ou `offset` négatif** : bornés ou refusés par le schéma, jamais une requête Prisma invalide. Test en Task 4
- **`crm_search` avec une requête vide ou faite d'espaces** : `isError` qui demande un terme, pas la liste entière. Test en Task 4
- **`legalEntity*` dans `crm_create` ou `crm_update`** : refusé par le schéma, jamais ignoré en silence. Test en Task 4
- **Erreur de stockage R2 pendant `crm_fetch_company_logo`** : loggée, rendue en erreur inconnue, aucune clé écrite. Test en Task 5

---

### Task 1 : `DomainResult` et `saveEntity`

**Files :**
- Create : `src/server/crm/result.ts`
- Modify : `src/server/actions/_support/shared.ts:94-138`
- Test : `src/server/actions/_support/shared.test.ts`

**Interfaces :**
- Produces :
  - `type DomainResult<T, E extends { code: string }> = { ok: true; value: T } | { ok: false; error: E }`, `ok<T>(value: T): { ok: true; value: T }`, `fail<E extends { code: string }>(error: E): { ok: false; error: E }` (`result.ts`)
  - `saveEntity` gagne une seconde surcharge, la première (forme existante) ne change pas :
    - `saveEntity<TInput extends object, TState, TValue, E extends { code: string }>(config: SaveDomainEntityConfig<TInput, TState, TValue, E>): Promise<TState>`
    - `SaveDomainEntityConfig` reprend `SaveEntityConfig` sans `notFound` et avec `persist: (data: TInput) => Promise<DomainResult<TValue, E>>`, `onSuccess: (value: TValue, data: TInput) => TState`, `successLogFields: (data: TInput, value: TValue) => Record<string, unknown>` et `onDomainError: (error: E) => { state: TState; invalidate: boolean }`
    - `onDomainError` rend `invalidate: true` pour les codes `*_not_found` : `saveEntity` appelle alors `invalidateCaches()` avant de rendre `state`. Aucun log de succès ni d'échec dans les deux cas. Un `persist` qui lève passe toujours par `mapError` puis `onUnknownError`

- [ ] **Step 1 : tests qui échouent.** Dans `shared.test.ts`, remplacer le mock du logger par un `log` partagé (`vi.hoisted`) pour asserter les logs. Ajouter une fonction `saveDomain(persist, { invalidate })` qui appelle la surcharge avec `onDomainError: (e) => ({ state: { failed: e.code }, invalidate })`

```ts
it('answers the domain error state and refreshes the caches when onDomainError asks for it', async () => {
  const invalidateCaches = vi.fn()

  const state = await saveDomain(async () => fail({ code: 'company_gone' as const }), { invalidateCaches, invalidate: true })

  expect(state).toEqual({ failed: 'company_gone' })
  expect(invalidateCaches).toHaveBeenCalledTimes(1)
  expect(log.info).not.toHaveBeenCalledWith(expect.objectContaining({ event: EVENTS.success }))
})

it('answers the domain error state without refreshing the caches when onDomainError does not ask for it', async () => {
  const invalidateCaches = vi.fn()

  const state = await saveDomain(async () => fail({ code: 'slug_taken' as const }), { invalidateCaches, invalidate: false })

  expect(state).toEqual({ failed: 'slug_taken' })
  expect(invalidateCaches).not.toHaveBeenCalled()
  expect(log.info).not.toHaveBeenCalledWith(expect.objectContaining({ event: EVENTS.success }))
})

it('passes the domain value to onSuccess, refreshes the caches and logs the success', async () => {
  const invalidateCaches = vi.fn()

  const state = await saveDomain(async () => ok({ id: 'c1' }), { invalidateCaches, invalidate: false })

  expect(state).toEqual({ saved: 'c1' })
  expect(invalidateCaches).toHaveBeenCalledTimes(1)
  expect(log.info).toHaveBeenCalledWith(expect.objectContaining({ event: EVENTS.success }))
})
```

- [ ] **Step 2 : lancer** `just test-unit`, Expected : FAIL sur ces trois cas

- [ ] **Step 3 : implémenter** `result.ts` et la seconde surcharge de `saveEntity` dans `shared.ts`, le corps commun (parse, `try/catch`, `mapError`, `onUnknownError`) restant partagé avec la forme existante

- [ ] **Step 4 : lancer** `just test-unit`, Expected : PASS, cas existants compris

---

### Task 2 : remplacement d'une section des Détails

**Files :**
- Create : `src/lib/crm/details-sections.ts`
- Test : `src/lib/crm/details-sections.test.ts`

**Interfaces :**
- Consumes : `normalizeForSearch` (`src/lib/admin/search.ts`, retire accents et casse, laisse l'emoji)
- Produces : `replaceDetailsSection(details: string | null, heading: string, content: string): { ok: true; details: string } | { ok: false; code: 'no_details' } | { ok: false; code: 'section_not_found'; headings: string[] }`. Une section commence à une ligne `# ` et finit avant la suivante ou à la fin du texte. Le titre se compare après `normalizeForSearch` puis retrait du préfixe qui n'est ni lettre ni chiffre (`/^[^\p{L}\p{N}]+/u`), étape propre à cette fonction. `headings` garde les titres tels qu'écrits, sans `# `

- [ ] **Step 1 : tests qui échouent** (gabarit `COMPANY_DETAILS_TEMPLATE` comme entrée)

```ts
it('replaces the body of a section and keeps the others', ...)       // « Chiffres clés » ← '50 salariés', les 4 autres titres et corps identiques
it('matches a heading regardless of emoji, case and accents', ...)    // 'a propos' trouve « # 🏢 À propos »
it('replaces the last section up to the end of the text', ...)        // « Liens »
it('reports a missing heading with the headings present', ...)        // code 'section_not_found', headings = les 5 titres sans '# '
it('reports empty details', ...)                                      // null et '' → code 'no_details'
```

- [ ] **Step 2 : lancer** `just test-unit`, Expected : FAIL

- [ ] **Step 3 : implémenter** `replaceDetailsSection`

- [ ] **Step 4 : lancer** `just test-unit`, Expected : PASS

---

### Task 3 : couche de domaine de l'entreprise, Server Action en adaptateur

**Files :**
- Create : `src/server/crm/companies.ts`
- Test : `src/server/crm/companies.integration.test.ts`
- Modify : `src/server/actions/companies.ts` (`toCreateData`, `toUpdateData`, `legalEntityCreate`, `addressMutation`, `toLegalEntityDraft`, `mapUniqueViolation` migrent vers le domaine)
- Modify : `src/server/actions/companies.test.ts`

**Interfaces :**
- Consumes : `DomainResult`, `ok`, `fail` (Task 1) ; `replaceDetailsSection` (Task 2) ; `CompanyInput` (`src/lib/schemas/company.ts:83`) ; `CompanyId` (`src/lib/ids.ts`) ; `companyFields` (`src/lib/crm/companies.ts`) ; `companyLogoRequestSchema` (`src/lib/schemas/company-logo.ts`) ; `retrieveCompanyLogo`, `CompanyIconFailure` (`src/server/company-logo/fetch-company-logo.ts`)
- Produces (`src/server/crm/companies.ts`, `import 'server-only'`) :
  - `type LegalEntityKey = Extract<keyof CompanyInput, \`legalEntity${string}\`>`
  - `type CompanyWriteData = CompanyInput`
  - `type CompanyPatch = { kind: 'fields'; fields: Partial<CompanyInput> } | { kind: 'section'; fields: Partial<Omit<CompanyInput, 'details' | LegalEntityKey>>; detailsSection: { heading: string; content: string } }`
  - `type CompanyCreateError = { code: 'slug_taken' } | { code: 'siret_taken' } | { code: 'legal_entity_slug_taken' }`
  - `type CompanyFieldsError = CompanyCreateError | { code: 'not_found' }`
  - `type CompanyWriteError = CompanyFieldsError | { code: 'no_details' } | { code: 'section_not_found'; headings: string[] }`
  - `type CompanySummary = { id: string; slug: string; name: string }`
  - `createCompany(data: CompanyWriteData): Promise<DomainResult<CompanySummary, CompanyCreateError>>`
  - `updateCompany(id: CompanyId, patch: Extract<CompanyPatch, { kind: 'fields' }>): Promise<DomainResult<CompanySummary, CompanyFieldsError>>` et `updateCompany(id: CompanyId, patch: CompanyPatch): Promise<DomainResult<CompanySummary, CompanyWriteError>>` (surcharges)
  - `type CompanyLogoError = { code: 'not_found' } | { code: 'no_website' } | { code: 'invalid_website' } | { code: CompanyIconFailure['message'] }`
  - `refreshCompanyLogo(id: CompanyId): Promise<DomainResult<{ key: string }, CompanyLogoError>>`

- [ ] **Step 1 : tests d'intégration qui échouent** (base de test, `retrieveCompanyLogo` mocké par `vi.mock`, données Acme)

```ts
it('creates a company with its nested legal entity, headquarters and the company slug', ...)
it('maps unique violations to slug_taken, siret_taken and legal_entity_slug_taken', ...)  // violations réelles
it('ignores the RCS number when the headquarters is in France', ...)
it('defaults the capital currency, and clears it with the capital', ...)
it('leaves absent fields unchanged and clears fields set to null', ...)            // size: null efface, name absent garde
it('leaves the legal entity and headquarters untouched without legalEntityName', ...)
it('upserts the legal entity on update and removes the headquarters when no address is given', ...)
it('writes the publisher VAT fields only when the entity has a publisher', ...)    // trois cas : écrit, intact (champs omis), ignoré sans Publisher
it('stores types, zones, relation status, notes and details, and keeps the fields the patch omits', ...)
it('replaces a details section with the fields in one transaction', ...)
it('writes nothing on section_not_found or no_details', ...)                        // relationStatus inchangé en base
it('returns not_found for an unknown id, with or without a details section', ...)
it('stores the logo key returned by retrieveCompanyLogo', ...)
it('returns no_website, invalid_website and service failures without writing', ...)  // no_icon_found → logoFilename inchangé
```

- [ ] **Step 2 : lancer** `just test-integration`, Expected : FAIL dans `companies.integration.test.ts`

- [ ] **Step 3 : implémenter le domaine** en déplaçant à l'identique la persistance de `src/server/actions/companies.ts`. Règles à reprendre, toutes couvertes par un test de l'étape 1 :
  - champs de l'entreprise par `companyFields` (un champ `undefined` est ignoré par Prisma)
  - entité légale créée seulement si `legalEntityName` est renseigné, avec le slug de l'entreprise
  - siège seulement si les quatre champs d'adresse sont renseignés
  - devise du capital : `undefined` sans capital, `null` avec un capital `null`, sinon la devise saisie ou `DEFAULT_CURRENCY`
  - `rcsNumber` à `null` si `isFrenchCountry(address?.country)`
  - à la modification, lecture de `addressId` et du `Publisher` de l'entité courante seulement si `legalEntityName` est présent. Sans nom : seuls les champs de l'entreprise
  - entité légale en `upsert` (create avec le slug de l'entreprise). Siège : `upsert` si adresse, `delete` si pas d'adresse et `addressId` existant, sinon rien
  - `Publisher` : `update` de `vatRegime` et `vatLiableSince` seulement s'il existe, jamais créé
  - P2002 : contrainte contenant `siret` donne `siret_taken`, `LegalEntity_slug` donne `legal_entity_slug_taken`, sinon `slug_taken`
  - P2025 avec cible absente (`rowExists`) donne `not_found`, P2025 avec cible présente est relancée
  - `detailsSection` : `findUnique` des Détails dans la `$transaction` (entreprise absente : `not_found`), `replaceDetailsSection`, écriture avec les champs, ou `section_not_found` / `no_details` sans écriture. Aucune invalidation de cache dans le domaine
  - `refreshCompanyLogo` : lit `websiteUrl` et `slug`, `no_website` si `websiteUrl` est vide, parse `{ websiteUrl, slug }` par `companyLogoRequestSchema` (`invalid_website` si le parse échoue), `retrieveCompanyLogo`, puis `logoFilename`. Une erreur levée par le stockage n'est pas attrapée

- [ ] **Step 4 : réduire la Server Action à un adaptateur** : `saveEntity` (surcharge `DomainResult`) avec `onDomainError`.
  - `switch` exhaustif sur `CompanyFieldsError['code']` : `slug_taken` et `siret_taken` sur leurs champs, `legal_entity_slug_taken` sur `legalEntityName` avec `message: null`, `not_found` en `company_not_found` avec `invalidate: true`. Les autres codes rendent `invalidate: false`
  - La création appelle `createCompany(data)` (type d'erreur sans `not_found`), la modification `updateCompany(companyId, { kind: 'fields', fields: data })` (première surcharge : `no_details` et `section_not_found` ne sont pas dans le type)
  - `id` parsé par `companyIdSchema` avant `saveCompany`. `invalidateCompanyCaches` reste dans l'action. `formStateHandlers` n'est plus appelé avec `notFound` pour les entreprises : la surcharge `DomainResult` ne le prend pas

- [ ] **Step 5 : réaligner `companies.test.ts`** sans perdre un cas. Mocker `@/server/crm/companies`. Garder le mock de `@/lib/prisma` pour `deleteCompany` et `companyExists`.
  - **Gardés en test d'adaptateur** : toute la validation du formulaire (slug vide, mal formé, mis en minuscules ; secteurs ; URL vide en `null` ; clé de logo hors dossier ; aucun type ; notes trop longues ; notes et Détails vides en `null` ; entité légale sans nom ; SIRET invalide ou espacé ; siège partiel), assertions sur l'appel du domaine mocké ; valeurs réaffichées en échec ; session absente ; invalidations `updateTag` après création et modification ; mapping des codes du domaine vers les champs (`slug_taken`, `siret_taken`, `legal_entity_slug_taken` en `message: null`) ; `not_found` en `company_not_found` avec invalidation ; tous les cas de `deleteCompany`
  - **Migrés dans `companies.integration.test.ts`** : persistance (types, zones triées, statut au défaut de la base, champs CRM intacts quand le formulaire ne les envoie pas, zones vidées, clé de logo conservée, ciblage par id), entité légale (création, RCS en France, devise par défaut et effacée, `upsert`, entité intacte sans nom), TVA du `Publisher` (trois cas), P2025 avec cible présente en erreur inconnue

- [ ] **Step 6 : lancer** `just test-unit` puis `just test-integration`, Expected : PASS

---

### Task 4 : registre, entité entreprise et cinq outils génériques

**Files :**
- Create : `src/server/mcp/crm/registry.ts`
- Create : `src/server/mcp/crm/entities/company.ts`
- Create : `src/server/mcp/crm/results.ts`
- Modify : `src/server/mcp/crm/tools.ts` (remplace le `crm_fetch` du prototype)
- Modify : `src/server/queries/companies.ts` (lecture légère pour la recherche, requête paginée, personnes rattachées pour `crm_fetch`)
- Test : `src/server/mcp/crm/tools.integration.test.ts` (mock de `next/cache` en tête de fichier)

**Interfaces :**
- Consumes : `createCompany`, `updateCompany`, `CompanyPatch`, `CompanyWriteError` (Task 3) ; `findCompanyByIdForAdmin` ; `normalizeForSearch` ; `COMPANY_SECTORS`, `COMPANY_SIZES`, `COMPANY_TYPES`, `RELATION_STATUSES`, `websiteUrlSchema`, `SLUG_PATTERN`, `NOTES_MAX_LENGTH`, `isCompanyLogoKey`, `companyIdSchema`, `ZONES`, `COMPANY_DETAILS_TEMPLATE`, `revalidatePersonLists`
- Produces :
  - `type SearchHit = { entity: CrmEntity; id: string; label: string; hint: string | null }` (`registry.ts`)
  - `type CrmWriteContext = { log: McpLogger }` (`McpLogger` du sub-project 01, rendu par `mcpLoggerFor('crm', ctx.http?.authInfo)`)
  - `interface CrmEntityDefinition<E extends string, TQuery extends z.ZodObject, TCreate extends z.ZodObject, TUpdate extends z.ZodObject>` (méthodes, pas des propriétés fonction) :
    - `entity: E`
    - `search(query: string): Promise<readonly SearchHit[]>`
    - `fetch(id: string): Promise<object | null>`
    - `querySchema: TQuery` et `query(params: z.output<TQuery>): Promise<{ rows: readonly object[]; total: number }>`
    - `createSchema: TCreate` et `create(input: z.output<TCreate>, ctx: CrmWriteContext): Promise<CallToolResult>`
    - `updateSchema: TUpdate` et `update(input: z.output<TUpdate>, ctx: CrmWriteContext): Promise<CallToolResult>`
    - chaque schéma est un objet complet avec `entity: z.literal(E)` (`querySchema` : `entity`, `filters?`, `sort?`, `order?`, `limit`, `offset` ; `createSchema` : `entity`, `data` ; `updateSchema` : `entity`, `id`, `fields?`, `detailsSection?`)
  - `defineCrmEntity<E extends string, TQuery extends z.ZodObject, TCreate extends z.ZodObject, TUpdate extends z.ZodObject>(definition: CrmEntityDefinition<E, TQuery, TCreate, TUpdate>): RegisteredCrmEntity<E>` avec `RegisteredCrmEntity<E>` : `entity: E`, `querySchema`, `createSchema`, `updateSchema` (en `z.ZodObject`), `search`, `fetch`, `query(args: unknown): Promise<CallToolResult>`, `create(args: unknown, ctx: CrmWriteContext): Promise<CallToolResult>`, `update(args: unknown, ctx: CrmWriteContext): Promise<CallToolResult>`. Les trois dernières parsent `args` par le schéma de la définition (`safeParse`, échec en `toolError`) dans la fermeture générique, donc sans cast, puis appellent la méthode de la définition avec la sortie typée
  - `CRM_ENTITIES = [companyEntity] as const`, `type CrmEntity = (typeof CRM_ENTITIES)[number]['entity']`, `isCrmEntity(value: string): value is CrmEntity` (`registry.ts`)
  - `toolJson(value: unknown): CallToolResult` et `toolError(message: string): CallToolResult` (`results.ts`)
  - `companyWriteErrorMessage(error: CompanyWriteError): string` (`entities/company.ts`), `switch` exhaustif

- [ ] **Step 1 : tests qui échouent** (client sur le handler du domaine, `authInfo` injecté sous la forme de la route du sub-project 01, `extra: { requestId, ipHash }` compris, `@/lib/logger` mocké comme dans le test de route du 01, `vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }))` en tête, entreprises Acme créées par Prisma)

```ts
it('finds a company ignoring case and accents, with its slug as hint', ...)       // query 'societe acm' → { entity: 'company', label: 'Société Acme', hint: 'societe-acme' }
it('rejects an empty or blank search query', ...)                                 // Review Focus
it('caps search results at 50', ...)
it('fetches a company with its legal entity, persons and opportunities', ...)
it('flags an unknown id in crm_fetch', ...)
it('filters, sorts and paginates crm_query with a total', ...)                    // 25 entreprises, 12 ACTIVE, limit 5 offset 10 → 2 lignes, total 12
it('bounds limit and offset in crm_query', ...)                                   // Review Focus : 0, 500, -1 refusés par le schéma
it('creates a company with the details template when details is absent', ...)
it('lowercases and trims the slug like the admin', ...)                           // Review Focus : ' Acme ' crée 'acme'
it('rejects a taken or malformed slug in crm_create', ...)                        // 'Acme' pris, 'Acme Corp' mal formé
it('refreshes the caches after a successful write only', ...)                     // revalidateTag('projects','max'), revalidateTag('legal-entity','max'), revalidatePath ; rien sur un échec
it('rejects legalEntity fields in crm_create and crm_update', ...)                // Review Focus : champ inconnu refusé
it('updates a field and a details section', ...)
it('rejects crm_update without fields nor detailsSection, or with empty fields', ...) // Review Focus : fields: {}
it('rejects fields.details together with detailsSection', ...)
it('rejects an empty types list in a patch', ...)                                 // Review Focus
it('reports a missing section with the headings present and writes nothing', ...)
it('keeps the legal entity untouched on crm_update', ...)
it('logs a write with the key id', ...)                                           // child lié à { domain: 'crm', keyId } de l'authInfo injecté, puis info appelé avec { event: 'company:created', ... }
```

- [ ] **Step 2 : lancer** `just test-integration`, Expected : FAIL

- [ ] **Step 3 : registre et helpers** : `registry.ts` et `results.ts` selon les interfaces

- [ ] **Step 4 : entité entreprise** (`companyEntity = defineCrmEntity({ ... })`).
  - Schémas JSON en `z.strictObject` (un champ inconnu ou `legalEntity*` est refusé) sur les définitions communes, slug en `.trim().toLowerCase()` comme `companySchema`, chaque champ avec `.describe()` et `null` pour effacer. `createSchema` : `{ entity, data }`, `data` sans `legalEntity*`. `updateSchema` : `{ entity, id, fields?, detailsSection? }` avec un `superRefine` qui exige l'un des deux, refuse `fields` vide et refuse `fields.details` avec `detailsSection`. `querySchema` : filtres `relationStatus`, `types`, `zones`, `sectors`, `size`, puis `sort`, `order`, `limit` (1 à 100, défaut 20), `offset` (≥ 0, défaut 0)
  - Patch : sans `detailsSection`, `{ kind: 'fields', fields }`. Avec `detailsSection`, `{ kind: 'section', fields, detailsSection }`, `fields.details` ayant été refusé par le `superRefine` et exclu du type de `fields` côté section
  - Recherche : lecture légère (`id`, `name`, `slug`) filtrée en mémoire par inclusion normalisée sur le nom et le slug
  - Requête : `findMany` paginé et `count`
  - Écritures : le domaine, puis à la réussite `revalidateTag("projects", "max")`, `revalidateTag("legal-entity", "max")` et `revalidatePersonLists()`. Une erreur du domaine rend `toolError(companyWriteErrorMessage(error))`. Une erreur inconnue est loggée (`company:create_failed` ou `company:update_failed`, `err` en clé) et rend un `toolError` générique
  - `crm_create` applique `COMPANY_DETAILS_TEMPLATE` si `details` manque

- [ ] **Step 5 : outils génériques** dans `registerCrmTools`.
  - `crm_fetch`, `crm_query`, `crm_create`, `crm_update` : `inputSchema` en `z.discriminatedUnion('entity', [first, ...rest])` construit en déstructurant `CRM_ENTITIES` (tuple non vide, sans cast), `crm_fetch` : `{ entity, id }` par entité. L'appel passe par `entity.query(args)`, `entity.create(args, ctx)`, `entity.update(args, ctx)` de l'entité du registre dont `entity` correspond à l'argument
  - `crm_search` hors de la union : `z.strictObject({ query: z.string().trim().min(1), entities: z.array(z.string().refine(isCrmEntity)).optional(), limit: 1 à 50, défaut 10 })`. Elle agrège les `search` des entités demandées (toutes par défaut), puis plafonne
  - Annotations : `readOnlyHint` sur `search`, `fetch` et `query`, `idempotentHint` sur `fetch` et `update`
  - Descriptions écrites pour un nouvel arrivant, avec l'outil à appeler avant : `crm_search` avant `crm_fetch` et `crm_update`
  - Log des écritures par `mcpLoggerFor('crm', ctx.http?.authInfo)`, passé en `CrmWriteContext`

- [ ] **Step 6 : lancer** `just test-integration`, Expected : PASS

---

### Task 5 : outil `crm_fetch_company_logo`

**Files :**
- Modify : `src/server/mcp/crm/tools.ts`
- Modify : `src/server/mcp/crm/entities/company.ts` (message par code de `CompanyLogoError`)
- Test : `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces :**
- Consumes : `refreshCompanyLogo`, `CompanyLogoError` (Task 3) ; `toolJson`, `toolError` (Task 4) ; `ADMIN_ASSETS_PATH`, `revalidatePersonLists`
- Produces : outil `crm_fetch_company_logo` `{ id }` (`id` par `companyIdSchema`), réponse `{ id, logoFilename }`. `companyLogoErrorMessage(error: CompanyLogoError): string` (`entities/company.ts`), `switch` exhaustif sur `not_found`, `no_website`, `invalid_website`, `site_unreachable`, `site_too_slow`, `address_blocked`, `icon_too_small`, `no_icon_found`

- [ ] **Step 1 : tests qui échouent** (`retrieveCompanyLogo` mocké)

```ts
it('stores the fetched logo and returns its key', ...)
it('asks for a website when the company has none', ...)       // isError mentionne websiteUrl et la capture Wayback
it('reports the service failure cause', ...)                  // no_icon_found → message qui le nomme
it('logs and reports an unknown error when the storage throws', ...)  // Review Focus : retrieveCompanyLogo rejette, logoFilename inchangé, log company_logo:fetch_failed
```

- [ ] **Step 2 : lancer** `just test-integration`, Expected : FAIL

- [ ] **Step 3 : implémenter** l'outil : `refreshCompanyLogo` dans un `try/catch` qui logge `company_logo:fetch_failed` (`err` en clé) et rend un `toolError` générique, puis à la réussite `revalidatePath(ADMIN_ASSETS_PATH)` et `revalidatePersonLists()`, log `company_logo:fetched`. Un message par code, `switch` exhaustif

- [ ] **Step 4 : lancer** `just test-integration`, Expected : PASS

---

### Task 6 : docs du code livré et recette

**Files :**
- Modify : `docs/ARCHITECTURE.md`
- Modify : `.claude/rules/nextjs/server-actions.md`

- [ ] **Step 1 : ARCHITECTURE.md** (`Skill[architecture-doc]`) :
  - couche `src/server/crm/` dans la structure du code
  - `src/server/mcp/crm/` (registre, entités, outils)
  - § Patterns Utilisés, ligne Server Actions (« mutations côté serveur sans API route dédiée ») : les outils MCP sont une seconde entrée vers la même logique de domaine
  - § Données & Cache > Cache (« invalidation par `updateTag` depuis les Server Actions de l'espace admin ») : les outils invalident par `revalidateTag(tag, 'max')` pour `projects` et `legal-entity` et par `revalidatePath` pour les listes du CRM, `updateTag` n'étant permis que dans une Server Action

- [ ] **Step 2 : rule** (`Skill[rules-doc]`) : dans `nextjs/server-actions.md`, l'action d'un domaine qui a sa couche `src/server/crm/` ne fait qu'adapter (`FormData`, état du formulaire, `updateTag`) et appelle la fonction de domaine, la règle métier n'y étant jamais réécrite. Erreur attendue en `DomainResult`, traitée par `onDomainError` qui décide aussi de l'invalidation

- [ ] **Step 3 : recette** depuis Claude Code sur le serveur local, avec une clé créée par la commande ponctuelle `tsx` du sub-project 01 (permission `crm`, aucune dépendance au sub-project 02) : les scénarios 1 à 7 du spec, puis le scénario 8 dans l'admin (création, slug pris, modification avec entité légale, modification d'une entreprise supprimée depuis un autre onglet)

- [ ] **Step 4 : quality gate final**

Run : `just lint && just typecheck && just test`
Expected : PASS, couverture ≥ 80 % lignes et branches
