# Outils CRM, leads et contacts : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** ajouter les leads et les contacts aux outils génériques du CRM sous les mêmes gardes que l'admin (doublons, opposition RGPD) et déclarer Anthropic comme destinataire de ces données.

**Architecture :** les gardes de personnes passent dans `src/server/crm/person-guards.ts` et portent des données structurées, les textes des conflits restant côté adaptateur dans `person-form.ts`. `src/server/crm/{leads,contacts}.ts` rendent des `DomainResult` que les Server Actions et les entrées `lead` et `contact` du registre adaptent. Deux migrations ajoutent les catégories légales et insèrent le destinataire Anthropic.

**Tech Stack :** Next.js 16.4, Prisma 7, PostgreSQL 18, Zod 4, `@modelcontextprotocol/server` 2.4.0, next-intl, Vitest 5.

**Spec :** `docs/superpowers/specs/outils-de-l-app-pour-les-agents/04-outils-crm-personnes-design.md`

## Global Constraints

- Prérequis livrés par le sub-project 03 : `DomainResult`, `ok`, `fail`, `saveEntity` avec `onDomainError: (error: E) => { state: TState; invalidate: boolean }`, `CRM_ENTITIES`, `CrmEntityDefinition` (générique sur ses schémas) et `defineCrmEntity`, `CrmWriteContext` (`{ log: McpLogger }`, logger de la requête), `SearchHit`, `toolJson`, `toolError`, `replaceDetailsSection`, tri et pagination de `crm_query`, schémas en `z.strictObject`
- `onDomainError` des adaptateurs : `invalidate: true` pour `not_found` seulement (écran périmé réaligné, comme le chemin P2025 de `saveEntity`), `false` partout ailleurs
- Comportement de l'admin inchangé : codes de message (`lead_exists`, `lead_opted_out`, `lead_opted_out_locked`, `lead_not_found`, `contact_exists`, `contact_opted_out`, `contact_opted_out_locked`, `contact_not_found`, `person_not_found`, `unknown_error`), textes des formulaires, invalidations `revalidatePersonLists()`
- Hors des schémas d'écriture des outils : `score`, `optedOutAt`, `exchangesErasedAt`. Aucun outil d'opposition, d'effacement ni de suppression
- Personnes opposées : jamais listées par `crm_query`, trouvées par `crm_search` sur leur email ou leur URL LinkedIn exacts seulement, rendues `{ id, name: null, optedOut: true }` sans email ni LinkedIn quand une fiche les cite
- Logs : `lead:*` et `contact:*` des actions, par `ctx.log` (`CrmWriteContext` du 03 : `action: 'mcp'`, `requestId`, `keyId`), avec `personId`, jamais un nom ni un email
- Registre et politique sans détail du compte Claude (dépôt public)
- Données de test fictives : Jane Doe, John Roe, Acme, `example.com`
- `tools.integration.test.ts` mocke `next/cache` (et `next/headers` si lu) comme `src/server/actions/contacts.integration.test.ts:3-6` (Global Constraint du plan 03)
- Commandes de test : `just test-unit` ou `just test-integration` aux étapes intermédiaires, `just test` (seuil de couverture 80 %) seulement au gate final
- Aucun commit intermédiaire : `/implement-subproject` commite à la fin

## Review Focus

- **Email en majuscules ou avec espaces** (`Jane.Doe@Example.com `) : normalisé comme dans l'admin, donc reconnu comme doublon d'un lead existant. Test en Task 3
- **URL LinkedIn sous une autre forme** (`linkedin.com/in/JaneDoe/` sans `https`) : normalisée par `normalizeLinkedinProfileUrl`, doublon reconnu. Test en Task 3
- **`fromLeadId` mêlé à des champs de personne** dans `crm_create` contact : refusé, jamais une création ambiguë. Test en Task 3
- **`companyId` d'une entreprise inexistante** : `isError` qui demande de chercher l'entreprise par `crm_search`. Test en Task 3
- **Recherche par un fragment** (`janedoe`, `jane.doe@exam`) : trouve la personne ordinaire, jamais une personne opposée, que seule la correspondance exacte de son email ou de son URL LinkedIn rend. Test en Task 3

