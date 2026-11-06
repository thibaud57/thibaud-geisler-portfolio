---
feature: "Feature 3 : Outils de l'app pour les agents"
subproject: "outils-crm-suivi"
goal: "Ajouter les opportunités, entretiens, actions de prospection, signaux et revues hebdomadaires aux outils génériques du CRM, sous les mêmes règles que l'admin et éprouver les outils sur des copies de test de trois commandes freelance."
status: "draft"
complexity: "XL"
tdd_scope: "full"
execution: "subagent-driven"
model: "opus"
effort: "high"
depends_on: ["04-outils-crm-personnes-design.md"]
date: "2026-11-06"
---

# Outils CRM : opportunités, entretiens, actions, signaux et revues

## Scope

Couvre cinq entrées du registre des outils CRM, `opportunity`, `interview`, `prospecting-action`, `signal` et `weekly-review` : recherche, lecture, requête, création et modification. Leur logique de création et de modification sort des Server Actions vers `src/server/crm/`. S'y ajoutent des copies de test de trois commandes du dépôt des skills freelance (hors de ce dépôt), branchées sur les outils de l'app. Exclut :
- la suppression
- les actions propres au tableau de l'admin (`changeProspectingActionStatus`, `rescheduleProspectingAction`), qui restent des adaptateurs de l'admin
- la création de nouveaux correspondants depuis un entretien : un correspondant se crée d'abord comme contact
- la bascule des commandes CRM (rebranchement, nouvel instantané des données Notion, gel du CRM Notion), premier sub-project de la Feature 4

### État livré

À la fin de ce sub-project, on peut : depuis la copie de test de la commande d'ajout d'action, planifier une action de prospection par `crm_create` pour un lead et voir la même commande refusée pour un lead opposé. Depuis la copie de la commande de revue hebdomadaire, créer la revue de la semaine avec des compteurs calculés par l'app, les commandes d'origine restant branchées sur Notion.

## Dependencies

- `04-outils-crm-personnes-design.md` (statut: draft) : gardes de personnes dans `src/server/crm/person-guards.ts`, textes des conflits dans `src/server/actions/_support/person-form.ts`, rendu des personnes liées `personRef`, entrées `lead` et `contact` (les actions et signaux visent un lead, les entretiens des contacts), motif d'extraction et registre du 03

## Files touched

