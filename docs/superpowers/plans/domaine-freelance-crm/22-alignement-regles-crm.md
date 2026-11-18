# Alignement du CRM sur les règles de prospection : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner le CRM sur les règles de prospection : statut Refusé et statuts permis par canal, opposition qui clôt les actions, huit compteurs de revue, RDV planifié et dernier contact déduits du journal, statut Dormante d'une entreprise déduit.

**Architecture:** Les règles de statut vivent dans des fonctions pures (`prospecting-action-status.ts`) que le domaine des actions applique seul, le pipeline lui déléguant. Les compteurs de revue, le RDV planifié, le dernier contact et le statut Dormante se calculent par des fonctions pures nourries par les requêtes existantes, élargies plutôt que doublées. Trois migrations : valeur Refusé, rattrapage des actions avec la colonne des refus, réduction de `RelationStatus`.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4, Next.js 16 (Server Actions), React 19, date-fns, serveur MCP, Vitest.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/22-alignement-regles-crm-design.md`

## Global Constraints

- **Statuts** : `REFUSE` inséré avant `IGNORE` dans `ActionStatus`, libellé « Refusé ». `ALLOWED_STATUSES` : `CONNEXION_LINKEDIN` → `A_FAIRE`, `FAIT`, `REPONDU`, `IGNORE` ; `CALL` → `A_FAIRE`, `FAIT`, `CONVERTI`, `IGNORE` ; `CANDIDATURE`, `DM_LINKEDIN`, `EMAIL`, `SMS_WHATSAPP`, `AUTRE` → les six statuts
- **Messages du domaine** : `status_not_allowed` → « Statut impossible pour ce type d'action » ; `unsent_action_ignored` → « Une action jamais envoyée se supprime au lieu d'être ignorée »
- **Revue** : `refusalsReceived` (« Refus reçus »), après `conversationsEngaged` partout ; taux de réponse = (conversations + refus) / messages envoyés
- **Leads** : `lastReplyAt` devient `lastContactAt`, libellé « Dernier contact de sa part » inchangé ; `IN_PROGRESS` → `PIPELINE_STATUSES`, `isActiveLead` → `isInPipeline`, `ACTIVE` → `ACTIVE_LEAD_STATUSES`
- **Entreprises** : `RelationStatus` = `ACTIVE`, `ARCHIVEE` ; `DORMANCY_MONTHS = 12` mois civils ; libellé « Dernière interaction »
- **Textes d'interface** : apostrophe droite, vocabulaire de `.claude/rules/shadcn-ui/admin-textes.md`
- **Tests** : noms en anglais, AAA sans commentaires, données fictives seulement (Jane Doe, Acme, `example.com`)
- **Migrations** : chacune créée par `pnpm prisma migrate dev --create-only --name <nom>`, complétée à la main, appliquée par `pnpm prisma migrate dev` puis `just db-test` ; absence de dérive prouvée quand `pnpm prisma migrate dev --create-only --name drift_check` répond « Already in sync » sans créer de dossier
- **Release** : la sauvegarde du jour de la checklist de `docs/PRODUCTION.md` précède la mise en production, le rattrapage effaçant des données
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/data-modeling.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/server-actions-security.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/modelcontextprotocol-server/tools.md`, `.claude/rules/modelcontextprotocol-server/input-schema.md`, `.claude/rules/shadcn-ui/admin.md`, `.claude/rules/shadcn-ui/admin-textes.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/typescript/conventions.md`, `.claude/rules/vitest/mocks-assertions.md`.

## Review Focus

- **Type changé dans le formulaire vers un canal qui interdit le statut choisi** : le statut revient à Fait au lieu d'envoyer un couple refusé. Couvert par « falls back to done when the channel forbids the status » (Task 1).
- **Action créée directement Refusée avec une date de réponse saisie** : la date saisie est gardée, pas remplacée par aujourd'hui. Couvert par « keeps the response date entered on an action created refused » (Task 1).
- **Call planifié qui porte une heure** (repassé de Fait à À faire sans date) : compté comme call du jour, pas comme dépassé. Couvert par « treats a planned call carrying a time as a call of its day » (Task 6).
- **Opposition sans message en attente** : rien ne passe Refusé, les actions À faire disparaissent quand même. Couvert par « deletes planned actions without refusing anything when no message awaits » (Task 3).
- **Pagination de `crm_query` après le filtre Dormante** : `total` compte les seules entreprises filtrées et l'`offset` s'applique après le filtre. Couvert par « counts the total after the displayed status filter » (Task 7).

---

### Task 0 : Arbitrage visuel du glyphe et de la couleur de Refusé

Exécutée par la session principale avant tout sous-agent : elle attend une décision du propriétaire.

