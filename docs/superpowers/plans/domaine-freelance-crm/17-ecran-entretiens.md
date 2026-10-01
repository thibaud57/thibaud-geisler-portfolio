# Écran des entretiens : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'écran Entretiens (À venir, Journal, page de création et de modification en cards, détail, suppression), la card Entretiens avec « Nouvel entretien » sur la page d'une mission, le bloc Entretiens des missions, le bloc, la colonne et la card Entretiens des leads.

**Architecture:** Un module pur testé (`interview-views`) porte les deux vues. `InterviewsTable` reprend le motif des listes admin et calcule les titres sur tous les entretiens (`interviewPlaces`, `16`) ; `InterviewForm` reprend le motif de `LeadForm` (`08`) : page en cards, avec une mission de départ passée par `?mission=<id>` depuis la card Entretiens de la page d'une mission, un correspondant choisi parmi les personnes non opposées ou ajouté en ligne (nouvelle personne), et une issue visible et obligatoire seulement quand le statut vaut Fait. Le champ date et heure du formulaire des actions (`10`) sort dans un composant partagé.

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui `radix-nova` (Card, RadioGroup, Select, Popover, Calendar, Command), Pages CMS Editor (ADR-024), Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/17-ecran-entretiens-design.md`

## Global Constraints

- **Prérequis** : plans `07` (`findPersonOptions()`, `PersonOption`, `personFields`, `JOB_ROLES`, `JOB_ROLE_LABELS`), `08` (`LeadForm`, page du lead, `RelatedLinksCard`, `findCompanyOptions()`, `CompanyOption`, `SelectField`), `10` (`DateTimeField` local à `ProspectingActionFormDialog`, `timeOf`, `toInstant`, `formatShortDateTime`), `15` (`MissionsTable`, `DeleteMissionDialog`, `AdminMission`, page de la mission, `findMissionByIdForAdmin`) et `16` (`AdminInterview`, `findAllInterviewsForAdmin`, `createInterview`, `updateInterview`, `deleteInterview`, `interviewPlaces`, `interviewTitle`, libellés `INTERVIEW_*`, `interviewDetailsTemplate`, `detailsAfterTemplateChange`, `AdminLead.interviews`, `AdminLead.interviewsCount`) implémentés.
- **Routes et titres** : À venir `/admin/entretiens` « Entretiens à venir », sous-titre « Ceux qui restent à tenir, le prochain en premier. » ; Journal `/admin/entretiens/journal` « Journal des entretiens », sous-titre « Toutes les fiches, passées et à venir, la plus récente en premier. »
- **Vues** : À venir = statut `PLANIFIE` et date non passée, le prochain d'abord ; Journal = tous, le plus récent d'abord.
- **Missions proposées** : non closes (ni `REFUSEE`, ni `DECLINEE`, ni `ABANDONNEE`), la mission déjà reliée restant affichée.
- **Page ou modale** (arbitrages « Page ou modale d'édition » et « Élément rattaché à une fiche » de DESIGN.md) : l'entretien se crée sur `/admin/entretiens/nouveau` (mission de départ par `?mission=<id>`) et se modifie sur `/admin/entretiens/<id>`, en cards Mission, Échange, Détails, Évaluation, Notes ; la ligne ne porte que Modifier (lien) et Supprimer ; aucun bouton de ligne sur les missions, « Nouvel entretien » vit dans la card Entretiens de la page d'une mission.
- **Issue** : champ masqué tant que le statut n'est pas Fait, facultative dès qu'il le devient (`16`).
- **Textes** : suppression d'un entretien « Les entretiens suivants de la mission se renumérotent. » ; suppression d'une mission « Ses entretiens sont supprimés avec elle. L'apporteur, l'ESN et le client final restent. »
- **Menu** : entrée « Entretiens », sous-entrées « À venir » et « Journal ».
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Mission changée pour une mission sans ESN alors que « Mené par » est sur l'ESN** : le choix passe au client final, sans enregistrement refusé ensuite. Vérifié à la Task 7, Step 2.
- **Titre dans la vue À venir** : « Entretien 2 » reste « Entretien 2 » même si l'entretien 1, passé, n'est pas dans la vue. Vérifié à la Task 7, Step 3 (les titres se calculent sur tous les entretiens).
- **Entretien d'une mission close ouvert en modification** : sa mission reste affichée dans le champ. Vérifié à la Task 7, Step 4.
- **Correspondant opposé** : il reste affiché dans le formulaire et la vue détail d'un entretien existant, sans être proposé pour un autre. Vérifié à la Task 7, Step 4.
- **Statut changé de Fait à Planifié** : Issue se masque sans bloquer l'enregistrement. Vérifié à la Task 7, Step 2.

---

### Task 1 : Vues des entretiens

**Files:**
- Create: `src/lib/interview-views.ts`
- Test: `src/lib/interview-views.test.ts`

**Interfaces:**
- Consumes: `InterviewStatus`
- Produces: `type InterviewView = "a-venir" | "journal"` ; `INTERVIEW_VIEWS` ; `interviewsForView<T extends InterviewViewRow>(interviews: readonly T[], view: InterviewView, now: number): T[]` ; `INTERVIEW_VIEW_PAGES: Record<InterviewView, { title: string; subtitle: string }>`

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/interview-views.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import type { InterviewStatus } from "@/generated/prisma/client"

import { interviewsForView } from "./interview-views"

const NOW = new Date(2026, 8, 27, 12, 0).getTime()

interface TestInterview {
  id: string
  status: InterviewStatus
  scheduledAt: Date
}

function interview(overrides: Partial<TestInterview> = {}): TestInterview {
  return { id: "i1", status: "PLANIFIE", scheduledAt: new Date(2026, 8, 28, 10, 0), ...overrides }
}

function idsOf(interviews: readonly TestInterview[]): string[] {
  return interviews.map((row) => row.id)
}

const INTERVIEWS = [
  interview({ id: "next-week", scheduledAt: new Date(2026, 9, 4, 10, 0) }),
  interview({ id: "this-morning", scheduledAt: new Date(2026, 8, 27, 9, 0) }),
  interview({ id: "tomorrow", scheduledAt: new Date(2026, 8, 28, 10, 0) }),
  interview({ id: "done", status: "FAIT", scheduledAt: new Date(2026, 8, 20, 10, 0) }),
  interview({ id: "cancelled", status: "ANNULE", scheduledAt: new Date(2026, 9, 1, 10, 0) }),
]

describe("interviewsForView", () => {
  it("keeps planned interviews still to come in the upcoming view, soonest first", () => {
    const rows = interviewsForView(INTERVIEWS, "a-venir", NOW)

    expect(idsOf(rows)).toEqual(["tomorrow", "next-week"])
  })

  it("keeps every interview in the journal, most recent first", () => {
    const rows = interviewsForView(INTERVIEWS, "journal", NOW)

    expect(idsOf(rows)).toEqual(["next-week", "cancelled", "tomorrow", "this-morning", "done"])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/interview-views.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Écrire les vues**

`src/lib/interview-views.ts` :

```ts
import type { InterviewStatus } from "@/generated/prisma/client"

export type InterviewView = "a-venir" | "journal"

export const INTERVIEW_VIEWS: readonly InterviewView[] = ["a-venir", "journal"]

export interface InterviewViewRow {
  status: InterviewStatus
  scheduledAt: Date
}

