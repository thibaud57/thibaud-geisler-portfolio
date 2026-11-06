---
feature: "Feature 3 : Outils de l'app pour les agents"
subproject: "outils-crm-entreprises"
goal: "Exposer aux agents les cinq outils génériques du CRM sur l'entité entreprise, avec la logique métier sortie des Server Actions pour servir l'admin comme les outils."
status: "draft"
complexity: "L"
tdd_scope: "full"
execution: "subagent-driven"
model: "opus"
effort: "high"
depends_on: ["01-prototype-serveur-mcp-design.md"]
date: "2026-11-06"
---

# Outils CRM : socle générique et entreprises

## Scope

Couvre le socle des cinq outils génériques du domaine CRM (`crm_search`, `crm_fetch`, `crm_query`, `crm_create`, `crm_update`), un registre d'entités que les sub-projects 04 et 05 complètent, et l'entité entreprise branchée dessus. S'y ajoutent l'outil propre `crm_fetch_company_logo` et la sortie de la logique métier de création et de modification d'une entreprise hors de `src/server/actions/companies.ts`, vers une couche de domaine appelée par la Server Action et par les outils. Exclut la suppression (aucun outil), l'écriture de l'entité légale par les outils (lue par `crm_fetch`, écrite par l'admin seul en attendant le pré-remplissage de la Feature 4), les vues déduites (« travaillées », « prospects ») dans `crm_query` et les autres entités (04 et 05).

### État livré

À la fin de ce sub-project, on peut : depuis Claude Code, chercher une entreprise par un nom approximatif, lire sa fiche et ses liens, lister les entreprises filtrées et paginées, en créer une puis modifier un champ et une section de ses Détails, récupérer son logo, et voir chaque changement dans l'admin. Les règles de validation sont les mêmes qu'à la saisie dans l'admin.

## Dependencies

- `01-prototype-serveur-mcp-design.md` (statut: draft) : route `/api/mcp/[domain]`, `buildServer`, `crm_fetch` du prototype que ce sub-project remplace par sa version générique, commande ponctuelle de création d'une clé utilisée par la recette

## Files touched

