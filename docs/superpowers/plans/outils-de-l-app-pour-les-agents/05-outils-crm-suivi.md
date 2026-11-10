# Outils CRM, opportunités, entretiens, actions, signaux et revues : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** ajouter les opportunités, entretiens, actions de prospection, signaux et revues hebdomadaires aux outils génériques du CRM, sous les mêmes règles que l'admin et éprouver les outils sur des copies de test de trois commandes freelance.

**Architecture :** une tâche par entité. Chacune déplace la persistance de son module d'actions vers `src/server/crm/<module>.ts`, qui rend un `DomainResult`, réduit l'action à un adaptateur et ajoute l'entrée de l'entité au registre `CRM_ENTITIES`. Une dernière tâche crée les copies de test dans le dépôt des skills freelance.

**Tech Stack :** Next.js 16.4, Prisma 7, Zod 4, `@modelcontextprotocol/server` 2.4.0, Vitest 5.

**Spec :** `docs/superpowers/specs/outils-de-l-app-pour-les-agents/05-outils-crm-suivi-design.md`

## Global Constraints

- Prérequis des sub-projects 03 et 04 :
  - `DomainResult`, `ok`, `fail`, `saveEntity` avec `onDomainError: (error: E) => { state: TState; invalidate: boolean }`
  - `CRM_ENTITIES`, `CrmEntityDefinition` (générique sur ses schémas) et `defineCrmEntity`, `CrmWriteContext` (`{ log: McpLogger }`, logger de la requête), `SearchHit`, `toolJson`, `toolError`, `replaceDetailsSection`
  - gardes de `src/server/crm/person-guards.ts` (`assertProspectionAllowed`, `assertNewIdentity`, `PersonConflict`, `PersonConflictError`), `revalidatePersonLists`, `personConflictMessage` et `conflictErrors` (`src/server/actions/_support/person-form.ts`), `personRef` (`src/server/mcp/crm/person-ref.ts`)
  - schémas d'outil en `z.strictObject`, tri et pagination de `crm_query` (20 par défaut, 100 au plus)
- `onDomainError` des adaptateurs : `invalidate: true` pour `not_found` (et pour `company_not_found` des signaux), `false` ailleurs
- Comportement de l'admin inchangé : codes de message, textes, invalidations de chaque module, `changeProspectingActionStatus` et `rescheduleProspectingAction` compris
- Aucun outil de suppression ; par l'outil, entretien avec `correspondentIds` seulement, jamais `newCorrespondents`
- Personne liée opposée rendue `{ id, name: null, optedOut: true }` par `personRef`, sans email ni LinkedIn
- Logs : événements des modules (`opportunity:*`, `interview:*`, `prospecting_action:*`, `signal:*`, `weekly_review:*`) par `ctx.log` (`CrmWriteContext` du 03 : `action: 'mcp'`, `requestId`, `keyId`)
- Gabarits des Détails à la création : `OPPORTUNITY_DETAILS_TEMPLATE`, `interviewDetailsTemplate(type)`
- Données de test fictives : Jane Doe, Acme, « Plateforme data », `example.com`
- `tools.integration.test.ts` mocke `next/cache` (et `next/headers` si lu) comme `src/server/actions/contacts.integration.test.ts:3-6` (Global Constraint du plan 03)
- Commandes de test : `just test-unit` ou `just test-integration` aux étapes intermédiaires, `just test` (seuil de couverture 80 %) seulement au gate final
- Aucun commit intermédiaire dans ce dépôt : `/implement-subproject` commite à la fin. Les copies de test vivent sur une branche du dépôt des skills freelance

## Review Focus

- **Intervalle de dates inversé** dans `crm_query` (`from` après `to`) sur `scheduledAt`, `occurredAt`, `occurredOn` et `closingFriday` : refusé par le schéma, jamais une liste vide trompeuse. Test paramétré dont chaque tâche propriétaire ajoute sa ligne (Tasks 2 à 5)
- **`startMonth` mal formé** (`2026-13`, `11/2026`) : refusé sur le format `YYYY-MM`. Test en Task 1
- **`onSiteDays` supérieur à `daysPerWeek` dans un patch qui ne change que l'un des deux** : refusé contre la valeur en base, comme le formulaire qui les envoie ensemble. Test en Task 1
- **Signal avec `companyId` et `personId` tous deux, ou aucun** : refusé par le schéma avant la base. Test en Task 4
- **`closingFriday` à un autre jour que vendredi ou au format datetime** : refusé. Test en Task 5

