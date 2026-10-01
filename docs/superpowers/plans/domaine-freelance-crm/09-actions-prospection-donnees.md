# Données des actions de prospection : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer le modèle des actions de prospection, leurs règles de statut et leurs Server Actions, supprimer les actions d'un lead qui demande l'effacement de son historique et exposer la date de dernière réponse d'un lead.

**Architecture:** Une fonction pure (`applyStatusRules`) porte les règles de date au passage d'un statut à l'autre ; toutes les écritures (création, modification, changement de statut seul) la traversent. Le modèle `ProspectingAction` dépend de `Person` en cascade (`@@index([personId, occurredAt])`) ; `erasePersonExchanges` (`07`, étendue ici) supprime aussi les actions d'une personne, l'opposition simple (`optOutPerson`, `07`, inchangée) les gardant comme historique ; la lecture des leads calcule `lastReplyAt` par personne, depuis la dernière action répondue de son rôle Lead.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4 (`z.iso.datetime`), Next.js 16 Server Actions, Vitest 4 (horloge figée par `vi.useFakeTimers({ toFake: ["Date"] })`).

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/09-actions-prospection-donnees-design.md`

## Global Constraints

- **Prérequis** : plan `07` implémenté (modèles `Person` et `Lead`, `saveEntity` au générique `TInput extends object`, `optOutPerson` et `erasePersonExchanges` transactionnels, `adminLeadInclude` nesté sous `person`, `findPersonOptions`).
- **Enums, valeurs exactes** : `ActionChannel` `CANDIDATURE`, `CONNEXION_LINKEDIN`, `DM_LINKEDIN`, `EMAIL`, `SMS_WHATSAPP`, `CALL`, `AUTRE` ; `ActionStatus` `A_FAIRE`, `FAIT`, `REPONDU`, `CONVERTI`, `IGNORE`, défaut `A_FAIRE`.
- **Libellés** (maquette) : Candidature, Connexion LinkedIn, DM LinkedIn, Email, SMS/WhatsApp, Call, Autre ; À faire, Fait, Répondu, Converti, Ignoré.
- **Règles de statut** : quitter À faire sans changer la date ⇒ date = maintenant ; passer à Répondu ou Converti ⇒ date de réponse saisie, sinon celle déjà enregistrée, sinon maintenant ; revenir à À faire, Fait ou Ignoré ⇒ date de réponse effacée ; aucune action verrouillée.
- **Instants** : `occurredAt` et `respondedAt` reçus en ISO complet avec décalage (`z.iso.datetime({ offset: true })`).
- **Cascade** : supprimer une personne supprime toujours ses actions (`Person → Cascade`) ; `deleteLead` (`07`) supprime la personne dès qu'elle n'a aucun autre rôle. Opposition d'une personne : `optOutPerson` (`07`, inchangée) garde les actions par défaut (art. 21, historique jamais réutilisé) ; seul un appel supplémentaire à `erasePersonExchanges` (`07`, étendue ici) les supprime (`deleteMany` sur `personId`), dans la même transaction que la pose d'`exchangesErasedAt` (art. 17.1.c, demande d'effacement en plus du stop).
- **Revalidation** : `revalidatePath("/admin/actions-prospection", "layout")` et `revalidatePath("/admin/leads", "layout")` après toute écriture.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Heure lue en UTC** : une date sans décalage (`2026-03-12T14:30`) serait lue 14 h 30 UTC sur le serveur, 15 h 30 ou 16 h 30 à Paris. Couvert par « rejects a date without its time zone offset » (Task 3).
- **Rattrapage d'un envoi passé** : passer à Fait en corrigeant la date ne doit pas écraser la date saisie. Couvert par « keeps a date changed in the same edit that marks it done » (Task 1).
- **Réponse puis conversion** : passer de Répondu à Converti garde la date de réponse d'origine, qui fixe le dernier contact du lead. Couvert par « keeps the reply time when a replied action becomes converted » (Task 1).
- **Changement de statut depuis le pipeline** : le glisser (`11`) doit appliquer les mêmes règles que le formulaire. Couvert par « changes the status alone and applies the same rules » (Task 3).
- **Opposition simple contre effacement** : `optOutPerson` (`07`) garde les actions comme historique ; seul `erasePersonExchanges` (`07`, étendue ici) les supprime. Couvert par « does not touch the person's prospecting actions on a simple stop » et « erases the person's prospecting actions along with the exchange trace » (Task 4).

---

### Task 1 : Règles de statut

**Files:**
- Create: `src/lib/prospecting-action-status.ts`
- Test: `src/lib/prospecting-action-status.test.ts`

**Interfaces:**
- Consumes: type `ActionStatus` (`@/generated/prisma/client`, après la Task 2 ; les tests tapent les valeurs en chaînes)
- Produces: `interface ActionTiming { status: ActionStatus; occurredAt: Date; respondedAt: Date | null }` ; `applyStatusRules(current: ActionTiming | null, next: ActionTiming, now: Date): ActionTiming`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
import { describe, expect, it } from "vitest"

import { applyStatusRules, type ActionTiming } from "./prospecting-action-status"

const NOW = new Date("2026-03-11T13:30:00Z")
const MONDAY = new Date("2026-03-09T08:00:00Z")
const TUESDAY_EVENING = new Date("2026-03-10T17:00:00Z")

function timing(overrides: Partial<ActionTiming> = {}): ActionTiming {
  return { status: "A_FAIRE", occurredAt: MONDAY, respondedAt: null, ...overrides }
}

describe("applyStatusRules", () => {
  it("stamps the sending time when an action leaves to do", () => {
    const result = applyStatusRules(timing(), timing({ status: "FAIT" }), NOW)

    expect(result.occurredAt).toEqual(NOW)
  })

  it("keeps a date changed in the same edit that marks it done", () => {
    const result = applyStatusRules(
      timing(),
      timing({ status: "FAIT", occurredAt: TUESDAY_EVENING }),
      NOW,
    )

    expect(result.occurredAt).toEqual(TUESDAY_EVENING)
  })

  it.each(["REPONDU", "CONVERTI"] as const)(
    "stamps the reply time when an action becomes replied or converted (%s)",
    (status) => {
      const result = applyStatusRules(timing({ status: "FAIT" }), timing({ status }), NOW)

      expect(result.respondedAt).toEqual(NOW)
    },
  )

  it("keeps a submitted reply time", () => {
    const result = applyStatusRules(
      timing({ status: "FAIT" }),
      timing({ status: "REPONDU", respondedAt: TUESDAY_EVENING }),
      NOW,
    )

    expect(result.respondedAt).toEqual(TUESDAY_EVENING)
  })

  it("keeps the reply time when a replied action becomes converted", () => {
    const result = applyStatusRules(
      timing({ status: "REPONDU", respondedAt: TUESDAY_EVENING }),
      timing({ status: "CONVERTI" }),
      NOW,
    )

    expect(result.respondedAt).toEqual(TUESDAY_EVENING)
  })

  it.each(["A_FAIRE", "FAIT", "IGNORE"] as const)(
    "clears the reply time when an action goes back to to do, done or ignored (%s)",
    (status) => {
      const result = applyStatusRules(
        timing({ status: "REPONDU", respondedAt: TUESDAY_EVENING }),
        timing({ status, respondedAt: TUESDAY_EVENING }),
        NOW,
      )

      expect(result.respondedAt).toBeNull()
    },
  )
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/prospecting-action-status.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3 : Écrire les règles**

```ts
import type { ActionStatus } from "@/generated/prisma/client"

