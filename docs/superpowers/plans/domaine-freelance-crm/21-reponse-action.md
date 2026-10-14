# Réponse de la personne sur une action : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garder le texte de la réponse de la personne sur l'action qu'elle a répondue, à côté du message envoyé, dans le formulaire et la vue détail.

**Architecture:** Un champ `reply` sur `ProspectingAction` suit le cycle de `respondedAt` dans la fonction pure `applyStatusRules` : gardé tel que soumis au statut Répondu ou Converti, effacé à tout autre statut. Les Server Actions le lisent du formulaire et le repassent tel quel au changement de statut seul. Le formulaire l'affiche sous Message quand le statut est répondu, la vue détail sous le bloc Message quand il est renseigné.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4, Next.js 16 (Server Actions), React 19, Vitest.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/21-reponse-action-design.md`

## Global Constraints

- **Prérequis** : plans `09` (modèle, `applyStatusRules`, Server Actions) et `10` (`ProspectingActionFormDialog`, `buildActionDetail`) implémentés.
- **Champ** : `reply String?` sur `ProspectingAction`, après `message`, schema `freelance`. Migration additive nommée `prospecting_action_reply`.
- **Cycle** : statut `REPONDU` ou `CONVERTI` → réponse gardée telle que soumise, vide → `null`, sans repli sur la valeur enregistrée ; `A_FAIRE`, `FAIT`, `IGNORE` → `null`. Changement de statut seul : la réponse enregistrée est repassée telle quelle.
- **Textes** : libellé « Réponse », aide « Le texte exact reçu. » ; date de réponse « Acceptée le » pour `CONNEXION_LINKEDIN` (`respondedAtLabel`), « Réponse reçue le » sinon.
- **Lectures** : `actionTimelineSelect` (historique des leads) n'embarque pas la réponse, comme le message.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/data-modeling.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/server-actions-security.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/mocks-assertions.md`.

## Review Focus

- **Réponse vidée à la main en restant Répondu** : enregistrée `null`, l'ancienne valeur ne revient pas. Couvert par « does not restore a stored reply that the form cleared » (Task 1).
- **Glisser du pipeline de Répondu vers Fait** : la réponse disparaît avec sa date. Couvert par « clears the reply when the status alone moves a replied action back to done » (Task 2).
- **Glisser du pipeline de Répondu vers Converti** : la réponse reste. Couvert par « keeps the reply when the status alone moves a replied action to converted » (Task 2).
- **Statut rebasculé à Fait dans le formulaire avant d'enregistrer** : le champ masqué n'est pas soumis, `stringField` rend `""`, la règle efface de toute façon. Couvert par « clears the reply when an action goes back to to do, done or ignored » (Task 1).
- **Connexion acceptée sans texte** : « Acceptée le » et aucun bloc Réponse dans la vue détail. Vérifié à la Task 3, Step 4.

---

### Task 1 : Modèle, migration et règle de statut

**Files:**
- Modify: `prisma/schema.prisma` (modèle `ProspectingAction`)
- Create: `prisma/migrations/<horodatage>_prospecting_action_reply/migration.sql` (générée)
- Modify: `src/lib/crm/prospecting-action-status.ts`
- Test: `src/lib/crm/prospecting-action-status.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: colonne `ProspectingAction.reply: string | null` ; `ActionTiming { status: ActionStatus; occurredAt: Date; respondedAt: Date | null; reply: string | null }` ; `applyStatusRules(current: ActionTiming | null, next: ActionTiming, now: Date): ActionTiming` (signature inchangée, retourne aussi `reply`)

- [ ] **Step 1 : Champ et migration**

Dans `prisma/schema.prisma`, modèle `ProspectingAction`, juste après `message     String?` :

```prisma
  // Suit la date de réponse : effacée quand l'action quitte Répondu ou Converti.
  reply       String?