---

### Task 1 : opportunité

**Files :**
- Create : `src/server/crm/opportunities.ts`, `src/server/crm/opportunities.integration.test.ts`
- Create : `src/server/mcp/crm/entities/opportunity.ts`
- Modify : `src/lib/ids.ts` (`opportunityIdSchema` et `type OpportunityId` exportés, plus `interviewIdSchema`, `signalIdSchema`, `weeklyReviewIdSchema` avec leurs types `InterviewId`, `SignalId`, `WeeklyReviewId`, sur le motif de `prospectingActionIdSchema`)
- Modify : `src/server/actions/opportunities.ts`, `src/server/actions/opportunities.test.ts`, `src/server/queries/opportunities.ts`, `src/server/mcp/crm/registry.ts`
- Test : `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces :**
- Consumes : `personRef` (sub-project 04) ; `CompanyId`, `OpportunityId`
- Produces :
  - `type OpportunityWriteError = { code: 'intermediary_not_esn' } | { code: 'referrer_not_found'; field: 'referrerId' } | { code: 'company_not_found'; field: 'intermediaryId' | 'clientId' } | { code: 'days_out_of_range' } | { code: 'not_found' } | { code: 'no_details' } | { code: 'section_not_found'; headings: string[] }`
  - `createOpportunity(data: OpportunityWriteData)` et `updateOpportunity(id: OpportunityId, patch: OpportunityPatch)`, qui rendent `Promise<DomainResult<{ id: OpportunityId; title: string }, OpportunityWriteError>>`. `OpportunityWriteData` est le type de sortie du schéma `src/lib/schemas/opportunity.ts`, `OpportunityPatch` son `Partial` avec `detailsSection?`
  - `opportunityEntity` : définition produite par `defineCrmEntity` du 03, typée par ses schémas

- [ ] **Step 1 : tests qui échouent**

```ts
// opportunities.integration.test.ts
it('rejects a non-ESN intermediary and rechecks it only when it changes', ...)
it('maps a missing referrer and a missing company with the failing field', ...)       // referrerId, intermediaryId, clientId
it('rejects onSiteDays above daysPerWeek against the stored value in a patch', ...)   // Review Focus : 'days_out_of_range'
it('patches partially and replaces a details section', ...)
// tools.integration.test.ts
it('creates an opportunity with its details template and rejects a same client and intermediary', ...)
it('rejects a malformed startMonth', ...)                                              // Review Focus : '2026-13', '11/2026'
it('finds an opportunity by title or client name, hint client · status', ...)
it('filters opportunities by status and client', ...)
it('renders an opted-out referrer as id only', ...)                                    // { id, name: null, optedOut: true }
```

- [ ] **Step 2 : lancer** `just test-integration`, Expected : FAIL

- [ ] **Step 3 : domaine** : persistance déplacée à l'identique (`assertIntermediaryIsEsn` au seul changement d'intermédiaire, P2003 lu par contrainte, `referrerId` contre `intermediaryId` ou `clientId` pour le `field`). Le patch compare `onSiteDays` et `daysPerWeek` fusionnés avec la ligne lue dans la transaction (`days_out_of_range`)

- [ ] **Step 4 : adaptateur** : l'id reçu est parsé par `opportunityIdSchema`. `saveEntity` avec `onDomainError` (`switch` exhaustif sur `code`) : `intermediary_not_esn`, `MISSING_REFERRER`, `MISSING_COMPANY` sur le champ du `field`, `opportunity_not_found` conservés, `invalidate: true` pour `not_found` seulement, `revalidatePersonLists`

- [ ] **Step 5 : entrée du registre** : schémas sur les définitions de `src/lib/schemas/opportunity.ts` (titre 120, rôle 80, TJM, jours, `startMonth` `YYYY-MM`, durée 1 à 60), refinement client distinct de l'intermédiaire. Recherche, lecture avec apporteur par `personRef`, intermédiaire, client et entretiens, requête et filtres selon le spec

- [ ] **Step 6 : lancer** `just test-unit` puis `just test-integration`, Expected : PASS

---

### Task 2 : entretien

**Files :**
- Create : `src/server/crm/interviews.ts`, `src/server/crm/interviews.integration.test.ts`
- Create : `src/server/mcp/crm/entities/interview.ts`
- Create : `src/server/mcp/crm/date-range.ts`, `src/server/mcp/crm/date-range.test.ts`
- Modify : `src/server/actions/interviews.ts`, `src/server/actions/interviews.test.ts`, `src/server/queries/interviews.ts`, `src/server/mcp/crm/registry.ts`
- Test : `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces :**
- Consumes : `interviewTitle`, `interviewPlaces` (`src/lib/crm/interviews.ts`) ; `PersonConflict`, `personConflictMessage`, `CORRESPONDENT_WORDING` (sub-project 04) ; `personRef` ; `InterviewId`, `OpportunityId`
- Produces :
  - `dateRange(bound: z.ZodType<string>)` (`date-range.ts`) : schéma `{ from?: string; to?: string }` strict, refuse `from` après `to`, partagé par les Tasks 2 à 5
  - `type InterviewWriteError = { code: 'opportunity_not_found' } | { code: 'opportunity_without_intermediary' } | { code: 'correspondent_not_found' } | { code: 'correspondent_exists'; conflict: Extract<PersonConflict, { reason: 'exists' | 'opted_out' }> } | { code: 'not_found' } | { code: 'no_details' } | { code: 'section_not_found'; headings: string[] }`. `correspondent_exists` reste propre à l'admin, qui crée des correspondants et porte nom, rôles ou date d'opposition pour refaire son message
  - `createInterview(data: InterviewWriteData)`, `updateInterview(id: InterviewId, patch: InterviewPatch)`, qui rendent `Promise<DomainResult<{ id: InterviewId }, InterviewWriteError>>`. `InterviewWriteData` reprend le type de sortie du schéma, avec `newCorrespondents` facultatif et réservé à l'admin. `InterviewPatch` : `Partial` des champs de l'outil, absent = inchangé, `correspondentIds` présent = liste remplacée
  - `interviewEntity` : définition produite par `defineCrmEntity` du 03, typée par ses schémas