export interface ActionTiming {
  status: ActionStatus
  occurredAt: Date
  respondedAt: Date | null
}

const REPLIED: ReadonlySet<ActionStatus> = new Set(["REPONDU", "CONVERTI"])

// `current` vaut null à la création (l'action garde sa date) ; `next.respondedAt` nul signifie « non saisie ».
export function applyStatusRules(
  current: ActionTiming | null,
  next: ActionTiming,
  now: Date,
): ActionTiming {
  // La date devient celle de l'envoi réel, sauf si la même saisie la corrige (rattrapage).
  const leavesToDo =
    current !== null &&
    current.status === "A_FAIRE" &&
    next.status !== "A_FAIRE" &&
    next.occurredAt.getTime() === current.occurredAt.getTime()

  const respondedAt = REPLIED.has(next.status)
    ? (next.respondedAt ?? current?.respondedAt ?? now)
    : null

  return {
    status: next.status,
    occurredAt: leavesToDo ? now : next.occurredAt,
    respondedAt,
  }
}
```

(`current.respondedAt` n'est jamais renseigné hors Répondu et Converti, la règle l'effaçant ailleurs.)

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/prospecting-action-status.test.ts`
Expected: PASS une fois la Task 2 faite (l'import de type exige le client Prisma régénéré) ; si la Task 2 n'est pas encore faite, `vitest` passe quand même, le type s'effaçant à la compilation.

---

### Task 2 : Modèle, migration et libellés

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_prospecting_actions/migration.sql`
- Create: `src/lib/prospecting-actions.ts`

**Interfaces:**
- Consumes: modèle `Person` (`07`)
- Produces: modèle `ProspectingAction`, enums `ActionChannel`, `ActionStatus`, relation `Person.prospectingActions` ; `ACTION_CHANNEL_LABELS`, `ACTION_STATUS_LABELS`, `PROSPECTING_ACTION_FIELD_LABELS`

- [ ] **Step 1 : Enums et modèle**

Dans `prisma/schema.prisma`, après les enums des leads :

```prisma
enum ActionChannel {
  CANDIDATURE
  CONNEXION_LINKEDIN
  DM_LINKEDIN
  EMAIL
  SMS_WHATSAPP
  CALL
  AUTRE

  @@schema("freelance")
}

enum ActionStatus {
  A_FAIRE
  FAIT
  REPONDU
  CONVERTI
  IGNORE

  @@schema("freelance")
}
```

après le modèle `Lead` :

```prisma
model ProspectingAction {
  id          String        @id @default(uuid(7))
  title       String
  channel     ActionChannel
  status      ActionStatus  @default(A_FAIRE)
  // Planifiée tant que l'action est À faire, date d'envoi réelle ensuite.
  occurredAt  DateTime      @db.Timestamptz
  message     String?
  // Dernier contact émanant de la personne, point de départ des 3 ans de conservation (registre, Traitement 7).
  respondedAt DateTime?     @db.Timestamptz

  // Cascade : le message est une donnée personnelle. Vers la personne, pas le rôle :
  // un échange avec une relation réseau se journalise au même endroit.
  personId String
  person   Person @relation(fields: [personId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@index([personId, occurredAt])
  @@schema("freelance")
}
```

et dans le modèle `Person`, après `lead Lead?` :

```prisma
  prospectingActions ProspectingAction[]
```

- [ ] **Step 2 : Migration**

Run: `pnpm prisma migrate dev --name prospecting_actions`, puis `just db-test`
Expected: migration créée et appliquée en dev et en test : deux types d'enum, la table `"freelance"."ProspectingAction"`, l'index `ProspectingAction_personId_occurredAt_idx` et la clé étrangère `ProspectingAction_personId_fkey` en `ON DELETE CASCADE` vers `Person`. Aucune modification à la main.

- [ ] **Step 3 : Libellés**

`src/lib/prospecting-actions.ts` :

```ts
import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"

export const ACTION_CHANNEL_LABELS: Record<ActionChannel, string> = {
  CANDIDATURE: "Candidature",
  CONNEXION_LINKEDIN: "Connexion LinkedIn",
  DM_LINKEDIN: "DM LinkedIn",
  EMAIL: "Email",
  SMS_WHATSAPP: "SMS/WhatsApp",
  CALL: "Call",
  AUTRE: "Autre",
}

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  A_FAIRE: "À faire",
  FAIT: "Fait",
  REPONDU: "Répondu",
  CONVERTI: "Converti",
  IGNORE: "Ignoré",
}

// personId parle de « Personne » ici : le formulaire choisit une personne, pas un rôle.
export const PROSPECTING_ACTION_FIELD_LABELS = {
  title: "Action",
  personId: "Personne",
  channel: "Canal",
  status: "Statut",
  occurredAt: "Date et heure",
  message: "Message",
  respondedAt: "Réponse reçue le",
} as const
```

- [ ] **Step 4 : Vérifier**

Run: `just typecheck` puis `pnpm vitest run --project unit src/lib/prospecting-action-status.test.ts`
Expected: aucune erreur, tests de la Task 1 verts.

---

### Task 3 : Validation et Server Actions

**Files:**
- Create: `src/lib/schemas/prospecting-action.ts`
- Create: `src/server/actions/prospecting-actions.types.ts`
- Create: `src/server/actions/prospecting-actions.ts`
- Test: `src/server/actions/prospecting-actions.test.ts`

**Interfaces:**
- Consumes: `applyStatusRules` (Task 1) ; enums (Task 2) ; `saveEntity`, `deleteEntity` (`./shared`) ; `createActionLogger`, `isPrismaError`, `stringField` (`@/lib/server-utils`)
- Produces: `prospectingActionSchema`, `ProspectingActionInput`, `ACTION_CHANNELS`, `ACTION_STATUSES` ; `ProspectingActionFormState`, `initialProspectingActionFormState` ; `createProspectingAction(prev, formData)`, `updateProspectingAction(id, prev, formData)`, `changeProspectingActionStatus(id: string, status: string)`, `deleteProspectingAction(id: string)`, toutes `Promise<ProspectingActionFormState>`

- [ ] **Step 1 : Schéma**

`src/lib/schemas/prospecting-action.ts` :

```ts
import { z } from "zod"

import { ActionChannel, ActionStatus } from "@/generated/prisma/browser"

export const ACTION_CHANNELS = Object.values(ActionChannel)
export const ACTION_STATUSES = Object.values(ActionStatus)

// Instant avec décalage : sans lui, le serveur lirait la date en UTC, décalée d'une ou deux heures côté client.
const instant = z.iso.datetime({ offset: true, error: "Date et heure requises" })

export const prospectingActionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "L'action est requise")
    .max(120, "L'action ne peut pas dépasser 120 caractères"),
  personId: z.string().trim().min(1, "Choisissez une personne"),
  channel: z.enum(ActionChannel, { error: "Canal inconnu" }),
  status: z.enum(ActionStatus, { error: "Statut inconnu" }),
  occurredAt: instant.transform((value) => new Date(value)),
  respondedAt: z
    .union([instant, z.literal("")], { error: "Date de réponse invalide" })
    .transform((value) => (value === "" ? null : new Date(value))),
  message: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value)),
})