```

Run: `just db-migrate prospecting_action_reply`
Expected: migration créée et appliquée, client Prisma régénéré. Le SQL contient seulement :

```sql
ALTER TABLE "freelance"."ProspectingAction" ADD COLUMN     "reply" TEXT;
```

Run: `just db-test`
Expected: la DB de test reçoit la migration.

- [ ] **Step 2 : Tests en échec**

Dans `src/lib/crm/prospecting-action-status.test.ts`, la factory gagne `reply` :

```ts
function timing(overrides: Partial<ActionTiming> = {}): ActionTiming {
  return { status: "A_FAIRE", occurredAt: MONDAY, respondedAt: null, reply: null, ...overrides }
}
```

Ajouter, après une constante `const REPLY = "Merci, on peut en parler jeudi."` placée sous `TUESDAY_EVENING`, à la fin du `describe` :

```ts
  it.each(["REPONDU", "CONVERTI"] as const)(
    "keeps the submitted reply when an action is replied or converted (%s)",
    (status) => {
      const result = applyStatusRules(
        timing({ status: "FAIT" }),
        timing({ status, reply: REPLY }),
        NOW,
      )

      expect(result.reply).toBe(REPLY)
    },
  )

  it.each(["A_FAIRE", "FAIT", "IGNORE"] as const)(
    "clears the reply when an action goes back to to do, done or ignored (%s)",
    (status) => {
      const result = applyStatusRules(
        timing({ status: "REPONDU", reply: REPLY }),
        timing({ status, reply: REPLY }),
        NOW,
      )

      expect(result.reply).toBeNull()
    },
  )

  it("does not restore a stored reply that the form cleared", () => {
    const result = applyStatusRules(
      timing({ status: "REPONDU", reply: REPLY }),
      timing({ status: "REPONDU", reply: null }),
      NOW,
    )

    expect(result.reply).toBeNull()
  })
```

- [ ] **Step 3 : Vérifier l'échec**

Run: `pnpm vitest run --project unit src/lib/crm/prospecting-action-status.test.ts`
Expected: FAIL sur « keeps the submitted reply » (`reply` absent du résultat).

- [ ] **Step 4 : Implémenter**

Dans `src/lib/crm/prospecting-action-status.ts` :

```ts
export interface ActionTiming {
  status: ActionStatus
  occurredAt: Date
  respondedAt: Date | null
  reply: string | null
}
```

Commentaire au-dessus de `applyStatusRules` :

```ts
// `current` vaut null à la création (l'action garde sa date) ; `next.respondedAt` nul signifie « non saisie »,
// `next.reply` nul une réponse vidée, gardée telle quelle.
```

Fin de la fonction :

```ts
  const replied = isRepliedStatus(next.status)
  const respondedAt = replied ? (next.respondedAt ?? current?.respondedAt ?? now) : null

  return {
    status: next.status,
    occurredAt: leavesToDo ? now : next.occurredAt,
    respondedAt,
    reply: replied ? next.reply : null,
  }
```

- [ ] **Step 5 : Vérifier le passage**

Run: `pnpm vitest run --project unit src/lib/crm/prospecting-action-status.test.ts`
Expected: PASS.

---

### Task 2 : Validation, libellé et Server Actions

**Files:**
- Modify: `src/lib/schemas/prospecting-action.ts`
- Modify: `src/lib/crm/prospecting-actions.ts` (`PROSPECTING_ACTION_FIELD_LABELS`)
- Modify: `src/server/actions/prospecting-actions.ts`
- Test: `src/server/actions/prospecting-actions.test.ts`

**Interfaces:**
- Consumes: `ActionTiming.reply`, `applyStatusRules` (Task 1)
- Produces: `ProspectingActionInput.reply: string | null` ; champ de formulaire `reply` ; `PROSPECTING_ACTION_FIELD_LABELS.reply = "Réponse"`

- [ ] **Step 1 : Tests en échec**

Dans `src/server/actions/prospecting-actions.test.ts` :
- `BASE_FIELDS` gagne `reply: ""` après `message: ""` ;
- dans « changes the status alone and applies the same rules », le mock de `findUniqueOrThrow` gagne `reply: null` et la `data` attendue `reply: null` ;
- ajouter une constante `const REPLY = "Merci, on peut en parler jeudi."` sous `MONDAY_MIDNIGHT_IN_PARIS`.

Dans `describe("createProspectingAction")`, après « creates a replied action with its reply time » :

```ts
  it("stores the reply with a replied action", async () => {
    await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData({ status: "REPONDU", reply: REPLY }),
    )

    expect(prisma.prospectingAction.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ status: "REPONDU", reply: REPLY }) }),
    )
  })
