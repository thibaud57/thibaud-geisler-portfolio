# Écran des actions de prospection : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'écran Actions prospection (cinq vues, rang des relances, « Marquer fait », formulaire, détail, suppression), côté leads l'historique, le nombre d'actions et l'échéance de conservation, et côté entreprises le premier contact.

**Architecture:** Trois modules purs testés portent les règles : `action-views` (appartenance et tri), `action-rank` (Premier contact / Relance N, par personne) et `person-retention` (date « À conserver jusqu'au »). `ProspectingActionsTable` reprend le motif de `LeadsTable` (`08`) ; `LeadsTable` reçoit les actions lues une fois par sa page pour son historique. Un quatrième module pur (`company-first-contact`) rejoint `toAdminCompany` (`04`) pour le dérivé `firstContactAt`. Les écritures passent par les Server Actions du `09`.

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui `radix-nova` (Dialog, AlertDialog, Select, Popover, Calendar, Command, Checkbox, Textarea), date-fns `fr`, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/10-ecran-actions-prospection-design.md`

## Global Constraints

- **Prérequis** : plans `07` (`Person`, `Lead`, `findPersonOptions`, `personDisplayName`, `PERSON_FIELD_LABELS`), `08` (écran des leads : `LeadsTable`, `LeadsViewPage`, `DeleteLeadDialog`, `OptOutPersonDialog`, `LEAD_COLUMN_WIDTHS`, `LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS`, `LEAD_SECTION_TITLES`), `09` (`ProspectingAction`, `ACTION_CHANNELS`, `ACTION_STATUSES`, libellés, `createProspectingAction`, `updateProspectingAction`, `changeProspectingActionStatus`, `deleteProspectingAction`, `AdminProspectingAction`, `findAllProspectingActionsForAdmin`, `AdminLead.lastReplyAt`, `erasePersonExchanges` étendue) et `04` (`toAdminCompany`, `AdminCompanyRaw`, `COMPANY_COLUMN_WIDTHS`, `CompaniesTable`, dérivé `worked`) implémentés.
- **Routes** : À faire `/admin/actions-prospection`, Connexions `/connexions`, Discussions `/discussions`, Candidatures `/candidatures`, Journal `/journal` (sous `/admin/actions-prospection`).
- **Vues** : À faire = statut À faire ; Connexions = Connexion LinkedIn et Fait ; Discussions = DM LinkedIn, Email ou SMS/WhatsApp et Fait ; Candidatures = Candidature et Fait ; Journal = toutes, À faire d'abord puis plus récentes. Tri par défaut des quatre premières : date croissante.
- **Rang** : « Premier contact » si aucune action envoyée (statut autre que À faire) de la même personne ne précède, sinon « Relance N ».
- **Échéance** : personne active = 3 ans après le plus tardif entre la date de création de son rôle Lead et `lastReplyAt` ; personne opposée = 3 ans après `optedOutAt`.
- **Premier contact d'une entreprise** : la plus ancienne `occurredAt` des actions hors À faire de ses personnes.
- **Textes** : suppression d'une action « Elle disparaît du journal et de l'historique du lead. Une action sans réponse se garde plutôt avec le statut « Ignoré ». » ; ajout aux suppressions de lead « Ses actions de prospection sont supprimées avec lui. »
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/react/hooks.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Deux actions à la même heure** : le rang doit rester stable d'un affichage à l'autre, départagé par la date de création. Couvert par « keeps a stable rank for two actions at the same time » (Task 2).
- **Réponse antérieure à la création** (fiche reprise de Notion) : l'échéance part de la plus tardive des deux dates, jamais de la plus ancienne. Couvert par « keeps an active person three years after its creation when its reply predates it » (Task 3).
- **Heure saisie un jour de changement d'heure** : l'instant se construit avec les accesseurs locaux, jamais en concaténant une chaîne sans décalage. Vérifié à la Task 9, Step 3.
- **Action d'une personne opposée ouverte en modification** : elle n'est plus proposée, mais son nom reste affiché dans le champ. Vérifié à la Task 9, Step 5.
- **Entreprise avec seulement une action À faire** : `firstContactAt` reste vide, une action encore planifiée n'étant pas un contact établi. Couvert par « ignores to-do actions » (Task 8).

---

### Task 1 : Vues des actions

**Files:**
- Create: `src/lib/action-views.ts`
- Test: `src/lib/action-views.test.ts`

**Interfaces:**
- Consumes: types `ActionChannel`, `ActionStatus`
- Produces: `type ActionView = "a-faire" | "connexions" | "discussions" | "candidatures" | "journal"` ; `ACTION_VIEWS` ; `actionsForView<T extends ActionViewRow>(actions: readonly T[], view: ActionView): T[]` ; `ACTION_VIEW_PAGES: Record<ActionView, { title: string; subtitle: string }>`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
import { describe, expect, it } from "vitest"

import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"

import { actionsForView } from "./action-views"

interface TestAction {
  id: string
  status: ActionStatus
  channel: ActionChannel
  occurredAt: Date
  createdAt: Date
}

function action(overrides: Partial<TestAction> = {}): TestAction {
  return {
    id: "a1",
    status: "A_FAIRE",
    channel: "DM_LINKEDIN",
    occurredAt: new Date(2026, 2, 10, 9, 0),
    createdAt: new Date(2026, 2, 1),
    ...overrides,
  }
}

function idsOf(actions: readonly TestAction[]): string[] {
  return actions.map((row) => row.id)
}

describe("actionsForView", () => {
  it("keeps only to-do actions in the to-do view, soonest first", () => {
    const actions = [
      action({ id: "later", occurredAt: new Date(2026, 2, 12, 9, 0) }),
      action({ id: "done", status: "FAIT" }),
      action({ id: "sooner", occurredAt: new Date(2026, 2, 11, 9, 0) }),
    ]

    const rows = actionsForView(actions, "a-faire")

    expect(idsOf(rows)).toEqual(["sooner", "later"])
  })

  it("keeps only sent LinkedIn connections in the connections view", () => {
    const actions = [
      action({ id: "sent", channel: "CONNEXION_LINKEDIN", status: "FAIT" }),
      action({ id: "planned", channel: "CONNEXION_LINKEDIN", status: "A_FAIRE" }),
      action({ id: "replied", channel: "CONNEXION_LINKEDIN", status: "REPONDU" }),
      action({ id: "dm", channel: "DM_LINKEDIN", status: "FAIT" }),
    ]

    const rows = actionsForView(actions, "connexions")

    expect(idsOf(rows)).toEqual(["sent"])
  })

  it("keeps sent LinkedIn messages, emails and texts in the discussions view", () => {
    const actions = (["DM_LINKEDIN", "EMAIL", "SMS_WHATSAPP", "CALL", "CANDIDATURE"] as const).map(
      (channel) => action({ id: channel, channel, status: "FAIT" }),
    )

    const rows = actionsForView(actions, "discussions")

    expect(idsOf(rows).sort()).toEqual(["DM_LINKEDIN", "EMAIL", "SMS_WHATSAPP"])
  })

  it("puts to-do actions first in the journal, then the most recent", () => {
    const actions = [
      action({ id: "old-done", status: "FAIT", occurredAt: new Date(2026, 1, 1) }),
      action({ id: "todo", status: "A_FAIRE", occurredAt: new Date(2026, 3, 1) }),
      action({ id: "recent-done", status: "REPONDU", occurredAt: new Date(2026, 2, 1) }),
    ]

    const rows = actionsForView(actions, "journal")

    expect(idsOf(rows)).toEqual(["todo", "recent-done", "old-done"])
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/action-views.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3 : Écrire les vues**

```ts
import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"

export type ActionView = "a-faire" | "connexions" | "discussions" | "candidatures" | "journal"

export const ACTION_VIEWS: readonly ActionView[] = [
  "a-faire",
  "connexions",
  "discussions",
  "candidatures",
  "journal",
]

export interface ActionViewRow {
  status: ActionStatus
  channel: ActionChannel
  occurredAt: Date
  createdAt: Date
}

const MESSAGE_CHANNELS: ReadonlySet<ActionChannel> = new Set(["DM_LINKEDIN", "EMAIL", "SMS_WHATSAPP"])

const VIEW_FILTERS: Record<ActionView, (action: ActionViewRow) => boolean> = {
  "a-faire": (action) => action.status === "A_FAIRE",
  connexions: (action) => action.channel === "CONNEXION_LINKEDIN" && action.status === "FAIT",
  discussions: (action) => MESSAGE_CHANNELS.has(action.channel) && action.status === "FAIT",
  candidatures: (action) => action.channel === "CANDIDATURE" && action.status === "FAIT",
  journal: () => true,
}

function byDateAsc(a: ActionViewRow, b: ActionViewRow): number {
  return a.occurredAt.getTime() - b.occurredAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime()
}

function toDoFirstThenRecent(a: ActionViewRow, b: ActionViewRow): number {
  const rank = (action: ActionViewRow) => (action.status === "A_FAIRE" ? 0 : 1)
  return rank(a) - rank(b) || b.occurredAt.getTime() - a.occurredAt.getTime()
}

const VIEW_SORTS: Record<ActionView, (a: ActionViewRow, b: ActionViewRow) => number> = {
  "a-faire": byDateAsc,
  connexions: byDateAsc,
  discussions: byDateAsc,
  candidatures: byDateAsc,
  journal: toDoFirstThenRecent,
}

// L'ordre rendu ici est l'ordre d'affichage par défaut : DataTable garde celui des lignes reçues tant qu'aucune colonne n'est triée.
export function actionsForView<T extends ActionViewRow>(actions: readonly T[], view: ActionView): T[] {
  return actions.filter(VIEW_FILTERS[view]).sort(VIEW_SORTS[view])
}

export const ACTION_VIEW_PAGES: Record<ActionView, { title: string; subtitle: string }> = {
  "a-faire": {
    title: "Actions à faire",
    subtitle: "Prochaines actions à exécuter, les plus urgentes en premier.",
  },
  connexions: {
    title: "Connexions",
    subtitle: "Connexions LinkedIn envoyées. Au-delà de J+14 sans suite, passer le lead en stand-by.",
  },
  discussions: {
    title: "Discussions",
    subtitle: "DM, emails et SMS envoyés en attente de réponse, à relancer selon la séquence.",
  },
  candidatures: {
    title: "Candidatures",
    subtitle: "Candidatures envoyées en attente de retour RH. Ignoré si aucun contact relançable.",
  },
  journal: {
    title: "Journal des actions",
    subtitle: "Journal complet : À faire en premier, puis du plus récent au plus ancien.",
  },
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/action-views.test.ts`
Expected: PASS.

---

### Task 2 : Rang des relances

**Files:**
- Create: `src/lib/action-rank.ts`
- Test: `src/lib/action-rank.test.ts`

**Interfaces:**
- Consumes: type `ActionStatus`
- Produces: `rankActions(actions: readonly RankedActionRow[]): Map<string, number>` (nombre d'actions envoyées antérieures, par identifiant d'action) ; `rankLabel(count: number): string`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
import { describe, expect, it } from "vitest"

import type { ActionStatus } from "@/generated/prisma/client"

import { rankActions, rankLabel } from "./action-rank"

interface TestAction {
  id: string
  personId: string
  status: ActionStatus
  occurredAt: Date
  createdAt: Date
}

function action(overrides: Partial<TestAction> & Pick<TestAction, "id" | "occurredAt">): TestAction {
  return { personId: "p1", status: "FAIT", createdAt: new Date(2026, 0, 1), ...overrides }
}

describe("rankActions", () => {
  it("ranks a person's first sent action as the first contact", () => {
    const ranks = rankActions([action({ id: "connection", occurredAt: new Date(2026, 2, 1) })])

    expect(rankLabel(ranks.get("connection") ?? -1)).toBe("Premier contact")
  })

  it("counts only earlier sent actions of the same person", () => {
    const actions = [
      action({ id: "planned-before", status: "A_FAIRE", occurredAt: new Date(2026, 1, 20) }),
      action({ id: "first", occurredAt: new Date(2026, 2, 1) }),
      action({ id: "other-person", personId: "p2", occurredAt: new Date(2026, 2, 2) }),
      action({ id: "ignored", status: "IGNORE", occurredAt: new Date(2026, 2, 3) }),
      action({ id: "third", status: "REPONDU", occurredAt: new Date(2026, 2, 5) }),
    ]

    const ranks = rankActions(actions)

    expect(ranks.get("first")).toBe(0)
    expect(ranks.get("other-person")).toBe(0)
    expect(ranks.get("ignored")).toBe(1)
    expect(rankLabel(ranks.get("third") ?? -1)).toBe("Relance 2")
  })

  it("ranks a planned action after the actions already sent before its date", () => {
    const actions = [
      action({ id: "sent", occurredAt: new Date(2026, 2, 1) }),
      action({ id: "planned", status: "A_FAIRE", occurredAt: new Date(2026, 2, 8) }),
    ]

    const ranks = rankActions(actions)

    expect(rankLabel(ranks.get("planned") ?? -1)).toBe("Relance 1")
  })

  it("keeps a stable rank for two actions at the same time", () => {
    const sameTime = new Date(2026, 2, 1, 9, 0)
    const actions = [
      action({ id: "created-second", occurredAt: sameTime, createdAt: new Date(2026, 1, 2) }),
      action({ id: "created-first", occurredAt: sameTime, createdAt: new Date(2026, 1, 1) }),
    ]

    const ranks = rankActions(actions)

    expect(ranks.get("created-first")).toBe(0)
    expect(ranks.get("created-second")).toBe(1)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/action-rank.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3 : Écrire le rang**

```ts
import type { ActionStatus } from "@/generated/prisma/client"

export interface RankedActionRow {
  id: string
  personId: string
  status: ActionStatus
  occurredAt: Date
  createdAt: Date
}

// Pas de champ stocké : une relance se reconnaît à la chronologie des actions déjà envoyées à la même personne, ce qui reste juste quand une action est ajoutée, supprimée ou redatée.
export function rankActions(actions: readonly RankedActionRow[]): Map<string, number> {
  const byPerson = new Map<string, RankedActionRow[]>()
  for (const action of actions) {
    const list = byPerson.get(action.personId) ?? []
    list.push(action)
    byPerson.set(action.personId, list)
  }

  const ranks = new Map<string, number>()
  for (const list of byPerson.values()) {
    list.sort(
      (a, b) =>
        a.occurredAt.getTime() - b.occurredAt.getTime() ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    )
    let sentBefore = 0
    for (const action of list) {
      ranks.set(action.id, sentBefore)
      if (action.status !== "A_FAIRE") sentBefore += 1
    }
  }
  return ranks
}

export function rankLabel(count: number): string {
  return count === 0 ? "Premier contact" : `Relance ${count}`
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/action-rank.test.ts`
Expected: PASS.

---

### Task 3 : Échéance de conservation

**Files:**
- Create: `src/lib/person-retention.ts`
- Test: `src/lib/person-retention.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: `RETENTION_YEARS` ; `retentionEndOf(person: { createdAt: Date; lastReplyAt: Date | null; optedOutAt: Date | null }, years?: number): Date` ; `isRetentionOver(person, now: Date): boolean`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
import { describe, expect, it } from "vitest"

import { isRetentionOver, retentionEndOf } from "./person-retention"

describe("retentionEndOf", () => {
  it("keeps an active person three years after its creation when it never replied", () => {
    const end = retentionEndOf({
      createdAt: new Date(2025, 4, 10),
      lastReplyAt: null,
      optedOutAt: null,
    })

    expect(end).toEqual(new Date(2028, 4, 10))
  })

  it("keeps an active person three years after its creation when its reply predates it", () => {
    const end = retentionEndOf({
      createdAt: new Date(2025, 4, 10),
      lastReplyAt: new Date(2024, 0, 5),
      optedOutAt: null,
    })

    expect(end).toEqual(new Date(2028, 4, 10))
  })

  it("keeps an active person three years after its last reply", () => {
    const end = retentionEndOf({
      createdAt: new Date(2025, 4, 10),
      lastReplyAt: new Date(2026, 1, 3),
      optedOutAt: null,
    })

    expect(end).toEqual(new Date(2029, 1, 3))
  })

  it("keeps an opted-out person three years after the stop", () => {
    const person = {
      createdAt: new Date(2020, 0, 1),
      lastReplyAt: new Date(2026, 5, 1),
      optedOutAt: new Date(2023, 8, 15),
    }

    const end = retentionEndOf(person)

    expect(end).toEqual(new Date(2026, 8, 15))
    expect(isRetentionOver(person, new Date(2026, 8, 27))).toBe(true)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/person-retention.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3 : Écrire l'échéance**

```ts
// Délibération CNIL n° 2021-131 (prospects) et page CNIL « liste repoussoir » (oppositions), reprises au registre, Traitement 7.
export const RETENTION_YEARS = 3

interface RetentionPerson {
  createdAt: Date
  lastReplyAt: Date | null
  optedOutAt: Date | null
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

// `years` ne s'applique qu'à une personne active : une fois opposée, le délai légal de 3 ans s'impose quel que soit l'appelant, un lead comme un contact au rappel métier différent.
export function retentionEndOf(person: RetentionPerson, years = RETENTION_YEARS): Date {
  if (person.optedOutAt) return addYears(person.optedOutAt, RETENTION_YEARS)
  // Une réponse antérieure à la création vient d'une reprise : seule la plus tardive compte.
  const start =
    person.lastReplyAt && person.lastReplyAt > person.createdAt ? person.lastReplyAt : person.createdAt
  return addYears(start, years)
}

export function isRetentionOver(person: RetentionPerson, now: Date): boolean {
  return retentionEndOf(person) < now
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/person-retention.test.ts`
Expected: PASS.

---

### Task 4 : Largeurs, lectures et date-heure

**Files:**
- Modify: `src/lib/admin-table-widths.ts`
- Modify: `src/server/queries/leads.ts`
- Create: `src/lib/date-time.ts`

**Interfaces:**
- Consumes: `ActionView` (Task 1), `LeadView` et blocs des leads (`08`) ; `findPersonOptions`, `PersonOption` (`07`, `@/server/queries/persons`)
- Produces: `ACTION_COLUMN_WIDTHS`, `ActionColumnKey`, `ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS`, `actionSkeletonWidths(view)` ; `LEAD_COLUMN_WIDTHS.actionsCount`, `LEAD_COLUMN_WIDTHS.retentionEnd` ; `AdminLead.createdAt`, `AdminLead.actionsCount` ; `timeOf(date: Date): string`, `toInstant(date: Date | undefined, time: string): string`, `formatShortDateTime(date: Date): string`

- [ ] **Step 1 : Largeurs des actions**

À la fin de `src/lib/admin-table-widths.ts` (l'import de type va en tête) :

```ts
import type { ActionView } from "@/lib/action-views"
```

```ts
export const ACTION_COLUMN_WIDTHS = {
  title: 240,
  rank: 130,
  channel: 160,
  status: 120,
  occurredAt: 150,
  person: 210,
  actions: 120,
} as const

export type ActionColumnKey = keyof typeof ACTION_COLUMN_WIDTHS

// Colonnes de la maquette par vue (ACT_VIEW_COLS), plus Rang.
export const ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<ActionView, readonly ActionColumnKey[]> = {
  "a-faire": ["rank", "channel", "occurredAt", "person"],
  connexions: ["rank", "occurredAt", "person"],
  discussions: ["rank", "channel", "occurredAt", "person"],
  candidatures: ["rank", "occurredAt", "person"],
  journal: ["rank", "channel", "status", "occurredAt", "person"],
}

export function actionSkeletonWidths(view: ActionView): readonly number[] {
  const keys: readonly ActionColumnKey[] = [
    "title",
    ...ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
    "actions",
  ]
  return keys.map((key) => ACTION_COLUMN_WIDTHS[key])
}
```

- [ ] **Step 2 : Colonnes ajoutées aux leads**

Dans `LEAD_COLUMN_WIDTHS`, ajouter avant `notes` :

```ts
  actionsCount: 110,
  retentionEnd: 180,
```

Dans `LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS`, insérer `"actionsCount"` juste avant `"notes"` dans les cinq listes (colonne Relances de la maquette, présente dans ses quatre vues), et dans la liste `tous` seulement, `"retentionEnd"` juste après `"actionsCount"`.

- [ ] **Step 3 : Lectures des leads**

Dans `src/server/queries/leads.ts`, dans le bloc `adminLeadInclude` posé par le `09`, ajouter `_count` au niveau de `person.include`, à côté de `company` et `prospectingActions` :

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
      _count: { select: { prospectingActions: true } },
    },
  },
} as const
```

puis, dans `AdminLead`, ajouter `createdAt` (la date de création du rôle Lead, point de départ de l'échéance) et `actionsCount` après `score` :

```ts
  score: number | null
  createdAt: Date
  actionsCount: number
  hasContactRole: boolean
```

et, dans `toAdminLead`, les deux mêmes champs avant `hasContactRole: false` :

```ts
    score: row.score,
    createdAt: row.createdAt,
    actionsCount: row.person._count.prospectingActions,
    hasContactRole: false,
```

Le formulaire des actions (Task 5) choisit sa personne via `findPersonOptions()` (`07`), qui exclut déjà les personnes opposées : aucune lecture propre aux actions n'est nécessaire ici.

- [ ] **Step 4 : Date et heure**

`src/lib/date-time.ts` :

```ts
import { formatShortDate } from "@/lib/projects"

export function timeOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

// Accesseurs locaux : l'instant porte le décalage du navigateur, heure d'été comprise. Une chaîne « AAAA-MM-JJTHH:MM » sans décalage serait lue en UTC par le serveur.
export function toInstant(date: Date | undefined, time: string): string {
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return ""
  const hours = Number(time.slice(0, 2))
  const minutes = Number(time.slice(3, 5))
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).toISOString()
}

export function formatShortDateTime(date: Date): string {
  return `${formatShortDate(date) ?? ""} ${timeOf(date)}`
}
```

- [ ] **Step 5 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 5 : Formulaire, « Marquer fait » et suppression d'une action

**Files:**
- Create: `src/components/features/admin/prospection/ProspectingActionFormDialog.tsx`
- Create: `src/components/features/admin/prospection/MarkActionDoneButton.tsx`
- Create: `src/components/features/admin/prospection/DeleteProspectingActionDialog.tsx`

**Interfaces:**
- Consumes: Task 4 ; actions, libellés et glyphes du `09` (`ACTION_CHANNEL_ICONS`, `ACTION_STATUS_ICONS`) ; `personDisplayName`, `PersonOption` (`07`, `@/lib/persons`, `@/server/queries/persons`)
- Produces: `ProspectingActionFormDialog({ action, personOptions, defaultPersonId, triggerRef }: { action: AdminProspectingAction | null; personOptions: readonly PersonOption[]; defaultPersonId?: string; triggerRef?: Ref<HTMLButtonElement> })` ; `MarkActionDoneButton({ action })` ; `DeleteProspectingActionDialog({ action })`

- [ ] **Step 1 : « Marquer fait »**

```tsx
"use client"

import { useTransition } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"

import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { changeProspectingActionStatus } from "@/server/actions/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  action: AdminProspectingAction
}

export function MarkActionDoneButton({ action }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await changeProspectingActionStatus(action.id, "FAIT")
      if (result.ok) toast.success("Action marquée faite")
      else toast.error("Une erreur est survenue, réessayez")
    })
  }

  return (
    <RowActionButton
      aria-label={`Marquer fait : ${action.title}`}
      disabled={pending}
      onClick={handleClick}
    >
      <Check className="size-4" />
    </RowActionButton>
  )
}
```

- [ ] **Step 2 : Suppression**

```tsx
"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteProspectingAction } from "@/server/actions/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  action: AdminProspectingAction
}

