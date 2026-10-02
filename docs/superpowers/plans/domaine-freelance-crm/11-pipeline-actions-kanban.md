# Pipeline des actions de prospection : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La vue Pipeline des actions de prospection : une colonne par statut, une carte par action, filtre de période, clic vers la vue détail et sa modification, glisser une carte d'une colonne à l'autre pour changer son statut.

**Architecture:** Un module pur testé (`action-board`) répartit les actions en colonnes, filtre la période et lit un déplacement dans les métadonnées du Kanban. `ActionsBoard` compose le Kanban ReUI (headless) en `Card`, garde le tableau en état local réaligné sur chaque lecture du serveur, et enregistre au lâcher par `changeProspectingActionStatus` (`09`). La vue détail d'une action et le formulaire en mode contrôlé sont partagés avec la liste du `10`.

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui `radix-nova` (Card, Badge, Select, Skeleton), ReUI Kanban (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`), Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/11-pipeline-actions-kanban-design.md`

## Global Constraints

- **Prérequis** : plans `07` (`personDisplayName`, `findPersonOptions`, `PersonOption`), `09` (`ActionStatus`, `changeProspectingActionStatus(id: string, status: string): Promise<ProspectingActionFormState>`, `AdminProspectingAction`, `findAllProspectingActionsForAdmin`, `ACTION_CHANNEL_LABELS`, `ACTION_STATUS_LABELS`, `PROSPECTING_ACTION_FIELD_LABELS`) et `10` (`ProspectingActionFormDialog`, `ProspectingActionsTable`, `ActionsViewPage`, `rankActions`, `rankLabel`, `formatShortDateTime`, `timeOf`, menu Actions prospection) implémentés.
- **Route** : `/admin/actions-prospection/pipeline`, titre « Pipeline de prospection », sous-titre « Une carte par action, groupées par statut. Le glisser-déposer change le statut. »
- **Colonnes** : `A_FAIRE`, `FAIT`, `REPONDU`, `CONVERTI`, `IGNORE`, dans cet ordre ; dans chaque colonne, la plus récente en haut ; aucune poignée de colonne.
- **Enregistrement** : au lâcher seulement (`onValueCommit`), un changement de colonne appelle `changeProspectingActionStatus(id, statut d'arrivée)` ; en cas d'échec, retour à `previousValue` et toast « Une erreur est survenue, réessayez » ; un déplacement dans la même colonne n'enregistre rien.
- **Période** : « Toute la période », « 7 jours », « 30 jours », autour d'aujourd'hui (passé ou à venir).
- **Registre** : `"@reui": "https://reui.io/r/{style}/{name}.json"` dans `components.json`.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/shadcn-ui/setup.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Carte relâchée dans sa propre colonne** : aucune écriture, l'ordre revient à celui des dates au prochain affichage. Couvert par « ignores a move within the same column » (Task 1).
- **Échap pendant le glisser** : la carte revient à sa place, rien n'est enregistré (`restoreOnCancel`). Vérifié à la Task 6, Step 4.
- **Modifier deux cartes l'une après l'autre** : le formulaire montre chaque fois l'action ouverte, jamais la précédente (dialogue remonté par une clé à chaque modification). Vérifié à la Task 6, Step 6.
- **Dépôt dans une colonne vidée** : la colonne garde sa hauteur et reste une cible. Vérifié à la Task 6, Step 8.
- **Clavier** : Entrée sur une carte ciblée ouvre sa vue détail. Vérifié à la Task 6, Step 7.

---

### Task 1 : Colonnes, période et lecture d'un déplacement

**Files:**
- Create: `src/lib/action-board.ts`
- Test: `src/lib/action-board.test.ts`

**Interfaces:**
- Consumes: type `ActionStatus` (`09`)
- Produces: `BOARD_STATUSES` ; `type BoardPeriod = "tout" | "7" | "30"` ; `BOARD_PERIODS: readonly { value: BoardPeriod; label: string }[]` ; `isBoardPeriod(value: string): value is BoardPeriod` ; `boardColumns<T extends BoardRow>(actions: readonly T[]): Record<ActionStatus, T[]>` ; `actionsInPeriod<T extends { occurredAt: Date }>(actions: readonly T[], period: BoardPeriod, now: number): readonly T[]` ; `interface BoardMove<T>` ; `statusMoveFrom<T extends { id: string }>(move: BoardMove<T>): { id: string; status: ActionStatus } | null`

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/action-board.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import type { ActionStatus } from "@/generated/prisma/client"

import { actionsInPeriod, boardColumns, statusMoveFrom } from "./action-board"

interface TestAction {
  id: string
  status: ActionStatus
  occurredAt: Date
  createdAt: Date
}

function action(overrides: Partial<TestAction> = {}): TestAction {
  return {
    id: "a1",
    status: "A_FAIRE",
    occurredAt: new Date(2026, 8, 20, 9, 0),
    createdAt: new Date(2026, 8, 1),
    ...overrides,
  }
}

function idsOf(actions: readonly TestAction[]): string[] {
  return actions.map((row) => row.id)
}

describe("boardColumns", () => {
  it("puts every status in its own column, in the pipeline order", () => {
    const actions = [
      action({ id: "ignored", status: "IGNORE" }),
      action({ id: "todo", status: "A_FAIRE" }),
      action({ id: "done", status: "FAIT" }),
    ]

    const columns = boardColumns(actions)

    expect(Object.keys(columns)).toEqual(["A_FAIRE", "FAIT", "REPONDU", "CONVERTI", "IGNORE"])
    expect(idsOf(columns.A_FAIRE)).toEqual(["todo"])
    expect(idsOf(columns.FAIT)).toEqual(["done"])
    expect(columns.REPONDU).toEqual([])
    expect(idsOf(columns.IGNORE)).toEqual(["ignored"])
  })

  it("sorts each column from the most recent action", () => {
    const actions = [
      action({ id: "old", status: "FAIT", occurredAt: new Date(2026, 8, 1, 9, 0) }),
      action({ id: "recent", status: "FAIT", occurredAt: new Date(2026, 8, 25, 9, 0) }),
      action({ id: "middle", status: "FAIT", occurredAt: new Date(2026, 8, 10, 9, 0) }),
    ]

    const columns = boardColumns(actions)

    expect(idsOf(columns.FAIT)).toEqual(["recent", "middle", "old"])
  })
})

describe("actionsInPeriod", () => {
  it("keeps actions within the period around today", () => {
    const now = new Date(2026, 8, 27, 12, 0).getTime()
    const actions = [
      action({ id: "yesterday", occurredAt: new Date(2026, 8, 26, 9, 0) }),
      action({ id: "two-months-ago", occurredAt: new Date(2026, 6, 27, 9, 0) }),
      action({ id: "planned", occurredAt: new Date(2026, 9, 2, 9, 0) }),
    ]

    const rows = actionsInPeriod(actions, "30", now)

    expect(idsOf(rows)).toEqual(["yesterday", "planned"])
  })
})

describe("statusMoveFrom", () => {
  const previousValue = boardColumns([
    action({ id: "first", occurredAt: new Date(2026, 8, 21, 9, 0) }),
    action({ id: "second", occurredAt: new Date(2026, 8, 20, 9, 0) }),
  ])

  it("reads a move to another column as a status change", () => {
    const move = statusMoveFrom({
      kind: "item",
      activeContainer: "A_FAIRE",
      activeIndex: 1,
      overContainer: "FAIT",
      previousValue,
    })

    expect(move).toEqual({ id: "second", status: "FAIT" })
  })

  it("ignores a move within the same column", () => {
    const move = statusMoveFrom({
      kind: "item",
      activeContainer: "A_FAIRE",
      activeIndex: 1,
      overContainer: "A_FAIRE",
      previousValue,
    })

    expect(move).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/action-board.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3 : Écrire le module**

`src/lib/action-board.ts` :

```ts
import type { ActionStatus } from "@/generated/prisma/client"

export const BOARD_STATUSES = [
  "A_FAIRE",
  "FAIT",
  "REPONDU",
  "CONVERTI",
  "IGNORE",
] as const satisfies readonly ActionStatus[]

export type BoardPeriod = "tout" | "7" | "30"

export const BOARD_PERIODS: readonly { value: BoardPeriod; label: string }[] = [
  { value: "tout", label: "Toute la période" },
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
]

export function isBoardPeriod(value: string): value is BoardPeriod {
  return BOARD_PERIODS.some((period) => period.value === value)
}

export interface BoardRow {
  id: string
  status: ActionStatus
  occurredAt: Date
  createdAt: Date
}

function byMostRecent(a: BoardRow, b: BoardRow): number {
  return (
    b.occurredAt.getTime() - a.occurredAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime()
  )
}

export function boardColumns<T extends BoardRow>(actions: readonly T[]): Record<ActionStatus, T[]> {
  const sorted = [...actions].sort(byMostRecent)
  const column = (status: ActionStatus) => sorted.filter((action) => action.status === status)
  // Clés dans l'ordre de BOARD_STATUSES : le Kanban lit ses colonnes par Object.keys.
  return {
    A_FAIRE: column("A_FAIRE"),
    FAIT: column("FAIT"),
    REPONDU: column("REPONDU"),
    CONVERTI: column("CONVERTI"),
    IGNORE: column("IGNORE"),
  }
}

const DAY_MS = 86_400_000

// Autour d'aujourd'hui, passé ou à venir : une action À faire est planifiée dans le futur.
export function actionsInPeriod<T extends { occurredAt: Date }>(
  actions: readonly T[],
  period: BoardPeriod,
  now: number,
): readonly T[] {
  if (period === "tout") return actions
  const maxDistance = Number(period) * DAY_MS
  return actions.filter((action) => Math.abs(now - action.occurredAt.getTime()) <= maxDistance)
}

export interface BoardMove<T> {
  kind: "item" | "column"
  activeContainer: string
  activeIndex: number
  overContainer: string
  previousValue: Record<string, readonly T[]>
}

function isBoardStatus(value: string): value is ActionStatus {
  return (BOARD_STATUSES as readonly string[]).includes(value)
}

// Seul un changement de colonne s'enregistre : l'ordre dans une colonne suit les dates.
export function statusMoveFrom<T extends { id: string }>(
  move: BoardMove<T>,
): { id: string; status: ActionStatus } | null {
  if (move.kind !== "item" || move.activeContainer === move.overContainer) return null
  if (!isBoardStatus(move.overContainer)) return null
  const moved = move.previousValue[move.activeContainer]?.[move.activeIndex]
  return moved ? { id: moved.id, status: move.overContainer } : null
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/action-board.test.ts`
Expected: PASS (5 tests).

---

### Task 2 : Installation du Kanban ReUI

**Files:**
- Modify: `components.json`
- Create: `src/components/reui/kanban.tsx` (copié par la CLI)
- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `docs/VERSIONS.md` (skill `versions-doc`)
- Modify: `docs/DESIGN.md` (skill `design-doc`)

**Interfaces:**
- Consumes: rien
- Produces: `Kanban`, `KanbanBoard`, `KanbanColumn`, `KanbanColumnContent`, `KanbanItem`, `KanbanItemHandle`, `KanbanOverlay`, `type KanbanCommitMeta<T>` exportés par `@/components/reui/kanban`. API lue le 2026-09-27 dans `https://reui.io/r/radix-nova/kanban.json` : `Kanban<T>({ value: Record<string, T[]>, onValueChange, getItemValue, onValueCommit?(value, meta: KanbanCommitMeta<T>), restoreOnCancel?, … })`, `KanbanCommitMeta<T> = { kind: "item" | "column", event, activeContainer, activeIndex, overContainer, overIndex, previousValue }` ; `KanbanItem` pose les attributs de glisser (`role="button"`, `tabIndex={0}`) sur son élément, `KanbanItemHandle` en porte les écouteurs ; capteur souris à 10px d'activation, tactile à 250ms.

- [ ] **Step 1 : Déclarer le registre**

Dans `components.json`, compléter `registries` :

```json
  "registries": {
    "@magicui": "https://magicui.design/r/{name}.json",
    "@aceternity": "https://ui.aceternity.com/registry/{name}.json",
    "@reui": "https://reui.io/r/{style}/{name}.json"
  }
```

(`{style}` se résout en `radix-nova`, le style du projet, que ReUI publie.)

- [ ] **Step 2 : Ajouter le composant**

Run: `pnpm dlx shadcn@latest add @reui/kanban`
Expected: `src/components/reui/kanban.tsx` créé ; `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` et `cn` ajoutés à `package.json` (`radix-ui` y est déjà). Si la CLI demande une confirmation, la donner ; si elle échoue ou reste interactive, demander au propriétaire de la lancer dans son terminal.

- [ ] **Step 3 : Corrections après `add` (`.claude/rules/shadcn-ui/setup.md`)**

Dans `src/components/reui/kanban.tsx` :

- remplacer `import { cn } from "cn"` par `import { cn } from "@/lib/utils"`, puis :

Run: `pnpm remove cn`

- remplacer chaque `<XContext.Provider value={…}>…</XContext.Provider>` par `<XContext value={…}>…</XContext>` (`.claude/rules/react/hooks.md`, `Context.Provider` déprécié en React 19) ;
- lever les erreurs de `noUncheckedIndexedAccess` sans changer le comportement : une colonne lue par sa clé se lit `columns[key] ?? []` (une colonne absente est vide), et l'élément sorti par `splice` se garde par `if (movedItem === undefined) return` avant d'être réinséré. Dans la version lue le 2026-09-27, les lectures concernées sont `columns[key]` (boucle de détection des doublons et `findContainer`), `finalValue[key]` (`commitChange`), `snapshot[key]` (`handleDragStart`), `columns[activeContainer]` et `columns[overContainer]` (`handleDragOver`, `handleDragEnd`), `columns[container]` (réordonnancement dans une colonne, deux fois) et `columns[key]` (réordonnancement des colonnes).

Run: `just typecheck`
Expected: aucune erreur.

Run: `just format` puis `just lint`
Expected: aucune erreur. Une erreur restante dans `kanban.tsx` se corrige au plus près, sans changer le comportement du composant.

- [ ] **Step 4 : Versions**

Invoquer le skill `versions-doc` pour `docs/VERSIONS.md` : une ligne ReUI au tableau Framework & UI (« copy-paste (no semver) », registre `@reui` via le CLI shadcn, style `radix-nova`, `Kanban` seul installé) et une entrée dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, tirés par le Kanban), versions lues dans `package.json` après l'installation, jamais saisies de mémoire.

- [ ] **Step 5 : Design**

Invoquer le skill `design-doc` pour `docs/DESIGN.md` :

- § Mapping Composants : la ligne « Tableau kanban » quitte § Post-MVP (non installés) pour § Cards et grilles, réécrite ainsi :

```markdown
| Tableau kanban | Kanban | ReUI | Pipeline des actions de prospection (admin), puis espace Dev. Glisser-déposer par dnd-kit. **Headless** : colonne et carte sont à la charge de l'appelant, composées en `Card` (colonne : icône du statut, libellé au registre Label en `text-xs`, compteur en `Badge` `outline` ; carte `size="sm"`). Une seule rangée de colonnes de 13.75rem au moins, qui défile horizontalement. Enregistrement unique au lâcher par `onValueCommit`, dont `previousValue` sert au retour arrière en cas d'échec ; `restoreOnCancel` annule le geste à Échap. Aucune poignée de colonne quand leur ordre est fixe |
```

- § Stack UI, ligne ReUI : « Admin : `Kanban` installé (pipeline des actions de prospection), `EventCalendar` en Post-MVP. Registry compatible shadcn CLI, déclaré dans `components.json` (`@reui` → `https://reui.io/r/{style}/{name}.json`) » ;
- § Post-MVP, ligne « Agenda mensuel » : « Registry `@reui` déjà déclaré dans `components.json` » à la place de « à déclarer » ;
- § Ressources, ligne ReUI : « `Kanban` pour le pipeline des actions de prospection et l'espace Dev, `EventCalendar` pour l'agenda admin (post-MVP) ».

---

### Task 3 : Vue détail partagée, formulaire contrôlé et bouton « Nouvelle action »

**Files:**
- Create: `src/components/features/admin/prospection/action-detail.tsx`
- Modify: `src/components/features/admin/prospection/ProspectingActionsTable.tsx`
- Modify: `src/components/features/admin/prospection/ProspectingActionFormDialog.tsx`
- Modify: `src/components/features/admin/prospection/ActionsViewPage.tsx`

**Interfaces:**
- Consumes: `personDisplayName` (`07`, `@/lib/persons`) ; `rankLabel`, `formatShortDateTime` (`10`) ; libellés et glyphes (`09`) ; `EnumBadge` (`04`)
- Produces: `buildActionDetail(action: AdminProspectingAction, rank: number, onEdit: () => void): DetailContent` ; `ProspectingActionFormDialog({ action, personOptions, defaultPersonId, triggerRef, open, onOpenChange }: { …; open?: boolean; onOpenChange?: (open: boolean) => void })` ; `NewActionHeaderButton()`

- [ ] **Step 1 : Extraire la vue détail**

`src/components/features/admin/prospection/action-detail.tsx` reçoit la fonction `buildActionDetail` de `ProspectingActionsTable.tsx`, désormais exportée :

Hérité tel quel du `10` (sous-titre rang seul, bloc Action commençant par le lien vers le Lead ou le Contact, badges `EnumBadge`) :

```tsx
import Link from "next/link"

import type { DetailContent, DetailSection } from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { Badge } from "@/components/ui/badge"
import { rankLabel } from "@/lib/action-rank"
import { formatShortDateTime } from "@/lib/date-time"
import { personDisplayName } from "@/lib/persons"
import {
  ACTION_CHANNEL_ICONS,
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
} from "@/lib/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

export function buildActionDetail(
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
```

Dans `ProspectingActionsTable.tsx` : supprimer la fonction locale `buildActionDetail`, l'importer depuis `@/components/features/admin/prospection/action-detail`, et retirer les imports devenus inutiles (`DetailSection` au moins ; `just lint` signale les autres).

- [ ] **Step 2 : Mode contrôlé du formulaire**

Dans `ProspectingActionFormDialog.tsx`, remplacer l'interface `Props` et la fonction `ProspectingActionFormDialog` par :

```tsx
interface Props {
  action: AdminProspectingAction | null
  personOptions: readonly PersonOption[]
  // Personne déjà choisie d'une nouvelle action ouverte depuis la card Actions de la page du lead.
  defaultPersonId?: string
  // La vue détail rouvre ce même dialogue en cliquant ce bouton par ref.
  triggerRef?: Ref<HTMLButtonElement>
  // Mode contrôlé, sans bouton déclencheur : le parent ouvre le dialogue (carte du pipeline) ; onOpenChange doit garder son identité, un setter d'état, dont handleDone dépend.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProspectingActionFormDialog({
  action,
  personOptions,
  defaultPersonId,
  triggerRef,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)
  const controlled = controlledOpen !== undefined
  const open = controlledOpen ?? uncontrolledOpen

  function handleOpenChange(next: boolean) {
    if (controlled) onOpenChange?.(next)
    else setUncontrolledOpen(next)
    // Nouvelle clé à chaque ouverture : le formulaire repart d'un état neuf (heure courante comprise).
    if (next) setInstanceKey((key) => key + 1)
  }

  // Identité stable : le formulaire reste monté pendant l'animation de fermeture, un callback recréé relancerait son effet de succès et doublerait le toast.
  const handleDone = useCallback(() => {
    if (controlled) onOpenChange?.(false)
    else setUncontrolledOpen(false)
  }, [controlled, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {controlled ? null : action ? (
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
```

Le reste du fichier (`DateTimeField`, `ProspectingActionForm`) ne change pas.

- [ ] **Step 3 : Bouton « Nouvelle action » partagé**

Dans `ActionsViewPage.tsx`, ajouter après `NewActionButton` :

```tsx
export function NewActionHeaderButton() {
  return (
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
  )
}
```

puis, dans `ActionsViewPage`, remplacer la valeur de `actions={…}` (le `<Suspense>` et son commentaire) par `actions={<NewActionHeaderButton />}`.

- [ ] **Step 4 : Vérifier**

Run: `just typecheck`
Expected: aucune erreur.

Run: `pnpm vitest run --project unit src/lib`
Expected: PASS, les suites du `10` comprises.

---

### Task 4 : Tableau des actions

**Files:**
- Create: `src/components/features/admin/prospection/ActionsBoard.tsx`

**Interfaces:**
- Consumes: Task 1 ; composants de la Task 2 ; `buildActionDetail`, `ProspectingActionFormDialog` en mode contrôlé (Task 3) ; `changeProspectingActionStatus` (`09`) ; `rankActions`, `timeOf` (`10`) ; `EnumBadge` (`04`) ; `ACTION_CHANNEL_ICONS` (`09`)
- Produces: `ActionsBoard({ actions, personOptions }: { actions: readonly AdminProspectingAction[]; personOptions: readonly PersonOption[] })`

- [ ] **Step 1 : Écrire le composant**

`src/components/features/admin/prospection/ActionsBoard.tsx` :

```tsx
"use client"

import { startTransition, useMemo, useState } from "react"
import {
  CircleCheck,
  ClipboardList,
  MessageCircle,
  Send,
  Target,
  VolumeX,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { EmptyState } from "@/components/features/admin/EmptyState"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { buildActionDetail } from "@/components/features/admin/prospection/action-detail"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanCommitMeta,
} from "@/components/reui/kanban"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ActionStatus } from "@/generated/prisma/client"
import {
  BOARD_PERIODS,
  BOARD_STATUSES,
  actionsInPeriod,
  boardColumns,
  isBoardPeriod,
  statusMoveFrom,
  type BoardPeriod,
} from "@/lib/action-board"
import { rankActions } from "@/lib/action-rank"
import { timeOf } from "@/lib/date-time"
import { personDisplayName } from "@/lib/persons"
import { formatShortDate } from "@/lib/projects"
import { ACTION_CHANNEL_ICONS, ACTION_CHANNEL_LABELS, ACTION_STATUS_LABELS } from "@/lib/prospecting-actions"
import { LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { changeProspectingActionStatus } from "@/server/actions/prospecting-actions"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

type BoardValue = Record<string, AdminProspectingAction[]>

const COLUMN_ICONS: Record<ActionStatus, { icon: LucideIcon; className: string }> = {
  A_FAIRE: { icon: ClipboardList, className: "text-muted-foreground" },
  FAIT: { icon: CircleCheck, className: "text-info" },
  REPONDU: { icon: MessageCircle, className: "text-success" },
  CONVERTI: { icon: Target, className: "text-primary" },
  IGNORE: { icon: VolumeX, className: "text-destructive" },
}

function getActionId(action: AdminProspectingAction): string {
  return action.id
}

function BoardCard({
  action,
  onOpen,
}: {
  action: AdminProspectingAction
  onOpen: (action: AdminProspectingAction) => void
}) {
  return (
    <KanbanItem
      value={action.id}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      // Un appui qui ne parcourt pas 10px reste un clic : le capteur souris du Kanban n'active le glisser qu'au-delà.
      onClick={() => {
        onOpen(action)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen(action)
        }
      }}
    >
      <KanbanItemHandle>
        <Card size="sm">
          <CardContent className="flex flex-col gap-2.5">
            <span className="text-sm font-medium">{action.title}</span>
            <span className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <TruncateTooltip className="min-w-0">{personDisplayName(action.person)}</TruncateTooltip>
              <time dateTime={action.occurredAt.toISOString()} className="shrink-0 tabular-nums">
                {formatShortDate(action.occurredAt)} · {timeOf(action.occurredAt)}
              </time>
            </span>
            {/* EnumBadge (04) ne porte pas de className : le self-start, nécessaire dans ce flex-col, vit sur le span qui l'enveloppe. */}
            <span className="self-start">
              <EnumBadge label={ACTION_CHANNEL_LABELS[action.channel]} icon={ACTION_CHANNEL_ICONS[action.channel]} />
            </span>
          </CardContent>
        </Card>
      </KanbanItemHandle>
    </KanbanItem>
  )
}

function BoardColumn({
  status,
  actions,
  onOpen,
}: {
  status: ActionStatus
  actions: readonly AdminProspectingAction[]
  onOpen: (action: AdminProspectingAction) => void
}) {
  const { icon: Icon, className } = COLUMN_ICONS[status]

  return (
    <KanbanColumn value={status} className="min-w-0">
      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <Icon aria-hidden className={cn("size-4 shrink-0", className)} />
            <span className={cn(LABEL_CLASS, "text-xs whitespace-nowrap")}>
              {ACTION_STATUS_LABELS[status]}
            </span>
          </span>
          <Badge variant="outline">{actions.length}</Badge>
        </CardHeader>
        <CardContent>
          {/* Hauteur minimale : une colonne vidée reste une cible de dépôt. */}
          <KanbanColumnContent value={status} className="min-h-8 gap-2.5">
            {actions.map((action) => (
              <BoardCard key={action.id} action={action} onOpen={onOpen} />
            ))}
          </KanbanColumnContent>
        </CardContent>
      </Card>
    </KanbanColumn>
  )
}

interface Props {
  actions: readonly AdminProspectingAction[]
  personOptions: readonly PersonOption[]
}

export function ActionsBoard({ actions, personOptions }: Props) {
  // Instant figé au montage : le filtre Période reste stable pendant la consultation.
  const [now] = useState(() => Date.now())
  const [period, setPeriod] = useState<BoardPeriod>("tout")
  const [syncedActions, setSyncedActions] = useState(actions)
  const [columns, setColumns] = useState<BoardValue>(() => boardColumns(actions))
  const [selectedAction, setSelectedAction] = useState<AdminProspectingAction | null>(null)
  const [editedAction, setEditedAction] = useState<AdminProspectingAction | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editKey, setEditKey] = useState(0)

  // Nouvelle lecture du serveur (revalidation après une écriture) : le tableau s'y réaligne pendant le rendu plutôt que par un effet qui peindrait d'abord l'état périmé.
  if (actions !== syncedActions) {
    setSyncedActions(actions)
    setColumns(boardColumns(actionsInPeriod(actions, period, now)))
  }

  // Le rang se calcule sur toutes les actions, jamais sur la seule période affichée.
  const ranks = useMemo(() => rankActions(actions), [actions])

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedAction
        ? buildActionDetail(selectedAction, ranks.get(selectedAction.id) ?? 0, () => {
            setEditedAction(selectedAction)
            // Nouvelle clé : le dialogue remonte sur cette action, jamais sur la précédente.
            setEditKey((key) => key + 1)
            setEditOpen(true)
          })
        : null,
    [selectedAction, ranks],
  )

  function handlePeriodChange(value: string) {
    if (!isBoardPeriod(value)) return
    setPeriod(value)
    setColumns(boardColumns(actionsInPeriod(actions, value, now)))
  }

  function handleCommit(_value: BoardValue, meta: KanbanCommitMeta<AdminProspectingAction>) {
    const move = statusMoveFrom(meta)
    if (!move) return
    startTransition(async () => {
      const result = await changeProspectingActionStatus(move.id, move.status)
      if (!result.ok) {
        setColumns(meta.previousValue)
        toast.error("Une erreur est survenue, réessayez")
      }
    })
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="Aucune action"
        description="Aucune action pour le moment. Créez-en une via le bouton ci-dessus."
        // Bordure pleine des surfaces admin, pas le border-dashed du registry.
        className="border border-solid"
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-45" aria-label="Période">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BOARD_PERIODS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="overflow-x-auto py-1">
        <Kanban
          value={columns}
          onValueChange={setColumns}
          getItemValue={getActionId}
          onValueCommit={handleCommit}
          restoreOnCancel
        >
          <KanbanBoard className="grid-flow-col auto-cols-[minmax(13.75rem,1fr)] sm:grid-cols-none">
            {BOARD_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                actions={columns[status] ?? []}
                onOpen={setSelectedAction}
              />
            ))}
          </KanbanBoard>
          <KanbanOverlay className="rounded-md border-2 border-dashed bg-muted/10" />
        </Kanban>
      </div>

      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null)
        }}
      />
      {editedAction ? (
        <ProspectingActionFormDialog
          key={editKey}
          action={editedAction}
          personOptions={personOptions}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 5 : Page Pipeline et menu

**Files:**
- Create: `src/app/admin/(protected)/actions-prospection/pipeline/page.tsx`
- Create: `src/app/admin/(protected)/actions-prospection/pipeline/loading.tsx`
- Modify: `src/config/admin-nav-items.ts`

**Interfaces:**
- Consumes: `ActionsBoard` (Task 4), `NewActionHeaderButton` (Task 3), `BOARD_STATUSES` (Task 1), `findAllProspectingActionsForAdmin` (`09`), `findPersonOptions` (`07`, `@/server/queries/persons`)
- Produces: rien

- [ ] **Step 1 : Page**

`src/app/admin/(protected)/actions-prospection/pipeline/page.tsx` :

```tsx
import { Suspense } from "react"

import { NewActionHeaderButton } from "@/components/features/admin/prospection/ActionsViewPage"
import { ActionsBoard } from "@/components/features/admin/prospection/ActionsBoard"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Skeleton } from "@/components/ui/skeleton"
import { BOARD_STATUSES } from "@/lib/action-board"
import { getCurrentUser } from "@/lib/get-current-user"
import { findPersonOptions } from "@/server/queries/persons"
import { findAllProspectingActionsForAdmin } from "@/server/queries/prospecting-actions"

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-8 w-45" />
      <div className="grid grid-flow-col auto-cols-[minmax(13.75rem,1fr)] gap-4 overflow-hidden">
        {BOARD_STATUSES.map((status) => (
          <Skeleton key={status} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

async function BoardSection() {
  const [actions, personOptions] = await Promise.all([
    findAllProspectingActionsForAdmin(),
    findPersonOptions(),
  ])
  return <ActionsBoard actions={actions} personOptions={personOptions} />
}

export default async function AdminActionsPipelinePage() {
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Pipeline de prospection"
      subtitle="Une carte par action, groupées par statut. Le glisser-déposer change le statut."
      actions={<NewActionHeaderButton />}
    >
      <Suspense fallback={<BoardSkeleton />}>
        <BoardSection />
      </Suspense>
    </AdminPageShell>
  )
}
```

`src/app/admin/(protected)/actions-prospection/pipeline/loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 2 : Menu**

Dans `src/config/admin-nav-items.ts`, dans les `subItems` d'Actions prospection, insérer entre Candidatures et Journal :

```ts
          { label: "Pipeline", href: "/admin/actions-prospection/pipeline" },
```

- [ ] **Step 3 : Qualité**

Run: `just typecheck`
Expected: aucune erreur (si le typage des `href` échoue, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

---

### Task 6 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 5
- Produces: rien

- [ ] **Step 1 : Menu et tableau**

Run: `just dev`, se connecter, avoir des actions à chacun des cinq statuts.
Expected: la sous-entrée Pipeline, entre Candidatures et Journal, s'active sur sa page ; le bouton « Nouvelle action » est dans l'en-tête ; cinq colonnes À faire, Fait, Répondu, Converti, Ignoré avec leur icône et leur nombre ; dans chacune, la carte la plus récente en haut.

- [ ] **Step 2 : Glisser vers une autre colonne**

Créer une connexion LinkedIn À faire datée d'hier, puis glisser sa carte dans Fait.
Expected: la carte reste dans Fait, sa date devient l'heure du lâcher ; elle apparaît dans Actions prospection > Connexions et plus dans À faire.

- [ ] **Step 3 : Glisser dans la même colonne**

Onglet Réseau des outils du navigateur ouvert, glisser une carte plus bas dans sa propre colonne, puis recharger la page.
Expected: aucune requête de Server Action au lâcher ; au rechargement, la colonne revient à l'ordre des dates.

- [ ] **Step 4 : Annuler à Échap**

Commencer à glisser une carte au-dessus d'une autre colonne, puis appuyer sur Échap.
Expected: la carte revient à sa place d'origine, aucune requête envoyée.

- [ ] **Step 5 : Échec**

Ouvrir le Journal dans un second onglet, y supprimer une action, puis, dans le premier onglet sans recharger, glisser la carte de cette action dans une autre colonne.
Expected: la carte revient à sa place, le toast « Une erreur est survenue, réessayez » s'affiche.

- [ ] **Step 6 : Clic, détail et modification**

Cliquer une carte sans la déplacer, puis « Modifier » ; enregistrer un nouveau titre. Rouvrir ensuite une autre carte et « Modifier ».
Expected: la vue détail montre titre, rang, lead, canal, date et statut ; le formulaire s'ouvre prérempli, le toast « Action mise à jour » suit l'enregistrement et la carte prend son nouveau titre ; le second formulaire montre la seconde action, jamais la première. Un glisser n'ouvre jamais la vue détail.

- [ ] **Step 7 : Clavier**

Atteindre une carte à la touche Tab, puis Entrée.
Expected: un anneau de focus entoure la carte ; Entrée ouvre sa vue détail.

- [ ] **Step 8 : Colonne vide et période**

Glisser la seule carte d'une colonne ailleurs, puis en glisser une autre dans cette colonne vidée. Choisir ensuite « 30 jours » avec une action datée d'hier et une d'il y a deux mois (date modifiée par le formulaire), puis « Toute la période ».
Expected: la colonne vidée garde sa hauteur et reçoit la carte ; « 30 jours » ne garde que l'action d'hier, « Toute la période » les rend toutes.

- [ ] **Step 9 : Téléphone et opposition**

Réduire la fenêtre à 400px de large ; passer un lead avec actions en « Ne plus contacter » (case d'effacement décochée).
Expected: le tableau défile horizontalement sans que la page déborde ; les cartes de ce lead restent visibles et déplaçables. Puis `just stop`.