```

Dans `describe("changeProspectingActionStatus")` :

```ts
  it("keeps the reply when the status alone moves a replied action to converted", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockResolvedValue({
      status: "REPONDU",
      occurredAt: MONDAY,
      respondedAt: NOW,
      reply: REPLY,
    } as never)

    await changeProspectingActionStatus("a1", "CONVERTI")

    expect(prisma.prospectingAction.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "CONVERTI", occurredAt: MONDAY, respondedAt: NOW, reply: REPLY },
    })
  })

  it("clears the reply when the status alone moves a replied action back to done", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockResolvedValue({
      status: "REPONDU",
      occurredAt: MONDAY,
      respondedAt: NOW,
      reply: REPLY,
    } as never)

    await changeProspectingActionStatus("a1", "FAIT")

    expect(prisma.prospectingAction.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "FAIT", occurredAt: MONDAY, respondedAt: null, reply: null },
    })
  })
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pnpm vitest run --project unit src/server/actions/prospecting-actions.test.ts`
Expected: FAIL sur « stores the reply » et les deux tests du changement de statut seul.

- [ ] **Step 3 : Implémenter**

`src/lib/schemas/prospecting-action.ts`, dans `prospectingActionSchema`, après `message` :

```ts
  reply: optionalTextField,
```

`src/lib/crm/prospecting-actions.ts`, dans `PROSPECTING_ACTION_FIELD_LABELS`, après `message` :

```ts
  reply: "Réponse",
```

`src/server/actions/prospecting-actions.ts` :

```ts
const TIMING_SELECT = { status: true, occurredAt: true, respondedAt: true, reply: true } as const
```

Dans `collectValues`, après `message` :

```ts
    reply: stringField(formData, "reply"),
```

Dans `changeProspectingActionStatus`, l'appel à `applyStatusRules` :

```ts
      const timing = applyStatusRules(
        current,
        {
          status: parsed.data,
          occurredAt: current.occurredAt,
          respondedAt: null,
          reply: current.reply,
        },
        new Date(),
      )
```

- [ ] **Step 4 : Vérifier le passage**

Run: `pnpm vitest run --project unit src/server/actions/prospecting-actions.test.ts src/lib/crm/prospecting-action-status.test.ts`
Expected: PASS.

Run: `just typecheck`
Expected: aucune erreur (le type `ProspectingActionInput` porte `reply`, les appels de `applyStatusRules` le fournissent).

---

### Task 3 : Formulaire et vue détail

**Files:**
- Modify: `src/components/features/admin/prospecting-actions/ProspectingActionFormDialog.tsx`
- Modify: `src/components/features/admin/prospecting-actions/action-detail.tsx`

**Interfaces:**
- Consumes: `AdminProspectingAction.reply` (lecture `include`, inchangée), `PROSPECTING_ACTION_FIELD_LABELS.reply`, champ `reply` des Server Actions (Task 2), `isRepliedStatus`
- Produces: rien

- [ ] **Step 1 : Champ Réponse du formulaire**

Dans `ProspectingActionFormDialog.tsx`, juste après le bloc `<div className="sm:col-span-2">` du `TextareaField` Message :

```tsx
      {replied ? (
        <div className="sm:col-span-2">
          <TextareaField
            id={`${formId}-reply`}
            name="reply"
            label={LABELS.reply}
            help="Le texte exact reçu."
            className="min-h-30"
            defaultValue={action?.reply ?? ""}
            errors={state.errors.reply}
          />
        </div>
      ) : null}
```

- [ ] **Step 2 : Bloc Réponse de la vue détail**

Dans `action-detail.tsx`, `buildActionDetail`, le tableau `sections` se termine par :

```ts
    textSection(LABELS.message, action.message, { preserveLines: true }),
    ...(action.reply ? [textSection(LABELS.reply, action.reply, { preserveLines: true })] : []),
  ]
```

- [ ] **Step 3 : Qualité**

Run: `just lint` puis `just typecheck` puis `just test-unit`
Expected: tout vert.

- [ ] **Step 4 : Parcours manuel**

Avec `just dev`, dans Actions prospection :
1. Ouvrir une action DM LinkedIn au statut Fait avec un message, « Modifier », statut Répondu : « Réponse reçue le » et le champ Réponse apparaissent, le message est intact.
2. Saisir un texte sur deux lignes dans Réponse, enregistrer, ouvrir la vue détail : bloc Réponse sous Message, retours à la ligne conservés.
3. Glisser l'action dans Converti au Pipeline : la vue détail garde la réponse.
4. Repasser l'action à Fait : le bloc Réponse et la date de réponse ont disparu, le message reste.
5. Ouvrir une connexion LinkedIn Répondu sans texte : « Acceptée le », aucun bloc Réponse ; dans son formulaire, passer le Type à DM LinkedIn : le libellé redevient « Réponse reçue le ».