// L'ordre rendu est l'ordre d'affichage par défaut : DataTable le garde tant qu'aucune colonne n'est triée.
export function interviewsForView<T extends InterviewViewRow>(
  interviews: readonly T[],
  view: InterviewView,
  now: number,
): T[] {
  if (view === "journal") {
    return [...interviews].sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
  }
  return interviews
    .filter((interview) => interview.status === "PLANIFIE" && interview.scheduledAt.getTime() >= now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}

export const INTERVIEW_VIEW_PAGES: Record<InterviewView, { title: string; subtitle: string }> = {
  "a-venir": {
    title: "Entretiens à venir",
    subtitle: "Ceux qui restent à tenir, le prochain en premier.",
  },
  journal: {
    title: "Journal des entretiens",
    subtitle: "Toutes les fiches, passées et à venir, la plus récente en premier.",
  },
}
```

Run: `pnpm vitest run --project unit src/lib/interview-views.test.ts`
Expected: PASS.

---

### Task 2 : Champ date et heure partagé

**Files:**
- Create: `src/components/features/admin/DateTimeField.tsx`
- Modify: `src/components/features/admin/prospection/ProspectingActionFormDialog.tsx`
- Modify: `docs/DESIGN.md` (ligne « Champ date et heure »)

**Interfaces:**
- Consumes: `formatShortDate` (`@/lib/projects`)
- Produces: `DateTimeField({ id, label, errors, date, onDateChange, time, onTimeChange })`

- [ ] **Step 1 : Sortir le composant**

`src/components/features/admin/DateTimeField.tsx` reçoit la fonction `DateTimeField` de `ProspectingActionFormDialog.tsx`, exportée, avec ses imports :

```tsx
"use client"

import { useState } from "react"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatShortDate } from "@/lib/projects"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  label: string
  errors: string[] | undefined
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  time: string
  onTimeChange: (time: string) => void
}