export type ProspectingActionInput = z.infer<typeof prospectingActionSchema>
```

- [ ] **Step 2 : Types de l'état**

`src/server/actions/prospecting-actions.types.ts` :

```ts
import type { FormActionState } from "@/lib/form-state"
import type { ProspectingActionInput } from "@/lib/schemas/prospecting-action"

export type ProspectingActionFormMessage = "person_not_found" | "unknown_error" | null

export type ProspectingActionFormState = FormActionState<
  ProspectingActionInput,
  ProspectingActionFormMessage
>

export const initialProspectingActionFormState: ProspectingActionFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

- [ ] **Step 3 : Écrire les tests qui échouent**

`src/server/actions/prospecting-actions.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    prospectingAction: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"

import {
  changeProspectingActionStatus,
  createProspectingAction,
  updateProspectingAction,
} from "./prospecting-actions"
import { initialProspectingActionFormState } from "./prospecting-actions.types"

const NOW = new Date("2026-03-11T13:30:00Z")
const MONDAY = new Date("2026-03-09T08:00:00Z")

const BASE_FIELDS = {
  title: "Relance proposition",
  personId: "p1",
  channel: "DM_LINKEDIN",
  status: "A_FAIRE",
  occurredAt: MONDAY.toISOString(),
  respondedAt: "",
  message: "",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  return data
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

beforeEach(() => {
  // Seule l'horloge est figée : les promesses et les timers du logger restent réels.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.mocked(prisma.prospectingAction.create).mockResolvedValue({ id: "a1" } as never)
  vi.mocked(prisma.prospectingAction.update).mockResolvedValue({ id: "a1" } as never)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("createProspectingAction", () => {
  it("rejects a missing title or person", async () => {
    const state = await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData({ title: "", personId: "" }),
    )

    expect(state.errors.title).toEqual(["L'action est requise"])
    expect(state.errors.personId).toEqual(["Choisissez une personne"])
    expect(prisma.prospectingAction.create).not.toHaveBeenCalled()
  })

  it("rejects a date without its time zone offset", async () => {
    const state = await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData({ occurredAt: "2026-03-12T14:30" }),
    )

    expect(state.errors.occurredAt).toBeDefined()
  })

  it("creates a replied action with its reply time", async () => {
    await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData({ status: "REPONDU" }),
    )

    expect(prisma.prospectingAction.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ status: "REPONDU", occurredAt: MONDAY, respondedAt: NOW }) }),
    )
  })

  it("maps a missing person to the person field", async () => {
    vi.mocked(prisma.prospectingAction.create).mockRejectedValue({ code: "P2003" })

    const state = await createProspectingAction(initialProspectingActionFormState, buildFormData())

    expect(state.message).toBe("person_not_found")
    expect(state.errors.personId).toBeDefined()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createProspectingAction(initialProspectingActionFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.prospectingAction.create).not.toHaveBeenCalled()
  })
})

describe("updateProspectingAction", () => {
  it("applies the status rules on update, from the stored status and date", async () => {
    vi.mocked(prisma.prospectingAction.findUnique).mockResolvedValue({
      status: "A_FAIRE",
      occurredAt: MONDAY,
      respondedAt: null,
    } as never)

    await updateProspectingAction(
      "a1",
      initialProspectingActionFormState,
      buildFormData({ status: "FAIT" }),
    )

    expect(prisma.prospectingAction.update).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ status: "FAIT", occurredAt: NOW, respondedAt: null }) }),
    )
  })
})

describe("changeProspectingActionStatus", () => {
  it("changes the status alone and applies the same rules", async () => {
    vi.mocked(prisma.prospectingAction.findUnique).mockResolvedValue({
      status: "FAIT",
      occurredAt: MONDAY,
      respondedAt: null,
    } as never)

    const state = await changeProspectingActionStatus("a1", "REPONDU")

    expect(state.ok).toBe(true)
    expect(prisma.prospectingAction.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "REPONDU", occurredAt: MONDAY, respondedAt: NOW },
    })
  })
})
```