---

### Task 1 : gardes dans la couche de domaine

**Files :**
- Create : `src/server/crm/person-guards.ts` (déplacé de `src/server/actions/_support/person-guards.ts`)
- Create : `src/server/actions/_support/person-form.ts`, `src/server/actions/_support/person-form.test.ts`
- Delete : `src/server/actions/_support/person-guards.ts`
- Modify : imports de `src/server/actions/{leads,contacts,prospecting-actions,persons,interviews,opportunities,companies}.ts` et `src/server/mcp/crm/entities/company.ts` (tous importent `revalidatePersonLists` ou les gardes ; `interviews.ts` appelle `assertNewIdentity`, désormais sans `wording`)
- Modify : `src/server/actions/persons.types.ts` (`PersonLockedError` retirée, sans réexport : `leads.ts` et `contacts.ts` l'importent de `@/server/crm/person-guards`, les seuls à l'employer)

**Interfaces :**
- Produces (`src/server/crm/person-guards.ts`) :
  - `type IdentityField = "email" | "linkedinUrl"`, `type ConflictField = IdentityField | "personId"`, `type PersonRole = "lead" | "contact"`
  - `type PersonConflict` :
    - `{ reason: "exists"; field: ConflictField; personName: string | null; roles: Record<PersonRole, boolean> }`
    - `{ reason: "opted_out"; field: ConflictField; optedOutAt: Date }`
    - `{ reason: "person_missing" | "not_a_lead" | "no_lead_role"; field: "personId" }`
  - `class PersonConflictError extends Error` : `constructor(readonly conflict: PersonConflict)`, sans message de formulaire
  - `class PersonLockedError extends Error {}`
  - `assertNewIdentity(client: Prisma.TransactionClient, data: { email?: string | null; linkedinUrl?: string | null }, currentPersonId: PersonId | null): Promise<void>` : sans `wording`, ne contrôle que les identifiants fournis et non nuls
  - `assertNotOptedOut`, `assertOptOutOver`, `assertProspectionAllowed`, `deletePersonIfRoleless`, `revalidatePersonLists` : signatures inchangées
- Produces (`src/server/actions/_support/person-form.ts`) :
  - `collectPersonValues(formData: FormData)`, `interface DuplicateWording`
  - `LEAD_WORDING`, `CONTACT_WORDING`, `CONTACT_CREATE_WORDING`, `CORRESPONDENT_WORDING : DuplicateWording`, repris des actions (une seule définition)
  - `personConflictMessage(conflict: PersonConflict, wording?: DuplicateWording): string`
  - `conflictErrors(conflict: PersonConflict, wording?: DuplicateWording): Partial<Record<ConflictField, string[]>>`

- [ ] **Step 1 : test qui échoue** dans `person-form.test.ts`, `it.each` sur `personConflictMessage`, un cas par texte d'aujourd'hui (`Jane Doe`, `jane.doe@example.com`)

```ts
it.each([
  ["a lead duplicating a lead", LEAD_WORDING, exists("email", { lead: true, contact: false }), "Ce lead existe déjà : Jane Doe"],
  ["a lead form hitting a contact", LEAD_WORDING, exists("email", { lead: false, contact: true }), "Cette personne est déjà un contact : Jane Doe"],
  ["a contact form hitting a lead", CONTACT_WORDING, exists("email", { lead: true, contact: false }), "Cette personne est déjà un lead : Jane Doe"],
  ["a contact creation hitting a lead", CONTACT_CREATE_WORDING, exists("email", { lead: true, contact: false }), "Cette personne est déjà un lead : Jane Doe, choisissez-la « Depuis un lead »"],
  ["a correspondent hitting a lead", CORRESPONDENT_WORDING, exists("linkedinUrl", { lead: true, contact: false }), "Cette personne est déjà un lead : Jane Doe, choisissez-la parmi les correspondants existants"],
  ["an already attached contact", CONTACT_WORDING, exists("personId", { lead: true, contact: true }), "Ce contact existe déjà : Jane Doe"],
  ["a person without known role", undefined, exists("email", { lead: false, contact: false }), "Cette personne existe déjà : Jane Doe"],
  ["an opted-out person", LEAD_WORDING, { reason: "opted_out", field: "email", optedOutAt: new Date("2026-02-02T10:00:00Z") }, "Cette personne s'est opposée à la prospection le 02/02/2026"],
  ["a missing person", undefined, { reason: "person_missing", field: "personId" }, "Cette personne n'existe plus, recharge la page"],
  ["a person who is not a lead", undefined, { reason: "not_a_lead", field: "personId" }, "Cette personne n'est pas un lead"],
  ["a person without lead role", undefined, { reason: "no_lead_role", field: "personId" }, "Cette personne n'a pas de fiche lead"],
])("renders %s", (_label, wording, conflict, expected) => {
  expect(personConflictMessage(conflict, wording)).toBe(expected)
})
```