- **À créer** : `src/server/crm/{opportunities,interviews,prospecting-actions,signals,weekly-reviews}.ts`
- **À créer** : `src/server/crm/{opportunities,interviews,prospecting-actions,signals,weekly-reviews}.integration.test.ts`
- **À modifier** : `src/server/actions/{opportunities,interviews,prospecting-actions,signals,weekly-reviews}.ts` (adaptateurs)
- **À modifier** : `src/server/actions/{opportunities,interviews,prospecting-actions,signals,weekly-reviews}.test.ts`
- **À modifier** : `src/server/actions/prospecting-actions.integration.test.ts` (les cas du tableau passent sur le domaine déplacé)
- **À modifier** : `src/lib/schemas/prospecting-action.ts` (`actionDay` exporté pour le schéma d'outil)
- **À modifier** : `src/lib/ids.ts` (`OpportunityId` exporté, `InterviewId`, `SignalId`, `WeeklyReviewId` nominaux, avec leurs schémas)
- **À créer** : `src/server/mcp/crm/entities/{opportunity,interview,prospecting-action,signal,weekly-review}.ts`
- **À créer** : `src/server/mcp/crm/date-range.ts` et `src/server/mcp/crm/date-range.test.ts` (intervalle `from ≤ to` partagé par les filtres de dates)
- **À modifier** : `src/server/mcp/crm/registry.ts` (cinq entrées)
- **À modifier** : `src/server/mcp/crm/tools.integration.test.ts`
- **À modifier** : `src/server/queries/{opportunities,interviews,prospecting-actions,weekly-reviews}.ts` (lecture légère, requête paginée), `src/server/queries/signals.ts` (lecture des signaux, aujourd'hui simple fragment d'include)
- **À créer, hors dépôt** : trois copies de test dans `.claude/commands/` du dépôt des skills freelance (commandes d'ajout de lead, d'ajout d'action et de revue hebdomadaire, suffixées `-app`), sur une branche de test non fusionnée de ce dépôt-là. Le serveur MCP de l'app se déclare sur le poste par `claude mcp add` avec la clé, jamais dans un fichier versionné

## Architecture approach

- **Motif des 03 et 04** :
  - fonctions de domaine typées qui rendent un `DomainResult`, gardes qui lèvent dans la transaction et converties à la sortie
  - Server Actions réduites à des adaptateurs qui gardent leurs codes de message, leurs textes et leurs invalidations. Le `onDomainError` de chaque adaptateur rend `{ state, invalidate }` : `invalidate: true` pour `not_found` (écran périmé réaligné sur la base, comme le chemin P2025 de `saveEntity`) et pour `company_not_found` des signaux (`signals.ts` invalide aujourd'hui sur ce cas), `false` ailleurs
  - entrées du registre en `z.strictObject` sur les définitions communes des schémas, `.describe()` sur chaque champ, `null` pour effacer, champ absent inchangé. Un patch fusionne ses champs présents avec la ligne lue dans la transaction pour contrôler les règles croisées
  - événements des actions réutilisés, par `ctx.log` (`CrmWriteContext` du 03 : `action: 'mcp'`, `requestId`, `keyId`)
  - identifiants nominaux (`OpportunityId`, `InterviewId`, `SignalId`, `WeeklyReviewId`, `ProspectingActionId`) dans les signatures du domaine, l'adaptateur parsant l'id reçu comme `updateLead`
  - personne liée citée dans une fiche (apporteur, correspondant, lead d'une action) : rendue par `personRef` du 04, donc `{ id, name: null, optedOut: true }` sans email ni LinkedIn quand elle est opposée
- **Opportunité** (`src/server/crm/opportunities.ts`) :
  - Règles reprises à l'identique : l'intermédiaire doit être une ESN, revérifiée seulement quand il change ; le client est distinct de l'intermédiaire (refinement du schéma et CHECK `Opportunity_intermediary_client_check`) ; `onSiteDays` ≤ `daysPerWeek` ; `startMonth` au format `YYYY-MM`
  - Erreurs : `intermediary_not_esn`, `referrer_not_found` (`field: 'referrerId'`), `company_not_found` (`field: 'intermediaryId' | 'clientId'`, lus sur la contrainte de la clé étrangère comme le formulaire), `days_out_of_range` (patch qui ne change que `onSiteDays` ou `daysPerWeek`, comparé à la valeur en base), `not_found`, erreurs de section
  - Gabarit `OPPORTUNITY_DETAILS_TEMPLATE` à la création
  - Lecture avec apporteur (`personRef`), intermédiaire, client et entretiens
  - Recherche sur le titre et les noms du client et de l'intermédiaire ; `hint` « client · statut »
  - Filtres : `status`, `clientId`, `intermediaryId`, `referrerId`, `workMode`, `zone`
- **Entretien** (`interviews.ts`) :
  - `assertInterviewTargets` repris : l'opportunité existe ; un entretien côté ESN exige un intermédiaire sur l'opportunité ; les correspondants existent et ne sont pas opposés, sauf un correspondant déjà lié à cet entretien qui a été opposé depuis (règle d'`interviews.ts` sur la modification : l'entretien garde un fait passé). Le contrôle porte sur les valeurs effectives
  - Patch : absent = inchangé, présent = remplacement. `correspondentIds` présent remplace la liste entière (`set`), `side` et `opportunityId` présents remplacent la valeur et se contrôlent avec le reste de la ligne
  - Par l'outil, `correspondentIds` seulement, jamais de `newCorrespondents`
  - `outcome` forcé à `null` hors du statut `FAIT`
  - Erreurs : `opportunity_not_found`, `opportunity_without_intermediary`, `correspondent_not_found`, `correspondent_exists` (propre à l'admin, qui crée des correspondants : porte le `PersonConflict` du 04, de raison `exists` avec nom et rôles ou `opted_out` avec sa date, pour refaire le message de l'admin), `not_found`, erreurs de section
  - Gabarit `interviewDetailsTemplate(type)`
  - Numérotation : `interviewPlaces` (`src/lib/crm/interviews.ts`) se calcule sur tous les entretiens de chaque opportunité concernée, avant filtre et pagination, pour que « Entretien 2 » reste « Entretien 2 » dans une liste filtrée. Titre déduit par `interviewTitle` (« Entretien 2 · Technique ») en `label` de recherche et dans la fiche, opportunité et date en `hint`
  - Recherche : un entretien correspond quand la requête, après `normalizeForSearch`, est incluse dans son titre déduit ou dans le titre de son opportunité
  - Lecture : correspondants rendus par `personRef`
  - Filtres : `status`, `type`, `side`, `opportunityId`, intervalle de `scheduledAt`
- **Action de prospection** (`prospecting-actions.ts`) :
  - `requireProspectableLead` et `assertProspectionAllowed` repris (verrous `FOR UPDATE` et `FOR SHARE`), dates réglées par `applyStatusRules` (`src/lib/crm/prospecting-action-status.ts`) à la création comme à la modification. `respondedAt` reste facultatif en entrée : la règle le pose ou l'efface selon le statut, comme pour le formulaire
  - Patch : la personne visée est celle du patch, sinon celle de la ligne et la garde la contrôle avant la lecture du timing (verrou d'abord). L'état suivant fusionne le patch avec la ligne lue : `status` et `occurredAt` absents gardent ceux de la ligne, `respondedAt` absent compte comme non saisi (la règle garde alors la date de réponse existante), `reply` absent reste celui de la ligne et `null` l'efface. Les dates écrites sont celles de `applyStatusRules`
  - Erreurs : `person_conflict` (le `PersonConflict` du 04, de raison `no_lead_role` quand la personne n'a pas de rôle lead, ou `opted_out` avec sa date), `person_not_found` (clé étrangère `personId`), `not_found`
  - `changeProspectingActionStatus` et `rescheduleProspectingAction` restent des actions du tableau de l'admin, sur les mêmes gardes, leurs messages d'opposition venant de `personConflictMessage`. Un changement de statut par l'outil passe par `crm_update` et `applyStatusRules`
  - Recherche sur le titre et le nom du lead ; `hint` « lead · date · statut », le lead opposé rendu par `personRef`
  - Filtres : `status`, `channel`, `personId`, intervalle de `occurredAt`
- **Signal** (`signals.ts`) :
  - Création sur une entreprise ou sur un lead, exactement l'un des deux (CHECK `Signal_owner_check`), le rattachement ne changeant jamais
  - Le type doit convenir au rattachement (`COMPANY_SIGNAL_TYPES`, `LEAD_SIGNAL_TYPES`, `assertTypeFits`). Un lead doit accepter les signaux (`canReceiveSignal`, origine `OUTBOUND`, non opposé)
  - Erreurs : `type_mismatch`, `lead_not_eligible`, `company_not_found`, `not_found`
  - Invalidation propre au module (listes des entreprises et des leads)
  - Recherche sur le contenu ; `label` : libellé du type ; `hint` « fiche visée · date »
  - Filtres : `companyId`, `personId`, `type`, intervalle de `occurredOn`
- **Revue hebdomadaire** (`weekly-reviews.ts`) :
  - `closingFriday` doit être un vendredi et unique (`review_week_exists`, y compris quand une modification déplace la revue sur une semaine déjà revue)
  - Les sept compteurs absents de la création sont calculés par l'app, comme le préremplissage de l'admin (`findWeekCounterSources`, `weekBounds`, `countWeek`) : l'agent ne recompte jamais. Fournis, ils sont repris, comme une saisie de l'admin qui les corrige. À la modification, un compteur absent reste inchangé, jamais recalculé
  - Champs écrits par l'outil : `closingFriday`, les sept compteurs, `status` (`BONNE`, `MOYENNE`, `MAUVAISE`), `motivation` (`HAUTE`, `POSITIVE`, `NEUTRE`, `BASSE`), `wins`, `blockers`, `nextWeekPlan`, `notes`
  - Pas de garde de cadence (semaine manquée, semaine antérieure à la dernière revue) : l'admin n'en a pas, l'app reste la même pour les deux entrées. Une commande qui veut ce contrôle lit la dernière revue par `crm_query`. Les compteurs d'une revue de rattrapage se calculent sur sa semaine, `activeLeads` valant l'état à l'instant de la création comme dans l'admin
  - Recherche sur le libellé de semaine (`weekLabel`) et la date ; filtres : intervalle de `closingFriday`, tri par défaut décroissant
- **Intervalles de dates** : les filtres `scheduledAt`, `occurredAt`, `occurredOn` et `closingFriday` passent tous par `dateRange(bound)` (`src/server/mcp/crm/date-range.ts`), qui refuse `from` après `to` avec une erreur de schéma plutôt qu'une liste vide
- **Copies de test des commandes freelance** :
  - Décision du propriétaire du 2026-11-06 : les skills restent sur Notion jusqu'à la bascule complète
  - Trois commandes du dépôt des skills freelance sont dupliquées, suffixées `-app`, sur une branche de test non fusionnée de ce dépôt-là : ajout de lead, ajout d'action, revue hebdomadaire
  - Leurs appels Notion y sont remplacés par les outils `mcp__crm__*` de l'app : `crm_search` avant toute écriture, `crm_create`, `crm_update`
  - Chaque copie reprend le déroulé de l'originale avec les équivalents de l'app et omet ce qui n'en a pas :
    - copie d'ajout d'action : crée l'action, passe en `IGNORE` les actions encore `A_FAIRE` du lead, met à jour son statut et sa section « Contexte » par `crm_update` et `detailsSection`. La timeline de Notion est omise, l'app la déduit des actions
    - copie d'ajout de lead : résout ou crée l'entreprise par `crm_search` et `crm_create`, sans score ICP, que les outils refusent jusqu'à la Feature 4
    - copie de revue hebdomadaire : garde son contrôle de cadence par `crm_query`, crée la revue sans compteurs et porte le qualitatif dans les champs de l'app
  - Les statuts de Notion sans équivalent exact se rapprochent des valeurs de l'app (`LeadStatus`, `ActionStatus`). Le rapprochement est écrit dans la copie
  - Le propriétaire juge le rendu. Rien n'est migré ni retiré côté Notion

## Acceptance criteria

### Scénario 1 : opportunité sous les règles de l'admin
**GIVEN** une entreprise Acme sans le type `ESN_RECRUTEMENT`
**WHEN** un agent crée une opportunité avec Acme comme intermédiaire, puis avec le même client et le même intermédiaire
**THEN** les deux créations rendent `isError`, la première en nommant le type ESN attendu
**AND** une opportunité valide reçoit le gabarit de ses Détails
**AND** un apporteur ou une entreprise supprimés rendent `isError` en nommant le champ en cause (`referrerId`, `intermediaryId` ou `clientId`)

### Scénario 2 : entretien côté ESN sans intermédiaire
**GIVEN** une opportunité sans intermédiaire
**WHEN** un agent crée un entretien `side: 'ESN'` sur elle
**THEN** le résultat rend `isError` et un entretien côté `CLIENT_FINAL` et de type `TECHNIQUE` sur la même opportunité est créé avec le gabarit `interviewDetailsTemplate('TECHNIQUE')`

### Scénario 3 : action de prospection et opposition
**GIVEN** un lead actif et un lead opposé le 2026-10-01
**WHEN** un agent crée une action `DM_LINKEDIN` `A_FAIRE` pour chacun, puis passe la première en `REPONDU` par `crm_update` avec le seul champ `status`
**THEN** la seconde création rend `isError` avec la date d'opposition et la première action reçoit les dates réglées par `applyStatusRules` (date de réponse posée, jour de l'action conservé)

### Scénario 4 : signal mal rattaché
**GIVEN** une entreprise et un lead `INBOUND`
**WHEN** un agent crée un signal `POST` sur l'entreprise, puis un signal sur le lead `INBOUND`
**THEN** le premier rend `isError` sur le type, le second rend `isError` (lead inéligible)

### Scénario 5 : revue de la semaine calculée par l'app
**GIVEN** des actions et des entretiens dans la semaine close le vendredi 2026-10-30
**WHEN** un agent crée la revue de cette semaine sans compteurs, puis la recrée
**THEN** la revue porte les compteurs que l'admin aurait préremplis et la seconde création rend `isError` (semaine déjà revue)
**AND** une date qui n'est pas un vendredi rend `isError`

### Scénario 6 : recherche et requête
**GIVEN** deux entretiens techniques sur une opportunité « Plateforme data », plus un autre entretien sur une seconde opportunité
**WHEN** un agent cherche « plateforme » puis interroge les entretiens de cette opportunité
**THEN** la recherche rend l'opportunité et ses entretiens titrés « Entretien N · Technique », la requête leurs lignes et `total: 2`
**AND** le second entretien garde son numéro 2 quand la requête est filtrée sur lui seul

### Scénario 7 : admin inchangé
**GIVEN** les formulaires et le tableau des actions de l'admin
**WHEN** l'admin refait les saisies et les gestes d'avant ce sub-project (création, modification, changement de statut, replanification)
**THEN** codes de message, textes et invalidations sont les mêmes

### Scénario 8 : copie de test d'une commande
**GIVEN** la copie d'ajout d'action sur la branche de test du dépôt des skills freelance et une clé d'API de l'app
**WHEN** le propriétaire la lance pour un lead actif désigné par son nom, puis pour un lead opposé désigné par son email (une fiche opposée n'a plus de nom)
**THEN** l'action est créée dans l'app pour le premier, refusée avec la date d'opposition pour le second et la commande d'origine reste branchée sur Notion

### Scénario 9 : personne opposée liée
**GIVEN** une opportunité apportée par une personne et un entretien dont elle est correspondante, la personne s'opposant ensuite à la prospection
**WHEN** un agent lit l'opportunité et l'entretien, puis modifie l'entretien en renvoyant la même liste de correspondants
**THEN** la personne y apparaît `{ id, name: null, optedOut: true }` sans email ni LinkedIn et la modification est acceptée
**AND** un nouvel entretien qui cite cette personne comme correspondante rend `isError`

## Tests à écrire

### Unit
- `src/server/actions/{opportunities,interviews,prospecting-actions,signals,weekly-reviews}.test.ts` : cas existants maintenus, persistance mockée au niveau de `src/server/crm/`
- `src/server/mcp/crm/date-range.test.ts` : intervalle inversé refusé, bornes égales et bornes absentes acceptées, pour une borne en instant et une borne en jour

### Integration
- `src/server/crm/opportunities.integration.test.ts` : `intermediary_not_esn`, revérification seulement au changement d'intermédiaire, client distinct, `referrer_not_found` et `company_not_found` avec leur `field`, patch partiel, section
- `src/server/crm/interviews.integration.test.ts` : `opportunity_without_intermediary`, correspondant opposé ou inconnu, correspondant opposé déjà lié accepté à la modification, `correspondent_exists` avec rôles et date, `correspondentIds` absent inchangé et présent remplacé, `outcome` effacé hors `FAIT`, numérotation sur toute l'opportunité
- `src/server/crm/prospecting-actions.integration.test.ts` : `no_lead_role`, `opted_out`, `person_not_found`, dates de `applyStatusRules` à la création et sur un patch partiel. Les cas existants de `src/server/actions/prospecting-actions.integration.test.ts` passent sur le domaine
- `src/server/crm/signals.integration.test.ts` : un seul rattachement, `type_mismatch` des deux côtés, `lead_not_eligible` (inbound, opposé), rattachement inchangeable
- `src/server/crm/weekly-reviews.integration.test.ts` : compteurs calculés quand absents, repris quand fournis, inchangés à une modification qui les omet, `review_week_exists`
- `src/server/mcp/crm/tools.integration.test.ts` (`next/cache` mocké comme dans `src/server/actions/contacts.integration.test.ts`) : par entité, une recherche, une lecture avec liens, une requête filtrée, une création avec règle refusée et une modification. Plus le titre déduit des entretiens, le refus de `newCorrespondents` (champ inconnu), les personnes opposées rendues par `personRef` et un test paramétré qui refuse un intervalle inversé sur chacun des quatre filtres de dates

## Edge cases

- **ESN qui perd son type après coup** : ses opportunités restent modifiables tant que l'intermédiaire ne change pas, comme dans l'admin
- **Opposition pendant l'écriture d'une action** : les verrous de `assertProspectionAllowed` font attendre l'écriture, qui reçoit `opted_out`
- **Revue d'une semaine en cours** : les compteurs calculés valent à l'instant de la création, puis restent figés comme dans l'admin
- **Entretien dont le type change** : le gabarit n'est appliqué qu'à la création. Un changement de type ne réécrit pas les Détails
- **Copies de test lancées sur la base de prod** : elles écrivent réellement dans le CRM de l'app. Le propriétaire les lance sur le serveur local tant que la bascule n'est pas décidée

## Architectural decisions

### Décision : les compteurs d'une revue créée par un agent

**Options envisagées :**
- **A. Fournis par l'agent**, comme la commande Notion qui les compte aujourd'hui : deux façons de compter, qui divergent
- **B. Calculés par l'app quand ils manquent**, par la fonction qui préremplit l'admin : un seul calcul, l'agent pouvant encore corriger une valeur

**Choix : B**

**Rationale :**
- La règle de comptage vit déjà dans `countWeek`, testée : un agent qui recompte la réécrirait

### Décision : rebrancher les skills freelance

**Options envisagées :**
- **A. Rebrancher toutes les commandes CRM dans ce sub-project** : le CRM Notion cesserait d'être alimenté avant la bascule des données
- **B. Copies de test de trois commandes, les originales restant sur Notion** : les outils s'éprouvent en vrai sans toucher au fonctionnement actuel

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-11-06 : la bascule du CRM (commandes, agents et skills, formats JSON, nouvel instantané des données, gel de Notion) se fera d'un bloc quand il sera prêt, en premier sub-project de la Feature 4, dont les jobs en dépendent