- [ ] **Step 4 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/prospecting-actions.test.ts`
Expected: FAIL, module `./prospecting-actions` introuvable.

- [ ] **Step 5 : Écrire les actions**

`src/server/actions/prospecting-actions.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionStatus } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { applyStatusRules } from "@/lib/prospecting-action-status"
import {
  prospectingActionSchema,
  type ProspectingActionInput,
} from "@/lib/schemas/prospecting-action"
import { createActionLogger, isPrismaError, stringField } from "@/lib/server-utils"

import { deleteEntity, saveEntity } from "./shared"
import type { ProspectingActionFormState } from "./prospecting-actions.types"

const TIMING_SELECT = { status: true, occurredAt: true, respondedAt: true } as const

// Variante "layout" : les vues actions et leads, qui affichent le suivi, se rafraîchissent toutes.
function invalidateActionCaches(): void {
  revalidatePath("/admin/actions-prospection", "layout")
  revalidatePath("/admin/leads", "layout")
}

function collectValues(formData: FormData): ProspectingActionFormState["values"] {
  return {
    title: stringField(formData, "title"),
    personId: stringField(formData, "personId"),
    channel: stringField(formData, "channel"),
    status: stringField(formData, "status"),
    occurredAt: stringField(formData, "occurredAt"),
    respondedAt: stringField(formData, "respondedAt"),
    message: stringField(formData, "message"),
  }
}