`exists(field, roles)` est une factory locale du test qui rend un `PersonConflict` de raison `exists` nommé « Jane Doe ». Ajouter un cas sur `conflictErrors` : le texte se range sous le `field` du conflit.

- [ ] **Step 2 : lancer** `just test-unit`, Expected : FAIL (module absent)

- [ ] **Step 3 : déplacer et restructurer** : `duplicateIdentityMessage` et `optOutMessage` passent, privés, dans `personConflictMessage`, un `switch` exhaustif sur `conflict.reason` (`assertNever`). `findIdentityConflict` et `assertNewIdentity` lèvent `new PersonConflictError({ reason, ... })` avec les données qui servaient aux textes. `assertProspectionAllowed` lève `opted_out` sur `personId`. `collectPersonValues` et les quatre formulations vivent dans `person-form.ts`. Aucun import ne reste vers l'ancien chemin (grep de vérification sur `_support/person-guards`)

- [ ] **Step 4 : rebrancher les actions** : les `mapError` et les `catch` qui lisaient `err.message` ou `conflictErrors(err)` passent `err.conflict` à `personConflictMessage` ou `conflictErrors` avec leur formulation :
  - `leads.ts` et `contacts.ts` : table `reason` vers code de message, exhaustive sur les cinq raisons (`exists` : `lead_exists` ou `contact_exists`, `opted_out` : `lead_opted_out` ou `contact_opted_out`, les trois absences : `lead_not_found` ou `person_not_found`)
  - `interviews.ts` : `mapInterviewError` appelle `personConflictMessage(err.conflict, CORRESPONDENT_WORDING)` sur `newCorrespondents`
  - `prospecting-actions.ts` : `requireProspectableLead` lève `no_lead_role`, `mapActionError` appelle `conflictErrors(err.conflict)` et `changeProspectingActionStatus` et `rescheduleProspectingAction` (les `catch` qui lisaient `err.message`) appellent `personConflictMessage(err.conflict)`
  - `persons.ts`, `opportunities.ts`, `companies.ts`, `entities/company.ts` : chemin d'import seulement

- [ ] **Step 5 : vérifier sans régression** : lancer `just test-unit` puis `just test-integration`, Expected : PASS, tous les cas existants de `leads.test.ts`, `contacts.test.ts`, `persons.test.ts`, `prospecting-actions*.test.ts`, `interviews.test.ts` inchangés et `just typecheck` sans erreur

---

### Task 2 : domaine des leads et des contacts

**Files :**
- Create : `src/server/crm/leads.ts`, `src/server/crm/contacts.ts`
- Test : `src/server/crm/leads.integration.test.ts`, `src/server/crm/contacts.integration.test.ts`
- Modify : `src/server/actions/leads.ts`, `src/server/actions/contacts.ts` (adaptateurs), `src/server/actions/leads.test.ts`, `src/server/actions/contacts.test.ts`, `src/server/actions/contacts.integration.test.ts`