- [ ] **Step 1 : tests qui échouent**

```ts
// date-range.test.ts
it.each([instant bound, day bound])('rejects from after to and accepts equal or missing bounds', ...)
// interviews.integration.test.ts
it('rejects an ESN-side interview on an opportunity without intermediary', ...)
it('rejects an unknown or opted-out correspondent', ...)
it('keeps an opted-out correspondent already linked to the interview on update', ...)   // l'entretien garde un fait passé
it('returns correspondent_exists with roles or the opt-out date', ...)                   // création admin de correspondants
it('keeps correspondentIds when absent and replaces them when present', ...)
it('clears outcome when status is not FAIT', ...)
it('numbers interviews over the whole opportunity', ...)                                 // 3 entretiens, interviewPlaces avant filtre
// tools.integration.test.ts
it('creates a side CLIENT_FINAL, type TECHNIQUE interview with the TECHNIQUE template', ...)
it('titles interviews Entretien N · Technique in search and fetch', ...)                 // deux entretiens TECHNIQUE
it('keeps the number of an interview when the query filters on it alone', ...)
it('rejects newCorrespondents as an unknown field', ...)
it('renders an opted-out correspondent as id only', ...)
it.each(RANGE_FILTERS)('rejects an inverted %s range in crm_query', ...)                // Review Focus : crée la table, ligne interview.scheduledAt
```

- [ ] **Step 2 : lancer** `just test-unit` puis `just test-integration`, Expected : FAIL

- [ ] **Step 3 : domaine** : `assertInterviewTargets` (valeurs effectives : patch fusionné avec la ligne, exception du correspondant déjà lié et opposé depuis) et la création des correspondants de l'admin (`assertNewIdentity`, rôle contact) déplacés à l'identique. `InterviewRuleError` et `PersonConflictError` sont convertis en `DomainResult` (`correspondent_exists` porte le `conflict`)

- [ ] **Step 4 : adaptateur** : id parsé par `interviewIdSchema`, codes et champs d'erreur de `mapInterviewError` conservés, le message de `correspondent_exists` venant de `personConflictMessage(conflict, CORRESPONDENT_WORDING)`, `invalidate: true` pour `not_found` seulement, `revalidatePersonLists`