export function DateTimeField({ id, label, errors, date, onDateChange, time, onTimeChange }: Props) {
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
```

Dans `ProspectingActionFormDialog.tsx`, supprimer la fonction locale `DateTimeField`, l'importer depuis `@/components/features/admin/DateTimeField` et retirer les imports devenus inutiles (`just lint` les signale).

- [ ] **Step 2 : Mapping de `docs/DESIGN.md`**

Charger le skill `design-doc`, puis déplacer la ligne « Champ date et heure » de § Post-MVP (non installés) vers § Formulaires, sans sa dernière phrase (« Rejoint § … ») : le composant est installé.

- [ ] **Step 3 : Vérifier**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 3 : Lectures et largeurs

**Files:**
- Modify: `src/server/queries/missions.ts`
- Modify: `src/server/queries/leads.ts`
- Modify: `src/lib/admin-table-widths.ts`

**Interfaces:**
- Consumes: modèle `Interview` (`16`) ; `findCompanyOptions()`, `CompanyOption` (`08`, posée pour la combobox Entreprise de `LeadForm`)
- Produces: `AdminMission.interviews: { id, missionId, type, status, scheduledAt, createdAt }[]` ; `findMissionOptions()`, `type MissionOption = { id, title, intermediary: { name } | null, client: { name } | null }` ; `AdminLead.interviews: { id, type, status, scheduledAt, mission: { title } }[]` ; `INTERVIEW_COLUMN_WIDTHS`, `InterviewColumnKey`, `INTERVIEW_DEFAULT_VISIBLE_COLUMNS`, `interviewSkeletonWidths()` ; `LEAD_COLUMN_WIDTHS.interviewsCount`

- [ ] **Step 1 : Missions**

Dans `src/server/queries/missions.ts`, ajouter à `adminMissionInclude` :

```ts
  interviews: {
    select: {
      id: true,
      missionId: true,
      type: true,
      status: true,
      scheduledAt: true,
      createdAt: true,
    },
    orderBy: { scheduledAt: "asc" },
  },
```

puis, à la fin du fichier :

```ts
// Missions sur lesquelles planifier un entretien : jamais une opportunité close.
export async function findMissionOptions() {
  return prisma.mission.findMany({
    where: { status: { notIn: ["REFUSEE", "DECLINEE", "ABANDONNEE"] } },
    select: {
      id: true,
      title: true,
      intermediary: { select: { name: true } },
      client: { select: { name: true } },
    },
    orderBy: { title: "asc" },
  })
}

export type MissionOption = Awaited<ReturnType<typeof findMissionOptions>>[number]
```

- [ ] **Step 2 : Leads**

Dans `src/server/queries/leads.ts`, remplacer l'entrée `interviews` de `adminLeadInclude.person.include` (posée par le `16`) par :

```ts
      interviews: {
        select: {
          id: true,
          type: true,
          status: true,
          scheduledAt: true,
          mission: { select: { title: true } },
        },
        orderBy: { scheduledAt: "desc" },
      },
```

et, dans `AdminLead`, élargir `interviews` à `{ id: string; type: InterviewType; status: InterviewStatus; scheduledAt: Date; mission: { title: string } }[]` (import de type `InterviewType`) ; `toAdminLead` lit déjà `row.person.interviews`.

- [ ] **Step 3 : Largeurs**

Dans `src/lib/admin-table-widths.ts` :

- dans `LEAD_COLUMN_WIDTHS`, ajouter `interviewsCount: 110,` après `actionsCount` ; dans `LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS.tous`, insérer `"interviewsCount"` juste après `"actionsCount"` (colonne `entretiens` de la maquette, affichée dans Tous) ;
- ajouter en tête l'import de type `import type { InterviewView } from "@/lib/interview-views"` (Task 1), puis à la fin :

```ts
export const INTERVIEW_COLUMN_WIDTHS = {
  // Une colonne triable tient son en-tête sur une ligne : libellé, icône de tri et marges du bouton dictent sa largeur.
  title: 210,
  mission: 200,
  side: 180,
  scheduledAt: 150,
  type: 140,
  status: 110,
  outcome: 110,
  zone: 150,
  workMode: 110,
  dailyRate: 90,
  score: 90,
  decision: 170,
  correspondents: 200,
  actions: 88,
} as const

export type InterviewColumnKey = keyof typeof INTERVIEW_COLUMN_WIDTHS

// À venir : colonnes affichées de la maquette (entrCols), plus Mission, portée par l'entretien.
// Journal, la vue complète, montre toutes ses colonnes (arbitrage « Colonnes par vue »).
export const INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<InterviewView, readonly InterviewColumnKey[]> = {
  "a-venir": [
    "mission",
    "side",
    "scheduledAt",
    "type",
    "status",
    "outcome",
    "zone",
    "workMode",
    "dailyRate",
    "score",
  ],
  journal: [
    "mission",
    "side",
    "scheduledAt",
    "type",
    "status",
    "outcome",
    "zone",
    "workMode",
    "dailyRate",
    "score",
    "decision",
    "correspondents",
  ],
}

export function interviewSkeletonWidths(view: InterviewView): readonly number[] {
  const keys: readonly InterviewColumnKey[] = [
    "title",
    ...INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
    "actions",
  ]
  return keys.map((key) => INTERVIEW_COLUMN_WIDTHS[key])
}
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Page d'un entretien et suppression

**Files:**
- Create: `src/components/features/admin/entretiens/InterviewForm.tsx`
- Create: `src/components/features/admin/entretiens/DeleteInterviewDialog.tsx`
- Modify: `src/server/queries/interviews.ts`
- Create: `src/app/admin/(protected)/entretiens/nouveau/page.tsx` et `loading.tsx`, `src/app/admin/(protected)/entretiens/[id]/page.tsx` et `loading.tsx`

**Interfaces:**
- Consumes: Tasks 2 et 3 ; actions, libellés, gabarits (`16`) ; `SelectField`, `MultiSelectCombobox`, `ComboboxPopover`, `RowActionButton`, `ConfirmDeleteDialog`, `Editor`, `RadioGroup`, `Card`, `AdminBreadcrumb`, `StackedSkeleton` ; `timeOf`, `toInstant` ; `personDisplayName` (`@/lib/persons`) ; `JOB_ROLES`, `JOB_ROLE_LABELS` (`@/lib/job-roles`, `07`) ; `findPersonOptions()` (`07`) ; `findCompanyOptions()`, `CompanyOption` (`08`)
- Produces: `InterviewForm({ interview, defaultMissionId, missionOptions, personOptions, companyOptions }: { interview: AdminInterview | null; defaultMissionId?: string; missionOptions: readonly MissionOption[]; personOptions: readonly PersonOption[]; companyOptions: readonly CompanyOption[] })` ; `DeleteInterviewDialog({ interview, title })` ; `findInterviewByIdForAdmin(id)` ; routes `/admin/entretiens/nouveau` (mission de départ par `?mission=<id>`) et `/admin/entretiens/<id>`

- [ ] **Step 1 : Suppression**

`src/components/features/admin/entretiens/DeleteInterviewDialog.tsx` :

```tsx
"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteInterview } from "@/server/actions/interviews"
import type { AdminInterview } from "@/server/queries/interviews"

interface Props {
  interview: AdminInterview
  // Titre déduit de l'ordre de l'entretien dans sa mission, calculé par la table.
  title: string
}

export function DeleteInterviewDialog({ interview, title }: Props) {
  const name = `${title} · ${interview.mission.title}`

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      description="Les entretiens suivants de la mission se renumérotent."
      successMessage="Entretien supprimé"
      onDelete={async () => {
        const result = await deleteInterview(interview.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
```

- [ ] **Step 2 : Formulaire en cards**

`src/components/features/admin/entretiens/InterviewForm.tsx`, sur le motif de `LeadForm` (`08`) ; les cards reprennent les blocs de la vue détail. Ouvert depuis la card Entretiens d'une mission (`?mission=<id>`), il y revient après l'enregistrement :

```tsx
"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { Save, Trash2, UserPlus } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { DateTimeField } from "@/components/features/admin/DateTimeField"
import { MultiSelectCombobox } from "@/components/features/admin/MultiSelectCombobox"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { InterviewSide, InterviewStatus, InterviewType, JobRole } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { timeOf, toInstant } from "@/lib/date-time"
import { detailsAfterTemplateChange, interviewDetailsTemplate } from "@/lib/details-templates"
import {
  INTERVIEW_DECISION_LABELS,
  INTERVIEW_FIELD_LABELS as LABELS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/interviews"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import { personDisplayName } from "@/lib/persons"
import { INTERVIEW_DECISIONS, INTERVIEW_OUTCOMES, INTERVIEW_STATUSES, INTERVIEW_TYPES } from "@/lib/schemas/interview"
import { NONE_VALUE } from "@/lib/schemas/person"
import { createInterview, updateInterview } from "@/server/actions/interviews"
import { initialInterviewFormState } from "@/server/actions/interviews.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminInterview } from "@/server/queries/interviews"
import type { MissionOption } from "@/server/queries/missions"
import type { PersonOption } from "@/server/queries/persons"

interface NewCorrespondentDraft {
  key: string
  name: string
  jobRole: JobRole | ""
  companyId: string
  email: string
  linkedinUrl: string
}

function emptyCorrespondentDraft(): NewCorrespondentDraft {
  return { key: crypto.randomUUID(), name: "", jobRole: "", companyId: "", email: "", linkedinUrl: "" }
}

function toNewCorrespondentPayload(draft: NewCorrespondentDraft) {
  return {
    name: draft.name.trim() || undefined,
    jobRole: draft.jobRole || undefined,
    companyId: draft.companyId || undefined,
    email: draft.email.trim() || undefined,
    linkedinUrl: draft.linkedinUrl.trim() || undefined,
  }
}

interface NewCorrespondentRowProps {
  draft: NewCorrespondentDraft
  companyOptions: readonly CompanyOption[]
  onChange: (draft: NewCorrespondentDraft) => void
  onRemove: () => void
}

// Un correspondant inconnu : les mêmes champs qu'une personne, encodés en JSON à l'enregistrement.
function NewCorrespondentRow({ draft, companyOptions, onChange, onRemove }: NewCorrespondentRowProps) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
      <Input
        placeholder="Nom"
        value={draft.name}
        onChange={(event) => {
          onChange({ ...draft, name: event.target.value })
        }}
      />
      <Select value={draft.jobRole} onValueChange={(value) => onChange({ ...draft, jobRole: value as JobRole })}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Poste" />
        </SelectTrigger>
        <SelectContent>
          {JOB_ROLES.map((value) => (
            <SelectItem key={value} value={value}>
              {JOB_ROLE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={draft.companyId} onValueChange={(value) => onChange({ ...draft, companyId: value })}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Entreprise" />
        </SelectTrigger>
        <SelectContent>
          {companyOptions.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="email"
        placeholder="Email"
        value={draft.email}
        onChange={(event) => {
          onChange({ ...draft, email: event.target.value })
        }}
      />
      <Input
        type="url"
        placeholder="LinkedIn"
        value={draft.linkedinUrl}
        onChange={(event) => {
          onChange({ ...draft, linkedinUrl: event.target.value })
        }}
        className="sm:col-span-2"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="justify-self-start sm:col-span-2"
      >
        <Trash2 aria-hidden data-icon="inline-start" />
        Retirer
      </Button>
    </div>
  )
}

interface Props {
  interview: AdminInterview | null
  // Mission de départ d'un nouvel entretien, ouvert depuis la card Entretiens de sa page.
  defaultMissionId?: string
  missionOptions: readonly MissionOption[]
  personOptions: readonly PersonOption[]
  companyOptions: readonly CompanyOption[]
}

export function InterviewForm({
  interview,
  defaultMissionId,
  missionOptions,
  personOptions,
  companyOptions,
}: Props) {
  const router = useRouter()
  const formId = useId()
  const action = interview ? updateInterview.bind(null, interview.id) : createInterview
  const [state, formAction, pending] = useActionState(action, initialInterviewFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const returnPath: Route = defaultMissionId
    ? `/admin/missions/${defaultMissionId}`
    : "/admin/entretiens"

  // La mission d'un entretien existant peut être close, donc sortie des choix : elle reste affichée.
  const missions: readonly MissionOption[] =
    interview && !missionOptions.some((option) => option.id === interview.missionId)
      ? [
          {
            id: interview.mission.id,
            title: interview.mission.title,
            intermediary: interview.mission.intermediary
              ? { name: interview.mission.intermediary.name }
              : null,
            client: interview.mission.client ? { name: interview.mission.client.name } : null,
          },
          ...missionOptions,
        ]
      : missionOptions

  const [now] = useState(() => new Date())
  const [missionId, setMissionId] = useState(interview?.missionId ?? defaultMissionId ?? "")
  const [missionOpen, setMissionOpen] = useState(false)
  const selectedMission = missions.find((mission) => mission.id === missionId) ?? null
  const [side, setSide] = useState<InterviewSide>(
    interview?.side ?? (selectedMission?.intermediary ? "ESN" : "CLIENT_FINAL"),
  )
  const [correspondentIds, setCorrespondentIds] = useState<string[]>(
    interview?.correspondents.map((person) => person.id) ?? [],
  )
  const [newCorrespondents, setNewCorrespondents] = useState<NewCorrespondentDraft[]>([])
  const [type, setType] = useState<InterviewType>(interview?.type ?? "PREMIER_CONTACT")
  const [status, setStatus] = useState<InterviewStatus>(interview?.status ?? "PLANIFIE")
  const [outcome, setOutcome] = useState<string>(interview?.outcome ?? NONE_VALUE)
  const [date, setDate] = useState<Date | undefined>(interview?.scheduledAt ?? now)
  const [time, setTime] = useState(timeOf(interview?.scheduledAt ?? now))
  const [details, setDetails] = useState(
    interview ? (interview.details ?? "") : interviewDetailsTemplate("PREMIER_CONTACT"),
  )
  // Rien ne garantit que l'éditeur relise `value` après son montage : une nouvelle clé le remonte sur le gabarit.
  const [editorKey, setEditorKey] = useState(0)

  // Les correspondants déjà reliés restent proposés, même opposés depuis.
  const correspondentOptions = [
    ...personOptions.map((person) => ({ value: person.id, label: person.name ?? "" })),
    ...(interview?.correspondents ?? [])
      .filter((person) => !personOptions.some((option) => option.id === person.id))
      .map((person) => ({ value: person.id, label: personDisplayName(person) })),
  ]

  function handleMissionChange(nextId: string) {
    setMissionId(nextId)
    const next = missions.find((mission) => mission.id === nextId)
    // Une mission en client direct ne peut pas être menée côté ESN.
    if (side === "ESN" && !next?.intermediary) setSide("CLIENT_FINAL")
  }

  function handleTypeChange(value: string) {
    const nextType = value as InterviewType
    if (!interview) {
      const nextDetails = detailsAfterTemplateChange(
        details,
        interviewDetailsTemplate(type),
        interviewDetailsTemplate(nextType),
      )
      if (nextDetails !== details) {
        setDetails(nextDetails)
        setEditorKey((key) => key + 1)
      }
    }
    setType(nextType)
  }

  function handleStatusChange(value: string) {
    const nextStatus = value as InterviewStatus
    // L'issue ne vaut que sur un entretien Fait : quitter ce statut l'efface côté formulaire aussi.
    if (nextStatus !== "FAIT") setOutcome(NONE_VALUE)
    setStatus(nextStatus)
  }

  useEffect(() => {
    if (state.ok === true) {
      toast.success(interview ? "Entretien mis à jour" : "Entretien créé")
      router.push(returnPath)
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, interview, router, returnPath])

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {interview
            ? `${INTERVIEW_TYPE_LABELS[interview.type]} · ${interview.mission.title}`
            : "Nouvel entretien"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href={returnPath}>Annuler</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            <Save aria-hidden data-icon="inline-start" />
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Mission</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField id={`${formId}-missionId`} label={LABELS.missionId} errors={state.errors.missionId}>
                <ComboboxPopover
                  id={`${formId}-missionId`}
                  open={missionOpen}
                  onOpenChange={setMissionOpen}
                  triggerContent={
                    selectedMission ? (
                      <span className="truncate">{selectedMission.title}</span>
                    ) : (
                      <span className="text-muted-foreground">Choisir une mission</span>
                    )
                  }
                  ariaInvalid={!!state.errors.missionId?.length}
                  ariaDescribedby={`${formId}-missionId-error`}
                  searchPlaceholder="Chercher une mission"
                  emptyMessage="Aucune mission ne correspond."
                >
                  <CommandGroup>
                    {missions.map((mission) => (
                      <CommandItem
                        key={mission.id}
                        value={mission.id}
                        keywords={[mission.title, mission.intermediary?.name ?? "", mission.client?.name ?? ""]}
                        data-checked={missionId === mission.id}
                        onSelect={() => {
                          handleMissionChange(mission.id)
                          setMissionOpen(false)
                        }}
                      >
                        <span className="truncate">{mission.title}</span>
                        <span className="truncate text-muted-foreground">
                          {mission.intermediary?.name ?? mission.client?.name ?? ""}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ComboboxPopover>
                <input type="hidden" name="missionId" value={missionId} />
              </FormField>

              <FormField id={`${formId}-side`} label={LABELS.side} errors={state.errors.side}>
                <RadioGroup
                  id={`${formId}-side`}
                  name="side"
                  value={side}
                  onValueChange={(value) => {
                    setSide(value as InterviewSide)
                  }}
                  className="flex flex-wrap gap-4"
                  aria-describedby={`${formId}-side-error`}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      id={`${formId}-side-esn`}
                      value="ESN"
                      disabled={!selectedMission?.intermediary}
                    />
                    <Label htmlFor={`${formId}-side-esn`}>
                      ESN{selectedMission?.intermediary ? ` · ${selectedMission.intermediary.name}` : " (aucune)"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id={`${formId}-side-client`} value="CLIENT_FINAL" />
                    <Label htmlFor={`${formId}-side-client`}>
                      Client final{selectedMission?.client ? ` · ${selectedMission.client.name}` : ""}
                    </Label>
                  </div>
                </RadioGroup>
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Échange</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${formId}-type`} label={LABELS.type} errors={state.errors.type}>
                <Select name="type" value={type} onValueChange={handleTypeChange}>
                  <SelectTrigger
                    id={`${formId}-type`}
                    className="w-full"
                    aria-invalid={!!state.errors.type?.length}
                    aria-describedby={`${formId}-type-error`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {INTERVIEW_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField id={`${formId}-status`} label={LABELS.status} errors={state.errors.status}>
                <Select name="status" value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger
                    id={`${formId}-status`}
                    className="w-full"
                    aria-invalid={!!state.errors.status?.length}
                    aria-describedby={`${formId}-status-error`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {INTERVIEW_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {status === "FAIT" ? (
                <FormField id={`${formId}-outcome`} label={LABELS.outcome} errors={state.errors.outcome}>
                  <Select name="outcome" value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger
                      id={`${formId}-outcome`}
                      className="w-full"
                      aria-invalid={!!state.errors.outcome?.length}
                      aria-describedby={`${formId}-outcome-error`}
                    >
                      <SelectValue placeholder="Choisir une issue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Non renseignée</SelectItem>
                      {INTERVIEW_OUTCOMES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {INTERVIEW_OUTCOME_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : null}

              <div className="sm:col-span-2">
                <DateTimeField
                  id={`${formId}-scheduledAt`}
                  label={LABELS.scheduledAt}
                  errors={state.errors.scheduledAt}
                  date={date}
                  onDateChange={setDate}
                  time={time}
                  onTimeChange={setTime}
                />
                <input type="hidden" name="scheduledAt" value={toInstant(date, time)} />
              </div>

              <div className="flex min-w-0 flex-col gap-3 sm:col-span-2">
                <FormField
                  id={`${formId}-correspondentIds`}
                  label={LABELS.correspondentIds}
                  errors={state.errors.correspondentIds ?? state.errors.newCorrespondents}
                >
                  <MultiSelectCombobox
                    id={`${formId}-correspondentIds`}
                    name="correspondentIds"
                    options={correspondentOptions}
                    selected={correspondentIds}
                    onChange={setCorrespondentIds}
                    placeholder="Ajouter un correspondant"
                    searchPlaceholder="Chercher une personne"
                    emptyMessage="Aucune personne ne correspond."
                    ariaInvalid={!!state.errors.correspondentIds?.length}
                    ariaDescribedby={`${formId}-correspondentIds-error`}
                  />
                </FormField>
                {newCorrespondents.map((draft) => (
                  <NewCorrespondentRow
                    key={draft.key}
                    draft={draft}
                    companyOptions={companyOptions}
                    onChange={(next) => {
                      setNewCorrespondents((drafts) =>
                        drafts.map((current) => (current.key === next.key ? next : current)),
                      )
                    }}
                    onRemove={() => {
                      setNewCorrespondents((drafts) => drafts.filter((current) => current.key !== draft.key))
                    }}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    setNewCorrespondents((drafts) => [...drafts, emptyCorrespondentDraft()])
                  }}
                >
                  <UserPlus aria-hidden data-icon="inline-start" />
                  Nouvelle personne
                </Button>
                <input
                  type="hidden"
                  name="newCorrespondents"
                  value={JSON.stringify(newCorrespondents.map(toNewCorrespondentPayload))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détails</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                id={`${formId}-details`}
                label={LABELS.details}
                errors={state.errors.details}
                help="Raccourcis : « # » un titre, « - » une liste, « / » le menu des blocs."
              >
                <Editor
                  key={editorKey}
                  id={`${formId}-details`}
                  format="markdown"
                  enableImages={false}
                  value={details}
                  onChange={setDetails}
                  aria-invalid={!!state.errors.details?.length}
                  aria-describedby={`${formId}-details-help ${formId}-details-error`}
                />
              </FormField>
              <input type="hidden" name="details" value={details} />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <Card>
            <CardHeader>
              <CardTitle>Évaluation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField id={`${formId}-score`} label={LABELS.score} errors={state.errors.score} help="De 0 à 10.">
                <Input
                  id={`${formId}-score`}
                  name="score"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  step={1}
                  defaultValue={interview?.score?.toString() ?? ""}
                  aria-invalid={!!state.errors.score?.length}
                  aria-describedby={`${formId}-score-help ${formId}-score-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-decision`}
                name="decision"
                label={LABELS.decision}
                options={INTERVIEW_DECISIONS}
                labels={INTERVIEW_DECISION_LABELS}
                defaultValue={interview?.decision ?? NONE_VALUE}
                errors={state.errors.decision}
                noneLabel="Non renseignée"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                id={`${formId}-notes`}
                label={LABELS.notes}
                errors={state.errors.notes}
                help="Une ligne de marqueurs, séparés par |"
              >
                <Input
                  id={`${formId}-notes`}
                  name="notes"
                  maxLength={200}
                  defaultValue={interview?.notes ?? ""}
                  aria-invalid={!!state.errors.notes?.length}
                  aria-describedby={`${formId}-notes-help ${formId}-notes-error`}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 3 : Pages de création et de modification**

À la fin de `src/server/queries/interviews.ts` :

```ts
export async function findInterviewByIdForAdmin(id: string): Promise<AdminInterview | null> {
  return prisma.interview.findUnique({ where: { id }, include: adminInterviewInclude })
}
```

`src/app/admin/(protected)/entretiens/nouveau/page.tsx` :

```tsx
import { Suspense } from "react"

import { InterviewForm } from "@/components/features/admin/entretiens/InterviewForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findMissionOptions } from "@/server/queries/missions"
import { findPersonOptions } from "@/server/queries/persons"

const INTERVIEW_PAGE_SKELETON = ["h-[24px]", "h-[180px]", "h-[260px]", "h-[320px]"]

async function NewInterviewSection({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string }>
}) {
  const [{ mission }, missionOptions, personOptions, companyOptions] = await Promise.all([
    searchParams,
    findMissionOptions(),
    findPersonOptions(),
    findCompanyOptions(),
  ])
  // Seule une mission proposable devient la mission de départ.
  const defaultMissionId = missionOptions.some((option) => option.id === mission) ? mission : undefined

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Entretiens", href: "/admin/entretiens" }, { label: "Nouvel entretien" }]}
      />
      <InterviewForm
        interview={null}
        {...(defaultMissionId ? { defaultMissionId } : {})}
        missionOptions={missionOptions}
        personOptions={personOptions}
        companyOptions={companyOptions}
      />
    </div>
  )
}

export default async function NewInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string }>
}) {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={INTERVIEW_PAGE_SKELETON} />}>
        <NewInterviewSection searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
```

`src/app/admin/(protected)/entretiens/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { InterviewForm } from "@/components/features/admin/entretiens/InterviewForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { INTERVIEW_TYPE_LABELS } from "@/lib/interviews"
import { findCompanyOptions } from "@/server/queries/companies"
import { findInterviewByIdForAdmin } from "@/server/queries/interviews"
import { findMissionOptions } from "@/server/queries/missions"
import { findPersonOptions } from "@/server/queries/persons"

const INTERVIEW_PAGE_SKELETON = ["h-[24px]", "h-[180px]", "h-[260px]", "h-[320px]"]

async function EditInterviewSection({ id }: { id: string }) {
  const [interview, missionOptions, personOptions, companyOptions] = await Promise.all([
    findInterviewByIdForAdmin(id),
    findMissionOptions(),
    findPersonOptions(),
    findCompanyOptions(),
  ])
  if (!interview) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Entretiens", href: "/admin/entretiens" },
          { label: `${INTERVIEW_TYPE_LABELS[interview.type]} · ${interview.mission.title}` },
        ]}
      />
      <InterviewForm
        interview={interview}
        missionOptions={missionOptions}
        personOptions={personOptions}
        companyOptions={companyOptions}
      />
    </div>
  )
}

export default async function EditInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={INTERVIEW_PAGE_SKELETON} />}>
        <EditInterviewSection id={id} />
      </Suspense>
    </div>
  )
}
```

Les dossiers `nouveau/` et `[id]/` reçoivent chacun un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 4 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 5 : Liste, pages et menu

**Files:**
- Create: `src/components/features/admin/entretiens/InterviewsTable.tsx`
- Create: `src/components/features/admin/entretiens/InterviewsViewPage.tsx`
- Create: `src/app/admin/(protected)/entretiens/page.tsx` et `loading.tsx`, `src/app/admin/(protected)/entretiens/journal/page.tsx` et `loading.tsx`
- Modify: `src/config/admin-nav-items.ts`

**Interfaces:**
- Consumes: Tasks 1, 3 et 4 ; `findAllInterviewsForAdmin`, `interviewPlaces`, `interviewTitle` (`16`) ; `RowActionButton` ; `formatDailyRate` (`15`)
- Produces: `InterviewsTable({ interviews, view })`, `InterviewsViewPage({ view })`

- [ ] **Step 1 : Table**

`src/components/features/admin/entretiens/InterviewsTable.tsx` :

```tsx
"use client"

import { useMemo, useState } from "react"
import { MessageCircle, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { BadgeList } from "@/components/features/admin/BadgeList"
import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  type DetailSection,
  DetailDialog,
} from "@/components/features/admin/DetailDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteInterviewDialog } from "@/components/features/admin/entretiens/DeleteInterviewDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import {
  INTERVIEW_COLUMN_WIDTHS,
  INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type InterviewColumnKey,
} from "@/lib/admin-table-widths"
import { formatShortDateTime } from "@/lib/date-time"
import { interviewsForView, type InterviewView } from "@/lib/interview-views"
import {
  INTERVIEW_DECISION_LABELS,
  INTERVIEW_FIELD_LABELS as LABELS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  interviewPlaces,
  interviewTitle,
} from "@/lib/interviews"
import { formatDailyRate, MISSION_FIELD_LABELS } from "@/lib/missions"
import { personDisplayName } from "@/lib/persons"
import { CONTRACT_STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/projects"
import { INTERVIEW_OUTCOMES, INTERVIEW_STATUSES, INTERVIEW_TYPES } from "@/lib/schemas/interview"
import { ZONE_LABELS } from "@/lib/zones"
import type { AdminInterview } from "@/server/queries/interviews"

const OPTED_OUT_LABEL = "Ne plus contacter"

function leadingCompany(interview: AdminInterview) {
  return interview.side === "ESN" ? interview.mission.intermediary : interview.mission.client
}

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
}

function correspondentNames(interview: AdminInterview): string[] {
  return interview.correspondents.map((person) => personDisplayName(person))
}

function hideable(
  view: InterviewView,
  key: Exclude<InterviewColumnKey, "title" | "actions">,
): Pick<Column<AdminInterview>, "hideable" | "defaultVisible"> {
  return { hideable: true, defaultVisible: INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key) }
}

function buildDataColumns(
  titles: Map<string, string>,
  view: InterviewView,
): readonly Column<AdminInterview>[] {
  return [
    {
      key: "title",
      header: "Entretien",
      width: INTERVIEW_COLUMN_WIDTHS.title,
      sortValue: (interview) => titles.get(interview.id) ?? "",
      searchValue: (interview) =>
        [
          interview.mission.title,
          leadingCompany(interview)?.name ?? "",
          ...correspondentNames(interview),
        ].join(" "),
      cell: (interview) => (
        <TruncateTooltip className="block w-full font-medium">
          {titles.get(interview.id) ?? ""}
        </TruncateTooltip>
      ),
    },
    {
      key: "mission",
      header: LABELS.missionId,
      width: INTERVIEW_COLUMN_WIDTHS.mission,
      ...hideable(view, "mission"),
      sortValue: (interview) => interview.mission.title,
      cell: (interview) => <TruncatedCell value={interview.mission.title} />,
    },
    {
      key: "side",
      header: LABELS.side,
      width: INTERVIEW_COLUMN_WIDTHS.side,
      ...hideable(view, "side"),
      cell: (interview) => {
        const company = leadingCompany(interview)
        return company ? (
          <span className="flex min-w-0 items-center gap-2">
            <CompanyLogoTile logoFilename={company.logoFilename} size="sm" />
            <TruncateTooltip className="min-w-0">{company.name}</TruncateTooltip>
          </span>
        ) : null
      },
    },
    {
      key: "scheduledAt",
      header: LABELS.scheduledAt,
      width: INTERVIEW_COLUMN_WIDTHS.scheduledAt,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "scheduledAt"),
      sortValue: (interview) => interview.scheduledAt.getTime(),
      cell: (interview) => formatShortDateTime(interview.scheduledAt),
    },
    {
      key: "type",
      header: LABELS.type,
      width: INTERVIEW_COLUMN_WIDTHS.type,
      ...hideable(view, "type"),
      cell: (interview) => <Badge variant="secondary">{INTERVIEW_TYPE_LABELS[interview.type]}</Badge>,
    },
    {
      key: "status",
      header: LABELS.status,
      width: INTERVIEW_COLUMN_WIDTHS.status,
      ...hideable(view, "status"),
      cell: (interview) => <Badge variant="secondary">{INTERVIEW_STATUS_LABELS[interview.status]}</Badge>,
    },
    {
      key: "outcome",
      header: LABELS.outcome,
      width: INTERVIEW_COLUMN_WIDTHS.outcome,
      ...hideable(view, "outcome"),
      cell: (interview) =>
        interview.outcome ? (
          <Badge variant="secondary">{INTERVIEW_OUTCOME_LABELS[interview.outcome]}</Badge>
        ) : null,
    },
    {
      key: "zone",
      header: "Localité",
      width: INTERVIEW_COLUMN_WIDTHS.zone,
      ...hideable(view, "zone"),
      cell: (interview) =>
        interview.mission.zone ? (
          <Badge variant="secondary">{ZONE_LABELS[interview.mission.zone]}</Badge>
        ) : null,
    },
    {
      key: "workMode",
      header: "Mode",
      width: INTERVIEW_COLUMN_WIDTHS.workMode,
      ...hideable(view, "workMode"),
      cell: (interview) =>
        interview.mission.workMode ? WORK_MODE_LABELS[interview.mission.workMode] : null,
    },
    {
      key: "dailyRate",
      header: "TJM",
      width: INTERVIEW_COLUMN_WIDTHS.dailyRate,
      align: "right",
      className: "tabular-nums",
      ...hideable(view, "dailyRate"),
      sortValue: (interview) => interview.mission.dailyRate ?? -1,
      cell: (interview) => formatDailyRate(interview.mission.dailyRate),
    },
    {
      key: "score",
      header: LABELS.score,
      width: INTERVIEW_COLUMN_WIDTHS.score,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "score"),
      sortValue: (interview) => interview.score ?? -1,
      cell: (interview) => interview.score,
    },
    {
      key: "decision",
      header: "Décision",
      width: INTERVIEW_COLUMN_WIDTHS.decision,
      ...hideable(view, "decision"),
      cell: (interview) =>
        interview.decision ? INTERVIEW_DECISION_LABELS[interview.decision] : null,
    },
    {
      key: "correspondents",
      header: LABELS.correspondentIds,
      width: INTERVIEW_COLUMN_WIDTHS.correspondents,
      ...hideable(view, "correspondents"),
      cell: (interview) => <BadgeList labels={correspondentNames(interview)} noun="correspondants" />,
    },
  ]
}

// Arbitrage « bloc sans donnée » : un bloc dont aucun champ n'est renseigné disparaît.
function keepFilled(section: DetailSection): DetailSection[] {
  return section.rows.some((row) => row.value !== null && row.value !== undefined) ? [section] : []
}

function buildInterviewDetail(
  interview: AdminInterview,
  title: string,
  previous: { title: string; scheduledAt: Date } | null,
  onEdit: () => void,
): DetailContent {
  const company = leadingCompany(interview)
  const { mission } = interview

  return {
    title,
    subtitle: [mission.title, company?.name].filter((part): part is string => !!part).join(" · "),
    status: (
      <Badge variant="outline" meta>
        {INTERVIEW_STATUS_LABELS[interview.status]}
      </Badge>
    ),
    sections: [
      {
        title: "Échange",
        rows: [
          { label: LABELS.type, value: <Badge variant="secondary">{INTERVIEW_TYPE_LABELS[interview.type]}</Badge> },
          { label: LABELS.status, value: <Badge variant="secondary">{INTERVIEW_STATUS_LABELS[interview.status]}</Badge> },
          {
            label: LABELS.outcome,
            value: interview.outcome ? <Badge variant="secondary">{INTERVIEW_OUTCOME_LABELS[interview.outcome]}</Badge> : null,
          },
          { label: LABELS.scheduledAt, value: formatShortDateTime(interview.scheduledAt) },
          { label: LABELS.side, value: company?.name ?? null },
          {
            label: LABELS.correspondentIds,
            value:
              interview.correspondents.length > 0 ? (
                <span className="flex flex-wrap gap-2">
                  {interview.correspondents.map((person) => (
                    <span key={person.id} className="inline-flex items-center gap-1">
                      {personDisplayName(person)}
                      {person.optedOutAt ? <Badge variant="outline">{OPTED_OUT_LABEL}</Badge> : null}
                    </span>
                  ))}
                </span>
              ) : null,
          },
        ],
      },
      ...keepFilled({
        title: "Évaluation",
        rows: [
          { label: LABELS.score, value: interview.score === null ? null : `${interview.score} / 10` },
          {
            label: LABELS.decision,
            value: interview.decision ? <Badge variant="secondary">{INTERVIEW_DECISION_LABELS[interview.decision]}</Badge> : null,
          },
        ],
      }),
      ...keepFilled({
        title: "Mission",
        rows: [
          { label: MISSION_FIELD_LABELS.dailyRate, value: formatDailyRate(mission.dailyRate) },
          { label: MISSION_FIELD_LABELS.contract, value: mission.contract ? <Badge variant="secondary">{CONTRACT_STATUS_LABELS[mission.contract]}</Badge> : null },
          { label: MISSION_FIELD_LABELS.workMode, value: mission.workMode ? <Badge variant="secondary">{WORK_MODE_LABELS[mission.workMode]}</Badge> : null },
          {
            label: MISSION_FIELD_LABELS.zone,
            value: mission.zone ? <Badge variant="secondary">{ZONE_LABELS[mission.zone]}</Badge> : null,
          },
        ],
      }),
      ...(previous
        ? [
            {
              title: "Entretien précédent",
              rows: [
                {
                  fullWidth: true,
                  value: `${previous.title} · ${formatShortDateTime(previous.scheduledAt)}`,
                },
              ],
            },
          ]
        : []),
      ...(interview.notes ? [{ title: "Notes", rows: [{ value: interview.notes, fullWidth: true }] }] : []),
      ...(interview.details
        ? [
            {
              title: "Détails",
              rows: [
                {
                  value: <MarkdownContent markdown={interview.details} variant="admin" />,
                  fullWidth: true,
                },
              ],
            },
          ]
        : []),
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminInterview>[] = [
  {
    key: "type",
    label: LABELS.type,
    options: INTERVIEW_TYPES.map((type) => ({ value: type, label: INTERVIEW_TYPE_LABELS[type] })),
    value: (interview) => interview.type,
  },
  {
    key: "status",
    label: LABELS.status,
    options: INTERVIEW_STATUSES.map((status) => ({ value: status, label: INTERVIEW_STATUS_LABELS[status] })),
    value: (interview) => interview.status,
  },
  {
    key: "outcome",
    label: LABELS.outcome,
    options: INTERVIEW_OUTCOMES.map((outcome) => ({ value: outcome, label: INTERVIEW_OUTCOME_LABELS[outcome] })),
    value: (interview) => interview.outcome,
  },
]

interface Props {
  interviews: readonly AdminInterview[]
  view: InterviewView
}

export function InterviewsTable({ interviews, view }: Props) {
  const router = useRouter()
  const [selectedInterview, setSelectedInterview] = useState<AdminInterview | null>(null)
  // Instant figé au montage : la vue À venir reste stable pendant la consultation.
  const [now] = useState(() => Date.now())

  // Titres calculés sur tous les entretiens, jamais sur la seule vue : « Entretien 2 » le reste même si l'entretien 1 n'est pas affiché.
  const places = useMemo(() => interviewPlaces(interviews), [interviews])
  const titles = useMemo(
    () =>
      new Map(
        interviews.map((interview) => [
          interview.id,
          interviewTitle(interview.type, places.get(interview.id)?.number ?? null),
        ]),
      ),
    [interviews, places],
  )
  const viewInterviews = useMemo(
    () => interviewsForView(interviews, view, now),
    [interviews, view, now],
  )

  const columns = useMemo<readonly Column<AdminInterview>[]>(
    () => [
      ...buildDataColumns(titles, view),
      {
        key: "actions",
        header: "Actions",
        width: INTERVIEW_COLUMN_WIDTHS.actions,
        align: "right",
        cell: (interview) => (
          <span className="inline-flex gap-0">
            <RowActionButton
              aria-label={`Modifier ${titles.get(interview.id) ?? ""} · ${interview.mission.title}`}
              asChild
            >
              <Link href={`/admin/entretiens/${interview.id}`}>
                <Pencil className="size-4" />
              </Link>
            </RowActionButton>
            <DeleteInterviewDialog interview={interview} title={titles.get(interview.id) ?? ""} />
          </span>
        ),
      },
    ],
    [titles, view],
  )

  const detail = useMemo<DetailContent | null>(() => {
    if (!selectedInterview) return null
    const previousId = places.get(selectedInterview.id)?.previousId ?? null
    const previous = interviews.find((interview) => interview.id === previousId) ?? null
    return buildInterviewDetail(
      selectedInterview,
      titles.get(selectedInterview.id) ?? "",
      previous ? { title: titles.get(previous.id) ?? "", scheduledAt: previous.scheduledAt } : null,
      () => {
        router.push(`/admin/entretiens/${selectedInterview.id}`)
      },
    )
  }, [selectedInterview, places, interviews, titles, router])

  return (
    <>
      <DataTable
        rows={viewInterviews}
        columns={columns}
        getRowId={(interview) => interview.id}
        searchPlaceholder="Rechercher une mission, une entreprise ou un correspondant"
        noun="entretien"
        onRowClick={setSelectedInterview}
        rowLabel={(interview) => titles.get(interview.id) ?? ""}
        facets={facets}
        empty={{
          icon: MessageCircle,
          title: "Aucun entretien",
          description: "Aucun entretien dans cette vue. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedInterview(null)
        }}
      />
    </>
  )
}
```

- [ ] **Step 2 : Coquille commune**

`src/components/features/admin/entretiens/InterviewsViewPage.tsx` :

```tsx
import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { InterviewsTable } from "@/components/features/admin/entretiens/InterviewsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { interviewSkeletonWidths } from "@/lib/admin-table-widths"
import { INTERVIEW_VIEW_PAGES, type InterviewView } from "@/lib/interview-views"
import { findAllInterviewsForAdmin } from "@/server/queries/interviews"

async function InterviewsSection({ view }: { view: InterviewView }) {
  const interviews = await findAllInterviewsForAdmin()
  return <InterviewsTable interviews={interviews} view={view} />
}

interface Props {
  view: InterviewView
}

export function InterviewsViewPage({ view }: Props) {
  const { title, subtitle } = INTERVIEW_VIEW_PAGES[view]

  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href="/admin/entretiens/nouveau">
            <Plus aria-hidden data-icon="inline-start" />
            Nouvel entretien
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={interviewSkeletonWidths(view)} />}>
        <InterviewsSection view={view} />
      </Suspense>
    </AdminPageShell>
  )
}
```

- [ ] **Step 3 : Pages**

`src/app/admin/(protected)/entretiens/page.tsx` :

```tsx
import { InterviewsViewPage } from "@/components/features/admin/entretiens/InterviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminInterviewsPage() {
  await getCurrentUser()

  return <InterviewsViewPage view="a-venir" />
}
```

`src/app/admin/(protected)/entretiens/journal/page.tsx` :

```tsx
import { InterviewsViewPage } from "@/components/features/admin/entretiens/InterviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminInterviewsJournalPage() {
  await getCurrentUser()

  return <InterviewsViewPage view="journal" />
}
```

Chacun des deux dossiers reçoit un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 4 : Menu**

Dans `src/config/admin-nav-items.ts`, remplacer :

```ts
      { label: "Entretiens", icon: MessageCircle },
```

par :

```ts
      {
        label: "Entretiens",
        icon: MessageCircle,
        href: "/admin/entretiens",
        subItems: [
          { label: "À venir", href: "/admin/entretiens" },
          { label: "Journal", href: "/admin/entretiens/journal" },
        ],
      },
```

Run: `just typecheck`
Expected: aucune erreur (si le typage des `href` échoue, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

---

### Task 6 : Côté missions et leads

**Files:**
- Modify: `src/components/features/admin/missions/MissionsTable.tsx`
- Modify: `src/components/features/admin/missions/DeleteMissionDialog.tsx`
- Modify: `src/app/admin/(protected)/missions/[id]/page.tsx`
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`
- Modify: `src/app/admin/(protected)/leads/[id]/page.tsx`

**Interfaces:**
- Consumes: Tasks 3 et 4 ; `interviewPlaces`, `interviewTitle`, `INTERVIEW_STATUS_LABELS`, `INTERVIEW_TYPE_LABELS` (`16`) ; `RelatedLinksCard`, `RelatedLink` (`08`) ; pages de la mission (`15`) et du lead (`08`)
- Produces: rien

- [ ] **Step 1 : Suppression d'une mission**

Dans `DeleteMissionDialog.tsx`, remplacer la description par « Ses entretiens sont supprimés avec elle. L'apporteur, l'ESN et le client final restent. »

- [ ] **Step 2 : Bloc Entretiens d'une mission**

Dans `MissionsTable.tsx` :

- importer `interviewPlaces`, `interviewTitle`, `INTERVIEW_STATUS_LABELS` depuis `@/lib/interviews`, `formatShortDateTime` depuis `@/lib/date-time` ;
- ajouter avant `buildMissionDetail` :

```tsx
function interviewsSection(mission: AdminMission): DetailSection[] {
  if (mission.interviews.length === 0) return []
  const places = interviewPlaces(mission.interviews)
  return [
    {
      title: "Entretiens",
      rows: [
        {
          fullWidth: true,
          value: (
            <ol className="flex flex-col gap-1">
              {mission.interviews.map((interview) => (
                <li key={interview.id} className="flex flex-wrap gap-x-2 text-sm">
                  <span className="font-medium">
                    {interviewTitle(interview.type, places.get(interview.id)?.number ?? null)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatShortDateTime(interview.scheduledAt)}
                  </span>
                  <span className="text-muted-foreground">
                    {INTERVIEW_STATUS_LABELS[interview.status]}
                  </span>
                </li>
              ))}
            </ol>
          ),
        },
      ],
    },
  ]
}
```

  et, dans `buildMissionDetail`, insérer `...interviewsSection(mission),` juste avant le bloc Notes.

- [ ] **Step 3 : Card Entretiens de la page d'une mission**

Arbitrage « Élément rattaché à une fiche » de DESIGN.md : un entretien se crée depuis la page de sa mission, jamais par un bouton de ligne. La mission lue par `findMissionByIdForAdmin` porte ses entretiens (Task 3). Dans `src/app/admin/(protected)/missions/[id]/page.tsx`, importer `Plus` (`lucide-react`), `Link` (`next/link`), `Button`, `RelatedLinksCard`, `type RelatedLink`, `interviewPlaces`, `interviewTitle`, `INTERVIEW_STATUS_LABELS` (`@/lib/interviews`) et `formatShortDateTime` (`@/lib/date-time`), puis, dans `EditMissionSection`, calculer :

```tsx
  // Titres calculés sur les entretiens de la mission : « Entretien 2 » suit l'ordre de la mission.
  const places = interviewPlaces(mission.interviews)
```

et ajouter sous `<MissionForm … />` :

```tsx
      <RelatedLinksCard
        title="Entretiens"
        links={mission.interviews.map(
          (interview): RelatedLink => ({
            id: interview.id,
            href: `/admin/entretiens/${interview.id}`,
            label: interviewTitle(interview.type, places.get(interview.id)?.number ?? null),
            meta: `${formatShortDateTime(interview.scheduledAt)} · ${INTERVIEW_STATUS_LABELS[interview.status]}`,
          }),
        )}
        emptyText="Aucun entretien pour cette mission."
        action={
          <Button size="sm" asChild>
            <Link href={`/admin/entretiens/nouveau?mission=${mission.id}`}>
              <Plus aria-hidden data-icon="inline-start" />
              Nouvel entretien
            </Link>
          </Button>
        }
      />
```

La page `/admin/entretiens/nouveau` n'accepte comme mission de départ qu'une mission proposable (Task 4) : sur une mission close, le formulaire s'ouvre sans mission choisie.

- [ ] **Step 4 : Bloc et colonne Entretiens d'un lead**

Dans `LeadsTable.tsx` :

- importer `INTERVIEW_STATUS_LABELS`, `INTERVIEW_TYPE_LABELS` depuis `@/lib/interviews` ;
- dans `buildDataColumns`, après la colonne `actionsCount` :

```tsx
    {
      key: "interviewsCount",
      header: "Entretiens",
      width: LEAD_COLUMN_WIDTHS.interviewsCount,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "interviewsCount"),
      sortValue: (lead) => lead.interviewsCount,
      cell: (lead) => lead.interviewsCount,
    },
```

- ajouter avant `buildLeadDetail` :

```tsx
function interviewsSection(lead: AdminLead): DetailSection[] {
  if (lead.interviews.length === 0) return []
  return [
    {
      title: "Entretiens",
      rows: [
        {
          fullWidth: true,
          value: (
            <ol className="flex flex-col gap-1">
              {lead.interviews.map((interview) => (
                <li key={interview.id} className="flex flex-wrap gap-x-2 text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    {formatShortDateTime(interview.scheduledAt)}
                  </span>
                  <span className="font-medium">{INTERVIEW_TYPE_LABELS[interview.type]}</span>
                  <span className="text-muted-foreground">
                    {interview.mission.title} · {INTERVIEW_STATUS_LABELS[interview.status]}
                  </span>
                </li>
              ))}
            </ol>
          ),
        },
      ],
    },
  ]
}
```

  et, dans les deux branches de `buildLeadDetail`, insérer `...interviewsSection(lead),` juste après `...missionsSection(lead),` (`15`).

- [ ] **Step 5 : Card Entretiens de la page d'un lead**

Le lead lu par `findLeadByIdForAdmin` porte ses entretiens (Task 3). Dans `src/app/admin/(protected)/leads/[id]/page.tsx`, importer `INTERVIEW_STATUS_LABELS`, `INTERVIEW_TYPE_LABELS` (`@/lib/interviews`) et `formatShortDateTime` (`@/lib/date-time`), et ajouter sous la card Missions apportées (`15`) :

```tsx
      <RelatedLinksCard
        title="Entretiens"
        links={lead.interviews.map(
          (interview): RelatedLink => ({
            id: interview.id,
            href: `/admin/entretiens/${interview.id}`,
            label: `${INTERVIEW_TYPE_LABELS[interview.type]} · ${interview.mission.title}`,
            meta: `${formatShortDateTime(interview.scheduledAt)} · ${INTERVIEW_STATUS_LABELS[interview.status]}`,
          }),
        )}
        emptyText="Aucun entretien pour ce lead."
      />
```

- [ ] **Step 6 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

---

### Task 7 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 6
- Produces: rien

- [ ] **Step 1 : Depuis une mission**

Run: `just dev`, se connecter ; avoir une mission via une ESN et une mission en client direct, un lead non opposé.
Expected: l'entrée Entretiens mène à « Entretiens à venir ». Sur la page de la mission via l'ESN, la card Entretiens est vide ; son bouton « Nouvel entretien » ouvre la page `/admin/entretiens/nouveau?mission=<id>`, mission déjà choisie, Détails au gabarit Premier contact. Passer le type à Recruteur/RH puis Technique : le gabarit suit ; écrire une ligne puis changer de type : le texte reste. Ajouter le lead en correspondant, puis « Nouvelle personne » (nom, poste Recruteur, email) : la ligne apparaît avec ses champs. Enregistrer un Technique planifié demain, mené par l'ESN, avec les deux correspondants : retour sur la page de la mission, dont la card liste « Entretien 1 · Technique » ; il figure dans À venir, TJM et localité de la mission affichés ; le lead et la nouvelle personne (retrouvée dans Contacts, rôle Contact, type Commercial) affichent tous deux le lien vers cet entretien. Aucune ligne de la liste des missions ne porte de bouton « Nouvel entretien ».

- [ ] **Step 2 : Mené par et issue**

Cliquer « Nouvel entretien » dans l'en-tête de l'écran Entretiens, choisir la mission via l'ESN, laisser « ESN », puis changer pour la mission en client direct.
Expected: l'option ESN devient « ESN (aucune) », désactivée, et le choix passe au client final. Passer Statut à Fait : Issue apparaît, facultative ; la laisser vide n'empêche pas l'enregistrement. La choisir : l'enregistrement aboutit et ramène à l'écran Entretiens. Repasser Statut à Planifié sur un entretien Fait : Issue se masque, l'enregistrement aboutit toujours.

- [ ] **Step 3 : Journal, titres et précédent**

Créer sur la mission via l'ESN un Premier contact la semaine dernière (statut Fait, issue Positif) ; ouvrir le Journal puis la vue détail du Technique.
Expected: le Technique vient en premier ; il s'intitule toujours « Entretien 1 · Technique » dans À venir comme au Journal ; sa vue détail nomme le Premier contact comme entretien précédent, avec sa date.

- [ ] **Step 4 : Mission close et correspondant opposé**

Passer la mission via l'ESN à Refusée, puis le lead en « ne plus contacter » ; rouvrir la page du Technique (crayon de la ligne ou « Modifier » de sa vue détail).
Expected: la mission reste affichée dans le champ, sans être proposée à un nouvel entretien ; le bouton « Nouvel entretien » de sa page ouvre le formulaire sans mission choisie ; le lead opposé reste parmi les correspondants, marqué « Ne plus contacter » dans la vue détail, et n'est plus proposé pour un autre entretien.

- [ ] **Step 5 : Fiches reliées et suppressions**

Ouvrir la vue détail puis la page de la mission et du lead ; afficher Leads > Tous. Supprimer le Premier contact, puis la mission.
Expected: bloc Entretiens sur les deux vues détail, card Entretiens sur les deux pages, chaque entretien menant à sa page ; colonne Entretiens du lead à 1 ; après suppression du Premier contact, le Technique reste « Entretien 1 · Technique » ; la suppression de la mission prévient que ses entretiens partent avec elle et les supprime. Puis `just stop`.