**Interfaces :**
- Consumes : gardes (Task 1) ; `DomainResult`, `ok`, `fail`, `replaceDetailsSection`, `saveEntity` avec `onDomainError` (sub-project 03) ; `LeadInput` (`src/lib/schemas/lead.ts`) ; `detailsAfterContactPromotion` ; `PersonId`
- Produces :
  - `type PersonWriteError`, union discriminée par `code` :
    - `{ code: 'person_conflict'; conflict: PersonConflict }`
    - `{ code: 'identity_taken'; field: ConflictField }` (P2002, sans nom ni rôles)
    - `{ code: 'person_locked' }`, `{ code: 'company_not_found' }`, `{ code: 'not_found' }`
    - `{ code: 'no_details' }`, `{ code: 'section_not_found'; headings: string[] }`
  - `type LeadWriteData = Omit<LeadInput, 'score'> & { score?: LeadInput['score'] }`, `type LeadPatch = Partial<LeadWriteData> & { detailsSection?: { heading: string; content: string } }`
  - `createLead(data: LeadWriteData): Promise<DomainResult<{ personId: string }, PersonWriteError>>`
  - `updateLead(personId: PersonId, patch: LeadPatch): Promise<DomainResult<{ personId: string }, PersonWriteError>>`
  - `type ContactWriteData` : type de sortie de `newContactSchema` (`src/lib/schemas/network-contact.ts`) ; `ContactPatch` : `Partial` de ce type plus `detailsSection?`
  - `createContact(data: ContactWriteData)`, `attachContact(leadId: PersonId, data: { types: ContactType[]; status: ContactStatus })`, `updateContact(personId: PersonId, patch: ContactPatch)`, qui rendent `Promise<DomainResult<{ personId: string }, PersonWriteError>>`

- [ ] **Step 1 : tests d'intégration qui échouent** (base de test, Jane Doe / Acme / `example.com`). Les cas de rattachement de `src/server/actions/contacts.integration.test.ts` (rôle posé, gabarit remplacé, texte gardé, opposé refusé, pas un lead) migrent ici avec les mêmes données, assertions sur le `DomainResult`

```ts
// leads.integration.test.ts
it('creates a lead with its person', ...)
it('returns person_conflict exists with the existing name and roles', ...)    // email déjà porté par un contact → roles { lead: false, contact: true }
it('returns person_conflict opted_out over a duplicate on the other identifier', ...)  // email opposé, LinkedIn d'une autre fiche
it('returns person_locked when updating an opted-out person', ...)
it('returns company_not_found and not_found', ...)
it('patches partially without reading the identity that is absent', ...)      // patch { email } sur une personne dont le LinkedIn est porté par une autre fiche → accepté
it('replaces a details section in the same transaction as the patch', ...)
// contacts.integration.test.ts
it('creates a contact with a new person', ...)
it('attaches a contact to a lead and swaps an untouched lead template', ...)
it('keeps written details when attaching', ...)
it('returns not_a_lead, exists with both roles, opted_out with its date and person_missing on attach', ...)
it('maps a unique violation to identity_taken per field', ...)                 // personId, linkedinUrl, email
it('tells a missing company from a missing person on a foreign key violation', ...)
```

- [ ] **Step 2 : lancer** `just test-integration`, Expected : FAIL dans les deux fichiers

- [ ] **Step 3 : implémenter le domaine** en déplaçant à l'identique la persistance des actions :
  - verrou d'opposition avant le contrôle d'identité dans `updateLead` et `updateContact`
  - `assertAttachable` déplacé dans `attachContact`, qui lève `person_missing`, `opted_out`, `not_a_lead` ou `exists` (nom, rôles `{ lead: true, contact: true }`)
  - P2002 vers `identity_taken` (leads : `email` si la contrainte le nomme, sinon `linkedinUrl` ; contacts : `Contact_pkey` ou `personId` vers `personId`, `linkedinUrl`, sinon `email`), P2003 vers `company_not_found` (contacts : contrainte `personId` vers `person_conflict` de raison `person_missing`), P2025 avec fiche absente vers `not_found`
  - les `PersonConflictError` et `PersonLockedError` attrapées à la sortie de la transaction et rendues en `DomainResult`
  - `detailsSection` résolue dans la transaction ; un patch ne passe à `assertNewIdentity` que ses identifiants présents

- [ ] **Step 4 : réduire les actions à des adaptateurs** : `saveEntity` avec `onDomainError`, `switch` exhaustif sur `code` puis sur `conflict.reason`, vers les codes de message et les textes de `personConflictMessage` (`identity_taken` : « Cette personne existe déjà » sur le champ). `{ state, invalidate }` : `invalidate: true` pour `not_found` seulement. `no_details` et `section_not_found` sont inatteignables depuis les formulaires (`assertNever` sur un type restreint). `deleteLead` garde son `PersonLockedError` importé de `@/server/crm/person-guards`