- **À créer** : `src/server/crm/result.ts` (`DomainResult<T, E>`, `ok`, `fail`)
- **À créer** : `src/server/crm/companies.ts` (création, modification, logo d'une entreprise)
- **À créer** : `src/server/crm/companies.integration.test.ts`
- **À modifier** : `src/server/actions/companies.ts` (adaptateur : `FormData`, état du formulaire, invalidation par `updateTag`)
- **À modifier** : `src/server/actions/companies.test.ts` (tests d'adaptateur, persistance migrée dans `src/server/crm/companies.integration.test.ts`)
- **À modifier** : `src/server/actions/_support/shared.ts` (`saveEntity` accepte un `persist` qui rend un `DomainResult` et un `onDomainError`)
- **À modifier** : `src/server/actions/_support/shared.test.ts`
- **À créer** : `src/lib/crm/details-sections.ts` (remplacement d'une section du markdown des Détails)
- **À créer** : `src/lib/crm/details-sections.test.ts`
- **À créer** : `src/server/mcp/crm/registry.ts` (définition d'une entité, `defineCrmEntity`, `CRM_ENTITIES`)
- **À créer** : `src/server/mcp/crm/entities/company.ts` (schémas JSON, lecture, recherche, requête, écritures)
- **À modifier** : `src/server/mcp/crm/tools.ts` (les cinq outils génériques et `crm_fetch_company_logo`)
- **À créer** : `src/server/mcp/crm/results.ts` (`toolJson`, `toolError`)
- **À modifier** : `src/server/mcp/crm/tools.integration.test.ts` (mock de `next/cache`)
- **À modifier** : `src/server/queries/companies.ts` (lecture par lot pour la recherche et la requête paginée)
- **À modifier** : `docs/ARCHITECTURE.md` (couche `src/server/crm/`, outils, nuance du motif Server Actions et de l'invalidation du cache)
- **À modifier** : `.claude/rules/nextjs/server-actions.md` (l'action adapte, la règle métier vit dans `src/server/crm/`)

## Architecture approach

- **Couche de domaine** : `src/server/crm/companies.ts` (`import 'server-only'`) porte :
  - `createCompany(data: CompanyWriteData)`, qui rend `DomainResult<CompanySummary, CompanyCreateError>`
  - `updateCompany(id: CompanyId, patch: CompanyPatch)`, en deux surcharges : un patch `kind: 'fields'` rend `CompanyFieldsError`, un patch `kind: 'section'` rend `CompanyWriteError`
  - `refreshCompanyLogo(id: CompanyId)`

  Les données sont typées, jamais un `FormData` :
  - `CompanyWriteData` : `CompanyInput` (`src/lib/schemas/company.ts`), dont les champs `legalEntity*` à plat comme dans le formulaire. L'entité légale n'est créée que si `legalEntityName` est renseigné
  - `CompanyPatch` : union discriminée par `kind`. `{ kind: 'fields'; fields: Partial<CompanyInput> }` couvre l'admin (tous les champs et `legalEntity*`) et l'outil sans section. `{ kind: 'section'; fields: Partial<Omit<CompanyInput, 'details' | LegalEntityKey>>; detailsSection: { heading: string; content: string } }` couvre l'outil avec section : `details` et les champs `legalEntity*` y sont interdits par le type

  Un champ absent du patch reste inchangé, `null` efface un champ facultatif. Les schémas d'outil n'exposent jamais `legalEntity*` : l'outil ne peut ni créer ni modifier l'entité légale, et le patch d'un outil se valide sur ses propres champs sans fusion avec l'état en base. Les violations d'unicité deviennent des erreurs du domaine : `slug_taken`, `siret_taken`, `legal_entity_slug_taken`, `not_found` (P2025 avec cible réellement absente, ou id inconnu). Un P2025 dont la cible existe encore reste une erreur inconnue, relancée. `detailsSection` se résout dans la `$transaction` de `updateCompany` : lecture des Détails, `replaceDetailsSection`, écriture avec les autres champs. Un échec rend `section_not_found` (avec les titres présents) ou `no_details`, et rien n'est écrit. Le motif sert aux autres entités à Détails (personne, opportunité, entretien) en 04 et 05. Aucune invalidation de cache dans le domaine : `updateTag` n'est permis que dans une Server Action (`.claude/rules/nextjs/rendering-caching.md`)
- **Règles reprises à l'identique** (lues dans `src/server/actions/companies.ts`, portées par le domaine) :
  - champs de l'entreprise écrits par `companyFields` (`src/lib/crm/companies.ts`) : un champ `undefined` est ignoré par Prisma, donc inchangé
  - entité légale créée seulement si `legalEntityName` est renseigné, avec le slug de l'entreprise comme slug
  - siège construit seulement si les quatre champs d'adresse sont renseignés (la validation `refineLegalEntity` garantit qu'un nom présent s'accompagne d'un siège complet)
  - devise du capital : inchangée si le capital est absent, effacée si le capital est `null`, sinon la devise saisie ou `DEFAULT_CURRENCY`
  - numéro RCS ignoré (`null`) quand le siège est en France (`isFrenchCountry`)
  - à la modification, l'entité légale se lit (siège et `Publisher`) seulement si `legalEntityName` est présent. Sans nom, seuls les champs de l'entreprise s'écrivent et l'entité légale reste intacte
  - entité légale en `upsert`. Siège en `upsert` si une adresse est fournie, supprimé si aucune adresse n'est fournie et que l'entité en avait une, sinon intact
  - TVA du `Publisher` (`vatRegime`, `vatLiableSince`) mise à jour seulement si l'entité légale a déjà un `Publisher`, jamais créé par ce formulaire
  - correspondance des violations d'unicité par la contrainte violée : SIRET, puis slug de l'entité légale, puis slug de l'entreprise par défaut. `legal_entity_slug_taken` garde un message de formulaire nul
  - la modification est une `$transaction` (lecture de l'entité légale courante puis écriture)
- **Erreur attendue dans le retour** : `DomainResult<T, E> = { ok: true; value: T } | { ok: false; error: E }`, `E` étant une union discriminée par `code`. `saveEntity` gagne une seconde surcharge dont le `persist` rend un `DomainResult` et qui exige `onDomainError: (error: E) => { state: TState; invalidate: boolean }`. `invalidate: true` fait appeler `invalidateCaches()` avant de rendre `state` : c'est le cas des codes `*_not_found` (écran périmé réaligné sur la base, comme le chemin P2025 existant de `saveEntity`). Aucun log de succès dans les deux cas. Les adaptateurs décident par un `switch` exhaustif sur `code`. La forme existante de `saveEntity` ne change pas, ses appelants non plus. Les gardes de personnes des sub-projects 04 et 05 suivront le même motif à leur extraction
- **Adaptateurs** :
  - **Server Action** (`src/server/actions/companies.ts`) : elle garde le parse de `FormData` par `companySchema`, la traduction des erreurs du domaine en erreurs de champ et messages (`slug_taken`, `siret_taken`, `legal_entity_slug_taken`, `not_found` en `company_not_found` avec invalidation) et l'invalidation existante (`updateTag("projects")`, `updateTag("legal-entity")`, `revalidatePersonLists()`). Elle parse son `id` par `companyIdSchema` à la frontière
  - **Outil** : il parse ses arguments par le schéma JSON, traduit l'erreur en résultat `isError` et invalide par `revalidateTag("projects", "max")`, `revalidateTag("legal-entity", "max")` et `revalidatePersonLists()`, qui passe par `revalidatePath` et vaut dans un route handler
- **Registre d'entités** : `src/server/mcp/crm/registry.ts`.
  - `CrmEntityDefinition<E, TQuery, TCreate, TUpdate>` décrit ce qu'une entité apporte, générique sur son discriminant `E` et sur ses trois schémas d'entrée, chaque méthode recevant la sortie de son schéma (`z.output<TCreate>`) sans cast ni `any`. Les schémas sont des `z.ZodObject` complets avec le champ `entity` littéral
  - `search(query)` : résultats `SearchHit` (`{ entity, id, label, hint }`)
  - `fetch(id)` : fiche et liens, ou `null`
  - `query(params)` : lignes et `total`
  - `create(input, ctx)` et `update(input, ctx)` : rendent le `CallToolResult` du SDK
  - `defineCrmEntity(definition)` fixe les génériques d'une définition et la rend sous une forme `RegisteredCrmEntity<E>` homogène : ses opérations d'écriture et de requête reçoivent l'entrée brute, la parsent par le schéma de leur définition (dans la fermeture générique, donc sans cast) et rendent un résultat d'outil. Le registre `CRM_ENTITIES = [companyEntity] as const` est ainsi un tuple hétérogène sans union de génériques. Les schémas d'entité restent idempotents (seules des transforms `trim` et `toLowerCase` y sont permises) parce que l'entrée est validée une fois par le SDK, puis par la définition
  - `CrmEntity` (union des discriminants) et `isCrmEntity(value: string): value is CrmEntity` se dérivent de `CRM_ENTITIES`
  - Les outils `crm_fetch`, `crm_query`, `crm_create` et `crm_update` assemblent leur `inputSchema` en `z.discriminatedUnion('entity', [...])` depuis le registre (`crm_fetch` : `{ entity, id }` par entité). Les sub-projects 04 et 05 ajoutent une entrée sans toucher aux outils (`.claude/rules/modelcontextprotocol-server/tools.md`, ADR-025)
- **Schémas JSON de l'entreprise** (`entities/company.ts`) : en `z.strictObject`, un champ inconnu ou exclu (`legalEntity*`) étant refusé et jamais ignoré en silence. Ils reprennent les définitions communes de `src/lib/schemas/company.ts`, y compris `.trim().toLowerCase()` du slug (` Acme ` devient `acme`, comme dans l'admin), sans reprendre les transforms propres à `FormData`, et chaque champ porte un `.describe()` :
  - énumérations `COMPANY_SECTORS`, `COMPANY_SIZES`, `COMPANY_TYPES`, `RELATION_STATUSES`, `ZONES`
  - bornes : slug 60 caractères et `SLUG_PATTERN`, nom 120, `NOTES_MAX_LENGTH`, au moins un type
  - `websiteUrlSchema`, clé de logo par `isCompanyLogoKey`
  - `id` par `companyIdSchema`

  `null` efface un champ facultatif, un champ absent du patch reste inchangé. `crm_create` applique `COMPANY_DETAILS_TEMPLATE` quand `details` manque, comme le formulaire de l'admin, pour que les sections existent
- **Les cinq outils** :
  - `crm_search` (`readOnlyHint`), hors de la `discriminatedUnion` : `{ query, entities?, limit? }`, 10 résultats par défaut, 50 au plus, `entities` filtré par `isCrmEntity`. Correspondance par inclusion après `normalizeForSearch` (`src/lib/admin/search.ts`, casse et accents ignorés) sur le nom et le slug, faite en mémoire sur une lecture légère (`id`, `name`, `slug`), comme les listes de l'admin. Pour l'entreprise, `label` est le nom et `hint` le slug, qui départage deux homonymes
  - `crm_fetch` (`readOnlyHint`, `idempotentHint`) : `{ entity, id }`, la fiche et ses liens. Pour l'entreprise : entité légale, opportunités côté intermédiaire et côté client, signaux, personnes rattachées (id, nom, rôle lead ou contact)
  - `crm_query` (`readOnlyHint`) : `{ entity, filters?, sort?, order?, limit?, offset? }`. Filtres de l'entreprise : `relationStatus`, `types`, `zones`, `sectors`, `size`. Tri par `name`, `createdAt` ou `updatedAt`, `limit` à 20 par défaut et 100 au plus. Réponse : lignes résumées (id, nom, slug, statut, types, zones, mise à jour) et `total`
  - `crm_create` : `{ entity, data }`, renvoie id, slug et nom
  - `crm_update` (`idempotentHint`) : `{ entity, id, fields?, detailsSection? }` avec au moins l'un des deux, jamais `fields.details` et `detailsSection` ensemble (`isError` : deux écritures du même texte). `detailsSection = { heading, content }` remplace le corps d'une section des Détails par `replaceDetailsSection` (`src/lib/crm/details-sections.ts`, fonction pure). Le titre se compare après `normalizeForSearch` (casse et accents ignorés) puis retrait du préfixe qui n'est ni lettre ni chiffre : le retrait de l'emoji est une étape propre à `replaceDetailsSection`, `normalizeForSearch` ne le faisant pas. « À propos » trouve « # 🏢 À propos ». Un titre absent rend `isError` avec la liste des titres présents
- **`crm_fetch_company_logo`** : `{ id }`. `refreshCompanyLogo` lit `websiteUrl` et `slug`, parse `{ websiteUrl, slug }` par `companyLogoRequestSchema` (`src/lib/schemas/company-logo.ts`, même parse que l'action `fetchCompanyLogo`), appelle `retrieveCompanyLogo` (`src/server/company-logo/fetch-company-logo.ts`) puis enregistre la clé dans `logoFilename`. Sans `websiteUrl`, avec un `websiteUrl` rejeté par le parse, ou sur un échec du service (`site_unreachable`, `site_too_slow`, `address_blocked`, `icon_too_small`, `no_icon_found`), il rend `isError` avec la cause et la correction (renseigner le site, ou une capture Wayback). Une erreur non typée du stockage (R2) n'est pas attrapée par le domaine : l'outil la logge (`company_logo:fetch_failed`, `err` en clé) et rend une erreur inconnue. Invalidation de `ADMIN_ASSETS_PATH` et des listes
- **Réponses** : texte JSON dans `content`, courtes par défaut, sans `outputSchema`. Un échec du domaine ou une absence rend `isError` avec un message qui nomme la correction (outil à appeler, champ à fournir), par les helpers de `results.ts`. Une erreur inconnue d'écriture est loggée (`company:create_failed`, `company:update_failed`) et rend un `isError` générique
- **Confirmation des écritures** : aucune dans les outils, décision du propriétaire du 2026-11-06. L'accord passe par le canal qui porte l'agent :
  - Claude Code sur le poste, avant chaque appel d'outil
  - pour les sessions d'`agent-os` (Feature 4, ADR-026), la conversation de l'assistant interne, dans sa fenêtre de l'admin ou sur Telegram, ou le relais Telegram d'un job
- **Logs** : les écritures par outil réutilisent les événements des actions (`company:created`, `company:updated`, `company:create_failed`, `company:update_failed`), par le logger de la requête, `mcpLoggerFor('crm', ctx.http?.authInfo)` du sub-project 01 (`action: 'mcp'`, `domain`, `requestId`, `ip_hash`, `keyId`). Le logo par outil réutilise ceux de l'action `fetchCompanyLogo`, `company_logo:fetched` et `company_logo:fetch_failed` (`src/server/actions/company-logo.ts`). La valeur de la clé n'est jamais loggée (`.claude/rules/pino/usage.md`)
- **Docs du code livré** : ARCHITECTURE.md (couche `src/server/crm/`, `src/server/mcp/crm/`, mutations servies aussi par les outils, invalidation du cache par les outils) et la rule `nextjs/server-actions.md` se mettent à jour par leur skill dans le plan

## Acceptance criteria

### Scénario 1 : recherche tolérante
**GIVEN** une entreprise « Société Acme » de slug `societe-acme`
**WHEN** un agent appelle `crm_search` avec `{ query: 'societe acm' }`
**THEN** le résultat la contient avec son id, son nom et l'entité `company`

### Scénario 2 : lecture d'une fiche et de ses liens
**GIVEN** une entreprise avec une entité légale, une personne rattachée et une opportunité dont elle est cliente
**WHEN** un agent appelle `crm_fetch` avec `{ entity: 'company', id }`
**THEN** la réponse porte la fiche, l'entité légale, la personne (id, nom, rôle) et l'opportunité (id, titre)

### Scénario 3 : requête filtrée et paginée
**GIVEN** 25 entreprises dont 12 au statut `ACTIVE`
**WHEN** un agent appelle `crm_query` avec `{ entity: 'company', filters: { relationStatus: 'ACTIVE' }, limit: 5, offset: 10 }`
**THEN** la réponse porte 2 lignes résumées et `total: 12`

### Scénario 4 : création sous les règles de l'admin
**GIVEN** une entreprise de slug `acme`
**WHEN** un agent crée une entreprise de slug `Acme`, puis une de slug `Acme Corp`, puis une de slug ` Acme-Corp `
**THEN** la première rend `isError` en nommant le slug déjà pris (mis en minuscules comme dans l'admin), la deuxième rend `isError` sur le format du slug, la troisième est créée avec le slug `acme-corp`
**AND** une création valide sans `details` reçoit le gabarit des Détails de l'entreprise

### Scénario 5 : modification d'un champ et d'une section
**GIVEN** une entreprise créée avec le gabarit des Détails
**WHEN** un agent appelle `crm_update` avec `{ fields: { relationStatus: 'DORMANTE' }, detailsSection: { heading: 'Chiffres clés', content: '50 salariés' } }`
**THEN** le statut vaut `DORMANTE`, la section « 📊 Chiffres clés » contient « 50 salariés » et les autres sections sont intactes
**AND** la liste des entreprises de l'admin affiche le nouveau statut à son prochain chargement

### Scénario 6 : section introuvable
**GIVEN** une entreprise dont les Détails n'ont pas de section « Effectifs »
**WHEN** un agent appelle `crm_update` avec `detailsSection.heading: 'Effectifs'`
**THEN** le résultat rend `isError` avec la liste des titres présents, et rien n'est écrit

### Scénario 7 : logo récupéré
**GIVEN** une entreprise avec un site web dont le service de logo trouve une icône
**WHEN** un agent appelle `crm_fetch_company_logo`
**THEN** `logoFilename` reçoit la clé enregistrée, et un site sans icône rend `isError` avec la cause

### Scénario 8 : admin inchangé
**GIVEN** la Server Action de création et de modification d'une entreprise
**WHEN** l'admin enregistre les mêmes saisies qu'avant ce sub-project
**THEN** les états de formulaire, les erreurs de champ (`slug_taken`, `siret_taken`) et les invalidations sont les mêmes
**AND** la modification d'une entreprise supprimée entre-temps rend `company_not_found` et purge les caches comme avant

## Tests à écrire

### Unit
- `src/lib/crm/details-sections.test.ts` :
  - remplace le corps d'une section et garde les autres intactes
  - trouve la section sans emoji ni casse ni accents
  - signale un titre absent avec la liste des titres présents
  - remplace la dernière section, jusqu'à la fin du texte
  - signale des Détails vides (`null` et chaîne vide)
- `src/server/actions/_support/shared.test.ts` (cas existants maintenus) :
  - un `persist` qui rend un échec avec `invalidate: true` rend l'état de `onDomainError` et appelle `invalidateCaches` une fois, sans log de succès
  - un échec avec `invalidate: false` rend l'état de `onDomainError` sans appeler `invalidateCaches`, sans log de succès
  - un `persist` qui rend un succès passe sa valeur à `onSuccess`, invalide les caches et logge le succès
- `src/server/actions/companies.test.ts` : tests d'adaptateur, la persistance étant mockée au niveau de `src/server/crm/companies.ts`. Aucun cas métier n'est perdu, chacun suit la répartition ci-dessous

| Groupe de `companies.test.ts` | Devenir |
|---|---|
| Validation du formulaire (slug vide ou mal formé, mis en minuscules, secteurs, URL vide en `null`, clé de logo hors dossier, aucun type, notes trop longues, notes et Détails vides en `null`, entité légale sans nom, SIRET invalide ou espacé, siège partiel) | gardé en test d'adaptateur, assertion sur l'appel du domaine mocké (données parsées) ou sur l'état d'erreur |
| Valeurs réaffichées en échec, session absente, `deleteCompany` (tous les cas) | gardé en test d'adaptateur, inchangé |
| Invalidations (`updateTag("projects")`, `updateTag("legal-entity")`) après création et modification | gardé en test d'adaptateur, domaine mocké en succès |
| Violations d'unicité (slug, SIRET, slug d'entité légale) vers le champ du formulaire | gardé en test d'adaptateur (domaine mocké qui rend le code), la détection de la contrainte réelle passe en intégration |
| Entreprise supprimée depuis le chargement de l'écran (`company_not_found`, `unknown_error` si elle existe encore) | gardé en test d'adaptateur pour `not_found` (état et invalidation), le P2025 avec cible présente passe en intégration |
| Persistance : types, zones triées, statut, notes, Détails écrits ; statut laissé au défaut de la base ; champs CRM laissés intacts quand le formulaire ne les envoie pas ; zones vidées ; clé de logo conservée ; ciblage par id | migré en intégration |
| Entité légale : création avec l'entreprise et son slug, RCS ignoré en France, devise par défaut, `upsert` à la modification, devise effacée avec le capital, entité intacte sans `legalEntityName` | migré en intégration |
| TVA du `Publisher` : écrite quand l'entité en a un, intacte quand le formulaire l'omet, ignorée sans `Publisher` | migré en intégration |

### Integration
- `src/server/crm/companies.integration.test.ts` (base de test, mocks de `retrieveCompanyLogo` seulement) :
  - création avec entité légale imbriquée, siège et slug de l'entreprise
  - `slug_taken`, `siret_taken`, `legal_entity_slug_taken` sur une violation d'unicité réelle
  - `rcsNumber` ignoré en France, devise du capital par défaut, effacée avec le capital
  - patch partiel : un champ absent reste inchangé, `null` efface, `legalEntity*` absents laissent l'entité légale et le siège intacts
  - entité légale en `upsert` à la modification, siège supprimé sans adresse fournie
  - TVA du `Publisher` écrite, intacte ou ignorée selon les trois cas
  - `detailsSection` : section remplacée avec les champs dans la même transaction, `section_not_found` et `no_details` sans aucune écriture
  - `not_found` pour un id inconnu, avec ou sans `detailsSection`
  - `refreshCompanyLogo` enregistre la clé rendue par `retrieveCompanyLogo`, rend `no_website`, `invalid_website` et l'échec du service sans écrire
- `src/server/mcp/crm/tools.integration.test.ts` (client sur le handler du domaine `crm`, `authInfo` injecté, `next/cache` mocké) :
  - `crm_search` tolère casse et accents, plafonne `limit`, refuse une requête vide
  - `crm_fetch` rend la fiche et ses liens, `isError` pour un id inconnu
  - `crm_query` filtre, trie, pagine et rend `total`
  - `crm_create` applique le gabarit des Détails, met le slug en minuscules, rend `isError` sur un slug pris, invalide les caches après succès
  - `crm_update` modifie un champ et une section, rend `isError` sans `fields` ni `detailsSection`, avec `fields.details` et `detailsSection` ensemble, et pour une section absente (aucun champ écrit), et refuse un champ `legalEntity*`
  - `crm_update` sans `legalEntity*` laisse l'entité légale et son siège intacts
  - le log d'écriture porte `keyId`, asserté par `toHaveBeenCalledWith`
  - `crm_fetch_company_logo` rend `isError` sans site web et logge une erreur de stockage inconnue

## Edge cases

- **Mise en production** : aucune avant la fin de l'epic (`/finalize-feature`, après le sub-project 04 qui déclare le destinataire des données dans la politique de confidentialité). Les recettes 01 à 03 tournent en local
- **Modification concurrente des Détails** (agent et admin à la fois) : la section se remplace sur la valeur lue au même appel, une saisie de l'admin arrivée entre-temps est écrasée. Acceptable pour un seul utilisateur
- **Détails vides** (entreprise créée sans gabarit avant ce sub-project) : `detailsSection` rend `isError` en invitant à écrire le texte entier par `fields.details`
- **Volume** : la recherche filtre en mémoire une lecture de trois colonnes. Au-delà de quelques milliers d'entreprises, passer à `unaccent` ou `pg_trgm` en base
- **Clé de logo écrite à la main par un agent** (`fields.logoFilename`) : acceptée seulement sous le dossier des logos (`isCompanyLogoKey`), comme dans l'admin
- **`size` ou `websiteUrl` à `null` dans un patch** : la valeur s'efface. Un champ absent reste inchangé
- **Entreprise supprimée pendant un appel** : `not_found`, avec invalidation côté Server Action, sans invalidation côté outil

## Architectural decisions

### Décision : où vit la logique métier commune

**Options envisagées :**
- **A. Dans `src/server/actions/_support/`** : déjà le dossier des helpers des actions, mais son nom et sa rule le lient aux Server Actions
- **B. Une couche `src/server/crm/` par domaine** : appelée par les actions et par les outils, nommée comme les modules de `src/lib/crm/` et des composants

**Choix : B**

**Rationale :**
- Le domaine et ses deux entrées se lisent séparément : l'action adapte le formulaire, l'outil adapte le JSON
- Chaque domaine suivant (Missions, Comptabilité) suit le même rangement

### Décision : forme des erreurs du domaine

**Options envisagées :**
- **A. Erreurs typées levées**, comme `PersonConflictError` de `person-guards.ts`, traduites par `mapError` : aucun changement de `saveEntity`, mais l'échec attendu sort du type de retour
- **B. `DomainResult` rendu, `saveEntity` étendu d'un `onDomainError`** qui décide aussi de l'invalidation : l'échec attendu est dans le type et le `switch` des adaptateurs devient exhaustif

**Choix : B**

**Rationale :**
- Convention du projet : une erreur attendue du domaine se porte dans le retour quand l'idiome le permet (union de résultat en TypeScript)
- L'outil MCP traduit chaque `code` en message de correction : l'exhaustivité au typage garantit qu'aucun cas ne tombe en erreur générique
- Les codes `*_not_found` doivent garder l'invalidation de l'écran périmé que `saveEntity` fait déjà sur P2025

### Décision : recherche tolérante

**Options envisagées :**
- **A. En base, `unaccent` et `pg_trgm`** : tolère aussi les fautes de frappe, au prix d'une migration d'extensions et de requêtes SQL brutes
- **B. En mémoire, `normalizeForSearch` sur une lecture légère** : même tolérance que les listes de l'admin (casse, accents, sous-chaîne), sans migration

**Choix : B**

**Rationale :**
- Le CRM compte quelques dizaines à centaines de fiches, et l'admin charge déjà ses listes entières
- Même comportement pour l'agent que pour le propriétaire dans l'admin

### Décision : typage du registre d'entités

**Options envisagées :**
- **A. Une définition non générique** (`create(input: unknown)`) : simple, mais chaque entité reparse ou caste son entrée
- **B. Une définition générique sur ses schémas, rendue homogène par `defineCrmEntity`** : chaque méthode reçoit la sortie typée de son schéma, le registre reste un tuple hétérogène, aucun cast

**Choix : B**

**Rationale :**
- Le projet interdit `any` et les casts : l'entrée d'une écriture doit être celle que son schéma produit
- Un tableau de définitions aux génériques différents ne se range pas en union appelable : la fermeture de `defineCrmEntity` garde la corrélation schéma et méthode
