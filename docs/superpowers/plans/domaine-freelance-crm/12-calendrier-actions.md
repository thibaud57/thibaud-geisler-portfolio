# Calendrier des actions de prospection : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La vue Calendrier des actions de prospection : grille du mois, une pastille par action colorée selon son statut, clic vers la vue détail, clic sur un jour vers une nouvelle action datée de ce jour, glisser d'une action À faire vers un autre jour pour la replanifier.

**Architecture:** Une Server Action testée (`rescheduleProspectingAction`) replanifie sous garde du statut À faire, dans la requête même. Un module pur (`action-calendar`) traduit les actions en événements, calcule l'instant replanifié et porte les textes français du composant. `ActionsCalendar` compose l'EventCalendar ReUI en vue mois, événements contrôlés en état local réalignés sur chaque lecture du serveur, et réutilise la vue détail et le formulaire contrôlé du `11`.

**Tech Stack:** Next.js 16 App Router, React 19, ReUI EventCalendar (`date-fns`, `@date-fns/tz`), shadcn/ui `radix-nova` (ScrollArea tiré par le registre), Zod 4, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/12-calendrier-actions-design.md`

## Global Constraints

- **Prérequis** : plans `07` (`findPersonOptions`, `PersonOption`), `09` (`src/server/actions/prospecting-actions.ts` et son test, `invalidateActionCaches`, `createActionLogger`, `ProspectingActionFormState`), `10` (`rankActions`) et `11` (registre `@reui` dans `components.json`, `buildActionDetail` dans `action-detail.tsx`, `ProspectingActionFormDialog` en mode contrôlé, `NewActionHeaderButton`, sous-entrée Pipeline) implémentés.
- **Route** : `/admin/actions-prospection/calendrier`, titre « Calendrier des actions », sous-titre « Chaque action posée sur sa date. »
- **Vue** : mois seule, en français, semaine commençant le lundi, mois courant à l'ouverture.
- **Couleurs** : À faire `warning`, Fait `info`, Répondu et Converti `success`, Ignoré `destructive`.
- **Glisser** : action À faire seulement, heure gardée, jour changé ; aucune action ne se redimensionne. Échec : retour à la dernière lecture et toast « Une erreur est survenue, réessayez ».
- **Replanifier côté serveur** : instant ISO complet avec décalage, mise à jour conditionnée à `status: "A_FAIRE"` dans la même requête ; aucune ligne touchée vaut refus.
- **Installation** : la CLI n'écrase aucun composant `src/components/ui/` existant.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/shadcn-ui/setup.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/zod/validation.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Action passée à Fait ailleurs puis glissée ici** : le serveur refuse, la pastille revient, un toast s'affiche. Couvert par « refuses to move an action already sent » (Task 1) et vérifié à la Task 6, Step 4.
- **Replanifier par-dessus un changement d'heure** (dernier dimanche d'octobre) : l'action garde son heure affichée, l'instant se construisant avec les accesseurs locaux. Vérifié à la Task 6, Step 3.
- **Clic sur une pastille dans un jour** : il ouvre la vue détail de l'action, jamais le formulaire de création du jour. Vérifié à la Task 6, Step 5.
- **Formulaire de création ouvert deux fois de suite sur deux jours différents** : chaque ouverture porte le jour cliqué (dialogue remonté par une clé). Vérifié à la Task 6, Step 6.
- **Téléphone** : la grille reste lisible (en-têtes de jour réduits par le composant) sans faire déborder la page. Vérifié à la Task 6, Step 7.

---

### Task 1 : Replanifier une action

**Files:**
- Modify: `src/server/actions/prospecting-actions.ts`
- Test: `src/server/actions/prospecting-actions.test.ts`

**Interfaces:**
- Consumes: `getCurrentUser`, `prisma`, `createActionLogger`, `invalidateActionCaches`, `ProspectingActionFormState` (`09`)
- Produces: `rescheduleProspectingAction(id: string, occurredAt: string): Promise<ProspectingActionFormState>`

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `src/server/actions/prospecting-actions.test.ts` :

- ajouter `updateMany: vi.fn(),` au mock `prospectingAction` de `vi.mock("@/lib/prisma", …)` ;
- ajouter `rescheduleProspectingAction` à l'import de `./prospecting-actions` ;
- ajouter à la fin du fichier :

```ts
describe("rescheduleProspectingAction", () => {
  const THURSDAY = new Date("2026-03-12T08:00:00Z")

  it("moves a to-do action to its new time", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValue({ count: 1 } as never)

    const state = await rescheduleProspectingAction("a1", THURSDAY.toISOString())

    expect(state.ok).toBe(true)
    expect(prisma.prospectingAction.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", status: "A_FAIRE" },
      data: { occurredAt: THURSDAY },
    })
  })

  it("refuses to move an action already sent", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValue({ count: 0 } as never)

    const state = await rescheduleProspectingAction("a1", THURSDAY.toISOString())

    expect(state.ok).toBe(false)
    expect(state.errors.occurredAt).toEqual(["Seule une action à faire se replanifie"])
  })

  it("rejects a date without its time zone offset", async () => {
    const state = await rescheduleProspectingAction("a1", "2026-03-12T09:00")

    expect(state.errors.occurredAt).toBeDefined()
    expect(prisma.prospectingAction.updateMany).not.toHaveBeenCalled()
  })

  it("rejects a reschedule without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = rescheduleProspectingAction("a1", THURSDAY.toISOString())

    await expect(result).rejects.toThrow()
    expect(prisma.prospectingAction.updateMany).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/prospecting-actions.test.ts`
Expected: FAIL, `rescheduleProspectingAction` n'est pas exporté.

- [ ] **Step 3 : Écrire l'action**

Dans `src/server/actions/prospecting-actions.ts`, après `changeProspectingActionStatus` :

```ts
const instantSchema = z.iso.datetime({ offset: true })

// La garde vit dans la requête (updateMany conditionné au statut), pas seulement dans le calendrier : une action passée à Fait dans un autre onglet garde sa date réelle d'envoi.
export async function rescheduleProspectingAction(
  id: string,
  occurredAt: string,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return createActionLogger("rescheduleProspectingAction", async ({ log }) => {
    const parsed = instantSchema.safeParse(occurredAt)
    if (!parsed.success) {
      return { ok: false, errors: { occurredAt: ["Date invalide"] }, message: null }
    }

    try {
      const { count } = await prisma.prospectingAction.updateMany({
        where: { id, status: "A_FAIRE" },
        data: { occurredAt: new Date(parsed.data) },
      })
      if (count === 0) {
        log.warn({ event: "prospecting_action:reschedule_refused", id })
        return {
          ok: false,
          errors: { occurredAt: ["Seule une action à faire se replanifie"] },
          message: null,
        }
      }
      invalidateActionCaches()
      log.info({ event: "prospecting_action:rescheduled", id })
      return { ok: true, errors: {}, message: null }
    } catch (err) {
      log.error({ err, event: "prospecting_action:reschedule_failed", id })
      return { ok: false, errors: {}, message: "unknown_error" }
    }
  })
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/prospecting-actions.test.ts`
Expected: PASS, les tests du `09` compris.

---

### Task 2 : Installation de l'EventCalendar ReUI

**Files:**
- Create: `src/components/reui/event-calendar/*.tsx` (13 fichiers), `src/components/reui/icon-stack.tsx`, `src/components/ui/scroll-area.tsx` (copiés par la CLI)
- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `docs/VERSIONS.md` (skill `versions-doc`)
- Modify: `docs/DESIGN.md` (skill `design-doc`)

**Interfaces:**
- Consumes: registre `@reui` (`11`)
- Produces, API lue le 2026-09-27 dans `https://reui.io/r/radix-nova/event-calendar.json` :
  - `EventCalendar` (`@/components/reui/event-calendar/event-calendar`) : `events`, `onEventsChange(events)`, `onEventUpdate(update) => boolean | void | { start?, end?, allDay? }`, `onEventClick(occurrence, e)`, `onSlotClick(slot, e)`, `views`, `defaultView`, `locale`, `weekStartsOn`, `i18n`, `interactions: { drag, resize, selectSlot }`, `scrollMode: "contained" | "page"`, `className`, enfants composés ;
  - `EventCalendarNav({ showViewSwitcher })` (`…/event-calendar-nav`), `EventCalendarContent` (`…/event-calendar-content`) ;
  - types `CalendarEvent<TData>` (`id`, `title`, `start`, `end`, `color`, `draggable`, `resizable`, `data`), `EventCalendarProposedUpdate<TData>` (`event`, `start`, `end`, `allDay`, `source`), `EventCalendarSlotInfo` (`date`, `allDay`, `view`) (`…/event-calendar-types`), `EventCalendarI18nOverrides` (`…/event-calendar-i18n`).

- [ ] **Step 1 : Voir ce que la CLI va écrire**

Run: `pnpm dlx shadcn@latest add @reui/event-calendar --dry-run`
Expected: les 13 fichiers `src/components/reui/event-calendar/`, `src/components/reui/icon-stack.tsx`, `src/components/ui/scroll-area.tsx` en création ; `button`, `calendar`, `dropdown-menu`, `popover`, `tooltip` déjà présents.

- [ ] **Step 2 : Ajouter le composant**

Run: `pnpm dlx shadcn@latest add @reui/event-calendar`
Répondre **non** à toute proposition d'écraser un fichier existant (`calendar.tsx` porte les corrections du projet). Si la CLI échoue ou reste interactive d'une manière non prévue, demander au propriétaire de la lancer dans son terminal.

Run: `git status --short src/components/ui`
Expected: seule la ligne `?? src/components/ui/scroll-area.tsx`.

- [ ] **Step 3 : Corrections de la rule (`.claude/rules/shadcn-ui/setup.md`)**

- dans tous les fichiers ajoutés, remplacer `import { cn } from "cn"` par `import { cn } from "@/lib/utils"`, puis :

Run: `pnpm remove cn`

- remplacer chaque `<XContext.Provider value={…}>…</XContext.Provider>` par `<XContext value={…}>…</XContext>` (`.claude/rules/react/hooks.md`) ;
- vérifier que la CLI a traduit les icônes du registre en `lucide-react` :

Run: `grep -rn "icon-placeholder\|IconPlaceholder" src/components/reui`
Expected: aucune ligne. Sinon, remplacer chaque `<IconPlaceholder lucide="XIcon" … />` par le composant `XIcon` importé de `lucide-react`, et retirer l'import `@/app/(create)/components/icon-placeholder`.

- [ ] **Step 4 : Typage strict**

Run: `just typecheck`
Expected, mesuré au bac à sable le 2026-09-27 : environ 29 erreurs, toutes dans `src/components/reui/event-calendar/`, à lever sans changer le comportement :

- `TS4111` (`event-calendar-dnd.tsx`) : `el.dataset.ecDay` s'écrit `el.dataset["ecDay"]` (idem `ecBoundsStart`, `ecBoundsEnd`, `ecResource`) ;
- `TS2532`, `TS18048`, `TS2345`, `TS2322` (`event-calendar-lib.tsx`, `-month-view.tsx`, `-recurrence.tsx`, `-time-grid.tsx`) : une lecture par indice (`weeks[i]`, `row[j]`, déstructuration de `split`) rend `T | undefined` sous `noUncheckedIndexedAccess`. Garder l'élément par un `if (x === undefined) continue` (ou `return`) là où la boucle le permet, sinon sortir la valeur dans une constante gardée ; jamais d'assertion `!`, que le lint refuse.

Relancer jusqu'à zéro erreur.

- [ ] **Step 5 : Lint strict**

Run: `pnpm eslint --fix src/components/reui src/components/ui/scroll-area.tsx`
puis `just format`, puis `just lint`.

Expected, mesuré au bac à sable : environ 110 remarques avant `--fix`, dont 48 corrigées d'office. Les restantes se lèvent sans changer le comportement :

- `no-confusing-void-expression` : corps de flèche entre accolades ;
- `unbound-method` : passer par une flèche (`(value) => api.method(value)`) ;
- `no-non-null-assertion` : garde explicite, comme à l'étape précédente ;
- `restrict-plus-operands` : gabarit de chaîne au lieu d'un `+` mêlant nombre et chaîne ;
- `no-unused-vars` : retirer la variable, ou la préfixer d'un `_` si c'est un paramètre de signature ;
- règles `react-hooks/*` du compilateur (`refs`, `purity`, `set-state-in-effect`, `exhaustive-deps`) : corriger si la correction ne change pas le comportement ; sinon, un `// eslint-disable-next-line <règle> -- <pourquoi>` sur la seule ligne, le pourquoi disant la contrainte du composant ;
- toute remarque `no-unsafe-*` restante (le bac à sable en montrait, dues à ses dépendances simulées) : typer la valeur à sa source.

Expected final : `just typecheck` et `just lint` sans erreur.

- [ ] **Step 6 : Versions**

Invoquer le skill `versions-doc` pour `docs/VERSIONS.md` : la ligne ReUI du tableau Framework & UI passe à « `Kanban` et `EventCalendar` installés », et une entrée `@date-fns/tz` (fuseaux de l'EventCalendar, compagnon de `date-fns`) est ajoutée, version lue dans `package.json` après l'installation.

- [ ] **Step 7 : Design**

Invoquer le skill `design-doc` pour `docs/DESIGN.md` :

- § Mapping Composants : la ligne « Agenda mensuel » quitte § Post-MVP (non installés) pour § Cards et grilles, à côté du Tableau kanban, réécrite ainsi :

```markdown
| Agenda mensuel | EventCalendar | ReUI | Calendrier des actions de prospection (admin), puis revues hebdo et agenda de l'accueil. Vue mois seule, en français (locale `fr`, semaine au lundi, textes et formats d'heure surchargés), défilement avec la page (`scrollMode="page"`), dans une surface de `Card`. Pastille teintée par la couleur de l'événement (`var(--color-<rampe>)`, rampes sémantiques). Événements contrôlés (`events` et `onEventsChange`) en état local ; `onEventUpdate` enregistre par Server Action et peut ajuster l'instant proposé ; le glisser se limite par événement (`draggable`). Tire `ScrollArea` (shadcn) pour ses seules surfaces défilantes |
```

- § Post-MVP, ligne « Primitifs d'interface » : ne garde que `Collapsible`, `ScrollArea` étant installé ;
- § Stack UI, ligne ReUI : « Admin : `Kanban` (pipeline des actions de prospection) et `EventCalendar` (calendrier des actions) installés » ;
- § Ressources, ligne ReUI : « `Kanban` et `EventCalendar` pour les vues pipeline et calendrier de l'admin ».

---

### Task 3 : Événements, textes français et date proposée

**Files:**
- Create: `src/lib/action-calendar.ts`
- Modify: `src/components/features/admin/prospection/ProspectingActionFormDialog.tsx`

**Interfaces:**
- Consumes: types de la Task 2 ; type `ActionStatus` (`09`)
- Produces: `actionEvents<T extends CalendarActionRow>(actions: readonly T[]): CalendarEvent<T>[]` ; `rescheduledTiming(day: Date, occurredAt: Date): { start: Date; end: Date; allDay: false }` ; `ACTION_CALENDAR_I18N: EventCalendarI18nOverrides` ; `ProspectingActionFormDialog({ …, defaultDate?: Date })`

- [ ] **Step 1 : Module des événements**

`src/lib/action-calendar.ts` :

```ts
import type { EventCalendarI18nOverrides } from "@/components/reui/event-calendar/event-calendar-i18n"
import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types"
import type { ActionStatus } from "@/generated/prisma/client"

// Une action est un instant : le composant exige une fin, qui ne se lit nulle part en vue mois.
const EVENT_DURATION_MS = 30 * 60_000

const STATUS_COLORS: Record<ActionStatus, string> = {
  A_FAIRE: "var(--color-warning)",
  FAIT: "var(--color-info)",
  REPONDU: "var(--color-success)",
  CONVERTI: "var(--color-success)",
  IGNORE: "var(--color-destructive)",
}

export interface CalendarActionRow {
  id: string
  title: string
  status: ActionStatus
  occurredAt: Date
}

export function actionEvents<T extends CalendarActionRow>(actions: readonly T[]): CalendarEvent<T>[] {
  return actions.map((action) => ({
    id: action.id,
    title: action.title,
    start: action.occurredAt,
    end: new Date(action.occurredAt.getTime() + EVENT_DURATION_MS),
    color: STATUS_COLORS[action.status],
    draggable: action.status === "A_FAIRE",
    resizable: false,
    data: action,
  }))
}

// Accesseurs locaux : l'heure affichée se garde même quand le jour d'arrivée change d'heure légale.
export function rescheduledTiming(
  day: Date,
  occurredAt: Date,
): { start: Date; end: Date; allDay: false } {
  const start = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    occurredAt.getHours(),
    occurredAt.getMinutes(),
  )
  return { start, end: new Date(start.getTime() + EVENT_DURATION_MS), allDay: false }
}

export const ACTION_CALENDAR_I18N: EventCalendarI18nOverrides = {
  labels: {
    today: "Aujourd'hui",
    previous: "Précédent",
    next: "Suivant",
    addEvent: "Nouvelle action",
    allDay: "Toute la journée",
    more: (count) => `+${count} autres`,
    noEvents: "Aucune action",
    loading: "Chargement des actions",
    event: "action",
    events: (count) => (count === 1 ? "1 action" : `${count} actions`),
    selectView: "Choisir la vue",
    week: (weekNumber) => `S${weekNumber}`,
    goToDate: "Aller à la date",
    dropNotAllowed: "Déplacement impossible",
    continues: "suite",
    timeRange: (from, to) => `${from} - ${to}`,
  },
  viewNames: { month: "Mois" },
  formats: {
    dayTitle: "EEEE d MMMM yyyy",
    moreDayHeader: "EEEE d MMMM",
    eventTime: "HH:mm",
    timeGutter: "HH'h'",
    timeGutterMinute: "HH:mm",
  },
}
```

- [ ] **Step 2 : Date proposée par le formulaire**

Dans `ProspectingActionFormDialog.tsx` :

- ajouter à `Props` :

```tsx
  // Nouvelle action seulement : le jour cliqué sur le calendrier.
  defaultDate?: Date
```

- ajouter `defaultDate` aux paramètres déstructurés de `ProspectingActionFormDialog`, et `defaultDate={defaultDate}` aux props de `<ProspectingActionForm … />` ;
- dans `ProspectingActionForm`, ajouter `defaultDate` à ses paramètres et à leur type (`defaultDate: Date | undefined`), puis remplacer :

```tsx
  const [date, setDate] = useState<Date | undefined>(action?.occurredAt ?? now)
```

par :

```tsx
  const [date, setDate] = useState<Date | undefined>(action?.occurredAt ?? defaultDate ?? now)
```

L'heure reste l'heure courante (`timeOf(action?.occurredAt ?? now)`), inchangée.

- [ ] **Step 3 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Calendrier des actions

**Files:**
- Create: `src/components/features/admin/prospection/ActionsCalendar.tsx`

**Interfaces:**
- Consumes: Tasks 1 à 3 ; `buildActionDetail`, `ProspectingActionFormDialog` en mode contrôlé (`11`) ; `rankActions` (`10`)
- Produces: `ActionsCalendar({ actions, personOptions }: { actions: readonly AdminProspectingAction[]; personOptions: readonly PersonOption[] })`

- [ ] **Step 1 : Écrire le composant**

`src/components/features/admin/prospection/ActionsCalendar.tsx` :

```tsx
"use client"

import { startTransition, useMemo, useState } from "react"
import { fr } from "date-fns/locale"
import { CalendarDays } from "lucide-react"
import { toast } from "sonner"

import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { EmptyState } from "@/components/features/admin/EmptyState"
import { buildActionDetail } from "@/components/features/admin/prospection/action-detail"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import { EventCalendar } from "@/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content"
import { EventCalendarNav } from "@/components/reui/event-calendar/event-calendar-nav"
import type {
  CalendarEvent,
  EventCalendarProposedUpdate,
  EventCalendarSlotInfo,
} from "@/components/reui/event-calendar/event-calendar-types"
import { ACTION_CALENDAR_I18N, actionEvents, rescheduledTiming } from "@/lib/action-calendar"
import { rankActions } from "@/lib/action-rank"
import { rescheduleProspectingAction } from "@/server/actions/prospecting-actions"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

type ActionEvent = CalendarEvent<AdminProspectingAction>

interface FormTarget {
  action: AdminProspectingAction | null
  defaultDate?: Date
}

interface Props {
  actions: readonly AdminProspectingAction[]
  personOptions: readonly PersonOption[]
}

export function ActionsCalendar({ actions, personOptions }: Props) {
  const [syncedActions, setSyncedActions] = useState(actions)
  const [events, setEvents] = useState<ActionEvent[]>(() => actionEvents(actions))
  const [selectedAction, setSelectedAction] = useState<AdminProspectingAction | null>(null)
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  // Nouvelle lecture du serveur (revalidation après une écriture) : le calendrier s'y réaligne pendant le rendu plutôt que par un effet qui peindrait d'abord l'état périmé.
  if (actions !== syncedActions) {
    setSyncedActions(actions)
    setEvents(actionEvents(actions))
  }

  const ranks = useMemo(() => rankActions(actions), [actions])

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedAction
        ? buildActionDetail(selectedAction, ranks.get(selectedAction.id) ?? 0, () => {
            setFormTarget({ action: selectedAction })
            // Nouvelle clé : le dialogue remonte sur sa cible, jamais sur la précédente.
            setFormKey((key) => key + 1)
            setFormOpen(true)
          })
        : null,
    [selectedAction, ranks],
  )

  function handleSlotClick(slot: EventCalendarSlotInfo) {
    setFormTarget({ action: null, defaultDate: slot.date })
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  function handleEventUpdate(update: EventCalendarProposedUpdate<AdminProspectingAction>) {
    const action = update.event.data
    if (action?.status !== "A_FAIRE") return false
    const timing = rescheduledTiming(update.start, action.occurredAt)
    startTransition(async () => {
      const result = await rescheduleProspectingAction(action.id, timing.start.toISOString())
      if (!result.ok) {
        setEvents(actionEvents(actions))
        toast.error("Une erreur est survenue, réessayez")
      }
    })
    return timing
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Aucune action"
        description="Aucune action pour le moment. Créez-en une via le bouton ci-dessus."
        // Bordure pleine des surfaces admin, pas le border-dashed du registry.
        className="border border-solid"
      />
    )
  }

  return (
    <>
      <EventCalendar
        events={events}
        onEventsChange={setEvents}
        onEventUpdate={handleEventUpdate}
        onEventClick={(occurrence) => {
          if (occurrence.event.data) setSelectedAction(occurrence.event.data)
        }}
        onSlotClick={handleSlotClick}
        views={["month"]}
        defaultView="month"
        locale={fr}
        weekStartsOn={1}
        i18n={ACTION_CALENDAR_I18N}
        interactions={{ drag: true, resize: false, selectSlot: false }}
        scrollMode="page"
        className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10"
      >
        <EventCalendarNav showViewSwitcher={false} />
        <EventCalendarContent />
      </EventCalendar>

      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null)
        }}
      />
      {formTarget ? (
        <ProspectingActionFormDialog
          key={formKey}
          action={formTarget.action}
          defaultDate={formTarget.defaultDate}
          personOptions={personOptions}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      ) : null}
    </>
  )
}
```

- [ ] **Step 2 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 5 : Page Calendrier et menu

**Files:**
- Create: `src/app/admin/(protected)/actions-prospection/calendrier/page.tsx`
- Create: `src/app/admin/(protected)/actions-prospection/calendrier/loading.tsx`
- Modify: `src/config/admin-nav-items.ts`

**Interfaces:**
- Consumes: `ActionsCalendar` (Task 4), `NewActionHeaderButton` (`11`), `findAllProspectingActionsForAdmin` (`09`), `findPersonOptions` (`07`, `@/server/queries/persons`)
- Produces: rien

- [ ] **Step 1 : Page**

`src/app/admin/(protected)/actions-prospection/calendrier/page.tsx` :

```tsx
import { Suspense } from "react"

import { ActionsCalendar } from "@/components/features/admin/prospection/ActionsCalendar"
import { NewActionHeaderButton } from "@/components/features/admin/prospection/ActionsViewPage"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findPersonOptions } from "@/server/queries/persons"
import { findAllProspectingActionsForAdmin } from "@/server/queries/prospecting-actions"

async function CalendarSection() {
  const [actions, personOptions] = await Promise.all([
    findAllProspectingActionsForAdmin(),
    findPersonOptions(),
  ])
  return <ActionsCalendar actions={actions} personOptions={personOptions} />
}

export default async function AdminActionsCalendarPage() {
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Calendrier des actions"
      subtitle="Chaque action posée sur sa date."
      actions={<NewActionHeaderButton />}
    >
      <Suspense fallback={<Skeleton className="h-160 rounded-xl" aria-hidden />}>
        <CalendarSection />
      </Suspense>
    </AdminPageShell>
  )
}
```

`src/app/admin/(protected)/actions-prospection/calendrier/loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 2 : Menu**

Dans `src/config/admin-nav-items.ts`, dans les `subItems` d'Actions prospection, insérer entre Pipeline et Journal :

```ts
          { label: "Calendrier", href: "/admin/actions-prospection/calendrier" },
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

- [ ] **Step 1 : Menu et mois**

Run: `just dev`, se connecter, avoir des actions ce mois-ci à chacun des cinq statuts.
Expected: la sous-entrée Calendrier, entre Pipeline et Journal, s'active sur sa page ; « Nouvelle action » dans l'en-tête ; le mois courant, semaine du lundi au dimanche, titre et jours en français ; chaque action à sa date avec son heure au format 24 h, colorée selon son statut ; aucun sélecteur de vue ; « Aujourd'hui », précédent et suivant changent de mois.

- [ ] **Step 2 : Replanifier**

Glisser une action À faire d'un lundi 9 h sur le jeudi suivant ; tenter de glisser une action Fait.
Expected: la première reste jeudi à 9 h, et la vue À faire l'affiche à cette date ; la seconde ne bouge pas.

- [ ] **Step 3 : Changement d'heure**

Créer une action À faire le vendredi 23 octobre 2026 à 9 h, puis la glisser sur le lundi 26 octobre (après le passage à l'heure d'hiver du 25).
Expected: elle s'affiche lundi 26 à 9 h, et la vue À faire indique la même heure.

- [ ] **Step 4 : Échec**

Dans un second onglet, passer une action À faire à Fait par la vue À faire ; dans le premier onglet, sans recharger, glisser cette action sur un autre jour.
Expected: la pastille revient à son jour, le toast « Une erreur est survenue, réessayez » s'affiche.

- [ ] **Step 5 : Clic sur une action**

Cliquer une pastille, puis « Modifier ».
Expected: la vue détail de l'action s'ouvre, jamais le formulaire de création du jour ; « Modifier » ouvre son formulaire prérempli.

- [ ] **Step 6 : Clic sur un jour**

Cliquer un jour vide, fermer, puis cliquer un autre jour et enregistrer une action.
Expected: le formulaire « Nouvelle action » s'ouvre chaque fois daté du jour cliqué, à l'heure courante ; l'action créée apparaît ce jour-là.

- [ ] **Step 7 : Téléphone et jour chargé**

Réduire la fenêtre à 400px de large ; mettre cinq actions le même jour.
Expected: la grille reste lisible sans que la page déborde ; le jour chargé montre « +N autres », qui ouvre la liste du jour. Puis `just stop`.