- [ ] **Step 5 : réaligner les tests d'actions** : `leads.test.ts` et `contacts.test.ts` mockent la persistance au niveau de `@/server/crm/{leads,contacts}`, mêmes cas d'adaptation. `contacts.integration.test.ts` garde `deleteContact`, `deleteLead`, `optOutPerson` et deux cas d'adaptation : `state.message` vaut `contact_opted_out` pour un lead opposé, `state.errors.personId` vaut `["Cette personne n'est pas un lead"]`

- [ ] **Step 6 : lancer** `just test-unit` puis `just test-integration`, Expected : PASS

---

### Task 3 : entrées `lead` et `contact` du registre

**Files :**
- Create : `src/server/mcp/crm/entities/lead.ts`, `src/server/mcp/crm/entities/contact.ts`
- Create : `src/server/mcp/crm/person-ref.ts`, `src/server/mcp/crm/person-ref.test.ts`
- Modify : `src/server/mcp/crm/registry.ts` (`CRM_ENTITIES = [companyEntity, leadEntity, contactEntity] as const`)
- Modify : `src/server/queries/{leads,contacts,persons}.ts` (lecture légère pour la recherche, requête paginée sans personnes opposées)
- Test : `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces :**
- Consumes : domaine (Task 2) ; `CrmEntityDefinition`, `SearchHit`, `toolJson`, `toolError` (sub-project 03) ; `findLeadByIdForAdmin`, `findContactByIdForAdmin` ; `leadDetailsTemplate`, `CONTACT_DETAILS_TEMPLATE` ; `normalizeForSearch`, `normalizeLinkedinProfileUrl` ; énumérations des personnes et des rôles
- Produces :
  - `leadEntity` et `contactEntity`, produites par `defineCrmEntity` du 03, typées par leurs schémas de requête, de création et de modification
  - `personRef(person: { id: string; name: string | null; optedOutAt: Date | null }): { id: string; name: string; optedOut?: undefined } | { id: string; name: null; optedOut: true }` (`person-ref.ts`), consommé par le 05
  - `personWriteErrorMessage(error: PersonWriteError): string`, `switch` exhaustif sur `code` puis `conflict.reason`, messages qui nomment la correction
  - `SearchHit` porte `optedOut?: true` pour une personne opposée

- [ ] **Step 1 : tests qui échouent** (client sur `handler.fetch`, `authInfo` injecté). `person-ref.test.ts` : une personne opposée rendue `{ id, name: null, optedOut: true }`, une autre avec son nom. `tools.integration.test.ts` :

```ts
it('finds a person by name and by email, ignoring case and accents', ...)    // hint 'Acme · lead'
it('finds a person by a fragment, never an opted-out one', ...)              // Review Focus : 'janedoe', 'jane.doe@exam' ; l'opposée sous 'john.roe'
it('finds an opted-out person by her exact email or LinkedIn URL only', ...) // label 'Opposée à la prospection', optedOut: true, hint = identifiant, sans nom
it('fetches a lead with its links and an opted-out record reduced', ...)     // { id, name: null, optedOut: true, optedOutAt }, sans email
it('filters leads and contacts in crm_query', ...)                           // 3 DISCUSSION → total 3
it('keeps opted-out persons out of crm_query', ...)                          // liste sans filtre, aucun filtre optedOut dans le schéma
it('creates a lead with the OUTBOUND template', ...)
it('creates a contact directly and from a lead with fromLeadId', ...)
it('rejects fromLeadId mixed with person fields', ...)                       // Review Focus
it('rejects a duplicate after email and LinkedIn normalization', ...)        // Review Focus : 'Jane.Doe@Example.com ', 'linkedin.com/in/JaneDoe/'
it('rejects an opted-out identity with its opt-out date', ...)
it('rejects an unknown companyId and points to crm_search', ...)             // Review Focus
it('rejects score in crm_update and a locked record', ...)
```

- [ ] **Step 2 : lancer** `just test-unit` et `just test-integration`, Expected : FAIL

- [ ] **Step 3 : implémenter les entrées** :
  - schémas `z.strictObject` sur `src/lib/schemas/person.ts` et `lead.ts`, sans `score`
  - `crm_create` contact en union de `{ fromLeadId, types, status }` et des champs de personne
  - recherche en mémoire sur le nom, l'email et l'URL LinkedIn normalisés des personnes qui ont un rôle ; `hint` = nom de l'entreprise et rôles ; personne opposée exclue sauf si la requête normalisée (email en minuscules, ou `normalizeLinkedinProfileUrl`) égale son identifiant
  - lecture : formes `AdminLead` et `AdminContact` et leurs liens ; fiche opposée réduite
  - requête : filtres du spec, `person.optedOutAt` nul exigé pour les leads, ligne résumée (id, nom, entreprise, statut, mise à jour)
  - écritures : le domaine, puis `revalidatePersonLists()` et le log ; gabarits des Détails à la création

- [ ] **Step 4 : lancer** `just test-unit` et `just test-integration`, Expected : PASS

---

### Task 4 : Anthropic dans la politique de confidentialité

**Files :**
- Modify : `prisma/schema.prisma` (`ProcessingKind` + `AI_ASSISTANT`, `DataCategory` + `PROFESSIONAL_INFO`)
- Create : `prisma/migrations/<horodatage>_processing_kind_ai_assistant/migration.sql`
- Create : `prisma/migrations/<horodatage>_recipient_anthropic/migration.sql`
- Modify : `src/lib/schemas/legal-keys.ts:6`
- Modify : `messages/fr.json`, `messages/en.json` (voir Step 7 pour les chemins)
- Modify : `content/legal/fr/confidentialite-intro.md`, `content/legal/en/confidentialite-intro.md` (puce « Prospection »)

**Interfaces :**
- Produces : `RetentionPolicyKey = z.enum(["logs1Year", "logs30Days", "session13Months", "recipientTerms"])`

- [ ] **Step 1 : clé de conservation** : ajouter `recipientTerms` à `RetentionPolicyKey`. Le test existant `src/lib/schemas/legal-keys.test.ts` exige une traduction non vide de chaque clé dans `fr.json` et `en.json`, sans nouveau test

- [ ] **Step 2 : lancer** `just test-unit`, Expected : FAIL dans `legal-keys.test.ts`, deux fois (`fr` et `en`) sur `recipientTerms`

- [ ] **Step 3 : valeurs d'enum** : schéma, puis `pnpm prisma migrate dev --create-only --name processing_kind_ai_assistant` (aucune recette `just` ne crée une migration sans l'appliquer : `just db-migrate` applique aussitôt). La migration ne contient que les deux `ALTER TYPE "public"."…" ADD VALUE`

- [ ] **Step 4 : migration d'insertion** (`pnpm prisma migrate dev --create-only --name recipient_anthropic`, SQL écrit à la main, schéma `public`, identifiants entre guillemets) en deux instructions, la seconde lisant la ligne que la première a écrite :
  - Instruction 1 : un CTE insère l'`Address` (`id` = `uuidv7()`, `updatedAt` = `now()`, `street`, `postalCode`, `city`, `country` renseignés) seulement `WHERE NOT EXISTS` une `LegalEntity` de slug `anthropic-ireland`, puis insère la `LegalEntity` (`id` = `uuidv7()`, slug `anthropic-ireland`, nom `Anthropic Ireland, Limited`, `addressId` du CTE, `updatedAt` = `now()`, `legalForm` omis) en `ON CONFLICT ("slug") DO NOTHING`
  - Instruction 2 : `INSERT INTO "DataProcessing" … SELECT` depuis la `LegalEntity` de ce slug : `id` = `uuidv7()`, slug `anthropic-ai-assistant`, `kind` `'AI_ASSISTANT'`, `dataCategories` `ARRAY['IDENTITY','CONTACT','PROFESSIONAL_INFO']`, `retentionPolicyKey` `'recipientTerms'`, `legalBasis` `'LEGITIMATE_INTERESTS'`, `outsideEuFramework` omis, `displayOrder` = `COALESCE(MAX("displayOrder"), 0) + 1` sur la table, `updatedAt` = `now()`, finalités FR et EN du spec, en `ON CONFLICT ("slug") DO NOTHING`
  - littéraux d'enum avec cast explicite (`'AI_ASSISTANT'::"public"."ProcessingKind"`, `LegalBasis` et `DataCategory[]` pour le tableau)
  - `createdAt` et `displayOrder` ont un défaut en base, `id` et `updatedAt` n'en ont pas (`@default(uuid(7))` et `@updatedAt` sont posés par Prisma)
  - adresse relue sur `anthropic.com/legal/privacy` le jour de l'écriture

- [ ] **Step 5 : point d'arrêt propriétaire** : relecture des valeurs de la migration (entité, adresse, finalités) avant de l'appliquer

- [ ] **Step 6 : appliquer** sur la base de dev (`just db`) et sur la base de test (`just db-test`), Expected : deux migrations appliquées, une seule ligne `anthropic-ai-assistant` et une seule `Address` rattachée après avoir rejoué la seconde migration (`pnpm prisma db execute --file <migration.sql>`)

- [ ] **Step 7 : textes** :
  - clés FR et EN : `Legal.processingKind.AI_ASSISTANT` « Assistant IA » / « AI assistant » ; `Legal.dataCategory.PROFESSIONAL_INFO` « Informations professionnelles (poste, entreprise, notes d'échanges) » / « Professional information (job title, company, exchange notes) » ; `Legal.retention.recipientTerms` « Selon les conditions du destinataire » / « Per the recipient's terms »
  - `PrivacyPolicy.recipients.intro` : « destinataires » à la place de « sous-traitants » (FR : « Les données personnelles peuvent être transmises aux destinataires suivants pour les finalités décrites : », EN : « …with the following recipients… ») et `PrivacyPolicy.recipients.tableHeaders.name` : « Destinataire » / « Recipient »
  - `PrivacyPolicy.lastUpdated` au jour de la modification
  - phrase de la puce « Prospection » : les fiches peuvent être consultées et mises à jour par l'assistant IA Claude d'Anthropic Ireland, Limited, responsable de traitement distinct, qui les héberge aux États-Unis sous clauses contractuelles types selon sa politique

- [ ] **Step 8 : lancer** `just test-unit`, Expected : PASS

---

### Task 5 : registre des traitements, documentation et recette

**Files :**
- Modify : `docs/registre-traitements.md` (traitement 7 et `date` du frontmatter)
- Modify : `docs/ARCHITECTURE.md` (ligne `revalidatePersonLists` du tableau des mécanismes et § Protection Données)

- [ ] **Step 1 : traitement 7**, sans détail du compte et `date` du frontmatter au jour de la modification :
  - Destinataire : ajout d'Anthropic Ireland, Limited (assistant IA Claude), responsable de traitement distinct, quand le propriétaire consulte ou met à jour les fiches par l'assistant
  - Transferts hors UE : hébergement d'Anthropic aux États-Unis sous clauses contractuelles types, selon sa politique de confidentialité
  - Conservation : chez Anthropic, selon ses conditions
  - Information des personnes : politique de confidentialité (puce « Prospection » et tableau des destinataires)
  - AIPD : « Non nécessaire à cette échelle : aucune donnée sensible, aucune décision automatisée n'évalue les personnes, l'assistant ne calcule pas de score. À réévaluer avec la qualification par agent (Feature 4) »

- [ ] **Step 2 : ARCHITECTURE.md** (`Skill[architecture-doc]`) : les gardes vivent dans `src/server/crm/person-guards.ts`, aux deux endroits qui citent l'ancien chemin

- [ ] **Step 3 : recette** :
  - scénarios 1 à 6 du spec depuis Claude Code sur le serveur local
  - scénario 7 dans l'admin (doublon, personne opposée, saisie valide sur les formulaires lead et contact)
  - scénario 8 sur `/fr/confidentialite` et `/en/confidentialite` (`just dev`)

- [ ] **Step 4 : quality gate**

Run : `just lint && just typecheck && just test`
Expected : PASS, couverture ≥ 80 % lignes et branches