- [ ] **Step 5 : entrée du registre** : schéma sans `newCorrespondents`, `scheduledAt` en instant ISO avec décalage, `score` 0 à 10. `label` de recherche « Entretien N · type », titre de l'opportunité et date en `hint`, `interviewPlaces` calculé sur tous les entretiens des opportunités concernées. Un entretien correspond à la requête par son titre déduit ou le titre de son opportunité. Correspondants rendus par `personRef`. Filtres du spec, intervalle de `scheduledAt` par `dateRange(instant)`

- [ ] **Step 6 : lancer** `just test-unit` puis `just test-integration`, Expected : PASS

---

### Task 3 : action de prospection

**Files :**
- Create : `src/server/crm/prospecting-actions.ts`, `src/server/crm/prospecting-actions.integration.test.ts`
- Create : `src/server/mcp/crm/entities/prospecting-action.ts`
- Modify : `src/server/actions/prospecting-actions.ts`, `src/server/actions/prospecting-actions.test.ts`, `src/server/actions/prospecting-actions.integration.test.ts`, `src/server/queries/prospecting-actions.ts`, `src/server/mcp/crm/registry.ts`, `src/lib/schemas/prospecting-action.ts` (`actionDay` exporté)
- Test : `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces :**
- Consumes : `applyStatusRules` (`src/lib/crm/prospecting-action-status.ts:29`), `assertProspectionAllowed`, `PersonConflict`, `personConflictMessage`, `conflictErrors` (sub-project 04) ; `personRef` ; `dateRange` (Task 2) ; `ProspectingActionId`
- Produces :
  - `type ProspectingActionWriteError = { code: 'person_conflict'; conflict: Extract<PersonConflict, { reason: 'no_lead_role' | 'opted_out' }> } | { code: 'person_not_found' } | { code: 'not_found' }`
  - `createProspectingAction(data)`, `updateProspectingAction(id: ProspectingActionId, patch)`, qui rendent `Promise<DomainResult<{ id: ProspectingActionId }, ProspectingActionWriteError>>`. `patch` est un `Partial` des champs de l'outil, fusionné avec la ligne lue
  - `prospectingActionEntity` : définition produite par `defineCrmEntity` du 03, typée par ses schémas

- [ ] **Step 1 : tests qui échouent**

```ts
it('rejects a person without a lead role and an opted-out lead with its date', ...)
it('returns person_not_found on a foreign key violation of personId', ...)
it('sets dates with applyStatusRules on create and on a status-only patch to REPONDU', ...)   // respondedAt posé, jour conservé
it('guards the stored person when the patch omits personId', ...)
it('keeps reply when absent and clears it when null', ...)
it('keeps the board actions working on the moved guards', ...)                        // cas existants de prospecting-actions.integration.test.ts
it('finds an action by title or lead name, hint lead · date · status', ...)           // tools
it('renders an opted-out lead as id only', ...)                                       // tools
it.each(RANGE_FILTERS)(...)                                                           // tools : ligne prospecting-action.occurredAt
```

- [ ] **Step 2 : lancer** `just test-integration`, Expected : FAIL

- [ ] **Step 3 : domaine** : `requireProspectableLead` (lève `no_lead_role`), `assertProspectionAllowed` (lève `opted_out`) et `TIMING_SELECT` déplacés à l'identique. À la modification : personne effective = celle du patch sinon celle de la ligne, garde (verrous) avant la lecture du timing, état suivant = patch fusionné avec la ligne (`status` et `occurredAt` de la ligne si absents, `respondedAt` absent traité comme non saisi, `reply` de la ligne si absent), puis `applyStatusRules(current, next, now)`. P2003 sur `personId` rend `person_not_found`

- [ ] **Step 4 : adaptateurs** : `createProspectingAction` et `updateProspectingAction` passent par le domaine, textes par `conflictErrors` et `personConflictMessage`, `invalidate: true` pour `not_found` seulement. `changeProspectingActionStatus` et `rescheduleProspectingAction` gardent leur logique et leurs messages (`DELETED_ACTION_MESSAGE`, « Seule une action à faire se replanifie ») et appellent `personConflictMessage(err.conflict)` sur les gardes déplacées

- [ ] **Step 5 : entrée du registre** : schéma sur `ACTION_CHANNELS`, `ACTION_STATUSES`, `occurredAt` et `respondedAt` en jour ISO (la définition `actionDay` du schéma, exportée), `respondedAt` facultatif. Filtres du spec avec intervalle de `occurredAt` par `dateRange(day)`. Lead rendu par `personRef`

- [ ] **Step 6 : lancer** `just test-unit` puis `just test-integration`, Expected : PASS

---

### Task 4 : signal

**Files :**
- Create : `src/server/crm/signals.ts`, `src/server/crm/signals.integration.test.ts`
- Create : `src/server/mcp/crm/entities/signal.ts`
- Modify : `src/server/actions/signals.ts`, `src/server/actions/signals.test.ts`, `src/server/queries/signals.ts`, `src/server/mcp/crm/registry.ts`
- Test : `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces :**
- Consumes : `COMPANY_SIGNAL_TYPES`, `LEAD_SIGNAL_TYPES`, `canReceiveSignal`, `signalTypesFor` (`src/lib/crm/signals.ts`) ; `dateRange` (Task 2) ; `SignalId`, `CompanyId`, `PersonId`
- Produces :
  - `type SignalWriteError = { code: 'type_mismatch' } | { code: 'lead_not_eligible' } | { code: 'company_not_found' } | { code: 'not_found' }`
  - `createSignal(owner: { companyId: CompanyId } | { personId: PersonId }, data)`, `updateSignal(id: SignalId, patch)`, qui rendent `Promise<DomainResult<{ id: SignalId }, SignalWriteError>>`
  - `findSignals(params)` et `countSignals(params)` (`src/server/queries/signals.ts`, à côté de `signalsInclude`)
  - `signalEntity` : définition produite par `defineCrmEntity` du 03, typée par ses schémas