**Files:**
- Create: `<scratchpad>/refuse-status-options.html` (page d'options, hors dépôt)
- Modify: `docs/DESIGN.md` § Palette de Couleurs (ligne `--destructive` ou celle du jeton retenu, statut « action refusée ») et ligne du Kanban (« ordre fixe » : six colonnes)

**Interfaces:**
- Produces: le nom du glyphe Lucide et le jeton de couleur de Refusé, lus par les Tasks 1 et 5

- [ ] **Step 1 : Construire la page d'options**

Rendu réel des badges, colonnes Kanban et pastilles de calendrier de Refusé à côté de Répondu, Converti et Ignoré, en clair et en sombre. Trois options de glyphe (`CircleSlash`, `MessageSquareX`, `ThumbsDown` ; `Ban` est pris par Hors ICP, `CircleX` par Perdu) croisées avec deux jetons existants (`--destructive`, partagé avec Ignoré ; `--warning`, partagé avec À faire). Recommandation marquée : `CircleSlash` avec `--destructive`.

- [ ] **Step 2 : Faire trancher le propriétaire** (`AskUserQuestion`, lien vers la page)

- [ ] **Step 3 : Écrire le choix dans `docs/DESIGN.md`** après avoir chargé le skill `design-doc`

---

### Task 1 : Valeur Refusé et règles de statut pures

**Files:**
- Modify: `prisma/schema.prisma` (enum `ActionStatus`, commentaire de `reply`)
- Create: `prisma/migrations/<horodatage>_action_status_refuse/migration.sql`
- Modify: `src/lib/crm/prospecting-action-status.ts`
- Test: `src/lib/crm/prospecting-action-status.test.ts`
- Modify: `src/lib/crm/prospecting-actions.ts` (`ACTION_STATUS_LABELS`, `ACTION_STATUS_ICONS`)
- Modify: `src/lib/crm/action-board.ts`, test `src/lib/crm/action-board.test.ts`
- Modify: `src/lib/crm/action-calendar.ts` (`STATUS_COLORS`)
- Modify: `src/components/features/admin/prospecting-actions/ActionsBoard.tsx` (`COLUMN_ICON_CLASSES`)
- Modify: `src/lib/crm/review-counters.ts`, `src/components/features/admin/prospecting-actions/ProspectingActionFormDialog.tsx` (remplacement mécanique de `isRepliedStatus` seulement)
- Modify: `src/server/crm/prospecting-actions.ts` (`channel` dans `TIMING_SELECT` et dans le `next` d'`updateProspectingAction`, pour que les appelants compilent)

**Interfaces:**
- Consumes: glyphe et jeton de la Task 0
- Produces (`src/lib/crm/prospecting-action-status.ts`) :
  - `interface ActionTiming { channel: ActionChannel; status: ActionStatus; occurredAt: Date; respondedAt: Date | null; reply: string | null }`
  - `RESPONSE_STATUSES: ReadonlySet<ActionStatus>` (Répondu, Converti, Refusé) ; `ENGAGED_STATUSES: ReadonlySet<ActionStatus>` (Répondu, Converti)
  - `ALLOWED_STATUSES: Record<ActionChannel, readonly ActionStatus[]>` (valeurs des Global Constraints, dans l'ordre de l'enum)
  - `isStatusAllowed(channel: ActionChannel, status: ActionStatus): boolean`
  - `statusForChannel(channel: ActionChannel, status: ActionStatus): ActionStatus` : le statut s'il est permis, `"FAIT"` sinon
  - `hasResponseDate(channel: ActionChannel, status: ActionStatus): boolean` : statut de réponse et canal autre que `CALL`
  - `isEngagedStatus(status: ActionStatus): boolean`
  - `isTransitionAllowed(channel: ActionChannel, from: ActionStatus, to: ActionStatus): boolean` : faux seulement pour `A_FAIRE` vers `IGNORE` hors `CALL`
  - `isContactMade(channel: ActionChannel, status: ActionStatus): boolean` : sorti d'`A_FAIRE`, sauf `CALL` en `IGNORE`
  - `applyStatusRules(current, next, now)` : signature inchangée ; `isRepliedStatus` supprimé

- [ ] **Step 1 : Ajouter `REFUSE` avant `IGNORE` dans `ActionStatus`, puis créer la migration sans l'appliquer**

Run: `pnpm prisma migrate dev --create-only --name action_status_refuse`
Puis remplacer le SQL généré par la seule ligne :

```sql
ALTER TYPE "freelance"."ActionStatus" ADD VALUE 'REFUSE' BEFORE 'IGNORE';
```

Run: `pnpm prisma migrate dev` puis `just db-test`
Expected: migration appliquée en dev et en test, client régénéré, aucune dérive (Global Constraints).

- [ ] **Step 2 : Écrire les tests qui échouent** dans `prospecting-action-status.test.ts`

Le helper `timing()` gagne `channel: "DM_LINKEDIN"` par défaut.

```typescript
it("keeps the response date and the reply of a refused message", () => {
  const result = applyStatusRules(
    timing({ status: "FAIT" }),
    timing({ status: "REFUSE", reply: REPLY }),
    NOW,
  )

  expect(result).toMatchObject({ respondedAt: NOW, reply: REPLY })
})

it("keeps the response date entered on an action created refused", () => {
  const result = applyStatusRules(null, timing({ status: "REFUSE", respondedAt: TUESDAY_EVENING }), NOW)

  expect(result.respondedAt).toEqual(TUESDAY_EVENING)
})

it.each(["A_FAIRE", "FAIT", "CONVERTI", "IGNORE"] as const)(
  "clears the response date and the reply of a call in status %s",
  (status) => {
    const result = applyStatusRules(
      timing({ channel: "CALL", status: "FAIT" }),
      timing({ channel: "CALL", status, respondedAt: NOW, reply: REPLY }),
      NOW,
    )

    expect(result).toMatchObject({ respondedAt: null, reply: null })
  },
)

it("keeps the planned day when a call leaves to do", () => {
  const plannedFriday = new Date("2026-03-05T23:00:00Z")

  const result = applyStatusRules(
    timing({ channel: "CALL", occurredAt: plannedFriday }),
    timing({ channel: "CALL", status: "CONVERTI", occurredAt: plannedFriday }),
    NOW,
  )

  expect(result.occurredAt).toEqual(plannedFriday)
})
```

Dans un `describe` par fonction, tests table (`it.each`) avec ces assertions :
- `allows each channel only its statuses` : `isStatusAllowed` vrai pour chaque couple d'`ALLOWED_STATUSES`, faux pour `CALL`×`REPONDU`, `CALL`×`REFUSE`, `CONNEXION_LINKEDIN`×`CONVERTI`, `CONNEXION_LINKEDIN`×`REFUSE`
- `falls back to done when the channel forbids the status` : `statusForChannel("CALL", "REPONDU")` vaut `"FAIT"`, `statusForChannel("EMAIL", "REFUSE")` vaut `"REFUSE"`
- `refuses to ignore a message that was never sent` : `isTransitionAllowed("DM_LINKEDIN", "A_FAIRE", "IGNORE")` faux
- `allows ignoring a planned call that did not take place` : `isTransitionAllowed("CALL", "A_FAIRE", "IGNORE")` vrai
- `allows creating an action already ignored` : `applyStatusRules(null, timing({ status: "IGNORE" }), NOW).status` vaut `"IGNORE"` (la transition ne se contrôle pas à la création)
- `does not count a call that did not take place as a contact` : `isContactMade("CALL", "IGNORE")` faux, `isContactMade("DM_LINKEDIN", "IGNORE")` vrai, `isContactMade("CALL", "A_FAIRE")` faux

Dans `action-board.test.ts`, `places the refused column before the ignored one` : `Object.keys(boardColumns([]))` vaut `["A_FAIRE", "FAIT", "REPONDU", "CONVERTI", "REFUSE", "IGNORE"]`.

- [ ] **Step 3 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/crm/prospecting-action-status.test.ts src/lib/crm/action-board.test.ts`
Expected: FAIL (fonctions absentes, `channel` absent de `ActionTiming`, colonne absente).

- [ ] **Step 4 : Implémenter les fonctions de l'Interfaces block**

`applyStatusRules` garde date et texte de réponse si `hasResponseDate(next.channel, next.status)` ; quand `next.channel === "CALL"` quitte `A_FAIRE` le même jour, `occurredAt` reste `current.occurredAt` au lieu de `now`. Ajouter `REFUSE` aux `Record` : libellé « Refusé », glyphe et jeton de la Task 0 (`ACTION_STATUS_ICONS`, `COLUMN_ICON_CLASSES`, `STATUS_COLORS`), colonne `REFUSE` avant `IGNORE` dans `boardColumns`. Remplacer `isRepliedStatus` par `RESPONSE_STATUSES.has` dans `review-counters.ts` (la Task 4 le précise) et par `hasResponseDate(channel, status)` dans le formulaire. `TIMING_SELECT` gagne `channel: true` et le `next` d'`updateProspectingAction` reçoit `channel: patch.channel ?? current.channel` ; `createProspectingAction` le transmet déjà par `data`. Commentaire de `reply` dans le schéma : effacée quand l'action quitte un statut de réponse ou est un call.

- [ ] **Step 5 : Relancer les tests, puis le typage**

Run: `pnpm vitest run --project unit src/lib/crm/prospecting-action-status.test.ts src/lib/crm/action-board.test.ts && just typecheck`
Expected: PASS.

---

### Task 2 : Domaine des actions, pipeline, MCP et rattrapage

**Files:**
- Modify: `prisma/schema.prisma` (`WeeklyReview.refusalsReceived Int @default(0)` après `conversationsEngaged`)
- Create: `prisma/migrations/<horodatage>_action_rules_and_refusals/migration.sql`
- Modify: `src/server/crm/prospecting-actions.ts`, test `src/server/crm/prospecting-actions.integration.test.ts`
- Modify: `src/lib/schemas/prospecting-action.ts`
- Modify: `src/server/actions/prospecting-actions.ts`, tests `src/server/actions/prospecting-actions.test.ts` et `src/server/actions/prospecting-actions.integration.test.ts`
- Modify: `src/server/mcp/crm/entities/prospecting-action.ts`, `src/server/mcp/crm/entities/interview.ts`
- Modify: `src/server/mcp/crm/tools-list.snapshot.json`, test `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces:**
- Consumes: Task 1 (`isStatusAllowed`, `isTransitionAllowed`, `applyStatusRules` avec `channel`, `TIMING_SELECT` avec `channel`)
- Produces:
  - `ProspectingActionWriteError` gagne `{ code: "status_not_allowed" } | { code: "unsent_action_ignored" }`
  - `changeProspectingActionStatus(rawId: string, status: string): Promise<ProspectingActionFormState>` : signature inchangée, délègue à `updateProspectingAction(id, { status })`

- [ ] **Step 1 : Créer la migration de rattrapage**

Ajouter `refusalsReceived` au schéma. Run: `pnpm prisma migrate dev --create-only --name action_rules_and_refusals`. Garder l'`ALTER TABLE` généré et ajouter à la suite :

```sql
UPDATE "freelance"."ProspectingAction" SET "status" = 'FAIT' WHERE "channel" = 'CALL' AND "status" = 'REPONDU';
UPDATE "freelance"."ProspectingAction" SET "respondedAt" = NULL, "reply" = NULL WHERE "channel" = 'CALL';
UPDATE "freelance"."ProspectingAction" SET "status" = 'REPONDU' WHERE "channel" = 'CONNEXION_LINKEDIN' AND "status" = 'CONVERTI';
```

Run: `pnpm prisma migrate dev` puis `just db-test`
Expected: appliquée, aucune dérive.

- [ ] **Step 2 : Écrire les tests d'intégration du domaine qui échouent** (`src/server/crm/prospecting-actions.integration.test.ts`)

- `rejects a status the channel forbids on create` : `createProspectingAction({ ...base, channel: "CALL", status: "REPONDU" })` rend `{ ok: false, error: { code: "status_not_allowed" } }` et aucune ligne n'est créée
- `rejects a status the channel forbids from a patch carrying only the status` : un call Fait patché `{ status: "REFUSE" }` rend `status_not_allowed`
- `rejects a status the channel forbids from a patch carrying only the channel` : un DM Répondu patché `{ channel: "CALL" }` rend `status_not_allowed`
- `rejects ignoring a message that was never sent` : un DM À faire patché `{ status: "IGNORE" }` rend `unsent_action_ignored`, statut en base inchangé
- `allows ignoring a planned call` : un call À faire patché `{ status: "IGNORE" }` est `IGNORE` en base
- `stores no response date when a call is converted` : un call Fait patché `{ status: "CONVERTI", respondedAt: <jour> }` a `respondedAt` et `reply` nuls

- [ ] **Step 3 : Écrire les tests de l'action du pipeline qui échouent** (`src/server/actions/prospecting-actions.test.ts`, domaine mocké)

- `returns each domain refusal as a status error when a move is not allowed` (`it.each`) : `updateProspectingAction` rend `status_not_allowed`, `unsent_action_ignored`, `person_conflict` (raison `opted_out`, puis `no_lead_role`) ; le résultat vaut `{ ok: false, errors: { status: [<message>] }, message: null }` avec le message du domaine ou `personConflictMessage(conflict)`
- `returns the deleted-action message when a moved action no longer exists` : `not_found` rend `errors.status` à `DELETED_ACTION_MESSAGE` et appelle `revalidatePersonLists`

Intégration (`src/server/actions/prospecting-actions.integration.test.ts`) : `refuses moving a call to replied from the board` : `changeProspectingActionStatus(callId, "REPONDU")` rend `errors.status` à « Statut impossible pour ce type d'action ».

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project integration src/server/crm/prospecting-actions.integration.test.ts src/server/actions/prospecting-actions.integration.test.ts && pnpm vitest run --project unit src/server/actions/prospecting-actions.test.ts`
Expected: FAIL.

- [ ] **Step 5 : Implémenter**

- `createProspectingAction` : `isStatusAllowed(data.channel, data.status)` avant l'écriture
- `updateProspectingAction` : à partir de `channel` et `status` lus par `TIMING_SELECT`, calcule le couple effectif (`patch.channel ?? current.channel`, `patch.status ?? current.status`), contrôle `isStatusAllowed` puis `isTransitionAllowed(effectiveChannel, current.status, effectiveStatus)` ; passe `channel` à `applyStatusRules`
- `changeProspectingActionStatus` : garde `getCurrentUser()` en tête et `createActionLogger`, appelle `updateProspectingAction`, traduit chaque erreur en `errors.status` (Step 3), garde les événements `prospecting_action:status_changed` et `prospecting_action:status_change_refused`, revalide comme aujourd'hui
- `mapDomainError` et `prospectingActionWriteErrorMessage` (MCP) traitent les deux codes avec les messages des Global Constraints
- `prospectingActionSchema` : `superRefine` qui pose une issue sur `["status"]` avec « Statut impossible pour ce type d'action » quand `!isStatusAllowed(channel, status)`
- Descriptions MCP (`prospecting-action.ts`) : statuts permis par canal, Refusé, À faire vers Ignoré réservé à un call non tenu, `respondedAt` et `reply` pour un statut de réponse hors call, règle de saisie d'un RDV (entretien dans une opportunité, call hors opportunité, call Converti quand il fait naître une opportunité) ; même règle dans les `docs` de `interview.ts`

- [ ] **Step 6 : Relancer les tests, régénérer le contrat MCP**

Run: les trois commandes du Step 4, puis `pnpm vitest run --project integration src/server/mcp/crm/tools.integration.test.ts -u`
Expected: PASS ; le diff du snapshot ne montre que l'enum avec `REFUSE`, les descriptions réécrites et l'ajout de `rejects creating or updating a call with a replied status` (à écrire dans `tools.integration.test.ts` : `crm_create` d'un call `REPONDU` et `crm_update` d'un call vers `REPONDU` rendent une erreur outil contenant « Statut impossible »).

---

### Task 3 : Opposition qui clôt les actions

**Files:**
- Modify: `src/server/actions/persons.ts` (`optOutPerson`)
- Test: `src/server/actions/persons.integration.test.ts`
- Modify: `src/components/features/admin/persons/OptOutPersonDialog.tsx` (texte)

**Interfaces:**
- Consumes: `MESSAGE_CHANNELS` (`src/lib/crm/action-views.ts`), valeur `REFUSE` (Task 1)
- Produces: rien de nouveau, `optOutPerson(id)` garde sa signature et ses issues

- [ ] **Step 1 : Écrire les tests qui échouent**

Intégration, `deletes planned actions and refuses the latest pending message when opting out` : Jane Doe, lead, porte un DM Fait du 2 mars 2026, un email Fait du 9 mars 2026, un DM À faire et un call À faire ; après `optOutPerson`, il reste deux actions, l'email est `REFUSE` avec `respondedAt` au jour du test, le DM du 2 mars reste `FAIT`.

Intégration, `deletes planned actions without refusing anything when no message awaits` : une connexion Fait, un call Fait, un DM Répondu et un DM À faire ; après l'opposition, le DM À faire a disparu, les trois autres gardent leur statut (une connexion ou un call en attente n'est jamais refusé).

- [ ] **Step 2 : Lancer les tests**

Run: `pnpm vitest run --project integration src/server/actions/persons.integration.test.ts`
Expected: FAIL.

- [ ] **Step 3 : Implémenter dans la transaction d'`optOutPerson`**, après la branche de suppression complète et avant l'`update` qui pose `optedOutAt` : `deleteMany` des actions `A_FAIRE` de la personne ; recherche de la plus récente action `FAIT` d'un canal message ou `CANDIDATURE` (`occurredAt` puis `createdAt` décroissants) ; si elle existe, `status: "REFUSE"` et `respondedAt` à l'instant de l'opposition. Texte de la fenêtre, à la place de la phrase sur les actions : « Ses actions à faire sont supprimées et son dernier message en attente passe Refusé. Ses autres actions restent dans son historique, sans être réutilisées, sauf si elle en demande l'effacement. »

- [ ] **Step 4 : Relancer les tests**

Run: la commande du Step 2
Expected: PASS.

---

### Task 4 : Revue hebdo à huit compteurs

**Files:**
- Modify: `src/lib/crm/review-counters.ts`, test `src/lib/crm/review-counters.test.ts`
- Modify: `src/lib/crm/weekly-reviews.ts`, test `src/lib/crm/weekly-reviews.test.ts`
- Modify: `src/lib/schemas/weekly-review.ts`
- Modify: `src/server/queries/weekly-reviews.ts` (`weeklyReviewRowSelect`)
- Modify: `src/server/mcp/crm/entities/weekly-review.ts`, snapshot et `src/server/mcp/crm/tools.integration.test.ts`
- Modify: `src/testing/prisma.ts` (`CLOSED_WEEK_COUNTS`, `seedClosedWeek`)
- Test: `src/server/crm/weekly-reviews.integration.test.ts`, `src/server/actions/weekly-reviews.test.ts`
- Modify: `src/components/features/admin/weekly-reviews/review-table-widths.ts`, `ReviewsTable.tsx`, `ReviewFormDialog.tsx` (rendu)

**Interfaces:**
- Consumes: `isSentStatus`, `isEngagedStatus`, `MESSAGE_CHANNELS`
- Produces: `REVIEW_COUNTER_KEYS` à huit clés, `refusalsReceived` placé après `conversationsEngaged` ; `ReviewCounts` dérivé ; `reviewRates(review)` inchangée en signature

- [ ] **Step 1 : Écrire les tests qui échouent**

`review-counters.test.ts`, avec les helpers existants (`action`, `sources`, `IN_WEEK`, `BEFORE`) :

```typescript
it("counts refusals apart from conversations", () => {
  const counts = countWeek(
    sources({
      actions: [
        action("DM_LINKEDIN", "REFUSE", BEFORE, IN_WEEK),
        action("EMAIL", "REPONDU", BEFORE, IN_WEEK),
      ],
    }),
    BOUNDS,
    NOW,
  )

  expect(counts).toMatchObject({ refusalsReceived: 1, conversationsEngaged: 1 })
})
```

Mêmes conventions pour :
- `counts a refused message as sent` : un DM `REFUSE` envoyé `IN_WEEK` donne `messagesSent: 1`
- `counts converted applications as booked meetings` : une `CANDIDATURE` `CONVERTI` répondue `IN_WEEK` donne `meetingsBooked: 1`, un `CALL` `CONVERTI` donne `meetingsBooked: 0`
- `counts held calls with held interviews, on the day of the call` : un entretien `FAIT` `IN_WEEK`, un `CALL` `FAIT` et un `CALL` `CONVERTI` datés `IN_WEEK`, un `CALL` `IGNORE` `IN_WEEK`, un `CALL` `FAIT` daté `BEFORE` donnent `interviewsHeld: 3`
- `ignores the other channel in every counter` : une action `AUTRE` `REPONDU` `IN_WEEK` laisse tous les compteurs à 0

`weekly-reviews.test.ts`, `computes the response rate with refusals` : `{ messagesSent: 10, conversationsEngaged: 3, refusalsReceived: 2, meetingsBooked: 2, … }` donne `response: 50` et `meetingConversion: 67`.

`weekly-reviews.integration.test.ts` : renommer « computes the seven counters when absent » en `computes the eight counters when absent`, avec `refusalsReceived` issu de `seedClosedWeek`.

- [ ] **Step 2 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/crm/review-counters.test.ts src/lib/crm/weekly-reviews.test.ts`
Expected: FAIL.

- [ ] **Step 3 : Implémenter**

`countWeek` : connexions et messages envoyés par `isSentStatus` à `occurredAt` ; une réponse comptée à `respondedAt` : connexions `REPONDU`, messages engagés (`isEngagedStatus`), messages `REFUSE`, messages et candidatures `CONVERTI` ; Entretiens = entretiens `FAIT` à `scheduledAt` plus calls `FAIT` ou `CONVERTI` à `occurredAt`. Commentaire d'en-tête mis à jour. `reviewRates.response` = `rate(conversationsEngaged + refusalsReceived, messagesSent)`. Clé, libellé « Refus reçus », champ Zod `counter`, colonne dans `weeklyReviewRowSelect`, description MCP (« Refusals received in the week. », définitions de `meetingsBooked` et `interviewsHeld`, « eight counters » aux trois endroits). Fixture : `seedClosedWeek` ajoute un DM Refusé, une candidature Convertie et un call Fait dans la semaine, `CLOSED_WEEK_COUNTS` suit.

- [ ] **Step 4 : Relancer les tests unitaires et d'intégration**

Run: `pnpm vitest run --project unit src/lib/crm src/server/actions/weekly-reviews.test.ts && pnpm vitest run --project integration src/server/crm/weekly-reviews.integration.test.ts src/server/mcp/crm/tools.integration.test.ts -u`
Expected: PASS ; diff du snapshot limité au compteur et aux descriptions.

- [ ] **Step 5 : Colonne et formulaire**

Colonne Refus reçus après Conversations engagées dans `ReviewsTable` et `ALL_REVIEW_COLUMNS`, largeur multiple de 8 mesurée sur les vraies données de la vue complète. Vérifier au rendu (`/run`, 1280 px puis largeur minimale) que le formulaire tient ses huit compteurs et la case des taux ; un écart de disposition se présente en arbitrage visuel avant d'être corrigé.

---

### Task 5 : Écrans des actions

**Files:**
- Modify: `src/components/features/admin/prospecting-actions/ProspectingActionFormDialog.tsx`
- Modify: `src/components/features/admin/prospecting-actions/action-detail.tsx`
- Modify: `src/components/features/admin/prospecting-actions/DeleteProspectingActionDialog.tsx`
- Modify: `src/lib/crm/action-views.ts` (sous-titres)

**Interfaces:**
- Consumes: `ALLOWED_STATUSES`, `statusForChannel`, `hasResponseDate` (Task 1)

- [ ] **Step 1 : Formulaire** : `SelectField` du Statut reçoit `options={ALLOWED_STATUSES[channel]}` ; au changement de Type, `setStatus(statusForChannel(nextChannel, status))` ; « Réponse reçue le » et Réponse rendus si `hasResponseDate(channel, status)`

- [ ] **Step 2 : Vue détail** : la ligne de date de réponse et le bloc Réponse ne sont construits que si `action.channel !== "CALL"`

- [ ] **Step 3 : Textes**

- Suppression : « Elle disparaît du journal et de l'historique du lead. Une action envoyée restée sans réponse, ou un call qui n'a pas eu lieu, se garde plutôt avec le statut « Ignoré » ; une action jamais envoyée se supprime. »
- Connexions : « Connexions LinkedIn envoyées, en attente d'acceptation, les plus anciennes d'abord. »
- Candidatures : « Candidatures envoyées en attente de retour RH. »

- [ ] **Step 4 : Vérifier au rendu** (`/run`) : un call n'offre ni Répondu ni Refusé ni champs de réponse ; passer un DM Refusé à Call ramène le statut à Fait ; la colonne Refusé apparaît entre Converti et Ignoré du pipeline ; glisser un DM À faire dans Ignoré affiche le toast « Une action jamais envoyée se supprime au lieu d'être ignorée » et la carte revient ; la pastille du calendrier prend la couleur de la Task 0

Run: `just lint && just typecheck`
Expected: PASS.

---

### Task 6 : RDV planifié, pipeline et dernier contact

**Files:**
- Modify: `src/lib/crm/lead-display-status.ts`, test `src/lib/crm/lead-display-status.test.ts`
- Modify: `src/lib/crm/lead-views.ts`, test `src/lib/crm/lead-views.test.ts`
- Modify: `src/lib/crm/review-counters.ts`, test `src/lib/crm/review-counters.test.ts`
- Create: `src/lib/crm/person-last-contact.ts`, test `src/lib/crm/person-last-contact.test.ts`
- Modify: `src/lib/crm/person-retention.ts`, test `src/lib/crm/person-retention.test.ts`
- Modify: `src/lib/crm/leads.ts` (clé de libellé)
- Modify: `src/server/queries/leads.ts`, `src/server/queries/companies.ts`, `src/server/queries/weekly-reviews.ts`
- Modify: `src/server/crm/weekly-reviews.ts` (`computeWeekCounts`)
- Modify: `src/server/mcp/crm/entities/lead.ts`, test `src/server/mcp/crm/tools.integration.test.ts`
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`, `lead-detail.tsx`
- Modify: `src/server/actions/interviews.ts` (commentaire), `prisma/schema.prisma` (commentaire de `respondedAt`)
- Modify: `docs/registre-traitements.md` (Traitement 7, Conservation)

**Interfaces:**
- Consumes: `isEngagedStatus`, `RESPONSE_STATUSES` (Task 1)
- Produces:
  - `LeadStatusSource.plannedCalls: readonly { occurredAt: Date }[]` (requis)
  - `PIPELINE_STATUSES`, `isInPipeline(lead: LeadStatusSource, now: Date): boolean` (`lead-views.ts`) ; `ACTIVE_LEAD_STATUSES` (`review-counters.ts`)
  - `lastContactAtOf(actions: readonly { channel: ActionChannel; status: ActionStatus; occurredAt: Date; respondedAt: Date | null }[], interviews: readonly { status: InterviewStatus; scheduledAt: Date }[], now: Date): Date | null`
  - `AdminLead.lastContactAt: Date | null`, `AdminLead.plannedCalls`, `RetentionPerson.lastContactAt`
  - `toAdminLead(row, now: Date)` ; `findWeekCounterSources(bounds, now: Date)`

- [ ] **Step 1 : Écrire les tests qui échouent**

`lead-display-status.test.ts` (chaque littéral gagne `plannedCalls: []`) :

```typescript
it("shows a scheduled meeting for a call planned today or later", () => {
  const lead = {
    status: "SUSPECT" as const,
    optedOutAt: null,
    opportunities: [],
    interviews: [],
    plannedCalls: [{ occurredAt: zonedDayStartOf(NOW) }],
  }

  const status = leadDisplayStatus(lead, NOW)

  expect(status).toBe("RDV_PLANIFIE")
})
```

Mêmes conventions pour `keeps the entered status once the planned call day has passed` (`occurredAt: zonedDayStartOf(NOW, -1)`, rend `"SUSPECT"`) et `treats a planned call carrying a time as a call of its day` (`occurredAt` à `zonedDayStartOf(NOW)` plus six heures, rend `"RDV_PLANIFIE"`).

`person-last-contact.test.ts`, `NOW = 2026-07-15` :
- `takes the latest of replies, held calls and held interviews` : réponse le 2 mars 2026, call `FAIT` le 10 mai 2026, entretien `FAIT` le 15 juin 2026 rendent le 15 juin 2026
- `ignores sent messages without reply, calls not held and future dates` : DM `FAIT` sans réponse le 1er juillet 2026, call `IGNORE` le 5 juillet 2026, entretien `FAIT` le 20 juillet 2026 et réponse datée du 20 juillet 2026, avec une réponse le 2 mars 2026, rendent le 2 mars 2026
- `returns null without any contact from the person`

`lead-views.test.ts` : renommer les usages, `keeps new leads in the pipeline` (`isInPipeline` d'un lead `NOUVEAU` vrai). `review-counters.test.ts` : le helper `lead` gagne `plannedCalls: []` ; `counts a new lead with a planned call as active` (lead `NOUVEAU` avec un call planifié à `NOW` donne `activeLeads: 1`, sans call `0`).

`person-retention.test.ts` : `lastReplyAt` devient `lastContactAt`, valeurs inchangées.

- [ ] **Step 2 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/crm/lead-display-status.test.ts src/lib/crm/person-last-contact.test.ts src/lib/crm/lead-views.test.ts src/lib/crm/review-counters.test.ts src/lib/crm/person-retention.test.ts`
Expected: FAIL.

- [ ] **Step 3 : Fonctions pures**

`leadDisplayStatus` : RDV planifié si un entretien `PLANIFIE` à `scheduledAt >= now` ou un call de `plannedCalls` à `occurredAt >= zonedDayStartOf(now)`, après opposition et Deal ; commentaire mis à jour. Renommages de `lead-views.ts` et `review-counters.ts`. `lastContactAtOf` : maximum des `respondedAt`, des `occurredAt` des calls `FAIT` ou `CONVERTI`, des `scheduledAt` des entretiens `FAIT`, en écartant toute date postérieure à `now`. `RetentionPerson.lastContactAt`.

- [ ] **Step 4 : Requêtes**

- `leads.ts` : la sélection `prospectingActions` prend `where: { OR: [{ respondedAt: { not: null } }, { channel: "CALL", status: { in: ["FAIT", "CONVERTI"] } }, { channel: "CALL", status: "A_FAIRE", occurredAt: { gte: zonedDayStartOf(now) } }] }`, sans `take` ni `orderBy`, `select` de `channel`, `status`, `occurredAt`, `respondedAt` ; `toAdminLead(row, now)` en tire `lastContactAt` (`lastContactAtOf`) et `plannedCalls` ; `findAllLeadsForAdmin` et `findLeadByIdForAdmin` passent `new Date()`
- `companies.ts` : `companyPersonSelect.prospectingActions` prend `where: { OR: [{ status: SENT_STATUS_WHERE }, { channel: "CALL", status: "A_FAIRE", occurredAt: { gte: <début du jour> } }] }`, sans `take` ni `orderBy`, `select` de `channel`, `status`, `occurredAt`, `respondedAt` ; `toAdminCompany` sépare les calls planifiés (pour `isInPipeline` et `leadDisplayStatus`) des actions sorties d'À faire (pour `firstContactAtOf`) ; `AdminCompanyLead` omet le nouveau champ
- `weekly-reviews.ts` : `findWeekCounterSources(bounds, now)` ajoute à `person` la sélection des calls planifiés ; `computeWeekCounts` lui passe `now` ; commentaire mis à jour

- [ ] **Step 5 : Écrans, MCP, docs**

`LeadsTable` lit `PIPELINE_STATUSES` et `lastContactAt` ; `lead-detail` lit `lastContactAt` ; `LEAD_FIELD_LABELS.lastContactAt` garde « Dernier contact de sa part ». MCP `lead.ts` : `withDays(..., ["lastContactAt"], ZONED_DAY)`, `plannedCalls` retiré de la sortie comme `interviews`. Test MCP `returns the last contact day of a lead from its held call` (call `FAIT` postérieur à la réponse de la fixture, `lastContactAt` à son jour de Paris) ; `DAY_KEYS` et `DATE_CASES` passent de `lastReplyAt` à `lastContactAt`. Registre, Traitement 7 : « Prospect : 3 ans à compter de la collecte ou du dernier contact émanant de lui (réponse, call ou entretien qu'il a tenu), puis relance… ». Commentaires de `respondedAt` (schéma) et de `src/server/actions/interviews.ts` alignés.

- [ ] **Step 6 : Relancer**

Run: la commande du Step 2, puis `pnpm vitest run --project integration src/server/mcp/crm/tools.integration.test.ts -u && just typecheck`
Expected: PASS ; snapshot inchangé hors descriptions touchées.

---

### Task 7 : Statut Dormante déduit

**Files:**
- Modify: `prisma/schema.prisma` (`RelationStatus`)
- Create: `prisma/migrations/<horodatage>_relation_status_dormancy_derived/migration.sql`
- Create: `src/lib/crm/company-relation-status.ts`, test `src/lib/crm/company-relation-status.test.ts`
- Modify: `src/lib/crm/company-first-contact.ts`, test `src/lib/crm/company-first-contact.test.ts`
- Modify: `src/lib/crm/companies.ts`
- Modify: `src/server/queries/companies.ts`
- Modify: `src/components/features/admin/companies/CompaniesTable.tsx`, `company-detail.tsx`, `CompanyRelationCard.tsx`, `CompanyForm.tsx`
- Modify: `src/server/mcp/crm/entities/company.ts`, snapshot, `src/server/mcp/crm/tools.integration.test.ts`
- Test: `src/server/crm/companies.integration.test.ts`, `src/server/actions/companies.test.ts`, `src/server/queries/projects.integration.test.ts`
- Modify: `docs/BRAINSTORM.md` (Feature 2, fiche entreprise enrichie : statut Dormante parmi les propriétés déduites)

**Interfaces:**
- Consumes: `isContactMade` (Task 1), sélection élargie des actions des personnes (Task 6)
- Produces (`src/lib/crm/company-relation-status.ts`) :
  - `type CompanyRelationDisplayStatus = RelationStatus | "DORMANTE"` ; `COMPANY_RELATION_DISPLAY_STATUSES: readonly CompanyRelationDisplayStatus[]` (`ACTIVE`, `DORMANTE`, `ARCHIVEE`) ; `DORMANCY_MONTHS = 12`
  - `interface InteractionSources { actions: readonly { channel: ActionChannel; status: ActionStatus; occurredAt: Date; respondedAt: Date | null }[]; metAts: readonly Date[]; interviews: readonly { status: InterviewStatus; scheduledAt: Date }[]; projects: readonly { type: ProjectType; startedAt: Date | null; endedAt: Date | null }[]; opportunities: readonly { status: OpportunityStatus; startMonth: Date | null; durationMonths: number | null }[] }`
  - `lastInteractionAtOf(sources: InteractionSources, now: Date): Date | null` : filtre lui-même les entretiens `FAIT`, les projets `CLIENT` et les opportunités `ACCEPTEE`
  - `relationDisplayStatus(stored: RelationStatus, lastInteractionAt: Date | null, now: Date): CompanyRelationDisplayStatus`
  - `AdminCompany.lastInteractionAt: Date | null`, `AdminCompany.displayRelationStatus: CompanyRelationDisplayStatus`
  - `findCompaniesPage(query: { where: Prisma.CompanyWhereInput; relationStatus?: CompanyRelationDisplayStatus; sort: "name" | "createdAt" | "updatedAt"; order: SortOrder; offset: number; limit: number }, now: Date)` : rend `{ rows, total }`, chaque ligne gardant les champs de `companyRowSelect` avec `relationStatus` au statut affiché, plus `lastInteractionAt`

- [ ] **Step 1 : Écrire les tests purs qui échouent** (`company-relation-status.test.ts`, `NOW = 2026-11-18T12:00:00Z`)

```typescript
it("stays active on the exact twelve-month day and turns dormant the day after", () => {
  const onTheDay = new Date("2025-11-18T08:00:00Z")
  const dayBefore = new Date("2025-11-17T08:00:00Z")

  expect([
    relationDisplayStatus("ACTIVE", onTheDay, NOW),
    relationDisplayStatus("ACTIVE", dayBefore, NOW),
  ]).toEqual(["ACTIVE", "DORMANTE"])
})
```

Mêmes conventions pour :
- `takes the latest of contacts, replies, meetings and held interviews` : action envoyée le 3 mars 2026, réponse le 10 avril 2026, rencontre le 2 mai 2026, entretien Fait le 15 juin 2026 rendent le 15 juin 2026
- `counts an ongoing client project and a running accepted mission as today` : projet commencé le 1er janvier 2026 sans fin rend `NOW` ; mission acceptée démarrée le 1er juin 2026 pour 12 mois rend `NOW` ; mission démarrée le 1er janvier 2025 pour 6 mois rend le 1er juillet 2025
- `ignores personal projects, planned interviews, actions to do, calls not held and future dates` : un projet `PERSONAL` en cours, un entretien `PLANIFIE` passé, une action `A_FAIRE`, un call `IGNORE` et une réponse datée du 1er décembre 2026 rendent `null`
- `ignores an accepted mission without start month`
- `keeps an archived company archived whatever its activity` : `relationDisplayStatus("ARCHIVEE", NOW, NOW)` vaut `"ARCHIVEE"`
- `keeps a company without any interaction active` : `relationDisplayStatus("ACTIVE", null, NOW)` vaut `"ACTIVE"`

`company-first-contact.test.ts`, `ignores a call that did not take place` : un call `IGNORE` du 1er février 2026 et un DM `FAIT` du 1er mars 2026 rendent le 1er mars 2026.

- [ ] **Step 2 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/crm/company-relation-status.test.ts src/lib/crm/company-first-contact.test.ts`
Expected: FAIL.

- [ ] **Step 3 : Implémenter les fonctions pures**

`lastInteractionAtOf` : actions où `isContactMade` (leur `occurredAt` et leur `respondedAt`), `metAts`, entretiens `FAIT`, projets `CLIENT` (`endedAt`, ou `now` si commencé sans fin), opportunités `ACCEPTEE` comme missions (`addMonths(startMonth, durationMonths)` plafonnée à `now`, `startMonth` sans durée, ignorée si `startMonth` manque ou est futur) ; toute date postérieure à `now` écartée. `relationDisplayStatus` : `ARCHIVEE` saisie gagne ; Dormante si `lastInteractionAt < zonedDayStartOf(subMonths(now, DORMANCY_MONTHS))`. `firstContactAtOf` filtre par `isContactMade`.

- [ ] **Step 4 : Migration**

Retirer `DORMANTE` de `RelationStatus`. Run: `pnpm prisma migrate dev --create-only --name relation_status_dormancy_derived`. Insérer en tête du SQL généré :

```sql
UPDATE "freelance"."Company" SET "relationStatus" = 'ACTIVE' WHERE "relationStatus" = 'DORMANTE';
```

Run: `pnpm prisma migrate dev` puis `just db-test`
Expected: appliquée, aucune dérive.

- [ ] **Step 5 : Requêtes et écrans**

- `toAdminCompany` : entretiens Faits sans `take`, projets avec `type`, `startedAt` et `endedAt` (`clientMetas`), opportunités avec `status`, `startMonth` et `durationMonths` ; construit `InteractionSources` (`metAts` des personnes), pose `lastInteractionAt` et `displayRelationStatus`
- `findCompanyWithLinks` charge les mêmes sources pour l'entreprise demandée et rend les deux champs
- `findCompaniesPage` : charge toutes les entreprises filtrées par `where` avec leurs sources, calcule le statut affiché, filtre par `relationStatus`, trie par `sort` puis `id`, découpe par `offset` et `limit`, `total` après le filtre
- `companies.ts` (lib) : `RELATION_STATUS_LABELS` et `COMPANY_STATUS_ICONS` indexés par `CompanyRelationDisplayStatus` ; libellé `lastInteractionAt` « Dernière interaction »
- `CompaniesTable` : colonne et facette sur `displayRelationStatus` et `COMPANY_RELATION_DISPLAY_STATUSES` ; `company-detail` : badge sur `displayRelationStatus`, ligne « Dernière interaction » après « Premier contact » ; `CompanyRelationCard` et `CompanyForm` sur `RELATION_STATUSES` (deux valeurs)
- MCP `company.ts` : description du champ saisi (« ACTIVE or ARCHIVEE. DORMANTE is derived from 12 months without interaction and only read »), filtre `relationStatus` en `z.enum(COMPANY_RELATION_DISPLAY_STATUSES)` passé à `findCompaniesPage` hors de `toWhere`, `lastInteractionAt` au jour de Paris (`ZONED_DAY`)

- [ ] **Step 6 : Tests d'intégration**

Dans `tools.integration.test.ts` :
- `filters companies on the displayed status, dormant and active` : Acme (dernière action il y a quatorze mois) et Globex (dernière action il y a deux mois) ; `relationStatus: "DORMANTE"` rend seulement Acme, `"ACTIVE"` seulement Globex
- `counts the total after the displayed status filter` : 25 entreprises dont 12 dormantes, `relationStatus: "DORMANTE"`, `limit: 5`, `offset: 10` rendent 2 lignes et `total: 12`
- `rejects a dormant status sent to crm_update`
- `DAY_KEYS` gagne `lastInteractionAt` ; `seedNumberedCompanies` et les cas qui écrivaient `DORMANTE` passent par des dates d'action

Dans `companies.integration.test.ts`, `actions/companies.test.ts` et `projects.integration.test.ts`, remplacer les `DORMANTE` saisis par `ARCHIVEE` ou les retirer.

Run: `pnpm vitest run --project unit src/lib/crm && pnpm vitest run --project integration src/server/crm/companies.integration.test.ts src/server/queries/projects.integration.test.ts src/server/mcp/crm/tools.integration.test.ts -u && pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: PASS ; diff du snapshot limité à l'enum, au filtre et aux descriptions.

- [ ] **Step 7 : Vérifier au rendu** (`/run`) : liste des entreprises avec Dormante, facette à trois valeurs, vue détail avec « Dernière interaction », formulaire à deux statuts. Ajouter « statut Dormante » à la liste des propriétés déduites de la fiche entreprise enrichie dans `docs/BRAINSTORM.md` (Feature 2).

---

### Task 8 : Consolidation, rattrapage sur une copie de production et gate

Dernière tâche avant la chaîne de revue de `/implement-subproject` : elle réécrit encore des tests et des commentaires, ce que `/simplify` et les relecteurs doivent voir dans leur état final. Ce sub-project se clôt sans `/finalize-feature` : ses passes de consolidation se font ici.

**Files:**
- Modify: les fichiers de test et de code touchés par les Tasks 1 à 7 (consolidation, commentaires)
- Modify: `docs/DESIGN.md`, `docs/registre-traitements.md`, `docs/BRAINSTORM.md` (cohérence relue)
- Modify: `.claude/skills/verify/SKILL.md` (par `/verify`, dans la chaîne de revue)

- [ ] **Step 1 : Consolider les tests** : `Agent(subagent_type: "code/test-consolidator")` sur les fichiers de test modifiés ou créés depuis `BASE_SHA` (`git diff --name-only <BASE_SHA> -- '*.test.ts' '*.test.tsx'`) : fixtures partagées réutilisées (`src/testing/`), doublons fusionnés en tests paramétrés, aucun cas métier perdu

- [ ] **Step 2 : Condenser les commentaires** des fichiers touchés depuis `BASE_SHA` selon `~/.claude/CLAUDE.md` § Commentaires & documentation de code : le pourquoi seulement, plus aucun commentaire devenu faux (« Répondu ou Converti », « sept compteurs », « RDV planifié » limité aux entretiens, `lastReplyAt`, Dormante saisie), une référence au spec au plus par fichier

- [ ] **Step 3 : Relire la cohérence des docs** touchées par l'évolution : Refusé dans `docs/DESIGN.md` (Task 0), dernier contact au registre (Task 6), Dormante déduite et ligne de la Feature 4 dans `docs/BRAINSTORM.md` (Task 7) ; un fait à un seul endroit, renvoi plutôt que recopie

- [ ] **Step 4 : Compter les cas à rattraper avant migration** sur une base locale restaurée (`just db-restore`, base à l'état d'avant les trois migrations) : calls `REPONDU`, calls avec `respondedAt`, connexions `CONVERTI`, entreprises `DORMANTE`

- [ ] **Step 5 : Appliquer les migrations** (`pnpm prisma migrate deploy`) puis recompter : les quatre comptes valent 0 ; les compteurs des revues existantes sont inchangés et `refusalsReceived` vaut 0. Cette étape rejoint la recette que `/verify` enrichit dans la chaîne de revue, avec les huit compteurs et les statuts par canal

- [ ] **Step 6 : Gate**

Run: `just lint && just typecheck && just test`
Expected: PASS.