function mapActionError(
  err: unknown,
  values: ProspectingActionFormState["values"],
): ProspectingActionFormState | null {
  if (!isPrismaError(err, "P2003")) return null
  return {
    ok: false,
    errors: { personId: ["Cette personne n'existe plus, recharge la page"] },
    message: "person_not_found",
    values,
  }
}

interface SaveActionEvents {
  success: string
  failure: string
}

function saveProspectingAction(
  actionName: string,
  events: SaveActionEvents,
  formData: FormData,
  persist: (data: ProspectingActionInput) => Promise<unknown>,
): Promise<ProspectingActionFormState> {
  const values = collectValues(formData)

  return saveEntity<ProspectingActionInput, ProspectingActionFormState, unknown>({
    actionName,
    events,
    schema: prospectingActionSchema,
    input: values,
    persist,
    invalidateCaches: invalidateActionCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapActionError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

export async function createProspectingAction(
  _prevState: ProspectingActionFormState,
  formData: FormData,
): Promise<ProspectingActionFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveProspectingAction(
    "createProspectingAction",
    { success: "prospecting_action:created", failure: "prospecting_action:create_failed" },
    formData,
    (data) =>
      prisma.prospectingAction.create({
        data: { ...data, ...applyStatusRules(null, data, new Date()) },
      }),
  )
}

export async function updateProspectingAction(
  id: string,
  _prevState: ProspectingActionFormState,
  formData: FormData,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return saveProspectingAction(
    "updateProspectingAction",
    { success: "prospecting_action:updated", failure: "prospecting_action:update_failed" },
    formData,
    async (data) => {
      const current = await prisma.prospectingAction.findUnique({
        where: { id },
        select: TIMING_SELECT,
      })
      return prisma.prospectingAction.update({
        where: { id },
        data: { ...data, ...applyStatusRules(current, data, new Date()) },
      })
    },
  )
}

// Statut seul : le glisser du pipeline et le « Marquer fait » de la liste passent par ici, sous les mêmes règles de date.
export async function changeProspectingActionStatus(
  id: string,
  status: string,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return createActionLogger("changeProspectingActionStatus", async ({ log }) => {
    const parsed = z.enum(ActionStatus).safeParse(status)
    if (!parsed.success) {
      return { ok: false, errors: { status: ["Statut inconnu"] }, message: null }
    }

    try {
      const current = await prisma.prospectingAction.findUnique({
        where: { id },
        select: TIMING_SELECT,
      })
      if (!current) throw new Error(`Action ${id} introuvable`)

      const timing = applyStatusRules(
        current,
        { status: parsed.data, occurredAt: current.occurredAt, respondedAt: null },
        new Date(),
      )
      await prisma.prospectingAction.update({ where: { id }, data: timing })
      invalidateActionCaches()
      log.info({ event: "prospecting_action:status_changed", id, status: parsed.data })
      return { ok: true, errors: {}, message: null }
    } catch (err) {
      log.error({ err, event: "prospecting_action:status_change_failed", id })
      return { ok: false, errors: {}, message: "unknown_error" }
    }
  })
}

export async function deleteProspectingAction(id: string): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return deleteEntity<ProspectingActionFormState>({
    actionName: "deleteProspectingAction",
    events: { success: "prospecting_action:deleted", failure: "prospecting_action:delete_failed" },
    successLogFields: { id },
    destroy: () => prisma.prospectingAction.delete({ where: { id } }),
    invalidateCaches: invalidateActionCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
```

- [ ] **Step 6 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/prospecting-actions.test.ts`
Expected: PASS.

---

### Task 4 : Opposition, lectures et qualité

**Files:**
- Modify: `src/server/actions/persons.ts` (`erasePersonExchanges`)
- Modify: `src/server/actions/persons.test.ts`
- Modify: `src/server/queries/leads.ts`
- Create: `src/server/queries/prospecting-actions.ts`

**Interfaces:**
- Consumes: modèle `ProspectingAction` (Task 2) ; `erasePersonExchanges`, `PersonActionState` (`07`, `./persons`)
- Produces: `AdminLead` avec `lastReplyAt: Date | null` ; `AdminProspectingAction` (action avec `person: { id, name, email, linkedinUrl, optedOutAt, company: { id, name, logoFilename } | null }`), `findAllProspectingActionsForAdmin(): Promise<AdminProspectingAction[]>` ; `erasePersonExchanges(id: string)` (`07`) étendue d'un `deleteMany` des actions de la personne

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `src/server/actions/persons.test.ts`, ajouter au mock de `@/lib/prisma`, à côté de `person` :

```ts
    prospectingAction: { deleteMany: vi.fn() },
```

puis, dans `describe("optOutPerson")` :

```ts
  it("does not touch the person's prospecting actions on a simple stop", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: "claire@acme.com",
      linkedinUrl: null,
      optedOutAt: null,
    } as never)

    await optOutPerson("p1")

    expect(prisma.prospectingAction.deleteMany).not.toHaveBeenCalled()
  })
```

et, dans `describe("erasePersonExchanges")` :

```ts
  it("erases the person's prospecting actions along with the exchange trace", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
      exchangesErasedAt: null,
    } as never)

    await erasePersonExchanges("p1")

    expect(prisma.prospectingAction.deleteMany).toHaveBeenCalledWith({ where: { personId: "p1" } })
  })
```

Run: `pnpm vitest run --project unit src/server/actions/persons.test.ts`
Expected: FAIL sur ces deux cas.

- [ ] **Step 2 : Supprimer les actions à l'effacement des échanges**

Dans `src/server/actions/persons.ts`, ajouter à côté de `const LEADS_PATH = "/admin/leads"` :

```ts
// Les actions disparaissent avec l'effacement : les vues des actions doivent aussi se rafraîchir.
const ACTIONS_PATH = "/admin/actions-prospection"
```

puis, dans `erasePersonExchanges`, remplacer :

```ts
        // Rien à supprimer à ce stade : les actions, les entretiens et les signaux d'une personne
        // rejoindront cette même transaction quand leurs modèles existeront.
        await tx.person.update({ where: { id }, data: { exchangesErasedAt: new Date() } })
        return "erased"
      })
      revalidatePath(LEADS_PATH, "layout")
```

par :

```ts
        // Les entretiens et les signaux d'une personne rejoindront cette même transaction, une fois leurs modèles créés.
        await tx.prospectingAction.deleteMany({ where: { personId: id } })
        await tx.person.update({ where: { id }, data: { exchangesErasedAt: new Date() } })
        return "erased"
      })
      revalidatePath(LEADS_PATH, "layout")
      revalidatePath(ACTIONS_PATH, "layout")
```

`optOutPerson` ne change pas : l'opposition simple garde les actions comme historique.

Run: `pnpm vitest run --project unit src/server/actions/persons.test.ts`
Expected: PASS.

- [ ] **Step 3 : Dernière réponse d'une personne**

Dans `src/server/queries/leads.ts`, remplacer le bloc `adminLeadInclude` … `findLeadByIdForAdmin` par :

```ts
const adminLeadInclude = {
  person: {
    include: {
      company: { select: { id: true, name: true, logoFilename: true } },
      prospectingActions: {
        where: { respondedAt: { not: null } },
        orderBy: { respondedAt: "desc" },
        take: 1,
        select: { respondedAt: true },
      },
    },
  },
} as const

type LeadWithPerson = Prisma.LeadGetPayload<{ include: typeof adminLeadInclude }>

export interface AdminLead {
  id: string
  name: string | null
  jobRole: JobRole | null
  zone: Zone | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  metAt: Date | null
  notes: string | null
  details: string | null
  optedOutAt: Date | null
  exchangesErasedAt: Date | null
  // Traitement 7 (registre) : point de départ des 3 ans de conservation, avec la date de création du rôle.
  lastReplyAt: Date | null
  company: { id: string; name: string; logoFilename: string | null } | null
  origin: LeadOrigin
  status: LeadStatus
  interest: LeadInterest | null
  channel: LeadChannel | null
  score: number | null
  hasContactRole: boolean
}

// La personne aplatie sur son rôle Lead : liste et formulaire lisent une forme unique, jamais une relation imbriquée.
function toAdminLead(row: LeadWithPerson): AdminLead {
  return {
    id: row.personId,
    name: row.person.name,
    jobRole: row.person.jobRole,
    zone: row.person.zone,
    email: row.person.email,
    phone: row.person.phone,
    linkedinUrl: row.person.linkedinUrl,
    metAt: row.person.metAt,
    notes: row.person.notes,
    details: row.person.details,
    optedOutAt: row.person.optedOutAt,
    exchangesErasedAt: row.person.exchangesErasedAt,
    lastReplyAt: row.person.prospectingActions[0]?.respondedAt ?? null,
    company: row.person.company,
    origin: row.origin,
    status: row.status,
    interest: row.interest,
    channel: row.channel,
    score: row.score,
    hasContactRole: false,
  }
}

// Sans 'use cache', comme les autres lectures admin : l'administration relit la base juste après ses propres mutations.
export async function findAllLeadsForAdmin(): Promise<AdminLead[]> {
  const rows = await prisma.lead.findMany({
    include: adminLeadInclude,
    orderBy: { person: { name: { sort: "asc", nulls: "last" } } },
  })
  return rows.map(toAdminLead)
}

export async function findLeadByIdForAdmin(personId: string): Promise<AdminLead | null> {
  const row = await prisma.lead.findUnique({ where: { personId }, include: adminLeadInclude })
  return row ? toAdminLead(row) : null
}
```

- [ ] **Step 4 : Lecture des actions**

`src/server/queries/prospecting-actions.ts` :

```ts
import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminProspectingActionInclude = {
  person: {
    select: {
      id: true,
      name: true,
      email: true,
      linkedinUrl: true,
      optedOutAt: true,
      company: { select: { id: true, name: true, logoFilename: true } },
    },
  },
} as const

export type AdminProspectingAction = Prisma.ProspectingActionGetPayload<{
  include: typeof adminProspectingActionInclude
}>

// Sans 'use cache', comme les autres lectures admin.
export async function findAllProspectingActionsForAdmin(): Promise<AdminProspectingAction[]> {
  return prisma.prospectingAction.findMany({
    include: adminProspectingActionInclude,
    orderBy: { occurredAt: "desc" },
  })
}
```

- [ ] **Step 5 : Qualité**

Run: `just typecheck`
Expected: aucune erreur (`toAdminLead` ne renvoie jamais `prospectingActions`, seulement le dérivé `lastReplyAt`).

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

- [ ] **Step 6 : Contrôle en base**

Run: `just db-studio`
Expected: table `ProspectingAction` dans le schema `freelance`, `status` à `A_FAIRE` par défaut ; supprimer un lead de test sans autre rôle (`deleteLead`, `07`, supprime sa personne) supprime ses actions avec elle. Fermer Studio.