- [ ] **Step 1 : tests qui échouent**

```ts
it('rejects a type that does not fit the company or the lead', ...)
it('rejects an inbound or opted-out lead', ...)
it('never changes the owner on update', ...)
it('rejects both companyId and personId, or neither', ...)                            // tools, Review Focus
it('finds a signal by content, hint target · date', ...)                              // tools
it.each(RANGE_FILTERS)(...)                                                           // tools : ligne signal.occurredOn
```

- [ ] **Step 2 : lancer** `just test-integration`, Expected : FAIL

- [ ] **Step 3 : domaine** : `assertTypeFits`, `assertLeadAccepts`, relecture du rattachement à la modification, déplacés à l'identique ; `SignalRefusedError` converti en `DomainResult`

- [ ] **Step 4 : adaptateurs** : `createCompanySignal` et `createPersonSignal` appellent `createSignal` avec leur rattachement. Messages et invalidations propres au module conservés (listes des entreprises et des leads). `onDomainError` : `invalidate: true` pour `not_found` et `company_not_found`, comme `signals.ts` aujourd'hui

- [ ] **Step 5 : entrée du registre** : `crm_create` signal en union `{ companyId } | { personId }` (exactement un), contenu 1 à 500 caractères, `sourceUrl` max 2048. Filtres du spec avec intervalle de `occurredOn` par `dateRange(day)`

- [ ] **Step 6 : lancer** `just test-unit` puis `just test-integration`, Expected : PASS

---

### Task 5 : revue hebdomadaire