export function DeleteProspectingActionDialog({ action }: Props) {
  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${action.title}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={action.title}
      description="Elle disparaît du journal et de l'historique du lead. Une action sans réponse se garde plutôt avec le statut « Ignoré »."
      successMessage="Action supprimée"
      onDelete={async () => {
        const result = await deleteProspectingAction(action.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
```

- [ ] **Step 3 : Formulaire**

`src/components/features/admin/prospection/ProspectingActionFormDialog.tsx` :

```tsx
"use client"

import {
  useActionState,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type Ref,
} from "react"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon, Pencil, Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import type { ActionStatus } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { timeOf, toInstant } from "@/lib/date-time"
import { personDisplayName } from "@/lib/persons"
import { formatShortDate } from "@/lib/projects"
import {
  ACTION_CHANNEL_ICONS,
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
} from "@/lib/prospecting-actions"
import { ACTION_CHANNELS, ACTION_STATUSES } from "@/lib/schemas/prospecting-action"
import { cn } from "@/lib/utils"
import {
  createProspectingAction,
  updateProspectingAction,
} from "@/server/actions/prospecting-actions"
import { initialProspectingActionFormState } from "@/server/actions/prospecting-actions.types"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

const REPLIED: ReadonlySet<string> = new Set<ActionStatus>(["REPONDU", "CONVERTI"])

interface Props {
  action: AdminProspectingAction | null
  personOptions: readonly PersonOption[]
  // Personne déjà choisie d'une nouvelle action ouverte depuis la card Actions de la page du lead.
  defaultPersonId?: string
  // La vue détail rouvre ce même dialogue en cliquant ce bouton par ref.
  triggerRef?: Ref<HTMLButtonElement>
}

export function ProspectingActionFormDialog({
  action,
  personOptions,
  defaultPersonId,
  triggerRef,
}: Props) {
  const [open, setOpen] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Nouvelle clé à chaque ouverture : le formulaire repart d'un état neuf (heure courante comprise).
    if (next) setInstanceKey((key) => key + 1)
  }

  // Identité stable : le formulaire reste monté pendant l'animation de fermeture, un callback recréé relancerait son effet de succès et doublerait le toast.
  const handleDone = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {action ? (
        <DialogTrigger asChild>
          <RowActionButton ref={triggerRef} aria-label={`Modifier ${action.title}`}>
            <Pencil className="size-4" />
          </RowActionButton>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle action
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-160">
        <ProspectingActionForm
          key={instanceKey}
          action={action}
          personOptions={personOptions}
          defaultPersonId={defaultPersonId}
          onDone={handleDone}
        />
      </DialogContent>
    </Dialog>
  )
}

function DateTimeField({
  id,
  label,
  errors,
  date,
  onDateChange,
  time,
  onTimeChange,
}: {
  id: string
  label: string
  errors: string[] | undefined
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  time: string
  onTimeChange: (time: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <FormField id={id} label={label} errors={errors}>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              id={id}
              aria-invalid={!!errors?.length}
              aria-describedby={`${id}-error`}
              className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon aria-hidden data-icon="inline-start" />
              {date ? formatShortDate(date) : "Choisir une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              locale={fr}
              mode="single"
              selected={date}
              defaultMonth={date ?? new Date()}
              onSelect={(next) => {
                onDateChange(next)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          aria-label={`${label}, heure`}
          value={time}
          onChange={(event) => {
            onTimeChange(event.target.value)
          }}
        />
      </div>
    </FormField>
  )
}

function ProspectingActionForm({
  action,
  personOptions,
  defaultPersonId,
  onDone,
}: {
  action: AdminProspectingAction | null
  personOptions: readonly PersonOption[]
  defaultPersonId: string | undefined
  onDone: () => void
}) {
  const formId = useId()
  const formAction = action ? updateProspectingAction.bind(null, action.id) : createProspectingAction
  const [state, submitAction, pending] = useActionState(formAction, initialProspectingActionFormState)
  const handleSubmit = useFormActionSubmit(submitAction)

  const [now] = useState(() => new Date())
  const [personId, setPersonId] = useState(action?.person.id ?? defaultPersonId ?? "")
  const [personOpen, setPersonOpen] = useState(false)
  const [status, setStatus] = useState<string>(action?.status ?? "A_FAIRE")
  const [date, setDate] = useState<Date | undefined>(action?.occurredAt ?? now)
  const [time, setTime] = useState(timeOf(action?.occurredAt ?? now))
  const [respondedDate, setRespondedDate] = useState<Date | undefined>(
    action?.respondedAt ?? undefined,
  )
  const [respondedTime, setRespondedTime] = useState(
    action?.respondedAt ? timeOf(action.respondedAt) : "",
  )

  // La personne d'une action existante peut être sortie des choix (opposition) : son nom reste affiché.
  const selectedLabel =
    personOptions.find((person) => person.id === personId)?.name ??
    (action && action.person.id === personId ? personDisplayName(action.person) : null)

  const notifySaved = useEffectEvent(() => {
    toast.success(action ? "Action mise à jour" : "Action créée")
  })

  useEffect(() => {
    if (state.ok === true) {
      onDone()
      notifySaved()
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, onDone])

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col gap-4">
      <DialogHeader className="shrink-0">
        <DialogTitle>{action ? `Modifier ${action.title}` : "Nouvelle action"}</DialogTitle>
        <DialogDescription>
          {action
            ? "Modifier les informations de cette action."
            : "Créer une action pour suivre un échange avec une personne."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-4 overflow-y-auto sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField id={`${formId}-title`} label={LABELS.title} errors={state.errors.title}>
            <Input
              id={`${formId}-title`}
              name="title"
              defaultValue={action?.title ?? ""}
              placeholder="Relance proposition"
              aria-invalid={!!state.errors.title?.length}
              aria-describedby={`${formId}-title-error`}
            />
          </FormField>
        </div>

        <FormField id={`${formId}-personId`} label={LABELS.personId} errors={state.errors.personId}>
          <ComboboxPopover
            id={`${formId}-personId`}
            open={personOpen}
            onOpenChange={setPersonOpen}
            // modal : le verrou de défilement du Dialog parent bloquerait la molette sur cette liste.
            modal
            triggerContent={
              selectedLabel ? (
                <span className="truncate">{selectedLabel}</span>
              ) : (
                <span className="text-muted-foreground">Choisir une personne</span>
              )
            }
            ariaInvalid={!!state.errors.personId?.length}
            ariaDescribedby={`${formId}-personId-error`}
            searchPlaceholder="Chercher une personne"
            emptyMessage="Aucune personne ne correspond."
          >
            <CommandGroup>
              {personOptions.map((person) => (
                <CommandItem
                  key={person.id}
                  value={person.id}
                  keywords={[person.name, person.company?.name ?? ""]}
                  data-checked={personId === person.id}
                  onSelect={() => {
                    setPersonId(person.id)
                    setPersonOpen(false)
                  }}
                >
                  <span className="truncate">{person.name}</span>
                  {person.company ? (
                    <span className="truncate text-muted-foreground">{person.company.name}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </ComboboxPopover>
          <input type="hidden" name="personId" value={personId} />
        </FormField>

        <FormField id={`${formId}-channel`} label={LABELS.channel} errors={state.errors.channel}>
          <Select name="channel" defaultValue={action?.channel ?? "DM_LINKEDIN"}>
            <SelectTrigger
              id={`${formId}-channel`}
              className="w-full"
              aria-invalid={!!state.errors.channel?.length}
              aria-describedby={`${formId}-channel-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_CHANNELS.map((channel) => {
                const Icon = ACTION_CHANNEL_ICONS[channel]
                return (
                  <SelectItem key={channel} value={channel}>
                    {Icon ? <Icon aria-hidden /> : null}
                    {ACTION_CHANNEL_LABELS[channel]}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </FormField>

        <DateTimeField
          id={`${formId}-occurredAt`}
          label={LABELS.occurredAt}
          errors={state.errors.occurredAt}
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
        />
        <input type="hidden" name="occurredAt" value={toInstant(date, time)} />

        <FormField id={`${formId}-status`} label={LABELS.status} errors={state.errors.status}>
          <Select name="status" value={status} onValueChange={setStatus}>
            <SelectTrigger
              id={`${formId}-status`}
              className="w-full"
              aria-invalid={!!state.errors.status?.length}
              aria-describedby={`${formId}-status-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_STATUSES.map((value) => {
                const Icon = ACTION_STATUS_ICONS[value]
                return (
                  <SelectItem key={value} value={value}>
                    {Icon ? <Icon aria-hidden /> : null}
                    {ACTION_STATUS_LABELS[value]}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </FormField>

        {REPLIED.has(status) ? (
          <div className="sm:col-span-2">
            <DateTimeField
              id={`${formId}-respondedAt`}
              label={LABELS.respondedAt}
              errors={state.errors.respondedAt}
              date={respondedDate}
              onDateChange={setRespondedDate}
              time={respondedTime}
              onTimeChange={setRespondedTime}
            />
          </div>
        ) : null}
        {/* Vide : le serveur pose l'heure courante au passage à Répondu ou Converti. */}
        <input
          type="hidden"
          name="respondedAt"
          value={REPLIED.has(status) ? toInstant(respondedDate, respondedTime) : ""}
        />

        <div className="sm:col-span-2">
          <FormField id={`${formId}-message`} label={LABELS.message} errors={state.errors.message} help="Le texte exact envoyé, ou le brouillon.">
            <Textarea
              id={`${formId}-message`}
              name="message"
              rows={5}
              defaultValue={action?.message ?? ""}
              aria-invalid={!!state.errors.message?.length}
              aria-describedby={`${formId}-message-help ${formId}-message-error`}
            />
          </FormField>
        </div>
      </div>

      <DialogFooter className="shrink-0">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Annuler
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          <Save aria-hidden data-icon="inline-start" />
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  )
}
```

- [ ] **Step 4 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 6 : Liste, détail et pages des actions

**Files:**
- Create: `src/components/features/admin/prospection/ProspectingActionsTable.tsx`
- Create: `src/components/features/admin/prospection/ActionsViewPage.tsx`
- Create: `src/app/admin/(protected)/actions-prospection/page.tsx` et `loading.tsx`, puis `connexions/`, `discussions/`, `candidatures/`, `journal/`, chacun `page.tsx` et `loading.tsx`
- Modify: `src/config/admin-nav-items.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 4, 5 ; `findAllProspectingActionsForAdmin` (`09`) ; `findPersonOptions` (`07`, `@/server/queries/persons`) ; `EnumBadge` (`04`) ; `ACTION_CHANNEL_ICONS`, `ACTION_STATUS_ICONS` (`09`) ; prop `initialDetailId` de `DataTable` (`08`)
- Produces: `ProspectingActionsTable({ actions, view, personOptions, initialDetailId })`, `ActionsViewPage({ view, initialDetailId })`, route `/admin/actions-prospection/journal` qui lit `searchParams.detail`

- [ ] **Step 1 : Table**

```tsx
"use client"

import { useMemo, useRef, useState } from "react"
import { Send } from "lucide-react"
import Link from "next/link"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  type DetailSection,
  DetailDialog,
} from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteProspectingActionDialog } from "@/components/features/admin/prospection/DeleteProspectingActionDialog"
import { MarkActionDoneButton } from "@/components/features/admin/prospection/MarkActionDoneButton"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import { Badge } from "@/components/ui/badge"
import { rankActions, rankLabel } from "@/lib/action-rank"
import { actionsForView, type ActionView } from "@/lib/action-views"
import {
  ACTION_COLUMN_WIDTHS,
  ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type ActionColumnKey,
} from "@/lib/admin-table-widths"
import { formatShortDateTime } from "@/lib/date-time"
import { personDisplayName } from "@/lib/persons"
import {
  ACTION_CHANNEL_ICONS,
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
} from "@/lib/prospecting-actions"
import { ACTION_CHANNELS, ACTION_STATUSES } from "@/lib/schemas/prospecting-action"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

const DAY_MS = 86_400_000

function hideable(
  view: ActionView,
  key: Exclude<ActionColumnKey, "title" | "actions">,
): Pick<Column<AdminProspectingAction>, "hideable" | "defaultVisible"> {
  return { hideable: true, defaultVisible: ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key) }
}

function personCell(action: AdminProspectingAction) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {action.person.company ? (
        <CompanyLogoTile logoFilename={action.person.company.logoFilename} size="sm" />
      ) : null}
      <TruncateTooltip className="min-w-0">{personDisplayName(action.person)}</TruncateTooltip>
    </span>
  )
}

function buildDataColumns(
  view: ActionView,
  ranks: Map<string, number>,
): readonly Column<AdminProspectingAction>[] {
  return [
    {
      key: "title",
      header: LABELS.title,
      width: ACTION_COLUMN_WIDTHS.title,
      sortValue: (action) => action.title,
      searchValue: (action) => `${action.title} ${personDisplayName(action.person)}`,
      cell: (action) => (
        <TruncateTooltip className="block w-full font-medium">{action.title}</TruncateTooltip>
      ),
    },
    {
      key: "rank",
      header: "Rang",
      width: ACTION_COLUMN_WIDTHS.rank,
      className: "text-muted-foreground",
      ...hideable(view, "rank"),
      sortValue: (action) => ranks.get(action.id) ?? 0,
      cell: (action) => rankLabel(ranks.get(action.id) ?? 0),
    },
    {
      key: "channel",
      header: LABELS.channel,
      width: ACTION_COLUMN_WIDTHS.channel,
      ...hideable(view, "channel"),
      cell: (action) => (
        <EnumBadge label={ACTION_CHANNEL_LABELS[action.channel]} icon={ACTION_CHANNEL_ICONS[action.channel]} />
      ),
    },
    {
      key: "status",
      header: LABELS.status,
      width: ACTION_COLUMN_WIDTHS.status,
      ...hideable(view, "status"),
      cell: (action) => (
        <EnumBadge label={ACTION_STATUS_LABELS[action.status]} icon={ACTION_STATUS_ICONS[action.status]} />
      ),
    },
    {
      key: "occurredAt",
      header: LABELS.occurredAt,
      width: ACTION_COLUMN_WIDTHS.occurredAt,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "occurredAt"),
      sortValue: (action) => action.occurredAt.getTime(),
      cell: (action) => formatShortDateTime(action.occurredAt),
    },
    {
      key: "person",
      header: LABELS.personId,
      width: ACTION_COLUMN_WIDTHS.person,
      ...hideable(view, "person"),
      sortValue: (action) => personDisplayName(action.person),
      cell: personCell,
    },
  ]
}

function buildActionDetail(
  action: AdminProspectingAction,
  rank: number,
  onEdit: () => void,
): DetailContent {
  const sections: DetailSection[] = [
    {
      title: "Action",
      rows: [
        {
          label: LABELS.personId,
          value: (
            // TODO(13) : basculer sur personDetailHref une fois le rôle Contact disponible (la personne peut alors être lead ou contact).
            <Link href={`/admin/leads/tous?detail=${action.person.id}`} className="font-medium underline-offset-4 hover:underline">
              {personDisplayName(action.person)}
            </Link>
          ),
        },
        {
          label: LABELS.channel,
          value: <EnumBadge label={ACTION_CHANNEL_LABELS[action.channel]} icon={ACTION_CHANNEL_ICONS[action.channel]} />,
        },
        { label: LABELS.occurredAt, value: formatShortDateTime(action.occurredAt) },
        {
          label: LABELS.respondedAt,
          value: action.respondedAt ? formatShortDateTime(action.respondedAt) : null,
        },
      ],
    },
    ...(action.message
      ? [
          {
            title: LABELS.message,
            rows: [
              {
                value: <span className="whitespace-pre-line">{action.message}</span>,
                fullWidth: true,
              },
            ],
          },
        ]
      : []),
  ]

  return {
    title: action.title,
    subtitle: rankLabel(rank),
    // EnumBadge n'a que la variante secondary (04) : l'en-tête garde le Badge outline + meta commun à toutes les vues détail.
    status: (
      <Badge variant="outline" meta>
        {ACTION_STATUS_LABELS[action.status]}
      </Badge>
    ),
    sections,
    onEdit,
  }
}

interface Props {
  actions: readonly AdminProspectingAction[]
  view: ActionView
  personOptions: readonly PersonOption[]
  // Ouvre la vue détail de cette ligne au chargement : cible d'un lien ?detail= depuis une autre fiche (lead, 08).
  initialDetailId?: string
}

export function ProspectingActionsTable({ actions, view, personOptions, initialDetailId }: Props) {
  const editTriggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const [selectedAction, setSelectedAction] = useState<AdminProspectingAction | null>(null)
  // Instant figé au montage : le filtre Période reste stable pendant la consultation.
  const [now] = useState(() => Date.now())

  // Le rang se calcule sur toutes les actions, jamais sur la seule vue affichée.
  const ranks = useMemo(() => rankActions(actions), [actions])
  const viewActions = useMemo(() => actionsForView(actions, view), [actions, view])

  const facets = useMemo<readonly Facet<AdminProspectingAction>[]>(
    () => [
      {
        key: "status",
        label: LABELS.status,
        options: ACTION_STATUSES.map((status) => ({
          value: status,
          label: ACTION_STATUS_LABELS[status],
        })),
        value: (action) => action.status,
      },
      {
        key: "channel",
        label: LABELS.channel,
        options: ACTION_CHANNELS.map((channel) => ({
          value: channel,
          label: ACTION_CHANNEL_LABELS[channel],
        })),
        value: (action) => action.channel,
      },
      {
        key: "period",
        label: "Période",
        options: [
          { value: "7", label: "7 jours" },
          { value: "30", label: "30 jours" },
        ],
        // Autour d'aujourd'hui, passé ou à venir, comme la maquette : une action À faire est future.
        value: (action) => {
          const days = Math.abs(now - action.occurredAt.getTime()) / DAY_MS
          return [days <= 7 ? "7" : null, days <= 30 ? "30" : null].filter(
            (period): period is string => period !== null,
          )
        },
      },
    ],
    [now],
  )

  // editTriggerRefs reste une fermeture lexicale : une ref ne se lit qu'au clic (react-hooks/refs).
  const columns = useMemo<readonly Column<AdminProspectingAction>[]>(
    () => [
      ...buildDataColumns(view, ranks),
      {
        key: "actions",
        header: "Actions",
        width: ACTION_COLUMN_WIDTHS.actions,
        align: "right",
        cell: (action) => (
          <span className="inline-flex gap-0">
            {action.status === "A_FAIRE" ? <MarkActionDoneButton action={action} /> : null}
            <ProspectingActionFormDialog
              action={action}
              personOptions={personOptions}
              triggerRef={(element) => {
                if (element) editTriggerRefs.current.set(action.id, element)
                else editTriggerRefs.current.delete(action.id)
              }}
            />
            <DeleteProspectingActionDialog action={action} />
          </span>
        ),
      },
    ],
    [view, ranks, personOptions],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedAction
        ? buildActionDetail(selectedAction, ranks.get(selectedAction.id) ?? 0, () => {
            editTriggerRefs.current.get(selectedAction.id)?.click()
          })
        : null,
    [selectedAction, ranks],
  )

  return (
    <>
      <DataTable
        rows={viewActions}
        columns={columns}
        getRowId={(action) => action.id}
        initialDetailId={initialDetailId}
        searchPlaceholder="Rechercher une action ou une personne"
        noun="action"
        onRowClick={setSelectedAction}
        rowLabel={(action) => action.title}
        facets={facets}
        empty={{
          icon: Send,
          title: "Aucune action",
          description: "Aucune action dans cette vue. Créez-en une via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null)
        }}
      />
    </>
  )
}
```

- [ ] **Step 2 : Coquille commune**

`src/components/features/admin/prospection/ActionsViewPage.tsx` :

```tsx
import { Suspense } from "react"
import { Plus } from "lucide-react"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import { ProspectingActionsTable } from "@/components/features/admin/prospection/ProspectingActionsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { ACTION_VIEW_PAGES, type ActionView } from "@/lib/action-views"
import { actionSkeletonWidths } from "@/lib/admin-table-widths"
import { findPersonOptions } from "@/server/queries/persons"
import { findAllProspectingActionsForAdmin } from "@/server/queries/prospecting-actions"

async function NewActionButton() {
  const personOptions = await findPersonOptions()
  return <ProspectingActionFormDialog action={null} personOptions={personOptions} />
}

async function ActionsSection({
  view,
  initialDetailId,
}: {
  view: ActionView
  initialDetailId: string | undefined
}) {
  const [actions, personOptions] = await Promise.all([
    findAllProspectingActionsForAdmin(),
    findPersonOptions(),
  ])
  return (
    <ProspectingActionsTable
      actions={actions}
      view={view}
      personOptions={personOptions}
      initialDetailId={initialDetailId}
    />
  )
}

interface Props {
  view: ActionView
  // Seule la vue Journal le reçoit : cible d'un lien ?detail=<id> depuis une autre fiche (lead, 08).
  initialDetailId?: string
}

export function ActionsViewPage({ view, initialDetailId }: Props) {
  const { title, subtitle } = ACTION_VIEW_PAGES[view]

  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        // Le bouton lit les personnes sans cache : sous <Suspense>, comme la table.
        <Suspense
          fallback={
            <Button disabled>
              <Plus aria-hidden data-icon="inline-start" />
              Nouvelle action
            </Button>
          }
        >
          <NewActionButton />
        </Suspense>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={actionSkeletonWidths(view)} />}>
        <ActionsSection view={view} initialDetailId={initialDetailId} />
      </Suspense>
    </AdminPageShell>
  )
}
```

- [ ] **Step 3 : Les cinq pages**

`src/app/admin/(protected)/actions-prospection/page.tsx` :

```tsx
import { ActionsViewPage } from "@/components/features/admin/prospection/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsPage() {
  await getCurrentUser()

  return <ActionsViewPage view="a-faire" />
}
```

`src/app/admin/(protected)/actions-prospection/connexions/page.tsx` :

```tsx
import { ActionsViewPage } from "@/components/features/admin/prospection/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsConnexionsPage() {
  await getCurrentUser()

  return <ActionsViewPage view="connexions" />
}
```

`src/app/admin/(protected)/actions-prospection/discussions/page.tsx` :

```tsx
import { ActionsViewPage } from "@/components/features/admin/prospection/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsDiscussionsPage() {
  await getCurrentUser()

  return <ActionsViewPage view="discussions" />
}
```

`src/app/admin/(protected)/actions-prospection/candidatures/page.tsx` :

```tsx
import { ActionsViewPage } from "@/components/features/admin/prospection/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsCandidaturesPage() {
  await getCurrentUser()

  return <ActionsViewPage view="candidatures" />
}
```

`src/app/admin/(protected)/actions-prospection/journal/page.tsx` (seule des cinq vues à lire `searchParams.detail`, cible des liens `?detail=<id>` qui mènent à une action depuis une autre fiche) :

```tsx
import { ActionsViewPage } from "@/components/features/admin/prospection/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

interface Props {
  searchParams: Promise<{ detail?: string }>
}

export default async function AdminActionsJournalPage({ searchParams }: Props) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <ActionsViewPage view="journal" initialDetailId={detail} />
}
```

Chacun des cinq dossiers reçoit un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 4 : Menu**

Dans `src/config/admin-nav-items.ts`, remplacer :

```ts
      { label: "Actions prospection", icon: Send },
```

par :

```ts
      {
        label: "Actions prospection",
        icon: Send,
        href: "/admin/actions-prospection",
        subItems: [
          { label: "À faire", href: "/admin/actions-prospection" },
          { label: "Connexions", href: "/admin/actions-prospection/connexions" },
          { label: "Discussions", href: "/admin/actions-prospection/discussions" },
          { label: "Candidatures", href: "/admin/actions-prospection/candidatures" },
          { label: "Journal", href: "/admin/actions-prospection/journal" },
        ],
      },
```

- [ ] **Step 5 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur (si le typage des `href` échoue, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

---

### Task 7 : Côté leads

**Files:**
- Modify: `src/components/features/admin/leads/LeadsViewPage.tsx`
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`
- Create: `src/components/features/admin/leads/LeadActionsCard.tsx`
- Modify: `src/server/queries/prospecting-actions.ts`
- Modify: `src/app/admin/(protected)/leads/[id]/page.tsx` et `src/app/admin/(protected)/leads/nouveau/page.tsx`

**Interfaces:**
- Consumes: Tasks 2 à 5 ; `findAllProspectingActionsForAdmin` (`09`) ; `personDisplayName` (`07`, `@/lib/persons`) ; page `/admin/leads/<id>` (`08`) ; `relatedCards` (`08`, `LeadForm`) ; `RelatedLinksCard`, `RelatedLinksList`, `RelatedLink` (`08`)
- Produces: `LeadsTable({ leads, view, actions }: { …; actions: readonly AdminProspectingAction[] })` ; `LeadActionsCard({ lead, actions }: { lead: AdminLead | null; actions: readonly AdminProspectingAction[] })` ; `findProspectingActionsOfPerson(personId: string): Promise<AdminProspectingAction[]>`

- [ ] **Step 1 : La page lit aussi les actions**

Dans `LeadsViewPage.tsx`, remplacer `LeadsSection` par :

```tsx
async function LeadsSection({ view }: { view: LeadView }) {
  const [leads, actions] = await Promise.all([
    findAllLeadsForAdmin(),
    findAllProspectingActionsForAdmin(),
  ])
  return <LeadsTable leads={leads} view={view} actions={actions} />
}
```

(avec l'import de `findAllProspectingActionsForAdmin` depuis `@/server/queries/prospecting-actions`).

- [ ] **Step 2 : Colonnes, filtre d'échéance et historique**

Dans `LeadsTable.tsx` :

- ajouter les imports :

```tsx
import { rankActions, rankLabel } from "@/lib/action-rank"
import { formatShortDateTime } from "@/lib/date-time"
import { isRetentionOver, retentionEndOf } from "@/lib/person-retention"
import { ACTION_CHANNEL_LABELS, ACTION_STATUS_LABELS } from "@/lib/prospecting-actions"
import { RelatedLinksList, type RelatedLink } from "@/components/features/admin/RelatedLinksList"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"
```

- dans `buildDataColumns`, avant la colonne `notes`, ajouter :

```tsx
    {
      key: "actionsCount",
      header: "Relances",
      width: LEAD_COLUMN_WIDTHS.actionsCount,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "actionsCount"),
      sortValue: (lead) => lead.actionsCount,
      cell: (lead) => lead.actionsCount,
    },
    {
      key: "retentionEnd",
      header: "À conserver jusqu'au",
      width: LEAD_COLUMN_WIDTHS.retentionEnd,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "retentionEnd"),
      sortValue: (lead) => retentionEndOf(lead).getTime(),
      cell: (lead) => formatShortDate(retentionEndOf(lead)),
    },
```

- ajouter, avant `buildLeadDetail` :

```tsx
// L'historique se lit aussi pour un lead opposé : ses actions restent, sauf effacement demandé.
// Arbitrage « Fiches rattachées » : chaque ligne mène, par ?detail=, à la vue détail de l'action dans le Journal (sa vue complète, 10), jamais à sa page d'édition.
function historySection(
  history: readonly AdminProspectingAction[],
  ranks: Map<string, number>,
): DetailSection[] {
  if (history.length === 0) return []
  return [
    {
      title: "Historique",
      rows: [
        {
          fullWidth: true,
          value: (
            <RelatedLinksList
              links={history.map(
                (action): RelatedLink => ({
                  id: action.id,
                  href: `/admin/actions-prospection/journal?detail=${action.id}`,
                  label: action.title,
                  meta: `${rankLabel(ranks.get(action.id) ?? 0)} · ${ACTION_CHANNEL_LABELS[action.channel]} · ${ACTION_STATUS_LABELS[action.status]}`,
                  trailing: formatShortDateTime(action.occurredAt),
                }),
              )}
            />
          ),
        },
      ],
    },
  ]
}
```

- changer la signature de `buildLeadDetail` en `buildLeadDetail(lead: AdminLead, history: readonly AdminProspectingAction[], ranks: Map<string, number>, onEdit: (() => void) | undefined): DetailContent` ; dans la branche opposée, remplacer `sections: [ { title: LEAD_SECTION_TITLES.optOut, … } ]` par la même section suivie de `...historySection(history, ranks)` ; dans la branche active, ajouter au bloc Pipeline, après la ligne `metAt` :

```tsx
          {
            label: "Dernier contact de sa part",
            value: lead.lastReplyAt ? formatShortDateTime(lead.lastReplyAt) : null,
          },
```

  et insérer `...historySection(history, ranks),` tout à la fin du tableau `sections`, juste après le bloc Réseau du `08` (lui-même en dernière position) et avant `...(onEdit ? { onEdit } : {})` : Historique vient après Réseau dans l'ordre de la vue détail (arbitrage du propriétaire, 2026-10-02), les blocs `15` (Opportunités apportées), `17` (Entretiens) et `19` (Signaux) le suivront à leur tour ;
- dans `facets`, ajouter à la fin (la liste passe dans le composant pour lire `now`, voir ci-dessous) :

```tsx
  {
    key: "retention",
    label: "Échéance",
    options: [{ value: "overdue", label: "Dépassée" }],
    value: (lead) => (isRetentionOver(lead, new Date(now)) ? ["overdue"] : []),
  },
```

- dans `LeadsTable`, ajouter la prop `actions: readonly AdminProspectingAction[]`, puis :

```tsx
  // Instant figé au montage : le filtre d'échéance reste stable pendant la consultation.
  const [now] = useState(() => Date.now())
  const ranks = useMemo(() => rankActions(actions), [actions])
  const historyByPerson = useMemo(() => {
    const map = new Map<string, AdminProspectingAction[]>()
    for (const action of [...actions].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    )) {
      const list = map.get(action.personId) ?? []
      list.push(action)
      map.set(action.personId, list)
    }
    return map
  }, [actions])
```

  déplacer la constante `facets` dans le composant en `useMemo(() => [...], [now])` avec l'entrée d'échéance ci-dessus, et passer `historyByPerson.get(selectedLead.id) ?? []` et `ranks` à `buildLeadDetail` (dépendances du `useMemo` du détail : `[selectedLead, historyByPerson, ranks, router]`).

- [ ] **Step 3 : Card Actions de la page du lead**

Le texte de suppression d'un lead (`DeleteLeadDialog`, `08`) annonce déjà que ses actions partent avec la personne : rien à y changer.

Arbitrage « Élément rattaché à une fiche » de DESIGN.md : les actions d'une personne se créent, se modifient et se suppriment dans une card passée à la prop `relatedCards` de `LeadForm` (`08`), présente aussi à la création. La case d'effacement des échanges vit déjà dans `OptOutPersonDialog` (`08`) : rien à y ajouter ici.

Dans `src/server/queries/prospecting-actions.ts`, ajouter :

```ts
// Actions d'une personne, de la plus ancienne à la plus récente : card Actions de la page de son lead.
export async function findProspectingActionsOfPerson(
  personId: string,
): Promise<AdminProspectingAction[]> {
  return prisma.prospectingAction.findMany({
    where: { personId },
    include: adminProspectingActionInclude,
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  })
}
```

`src/components/features/admin/leads/LeadActionsCard.tsx`, une `RelatedLinksCard` (`08`) : une action n'a pas de page propre, ses boutons Modifier et Supprimer voyagent dans la prop `actions` de chaque ligne :

```tsx
"use client"

import { Plus } from "lucide-react"

import { RelatedLinksCard, type RelatedLink } from "@/components/features/admin/RelatedLinksCard"
import { DeleteProspectingActionDialog } from "@/components/features/admin/prospection/DeleteProspectingActionDialog"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import { Button } from "@/components/ui/button"
import { rankActions, rankLabel } from "@/lib/action-rank"
import { formatShortDateTime } from "@/lib/date-time"
import { personDisplayName } from "@/lib/persons"
import { ACTION_CHANNEL_LABELS, ACTION_STATUS_LABELS } from "@/lib/prospecting-actions"
import type { AdminLead } from "@/server/queries/leads"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  lead: AdminLead | null
  actions: readonly AdminProspectingAction[]
}

export function LeadActionsCard({ lead, actions }: Props) {
  // Pas encore de personId tant que le lead n'est pas enregistré : la card reste vide, bouton désactivé.
  if (!lead) {
    return (
      <RelatedLinksCard
        title="Actions"
        links={[]}
        emptyText="Après l'enregistrement du lead."
        action={
          <Button variant="outline" size="sm" disabled>
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle action
          </Button>
        }
      />
    )
  }

  const ranks = rankActions(actions)
  // Depuis la fiche, une action ne peut viser que cette personne (id = personId).
  const personOptions = [
    {
      id: lead.id,
      name: personDisplayName(lead),
      company: lead.company ? { name: lead.company.name } : null,
    },
  ]

  return (
    <RelatedLinksCard
      title="Actions"
      links={actions.map(
        (action): RelatedLink => ({
          id: action.id,
          label: action.title,
          meta: `${rankLabel(ranks.get(action.id) ?? 0)} · ${ACTION_CHANNEL_LABELS[action.channel]} · ${ACTION_STATUS_LABELS[action.status]}`,
          trailing: formatShortDateTime(action.occurredAt),
          actions: (
            <>
              <ProspectingActionFormDialog action={action} personOptions={personOptions} />
              <DeleteProspectingActionDialog action={action} />
            </>
          ),
        }),
      )}
      emptyText="Aucune action pour ce lead."
      action={
        <ProspectingActionFormDialog action={null} personOptions={personOptions} defaultPersonId={lead.id} />
      }
    />
  )
}
```

Dans `src/app/admin/(protected)/leads/[id]/page.tsx`, importer `LeadActionsCard` et `findProspectingActionsOfPerson`, lire les actions avec le lead :

```tsx
  const [lead, companyOptions, actions] = await Promise.all([
    findLeadByIdForAdmin(id),
    findCompanyOptions(),
    findProspectingActionsOfPerson(id),
  ])
```

et passer la card à `relatedCards` :

```tsx
      <LeadForm
        lead={lead}
        companyOptions={companyOptions}
        relatedCards={
          <>
            <LeadActionsCard lead={lead} actions={actions} />
          </>
        }
      />
```

(le fragment reçoit, à la suite, les cards des plans suivants : Opportunités apportées `15`, Entretiens `17`, Signaux `19`, chacun ajoutant la sienne après celle qui précède, sans retirer celles déjà là.)

Dans `src/app/admin/(protected)/leads/nouveau/page.tsx`, importer `LeadActionsCard` et l'ajouter de même, vide, dans le même fragment :

```tsx
      <LeadForm
        lead={null}
        companyOptions={companyOptions}
        relatedCards={
          <>
            <LeadActionsCard lead={null} actions={[]} />
          </>
        }
      />
```

Les actions revalident `/admin/leads` en variante `layout` (`09`) : la card se met à jour sans recharger.

- [ ] **Step 4 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

---

### Task 8 : Premier contact des entreprises

**Files:**
- Create: `src/lib/company-first-contact.ts`
- Test: `src/lib/company-first-contact.test.ts`
- Modify: `src/server/queries/companies.ts` (`firstContactAt` dans `toAdminCompany`, `04`)
- Modify: `src/lib/companies.ts` (`COMPANY_FIELD_LABELS.firstContactAt`)
- Modify: `src/lib/admin-table-widths.ts` (colonne Premier contact)
- Modify: `src/components/features/admin/companies/CompaniesTable.tsx` (colonne et ligne de détail)

**Interfaces:**
- Consumes: `toAdminCompany`, `AdminCompanyRaw`, `adminCompanyInclude`, `findAllCompaniesForAdmin` (`04`, `persons` étendus par `08` pour `isProspect`) ; type `ActionStatus` (`09`)
- Produces: `firstContactAtOf(persons: readonly { prospectingActions: readonly { status: ActionStatus; occurredAt: Date }[] }[]): Date | null` ; `AdminCompany.firstContactAt: Date | null` ; `COMPANY_COLUMN_WIDTHS.firstContactAt` ; colonne et ligne de détail « Premier contact »

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/company-first-contact.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { firstContactAtOf } from "./company-first-contact"

describe("firstContactAtOf", () => {
  it("keeps the earliest sent action across the company's persons", () => {
    const first = firstContactAtOf([
      { prospectingActions: [{ status: "FAIT", occurredAt: new Date(2026, 2, 10) }] },
      { prospectingActions: [{ status: "REPONDU", occurredAt: new Date(2026, 1, 1) }] },
    ])

    expect(first).toEqual(new Date(2026, 1, 1))
  })

  it("ignores to-do actions", () => {
    const first = firstContactAtOf([
      { prospectingActions: [{ status: "A_FAIRE", occurredAt: new Date(2026, 0, 1) }] },
      { prospectingActions: [{ status: "FAIT", occurredAt: new Date(2026, 2, 10) }] },
    ])

    expect(first).toEqual(new Date(2026, 2, 10))
  })

  it("returns null when no action was ever sent", () => {
    const first = firstContactAtOf([
      { prospectingActions: [{ status: "A_FAIRE", occurredAt: new Date(2026, 0, 1) }] },
      { prospectingActions: [] },
    ])

    expect(first).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/company-first-contact.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3 : Écrire le dérivé**

`src/lib/company-first-contact.ts` :

```ts
import type { ActionStatus } from "@/generated/prisma/client"

interface ContactAction {
  status: ActionStatus
  occurredAt: Date
}

interface ContactPerson {
  prospectingActions: readonly ContactAction[]
}

// Premier contact d'une entreprise : la plus ancienne action envoyée (hors À faire, encore planifiée) parmi ses personnes, quel que soit leur rôle.
export function firstContactAtOf(persons: readonly ContactPerson[]): Date | null {
  const sentTimes = persons
    .flatMap((person) => person.prospectingActions)
    .filter((action) => action.status !== "A_FAIRE")
    .map((action) => action.occurredAt.getTime())
  return sentTimes.length === 0 ? null : new Date(Math.min(...sentTimes))
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/company-first-contact.test.ts`
Expected: PASS.

- [ ] **Step 5 : Dérivé dans `toAdminCompany`**

Dans `src/server/queries/companies.ts`, dans le `select` de `persons` posé par le `08` (pour `isProspect`), ajouter `prospectingActions` :

```ts
      persons: {
        select: {
          optedOutAt: true,
          lead: { select: { status: true } },
          prospectingActions: { select: { status: true, occurredAt: true } },
        },
      },
```

et, dans le type inline de `AdminCompanyRaw` qui répète ce même `select`, ajouter la même clé :

```ts
    persons: {
      select: {
        optedOutAt: true
        lead: { select: { status: true } }
        prospectingActions: { select: { status: true; occurredAt: true } }
      }
    }
```

puis remplacer `AdminCompany` et `toAdminCompany` par :

```ts
export type AdminCompany = Omit<AdminCompanyRaw, "clientMetas" | "persons"> & {
  worked: boolean
  isProspect: boolean
  firstContactAt: Date | null
}

const PROSPECT_STATUSES: readonly LeadStatus[] = ["NOUVEAU", "SUSPECT", "DISCUSSION"]

// Worked et isProspect, ci-dessus, posent le motif : firstContactAt rejoint la même fonction.
function toAdminCompany({ clientMetas, persons, ...company }: AdminCompanyRaw): AdminCompany {
  const worked = clientMetas.some((meta) => meta.project.type === "CLIENT")
  const isProspect =
    !worked &&
    persons.some(
      (person) =>
        !person.optedOutAt && person.lead !== null && PROSPECT_STATUSES.includes(person.lead.status),
    )
  return { ...company, worked, isProspect, firstContactAt: firstContactAtOf(persons) }
}
```

(import `firstContactAtOf` depuis `@/lib/company-first-contact` en tête de fichier.)

- [ ] **Step 6 : Libellé et largeur**

Dans `src/lib/companies.ts`, dans `COMPANY_FIELD_LABELS`, ajouter après `worked` :

```ts
  firstContactAt: "Premier contact",
```

Dans `src/lib/admin-table-widths.ts`, dans `COMPANY_COLUMN_WIDTHS`, ajouter après `worked` :

```ts
  firstContactAt: 150,
```

et, dans `COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS`, ajouter `"firstContactAt"` à la fin des listes `toutes`, `recrutement` et `prospects` : visible par défaut dans ces trois vues (`toutes` montre toutes ses colonnes, arbitrage « Colonnes par vue » de `docs/DESIGN.md`), masquée par défaut dans `travaillees`.

- [ ] **Step 7 : Colonne et ligne de détail**

Dans `src/components/features/admin/companies/CompaniesTable.tsx`, importer `formatShortDate` depuis `@/lib/projects`, puis, dans `buildColumns`, ajouter après la colonne `worked` :

```tsx
    {
      key: "firstContactAt",
      header: COMPANY_FIELD_LABELS.firstContactAt,
      width: COMPANY_COLUMN_WIDTHS.firstContactAt,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "firstContactAt"),
      sortValue: (company) => company.firstContactAt?.getTime() ?? 0,
      cell: (company) => formatShortDate(company.firstContactAt),
    },
```

et, dans `buildCompanyDetail`, dans le bloc `COMPANY_SECTION_TITLES.relation`, après la ligne `worked` :

```tsx
          {
            label: COMPANY_FIELD_LABELS.firstContactAt,
            value: formatShortDate(company.firstContactAt),
          },
```

- [ ] **Step 8 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

---

### Task 9 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 8
- Produces: rien

- [ ] **Step 1 : Menu et vues**

Run: `just dev`, se connecter.
Expected: Actions prospection mène à « Actions à faire » ; ses cinq sous-entrées s'activent sur leur page ; le squelette de chargement a le bon nombre de colonnes.

- [ ] **Step 2 : « Marquer fait » et rang**

Ouvrir « Nouveau lead » sans l'enregistrer.
Expected: la card Actions est présente, vide, « Après l'enregistrement du lead. », bouton « Nouvelle action » désactivé.

Créer pour un lead une connexion LinkedIn À faire datée d'hier, puis cliquer deux fois vite « Marquer fait ».
Expected: un seul toast « Action marquée faite » (le bouton se désactive pendant l'appel) ; l'action quitte À faire, apparaît dans Connexions à l'heure du clic, rang « Premier contact ». Créer un DM LinkedIn sur le même lead : il s'affiche « Relance 1 ».

- [ ] **Step 3 : Formulaire et heure**

Créer une action à 14 h 30 sur une date d'été, une autre à 14 h 30 sur une date d'hiver ; passer l'une à Répondu en laissant « Réponse reçue le » vide.
Expected: les deux s'affichent à 14 h 30 ; la réponse porte l'heure de l'enregistrement.

- [ ] **Step 4 : Côté leads**

Ouvrir la vue détail du lead de l'étape 2, puis sa page.
Expected: bloc Historique en `RelatedLinksList` avec ses actions par date et leur rang, ligne « Dernier contact de sa part » ; sur sa page, la card Actions liste les mêmes actions ; « Nouvelle action » y ouvre le formulaire avec cette personne déjà choisie, et l'action enregistrée apparaît dans la card sans recharger. Dans la liste, sa colonne Actions compte ses actions. Dans Tous, la colonne « À conserver jusqu'au » s'affiche ; le filtre « Échéance : Dépassée » ne garde que les fiches échues (en créer une en base avec une date de création de plus de 3 ans via `just db-studio` pour le vérifier). Cliquer une ligne du bloc Historique.
Expected: la liste Journal s'ouvre avec le détail de cette action déjà affiché (`?detail=<id>`).

- [ ] **Step 5 : Personne opposée**

Ouvrir un lead sur sa page et cliquer « Ne plus contacter » (`08`) sans cocher l'effacement des échanges.
Expected: ses actions restent dans son historique et dans le Journal ; ouvrir l'une d'elles en modification montre toujours son nom dans le champ Personne, même si elle n'apparaît plus dans les choix.

- [ ] **Step 6 : Premier contact d'une entreprise**

Ouvrir Entreprises > Recrutement (ou Prospects), constater la colonne « Premier contact » vide pour une entreprise sans action envoyée. Marquer faite une action d'une personne de cette entreprise, recharger la page.
Expected: « Premier contact » affiche la date de cette action ; la vue détail de l'entreprise montre la même date dans le bloc Relation. Puis `just stop`.