**Files :**
- Create : `src/server/crm/weekly-reviews.ts`, `src/server/crm/weekly-reviews.integration.test.ts`
- Create : `src/server/mcp/crm/entities/weekly-review.ts`
- Modify : `src/server/actions/weekly-reviews.ts`, `src/server/actions/weekly-reviews.test.ts`, `src/server/queries/weekly-reviews.ts`, `src/server/mcp/crm/registry.ts`
- Test : `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces :**
- Consumes : `weekBounds`, `countWeek` (`src/lib/crm/review-counters.ts`), `findWeekCounterSources` ; `weekLabel` (`src/lib/crm/weekly-reviews.ts`) ; `dateRange` (Task 2) ; `WeeklyReviewId`
- Produces :
  - `type WeeklyReviewWriteError = { code: 'review_week_exists' } | { code: 'not_found' }`
  - `createWeeklyReview(data: WeeklyReviewWriteData)` : sans compteurs, ils sont calculés comme dans l'action actuelle (`src/server/actions/weekly-reviews.ts:150-151`) : `bounds = weekBounds(closingFriday)`, `sources = await findWeekCounterSources(bounds)`, puis `countWeek(sources, bounds, now)`. `updateWeeklyReview(id: WeeklyReviewId, patch)` : un compteur absent reste inchangé. Toutes deux rendent `Promise<DomainResult<{ id: WeeklyReviewId }, WeeklyReviewWriteError>>`
  - `weeklyReviewEntity` : définition produite par `defineCrmEntity` du 03, typée par ses schémas

- [ ] **Step 1 : tests qui échouent**

```ts
it('computes the seven counters when absent, like the admin prefill', ...)           // semaine close le 2026-10-30
it('keeps provided counters', ...)
it('leaves counters unchanged on an update that omits them', ...)
it('rejects a second review for the same Friday, also by moving a review onto it', ...)
it('rejects a non-Friday or a datetime closingFriday', ...)                          // tools, Review Focus
it('accepts the qualitative fields and their enums', ...)                            // tools : status, motivation, wins, blockers, nextWeekPlan, notes
it.each(RANGE_FILTERS)(...)                                                           // tools : ligne weekly-review.closingFriday
```

- [ ] **Step 2 : lancer** `just test-integration`, Expected : FAIL

- [ ] **Step 3 : domaine et adaptateur** : P2002 (création et modification) vers `review_week_exists`, P2025 avec revue absente vers `not_found`, l'action garde son message et `revalidatePath(ADMIN_WEEKLY_REVIEWS_PATH, "layout")`, `invalidate: true` pour `not_found`. `computeWeekCounters` reste l'action de préremplissage de l'admin, sur le même calcul

- [ ] **Step 4 : entrée du registre** : compteurs facultatifs (entiers 0 à 999), `closingFriday` en date ISO de vendredi, champs qualitatifs du spec. Recherche sur `weekLabel` et la date, tri par défaut `closingFriday` décroissant, intervalle de `closingFriday` par `dateRange(day)`

- [ ] **Step 5 : lancer** `just test-unit` puis `just test-integration`, Expected : PASS

---

### Task 6 : copies de test des commandes freelance

**Files (dépôt des skills freelance, branche de test non fusionnée) :**
- Create (dépôt des skills freelance, `.claude/commands/`) : les copies suffixées `-app` des commandes d'ajout de lead, d'ajout d'action et de revue hebdomadaire

- [ ] **Step 1 : point d'arrêt propriétaire** : il crée la branche de test dans le dépôt des skills freelance et déclare le serveur local sur le poste. La commande est `claude mcp add --transport http crm http://localhost:3000/api/mcp/crm --header "Authorization: Bearer <clé>"`, avec une clé créée depuis la page du sub-project 02, ou par la commande ponctuelle du sub-project 01. Rien de cela n'est versionné

- [ ] **Step 2 : dupliquer** les commandes d'ajout de lead, d'ajout d'action et de revue hebdomadaire sous le suffixe `-app`. Dans le frontmatter, `allowed-tools` remplace les outils Notion par `mcp__crm__crm_search`, `mcp__crm__crm_fetch`, `mcp__crm__crm_query`, `mcp__crm__crm_create`, `mcp__crm__crm_update` (et `mcp__crm__crm_fetch_company_logo` pour la copie d'ajout de lead)

- [ ] **Step 3 : réécrire le déroulé** selon le spec § Copies de test. Les statuts Notion sont rapprochés de `LeadStatus` et `ActionStatus` dans une table en tête de chaque copie, sans score ICP ni timeline

- [ ] **Step 4 : recette par le propriétaire** (scénario 8 du spec) :
  - copie d'ajout d'action, pour un lead actif désigné par son nom, puis pour un lead opposé désigné par son email
  - copie de revue hebdomadaire, pour la dernière semaine
  - copie d'ajout de lead, pour une entreprise nouvelle
  
  Expected : écritures visibles dans l'admin local, refus de l'opposé avec sa date, commandes d'origine inchangées

- [ ] **Step 5 : quality gate du portfolio**

Run : `just lint && just typecheck && just test`
Expected : PASS, couverture ≥ 80 % lignes et branches
