# Écran des entretiens : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'écran Entretiens (À venir, Journal, page de création et de modification en cards, détail, suppression), la card Entretiens avec « Nouvel entretien » sur la page d'une opportunité, le bloc Entretiens des opportunités, le bloc, la colonne et la card Entretiens des leads.

**Architecture:** Un module pur testé (`interview-views`) porte les deux vues. `InterviewsTable` reprend le motif des listes admin et calcule les titres sur tous les entretiens (`interviewPlaces`, `16`) ; `InterviewForm` reprend le motif de `LeadForm` (`08`) : page en cards, avec une opportunité de départ passée par `?opportunity=<id>` depuis la card Entretiens de la page d'une opportunité, un correspondant choisi parmi les personnes non opposées ou ajouté en ligne (nouveau contact, au type choisi) ; une issue visible et obligatoire seulement quand le statut vaut Fait. Le champ date et heure du formulaire des actions (`10`) sort dans un composant partagé.

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui `radix-nova` (Card, RadioGroup, Select, Popover, Calendar, Command), Pages CMS Editor (ADR-024), Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/17-ecran-entretiens-design.md`

## Global Constraints

- **Prérequis** : plans `04` (`EnumBadge`), `07` (`findPersonOptions()`, `PersonOption`, `personFields`, `JOB_ROLES`, `JOB_ROLE_LABELS`), `08` (`LeadForm`, page du lead, `RelatedLinksList`, `RelatedLinksCard`, `findCompanyOptions()`, `CompanyOption`, `SelectField`), `10` (`DateTimeField` local à `ProspectingActionFormDialog`, `timeOf`, `toInstant`, `formatShortDateTime`, `LeadActionsCard`), `13` (`CONTACT_TYPES`, `CONTACT_TYPE_LABELS`, `CONTACT_TYPE_ICONS`, `personDetailHref`, `src/lib/person-links.ts`), `15` (`OpportunitiesTable`, `DeleteOpportunityDialog`, `AdminOpportunity`, page de l'opportunité, `findOpportunityByIdForAdmin`, card Opportunités apportées de la page du lead) et `16` (`AdminInterview`, `findAllInterviewsForAdmin`, `createInterview`, `updateInterview`, `deleteInterview`, `interviewPlaces`, `interviewTitle`, libellés et glyphes `INTERVIEW_*`, `interviewDetailsTemplate`, `detailsAfterTemplateChange`, `AdminLead.interviews`, `AdminLead.interviewsCount`) implémentés.
- **Routes et titres** : À venir `/admin/entretiens` « Entretiens à venir », sous-titre « Ceux qui restent à tenir, le prochain en premier. » ; Journal `/admin/entretiens/journal` « Journal des entretiens », sous-titre « Toutes les fiches, passées et à venir, la plus récente en premier. »
- **Vues** : À venir = statut `PLANIFIE` et date non passée, le prochain d'abord ; Journal = tous, le plus récent d'abord.
- **Opportunités proposées** : non closes (ni `REFUSEE`, ni `DECLINEE`, ni `ABANDONNEE`), l'opportunité déjà reliée restant affichée.
- **Page ou modale** (arbitrages « Page ou modale d'édition » et « Élément rattaché à une fiche » de DESIGN.md) : l'entretien se crée sur `/admin/entretiens/nouveau` (opportunité de départ par `?opportunity=<id>`) et se modifie sur `/admin/entretiens/<id>`, en cards Opportunité, Échange, Détails, Évaluation, Notes ; la ligne ne porte que Modifier (lien) et Supprimer ; aucun bouton de ligne sur les opportunités, « Nouvel entretien » vit dans la card Entretiens de la page d'une opportunité.
- **Issue** : champ masqué tant que le statut n'est pas Fait, facultative dès qu'il le devient (`16`) ; Statut occupe alors seul la pleine largeur de sa ligne.
- **Correspondant inconnu** : « Nouveau contact », grille Nom et Poste, Entreprise et Type de contact (requis, choisi par l'utilisateur), Email et LinkedIn ; aide « Chaque nouvelle personne devient un contact du type choisi. Le reste de sa fiche se complète depuis Contacts. »
- **Textes** : suppression d'un entretien « Les entretiens suivants de l'opportunité se renumérotent. » ; suppression d'une opportunité « Ses entretiens sont supprimés avec elle. L'apporteur, l'ESN et le client final restent. »
- **Menu** : entrée « Entretiens », sous-entrées « À venir » et « Journal ».
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Opportunité changée pour une opportunité sans ESN alors que « Mené par » est sur l'ESN** : le choix passe au client final, sans enregistrement refusé ensuite. Vérifié à la Task 7, Step 2.
- **Titre dans la vue À venir** : « Entretien 2 » reste « Entretien 2 » même si l'entretien 1, passé, n'est pas dans la vue. Vérifié à la Task 7, Step 3 (les titres se calculent sur tous les entretiens).
- **Entretien d'une opportunité close ouvert en modification** : son opportunité reste affichée dans le champ. Vérifié à la Task 7, Step 4.
- **Correspondant opposé** : il reste affiché dans le formulaire et la vue détail d'un entretien existant, sans être proposé pour un autre. Vérifié à la Task 7, Step 4.
- **Statut changé de Fait à Planifié** : Issue se masque sans bloquer l'enregistrement, Statut reprend la pleine largeur. Vérifié à la Task 7, Step 2.
- **Nouveau contact sans type choisi** : refusé, le type de contact étant requis. Vérifié à la Task 4, Step 2.

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
- Modify: `src/server/queries/opportunities.ts`
- Modify: `src/server/queries/leads.ts`
- Modify: `src/server/queries/interviews.ts`
- Modify: `src/lib/admin-table-widths.ts`

**Interfaces:**
- Consumes: modèle `Interview` (`16`) ; `findCompanyOptions()`, `CompanyOption` (`08`, posée pour la combobox Entreprise de `LeadForm`) ; `personDetailHref` (`13`, `@/lib/person-links`)
- Produces: `AdminOpportunity.interviews: { id, opportunityId, type, status, scheduledAt, createdAt }[]` ; `findOpportunityOptions()`, `type OpportunityOption = { id, title, intermediary: { name } | null, client: { name } | null }` ; `AdminLead.interviews: { id, type, status, scheduledAt, opportunity: { title } }[]` ; `AdminInterview.correspondents` étendu de `lead: { id } | null` et `contact: { id } | null` ; `INTERVIEW_COLUMN_WIDTHS`, `InterviewColumnKey`, `INTERVIEW_DEFAULT_VISIBLE_COLUMNS`, `interviewSkeletonWidths()` ; `LEAD_COLUMN_WIDTHS.interviewsCount`

- [ ] **Step 1 : Opportunités**

Dans `src/server/queries/opportunities.ts`, ajouter à `adminOpportunityInclude` :

```ts
  interviews: {
    select: {
      id: true,
      opportunityId: true,
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
// Opportunités sur lesquelles planifier un entretien : jamais une opportunité close.
export async function findOpportunityOptions() {
  return prisma.opportunity.findMany({
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

export type OpportunityOption = Awaited<ReturnType<typeof findOpportunityOptions>>[number]
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
          opportunity: { select: { title: true } },
        },
        orderBy: { scheduledAt: "desc" },
      },
```

et, dans `AdminLead`, élargir `interviews` à `{ id: string; type: InterviewType; status: InterviewStatus; scheduledAt: Date; opportunity: { title: string } }[]` (import de type `InterviewType`) ; `toAdminLead` lit déjà `row.person.interviews`.

- [ ] **Step 3 : Correspondants, lead ou contact**

Dans `src/server/queries/interviews.ts` (`adminInterviewInclude` du `16`), étendre le `select` de `correspondents` pour que la vue détail (Task 6, Step 1) puisse résoudre la fiche de chacun par `personDetailHref` (`13`) :

```ts
  correspondents: {
    select: {
      id: true,
      name: true,
      email: true,
      linkedinUrl: true,
      optedOutAt: true,
      lead: { select: { id: true } },
      contact: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  },
```

(remplace le `select` plus court posé par le `16`, qui n'avait que `id`, `name`, `email`, `linkedinUrl`, `optedOutAt` ; `opportunity` ne change pas.)

- [ ] **Step 4 : Largeurs**

Dans `src/lib/admin-table-widths.ts` :

- dans `LEAD_COLUMN_WIDTHS`, ajouter `interviewsCount: 110,` après `actionsCount` ; dans `LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS.tous`, insérer `"interviewsCount"` juste après `"actionsCount"` (colonne `entretiens` de la maquette, affichée dans Tous) ;
- ajouter en tête l'import de type `import type { InterviewView } from "@/lib/interview-views"` (Task 1), puis à la fin :

```ts
export const INTERVIEW_COLUMN_WIDTHS = {
  // Une colonne triable tient son en-tête sur une ligne : libellé, icône de tri et marges du bouton dictent sa largeur.
  title: 210,
  opportunity: 200,
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

// À venir : colonnes affichées de la maquette (entrCols), plus Opportunité, portée par l'entretien.
// Journal, la vue complète, montre toutes ses colonnes (arbitrage « Colonnes par vue »).
export const INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<InterviewView, readonly InterviewColumnKey[]> = {
  "a-venir": [
    "opportunity",
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
    "opportunity",
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
- Consumes: Tasks 2 et 3 ; actions, libellés, glyphes, gabarits (`16`) ; `EnumBadge` (`04`) ; `CONTACT_TYPES`, `CONTACT_TYPE_LABELS`, `CONTACT_TYPE_ICONS` (`13`) ; `SelectField`, `MultiSelectCombobox`, `ComboboxPopover`, `RowActionButton`, `ConfirmDeleteDialog`, `Editor`, `RadioGroup`, `Card`, `AdminBreadcrumb`, `StackedSkeleton` ; `timeOf`, `toInstant` ; `personDisplayName` (`@/lib/persons`) ; `JOB_ROLES`, `JOB_ROLE_LABELS` (`@/lib/job-roles`, `07`) ; `findPersonOptions()` (`07`) ; `findCompanyOptions()`, `CompanyOption` (`08`)
- Produces: `InterviewForm({ interview, defaultOpportunityId, opportunityOptions, personOptions, companyOptions }: { interview: AdminInterview | null; defaultOpportunityId?: string; opportunityOptions: readonly OpportunityOption[]; personOptions: readonly PersonOption[]; companyOptions: readonly CompanyOption[] })` ; `DeleteInterviewDialog({ interview, title })` ; `findInterviewByIdForAdmin(id)` ; routes `/admin/entretiens/nouveau` (opportunité de départ par `?opportunity=<id>`) et `/admin/entretiens/<id>`

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
  // Titre déduit de l'ordre de l'entretien dans son opportunité, calculé par la table.
  title: string
}

export function DeleteInterviewDialog({ interview, title }: Props) {
  const name = `${title} · ${interview.opportunity.title}`

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      description="Les entretiens suivants de l'opportunité se renumérotent."
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

`src/components/features/admin/entretiens/InterviewForm.tsx`, sur le motif de `LeadForm` (`08`) ; les cards reprennent les blocs de la vue détail. Ouvert depuis la card Entretiens d'une opportunité (`?opportunity=<id>`), il y revient après l'enregistrement :

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
import type { ContactType, InterviewSide, InterviewStatus, InterviewType, JobRole } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { CONTACT_TYPE_ICONS, CONTACT_TYPE_LABELS } from "@/lib/contacts"
import { timeOf, toInstant } from "@/lib/date-time"
import { detailsAfterTemplateChange, interviewDetailsTemplate } from "@/lib/details-templates"
import {
  INTERVIEW_DECISION_ICONS,
  INTERVIEW_DECISION_LABELS,
  INTERVIEW_FIELD_LABELS as LABELS,
  INTERVIEW_OUTCOME_ICONS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_STATUS_ICONS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_ICONS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/interviews"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import { personDisplayName } from "@/lib/persons"
import { CONTACT_TYPES } from "@/lib/schemas/contact"
import { INTERVIEW_DECISIONS, INTERVIEW_OUTCOMES, INTERVIEW_STATUSES, INTERVIEW_TYPES } from "@/lib/schemas/interview"
import { NONE_VALUE } from "@/lib/schemas/person"
import { createInterview, updateInterview } from "@/server/actions/interviews"
import { initialInterviewFormState } from "@/server/actions/interviews.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminInterview } from "@/server/queries/interviews"
import type { OpportunityOption } from "@/server/queries/opportunities"
import type { PersonOption } from "@/server/queries/persons"

interface NewCorrespondentDraft {
  key: string
  name: string
  jobRole: JobRole | ""
  companyId: string
  contactType: ContactType | ""
  email: string
  linkedinUrl: string
}

function emptyCorrespondentDraft(): NewCorrespondentDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    jobRole: "",
    companyId: "",
    contactType: "",
    email: "",
    linkedinUrl: "",
  }
}

function toNewCorrespondentPayload(draft: NewCorrespondentDraft) {
  return {
    name: draft.name.trim() || undefined,
    jobRole: draft.jobRole || undefined,
    companyId: draft.companyId || undefined,
    contactType: draft.contactType || undefined,
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

// Un correspondant inconnu : les mêmes champs qu'une personne, plus le type de contact choisi, encodés en JSON à l'enregistrement.
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
      <Select
        value={draft.contactType}
        onValueChange={(value) => onChange({ ...draft, contactType: value as ContactType })}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Type de contact" />
        </SelectTrigger>
        <SelectContent>
          {CONTACT_TYPES.map((value) => {
            const Icon = CONTACT_TYPE_ICONS[value]
            return (
              <SelectItem key={value} value={value}>
                {Icon ? <Icon aria-hidden /> : null}
                {CONTACT_TYPE_LABELS[value]}
              </SelectItem>
            )
          })}
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
  // Opportunité de départ d'un nouvel entretien, ouvert depuis la card Entretiens de sa page.
  defaultOpportunityId?: string
  opportunityOptions: readonly OpportunityOption[]
  personOptions: readonly PersonOption[]
  companyOptions: readonly CompanyOption[]
}

export function InterviewForm({
  interview,
  defaultOpportunityId,
  opportunityOptions,
  personOptions,
  companyOptions,
}: Props) {
  const router = useRouter()
  const formId = useId()
  const action = interview ? updateInterview.bind(null, interview.id) : createInterview
  const [state, formAction, pending] = useActionState(action, initialInterviewFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const returnPath: Route = defaultOpportunityId
    ? `/admin/opportunites/${defaultOpportunityId}`
    : "/admin/entretiens"

  // L'opportunité d'un entretien existant peut être close, donc sortie des choix : elle reste affichée.
  const opportunities: readonly OpportunityOption[] =
    interview && !opportunityOptions.some((option) => option.id === interview.opportunityId)
      ? [
          {
            id: interview.opportunity.id,
            title: interview.opportunity.title,
            intermediary: interview.opportunity.intermediary
              ? { name: interview.opportunity.intermediary.name }
              : null,
            client: interview.opportunity.client ? { name: interview.opportunity.client.name } : null,
          },
          ...opportunityOptions,
        ]
      : opportunityOptions

  const [now] = useState(() => new Date())
  const [opportunityId, setOpportunityId] = useState(interview?.opportunityId ?? defaultOpportunityId ?? "")
  const [opportunityOpen, setOpportunityOpen] = useState(false)
  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === opportunityId) ?? null
  const [side, setSide] = useState<InterviewSide>(
    interview?.side ?? (selectedOpportunity?.intermediary ? "ESN" : "CLIENT_FINAL"),
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

  function handleOpportunityChange(nextId: string) {
    setOpportunityId(nextId)
    const next = opportunities.find((opportunity) => opportunity.id === nextId)
    // Une opportunité en client direct ne peut pas être menée côté ESN.
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
            ? `${INTERVIEW_TYPE_LABELS[interview.type]} · ${interview.opportunity.title}`
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
              <CardTitle>Opportunité</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField id={`${formId}-opportunityId`} label={LABELS.opportunityId} errors={state.errors.opportunityId}>
                <ComboboxPopover
                  id={`${formId}-opportunityId`}
                  open={opportunityOpen}
                  onOpenChange={setOpportunityOpen}
                  triggerContent={
                    selectedOpportunity ? (
                      <span className="truncate">{selectedOpportunity.title}</span>
                    ) : (
                      <span className="text-muted-foreground">Choisir une opportunité</span>
                    )
                  }
                  ariaInvalid={!!state.errors.opportunityId?.length}
                  ariaDescribedby={`${formId}-opportunityId-error`}
                  searchPlaceholder="Chercher une opportunité"
                  emptyMessage="Aucune opportunité ne correspond."
                >
                  <CommandGroup>
                    {opportunities.map((opportunity) => (
                      <CommandItem
                        key={opportunity.id}
                        value={opportunity.id}
                        keywords={[
                          opportunity.title,
                          opportunity.intermediary?.name ?? "",
                          opportunity.client?.name ?? "",
                        ]}
                        data-checked={opportunityId === opportunity.id}
                        onSelect={() => {
                          handleOpportunityChange(opportunity.id)
                          setOpportunityOpen(false)
                        }}
                      >
                        <span className="truncate">{opportunity.title}</span>
                        <span className="truncate text-muted-foreground">
                          {opportunity.intermediary?.name ?? opportunity.client?.name ?? ""}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ComboboxPopover>
                <input type="hidden" name="opportunityId" value={opportunityId} />
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
                      disabled={!selectedOpportunity?.intermediary}
                    />
                    <Label htmlFor={`${formId}-side-esn`}>
                      ESN{selectedOpportunity?.intermediary ? ` · ${selectedOpportunity.intermediary.name}` : " (aucune)"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id={`${formId}-side-client`} value="CLIENT_FINAL" />
                    <Label htmlFor={`${formId}-side-client`}>
                      Client final{selectedOpportunity?.client ? ` · ${selectedOpportunity.client.name}` : ""}
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
                    {INTERVIEW_TYPES.map((value) => {
                      const Icon = INTERVIEW_TYPE_ICONS[value]
                      return (
                        <SelectItem key={value} value={value}>
                          {Icon ? <Icon aria-hidden /> : null}
                          {INTERVIEW_TYPE_LABELS[value]}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </FormField>

              <div>
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

              <div className={status === "FAIT" ? undefined : "sm:col-span-2"}>
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
                      {INTERVIEW_STATUSES.map((value) => {
                        const Icon = INTERVIEW_STATUS_ICONS[value]
                        return (
                          <SelectItem key={value} value={value}>
                            {Icon ? <Icon aria-hidden /> : null}
                            {INTERVIEW_STATUS_LABELS[value]}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

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
                      {INTERVIEW_OUTCOMES.map((value) => {
                        const Icon = INTERVIEW_OUTCOME_ICONS[value]
                        return (
                          <SelectItem key={value} value={value}>
                            {Icon ? <Icon aria-hidden /> : null}
                            {INTERVIEW_OUTCOME_LABELS[value]}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : null}

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
                    searchPlaceholder="Chercher un lead ou un contact"
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
                  Nouveau contact
                </Button>
                {newCorrespondents.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Chaque nouvelle personne devient un contact du type choisi. Le reste de sa fiche se complète
                    depuis Contacts.
                  </p>
                ) : null}
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
              <FormField id={`${formId}-score`} label={LABELS.score} errors={state.errors.score}>
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
                  aria-describedby={`${formId}-score-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-decision`}
                name="decision"
                label={LABELS.decision}
                options={INTERVIEW_DECISIONS}
                labels={INTERVIEW_DECISION_LABELS}
                icons={INTERVIEW_DECISION_ICONS}
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
import { findOpportunityOptions } from "@/server/queries/opportunities"
import { findPersonOptions } from "@/server/queries/persons"

const INTERVIEW_PAGE_SKELETON = ["h-[24px]", "h-[180px]", "h-[260px]", "h-[320px]"]

async function NewInterviewSection({
  searchParams,
}: {
  searchParams: Promise<{ opportunity?: string }>
}) {
  const [{ opportunity }, opportunityOptions, personOptions, companyOptions] = await Promise.all([
    searchParams,
    findOpportunityOptions(),
    findPersonOptions(),
    findCompanyOptions(),
  ])
  // Seule une opportunité proposable devient l'opportunité de départ.
  const defaultOpportunityId = opportunityOptions.some((option) => option.id === opportunity)
    ? opportunity
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Entretiens", href: "/admin/entretiens" }, { label: "Nouvel entretien" }]}
      />
      <InterviewForm
        interview={null}
        {...(defaultOpportunityId ? { defaultOpportunityId } : {})}
        opportunityOptions={opportunityOptions}
        personOptions={personOptions}
        companyOptions={companyOptions}
      />
    </div>
  )
}

export default async function NewInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ opportunity?: string }>
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
import { findOpportunityOptions } from "@/server/queries/opportunities"
import { findPersonOptions } from "@/server/queries/persons"

const INTERVIEW_PAGE_SKELETON = ["h-[24px]", "h-[180px]", "h-[260px]", "h-[320px]"]

async function EditInterviewSection({ id }: { id: string }) {
  const [interview, opportunityOptions, personOptions, companyOptions] = await Promise.all([
    findInterviewByIdForAdmin(id),
    findOpportunityOptions(),
    findPersonOptions(),
    findCompanyOptions(),
  ])
  if (!interview) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Entretiens", href: "/admin/entretiens" },
          { label: `${INTERVIEW_TYPE_LABELS[interview.type]} · ${interview.opportunity.title}` },
        ]}
      />
      <InterviewForm
        interview={interview}
        opportunityOptions={opportunityOptions}
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
- Produces: `InterviewsTable({ interviews, view, initialDetailId })`, `InterviewsViewPage({ view, initialDetailId })`

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
import { EnumBadge } from "@/components/features/admin/EnumBadge"
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
  INTERVIEW_DECISION_ICONS,
  INTERVIEW_DECISION_LABELS,
  INTERVIEW_FIELD_LABELS as LABELS,
  INTERVIEW_OUTCOME_ICONS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_STATUS_ICONS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_ICONS,
  INTERVIEW_TYPE_LABELS,
  interviewPlaces,
  interviewTitle,
} from "@/lib/interviews"
import { formatDailyRate, OPPORTUNITY_FIELD_LABELS } from "@/lib/opportunities"
import { personDetailHref } from "@/lib/person-links"
import { personDisplayName } from "@/lib/persons"
import { CONTRACT_STATUS_ICONS, CONTRACT_STATUS_LABELS, WORK_MODE_ICONS, WORK_MODE_LABELS } from "@/lib/projects"
import { INTERVIEW_OUTCOMES, INTERVIEW_STATUSES, INTERVIEW_TYPES } from "@/lib/schemas/interview"
import { ZONE_LABELS } from "@/lib/zones"
import type { AdminInterview } from "@/server/queries/interviews"

const OPTED_OUT_LABEL = "Ne plus contacter"

function leadingCompany(interview: AdminInterview) {
  return interview.side === "ESN" ? interview.opportunity.intermediary : interview.opportunity.client
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
          interview.opportunity.title,
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
      key: "opportunity",
      header: LABELS.opportunityId,
      width: INTERVIEW_COLUMN_WIDTHS.opportunity,
      ...hideable(view, "opportunity"),
      sortValue: (interview) => interview.opportunity.title,
      cell: (interview) => <TruncatedCell value={interview.opportunity.title} />,
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
      cell: (interview) => (
        <EnumBadge label={INTERVIEW_TYPE_LABELS[interview.type]} icon={INTERVIEW_TYPE_ICONS[interview.type]} />
      ),
    },
    {
      key: "status",
      header: LABELS.status,
      width: INTERVIEW_COLUMN_WIDTHS.status,
      ...hideable(view, "status"),
      cell: (interview) => (
        <EnumBadge label={INTERVIEW_STATUS_LABELS[interview.status]} icon={INTERVIEW_STATUS_ICONS[interview.status]} />
      ),
    },
    {
      key: "outcome",
      header: LABELS.outcome,
      width: INTERVIEW_COLUMN_WIDTHS.outcome,
      ...hideable(view, "outcome"),
      cell: (interview) =>
        interview.outcome ? (
          <EnumBadge label={INTERVIEW_OUTCOME_LABELS[interview.outcome]} icon={INTERVIEW_OUTCOME_ICONS[interview.outcome]} />
        ) : null,
    },
    {
      key: "zone",
      header: "Localité",
      width: INTERVIEW_COLUMN_WIDTHS.zone,
      ...hideable(view, "zone"),
      cell: (interview) =>
        interview.opportunity.zone ? (
          <Badge variant="secondary">{ZONE_LABELS[interview.opportunity.zone]}</Badge>
        ) : null,
    },
    {
      key: "workMode",
      header: "Mode",
      width: INTERVIEW_COLUMN_WIDTHS.workMode,
      ...hideable(view, "workMode"),
      cell: (interview) =>
        interview.opportunity.workMode ? WORK_MODE_LABELS[interview.opportunity.workMode] : null,
    },
    {
      key: "dailyRate",
      header: "TJM",
      width: INTERVIEW_COLUMN_WIDTHS.dailyRate,
      align: "right",
      className: "tabular-nums",
      ...hideable(view, "dailyRate"),
      sortValue: (interview) => interview.opportunity.dailyRate ?? -1,
      cell: (interview) => formatDailyRate(interview.opportunity.dailyRate),
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
        interview.decision ? (
          <EnumBadge label={INTERVIEW_DECISION_LABELS[interview.decision]} icon={INTERVIEW_DECISION_ICONS[interview.decision]} />
        ) : null,
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
  previous: { id: string; title: string; scheduledAt: Date } | null,
  onEdit: () => void,
): DetailContent {
  const company = leadingCompany(interview)
  const { opportunity } = interview

  return {
    title,
    subtitle: company?.name ?? "",
    status: (
      <Badge variant="outline" meta>
        {INTERVIEW_STATUS_LABELS[interview.status]}
      </Badge>
    ),
    sections: [
      {
        // La ligne cliquable fait aussi office de titre : l'opportunité se retrouve avant ses conditions.
        title: "Opportunité",
        rows: [
          {
            fullWidth: true,
            value: (
              <Link href={`/admin/opportunites/toutes?detail=${opportunity.id}`} className="font-medium hover:underline">
                {opportunity.title}
              </Link>
            ),
          },
          { label: OPPORTUNITY_FIELD_LABELS.dailyRate, value: formatDailyRate(opportunity.dailyRate) },
          {
            label: OPPORTUNITY_FIELD_LABELS.contract,
            value: opportunity.contract ? (
              <EnumBadge
                label={CONTRACT_STATUS_LABELS[opportunity.contract]}
                icon={CONTRACT_STATUS_ICONS[opportunity.contract]}
              />
            ) : null,
          },
          {
            label: OPPORTUNITY_FIELD_LABELS.workMode,
            value: opportunity.workMode ? (
              <EnumBadge label={WORK_MODE_LABELS[opportunity.workMode]} icon={WORK_MODE_ICONS[opportunity.workMode]} />
            ) : null,
          },
          {
            label: OPPORTUNITY_FIELD_LABELS.zone,
            value: opportunity.zone ? <Badge variant="secondary">{ZONE_LABELS[opportunity.zone]}</Badge> : null,
          },
        ],
      },
      {
        // Statut et mené par sont déjà portés par l'en-tête et le sous-titre, inutile de les répéter ici.
        title: "Échange",
        rows: [
          { label: LABELS.type, value: <EnumBadge label={INTERVIEW_TYPE_LABELS[interview.type]} icon={INTERVIEW_TYPE_ICONS[interview.type]} /> },
          { label: LABELS.scheduledAt, value: formatShortDateTime(interview.scheduledAt) },
          ...(interview.outcome
            ? [
                {
                  label: LABELS.outcome,
                  fullWidth: true,
                  value: <EnumBadge label={INTERVIEW_OUTCOME_LABELS[interview.outcome]} icon={INTERVIEW_OUTCOME_ICONS[interview.outcome]} />,
                },
              ]
            : []),
          {
            label: LABELS.correspondentIds,
            fullWidth: true,
            value:
              interview.correspondents.length > 0 ? (
                <span className="flex flex-wrap gap-2">
                  {interview.correspondents.map((person) => {
                    // Un correspondant peut n'avoir ni rôle Lead ni rôle Contact (perdu après une suppression) : personDetailHref (13) rend alors null, le nom reste en texte simple.
                    const href = personDetailHref(person)
                    return (
                      <span key={person.id} className="inline-flex items-center gap-1">
                        {href ? (
                          <Link href={href} className="hover:underline">
                            {personDisplayName(person)}
                          </Link>
                        ) : (
                          <span>{personDisplayName(person)}</span>
                        )}
                        {person.optedOutAt ? <Badge variant="outline">{OPTED_OUT_LABEL}</Badge> : null}
                      </span>
                    )
                  })}
                </span>
              ) : null,
          },
        ],
      },
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
      ...keepFilled({
        title: "Évaluation",
        rows: [
          { label: LABELS.score, value: interview.score === null ? null : `${interview.score} / 10` },
          {
            label: LABELS.decision,
            value: interview.decision ? <EnumBadge label={INTERVIEW_DECISION_LABELS[interview.decision]} icon={INTERVIEW_DECISION_ICONS[interview.decision]} /> : null,
          },
        ],
      }),
      ...(interview.notes ? [{ title: "Notes", rows: [{ value: interview.notes, fullWidth: true }] }] : []),
      ...(previous
        ? [
            {
              title: "Entretien précédent",
              rows: [
                {
                  fullWidth: true,
                  value: (
                    <Link href={`/admin/entretiens/journal?detail=${previous.id}`} className="hover:underline">
                      {previous.title} · {formatShortDateTime(previous.scheduledAt)}
                    </Link>
                  ),
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
  // Ouvre la vue détail de cette ligne au chargement (lien « Entretien précédent », card d'une opportunité ou d'un lead).
  initialDetailId?: string
}

export function InterviewsTable({ interviews, view, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedInterview, setSelectedInterview] = useState<AdminInterview | null>(
    () => interviews.find((interview) => interview.id === initialDetailId) ?? null,
  )
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
              aria-label={`Modifier ${titles.get(interview.id) ?? ""} · ${interview.opportunity.title}`}
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
      previous ? { id: previous.id, title: titles.get(previous.id) ?? "", scheduledAt: previous.scheduledAt } : null,
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
        searchPlaceholder="Rechercher une opportunité, une entreprise ou un correspondant"
        noun="entretien"
        onRowClick={setSelectedInterview}
        rowLabel={(interview) => titles.get(interview.id) ?? ""}
        initialDetailId={initialDetailId}
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

async function InterviewsSection({
  view,
  initialDetailId,
}: {
  view: InterviewView
  initialDetailId?: string
}) {
  const interviews = await findAllInterviewsForAdmin()
  return <InterviewsTable interviews={interviews} view={view} initialDetailId={initialDetailId} />
}

interface Props {
  view: InterviewView
  initialDetailId?: string
}

export function InterviewsViewPage({ view, initialDetailId }: Props) {
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
        <InterviewsSection view={view} initialDetailId={initialDetailId} />
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

export default async function AdminInterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>
}) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <InterviewsViewPage view="a-venir" initialDetailId={detail} />
}
```

`src/app/admin/(protected)/entretiens/journal/page.tsx` :

```tsx
import { InterviewsViewPage } from "@/components/features/admin/entretiens/InterviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminInterviewsJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>
}) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <InterviewsViewPage view="journal" initialDetailId={detail} />
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

### Task 6 : Côté opportunités et leads

**Files:**
- Modify: `src/components/features/admin/opportunities/OpportunitiesTable.tsx`
- Modify: `src/components/features/admin/opportunities/DeleteOpportunityDialog.tsx`
- Modify: `src/app/admin/(protected)/opportunites/[id]/page.tsx`
- Modify: `src/app/admin/(protected)/opportunites/nouvelle/page.tsx`
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`
- Modify: `src/app/admin/(protected)/leads/[id]/page.tsx`
- Modify: `src/app/admin/(protected)/leads/nouveau/page.tsx`

**Interfaces:**
- Consumes: Tasks 3 et 4 ; `interviewPlaces`, `interviewTitle`, `INTERVIEW_STATUS_LABELS`, `INTERVIEW_TYPE_LABELS` (`16`) ; `RelatedLinksList`, `RelatedLinksCard`, `RelatedLink` (`08`) ; pages de l'opportunité (`15`) et du lead (`08`)
- Produces: rien

- [ ] **Step 1 : Suppression d'une opportunité**

Dans `DeleteOpportunityDialog.tsx`, remplacer la description par « Ses entretiens sont supprimés avec elle. L'apporteur, l'ESN et le client final restent. »

- [ ] **Step 2 : Bloc Entretiens d'une opportunité**

Dans `OpportunitiesTable.tsx` :

- importer `interviewPlaces`, `interviewTitle`, `INTERVIEW_STATUS_LABELS` depuis `@/lib/interviews`, `formatShortDateTime` depuis `@/lib/date-time`, `RelatedLinksList` et `type RelatedLink` depuis `@/components/features/admin/RelatedLinksList` ;
- ajouter avant `buildOpportunityDetail` :

```tsx
// Arbitrage « Fiches rattachées » : RelatedLinksList, chaque ligne menant à la vue détail de l'entretien via ?detail= sur sa vue complète (le Journal).
function interviewsSection(opportunity: AdminOpportunity): DetailSection[] {
  if (opportunity.interviews.length === 0) return []
  const places = interviewPlaces(opportunity.interviews)
  return [
    {
      title: "Entretiens",
      rows: [
        {
          fullWidth: true,
          value: (
            <RelatedLinksList
              links={opportunity.interviews.map(
                (interview): RelatedLink => ({
                  id: interview.id,
                  href: `/admin/entretiens/journal?detail=${interview.id}`,
                  label: interviewTitle(interview.type, places.get(interview.id)?.number ?? null),
                  meta: INTERVIEW_STATUS_LABELS[interview.status],
                  trailing: formatShortDateTime(interview.scheduledAt),
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

  puis, dans `buildOpportunityDetail`, insérer `...interviewsSection(opportunity),` à la toute fin du tableau `sections`, juste après le bloc Notes (`15`) et avant `onEdit,` : Entretiens clôt la vue détail d'une opportunité (arbitrage du propriétaire, 2026-10-02), après Notes plutôt qu'avant.

- [ ] **Step 3 : Card Entretiens de la page d'une opportunité, en création comme en modification**

Arbitrage « Élément rattaché à une fiche » de DESIGN.md : un entretien se crée depuis la page de son opportunité, jamais par un bouton de ligne. L'opportunité lue par `findOpportunityByIdForAdmin` porte ses entretiens (Task 3). `OpportunityForm` rend déjà `relatedCards` dans sa colonne principale, après Détails (`15`).

Dans `src/app/admin/(protected)/opportunites/[id]/page.tsx`, importer `Plus` (`lucide-react`), `Link` (`next/link`), `Button`, `RelatedLinksCard`, `type RelatedLink`, `interviewPlaces`, `interviewTitle`, `INTERVIEW_STATUS_LABELS` (`@/lib/interviews`) et `formatShortDateTime` (`@/lib/date-time`), puis, dans `EditOpportunitySection`, calculer :

```tsx
  // Titres calculés sur les entretiens de l'opportunité : « Entretien 2 » suit l'ordre de l'opportunité.
  const places = interviewPlaces(opportunity.interviews)
```

et passer à `<OpportunityForm … />` :

```tsx
      <OpportunityForm
        opportunity={opportunity}
        referrerOptions={referrerOptions}
        companyOptions={companyOptions}
        relatedCards={
          <RelatedLinksCard
            title="Entretiens"
            links={opportunity.interviews.map(
              (interview): RelatedLink => ({
                id: interview.id,
                href: `/admin/entretiens/${interview.id}`,
                label: interviewTitle(interview.type, places.get(interview.id)?.number ?? null),
                meta: INTERVIEW_STATUS_LABELS[interview.status],
                trailing: formatShortDateTime(interview.scheduledAt),
              }),
            )}
            emptyText="Aucun entretien pour cette opportunité."
            action={
              <Button size="sm" asChild>
                <Link href={`/admin/entretiens/nouveau?opportunity=${opportunity.id}`}>
                  <Plus aria-hidden data-icon="inline-start" />
                  Nouvel entretien
                </Link>
              </Button>
            }
          />
        }
      />
```

Dans `src/app/admin/(protected)/opportunites/nouvelle/page.tsx`, importer les mêmes modules et passer, dans `NewOpportunitySection`, la même card vide et le bouton désactivé (aucune opportunité à relier encore) :

```tsx
      <OpportunityForm
        opportunity={null}
        referrerOptions={referrerOptions}
        companyOptions={companyOptions}
        relatedCards={
          <RelatedLinksCard
            title="Entretiens"
            links={[]}
            emptyText="Après l'enregistrement de l'opportunité."
            action={
              <Button size="sm" disabled>
                <Plus aria-hidden data-icon="inline-start" />
                Nouvel entretien
              </Button>
            }
          />
        }
      />
```

La page `/admin/entretiens/nouveau` n'accepte comme opportunité de départ qu'une opportunité proposable (Task 4) : sur une opportunité close, le formulaire s'ouvre sans opportunité choisie.

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
// Arbitrage « Fiches rattachées » : RelatedLinksList, chaque ligne menant à la vue détail de l'entretien via ?detail= sur sa vue complète (le Journal).
function interviewsSection(lead: AdminLead): DetailSection[] {
  if (lead.interviews.length === 0) return []
  return [
    {
      title: "Entretiens",
      rows: [
        {
          fullWidth: true,
          value: (
            <RelatedLinksList
              links={lead.interviews.map(
                (interview): RelatedLink => ({
                  id: interview.id,
                  href: `/admin/entretiens/journal?detail=${interview.id}`,
                  label: INTERVIEW_TYPE_LABELS[interview.type],
                  meta: `${interview.opportunity.title} · ${INTERVIEW_STATUS_LABELS[interview.status]}`,
                  trailing: formatShortDateTime(interview.scheduledAt),
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

  et, dans les deux branches de `buildLeadDetail`, insérer `...interviewsSection(lead),` juste après `...opportunitiesSection(lead),` (`15`) : Entretiens suit Opportunités apportées, avant Signaux (`19`).

- [ ] **Step 5 : Card Entretiens de la page d'un lead, en création comme en modification**

Le lead lu par `findLeadByIdForAdmin` porte ses entretiens (Task 3). Dans `src/app/admin/(protected)/leads/[id]/page.tsx`, importer `INTERVIEW_STATUS_LABELS`, `INTERVIEW_TYPE_LABELS` (`@/lib/interviews`) et `formatShortDateTime` (`@/lib/date-time`), puis remplacer le fragment `relatedCards` de `LeadForm` (`10`, `15`) par le même complété d'une card Entretiens, juste après la card Opportunités apportées :

```tsx
        relatedCards={
          <>
            <LeadActionsCard lead={lead} actions={actions} />
            <RelatedLinksCard
              title="Opportunités apportées"
              links={lead.opportunities.map(
                (opportunity): RelatedLink => ({
                  id: opportunity.id,
                  href: `/admin/opportunites/${opportunity.id}`,
                  label: opportunity.title,
                  meta: opportunity.client
                    ? `${OPPORTUNITY_STATUS_LABELS[opportunity.status]} · ${opportunity.client.name}`
                    : OPPORTUNITY_STATUS_LABELS[opportunity.status],
                  trailing: formatDailyRate(opportunity.dailyRate),
                }),
              )}
              emptyText="Aucune opportunité apportée par ce lead."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/opportunites/nouvelle">
                    <Plus aria-hidden data-icon="inline-start" />
                    Nouvelle opportunité
                  </Link>
                </Button>
              }
            />
            <RelatedLinksCard
              title="Entretiens"
              links={lead.interviews.map(
                (interview): RelatedLink => ({
                  id: interview.id,
                  href: `/admin/entretiens/${interview.id}`,
                  label: `${INTERVIEW_TYPE_LABELS[interview.type]} · ${interview.opportunity.title}`,
                  meta: INTERVIEW_STATUS_LABELS[interview.status],
                  trailing: formatShortDateTime(interview.scheduledAt),
                }),
              )}
              emptyText="Aucun entretien pour ce lead."
            />
          </>
        }
```

(la card Opportunités apportées, inchangée, vient du `15` ; ses imports `OPPORTUNITY_STATUS_LABELS`, `formatDailyRate`, `Plus`, `Button`, `Link` restent ceux déjà posés là.) Un entretien se crée depuis l'opportunité, jamais depuis le lead : sa card ne porte pas d'`action`. Dans `src/app/admin/(protected)/leads/nouveau/page.tsx`, remplacer de même le fragment `relatedCards` par le même complété d'une card Entretiens vide :

```tsx
        relatedCards={
          <>
            <LeadActionsCard lead={null} actions={[]} />
            <RelatedLinksCard
              title="Opportunités apportées"
              links={[]}
              emptyText="Après l'enregistrement du lead."
              action={
                <Button variant="outline" size="sm" disabled>
                  <Plus aria-hidden data-icon="inline-start" />
                  Nouvelle opportunité
                </Button>
              }
            />
            <RelatedLinksCard title="Entretiens" links={[]} emptyText="Après l'enregistrement du lead." />
          </>
        }
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

- [ ] **Step 1 : Depuis une opportunité**

Run: `just dev`, se connecter ; avoir une opportunité via une ESN et une opportunité en client direct, un lead non opposé. Ouvrir la page de création d'une opportunité.
Expected: sa card Entretiens est vide, « Après l'enregistrement de l'opportunité. », bouton « Nouvel entretien » désactivé.

Sur la page de l'opportunité via l'ESN (une fois enregistrée). Expected: l'entrée Entretiens mène à « Entretiens à venir ». La card Entretiens est vide ; son bouton « Nouvel entretien » ouvre la page `/admin/entretiens/nouveau?opportunity=<id>`, opportunité déjà choisie, Détails au gabarit Premier contact. Passer le type à Recruteur/RH puis Technique : le gabarit suit ; chaque option du select Type porte son glyphe ; écrire une ligne puis changer de type : le texte reste. Ajouter le lead en correspondant (recherche « Chercher un lead ou un contact »), puis « Nouveau contact » (nom, poste Recruteur, entreprise, type de contact Commercial, email) : la ligne apparaît avec ses champs, dont le select Type de contact à glyphes. Enregistrer un Technique planifié demain, mené par l'ESN, avec les deux correspondants : retour sur la page de l'opportunité, dont la card liste « Entretien 1 · Technique », statut en méta, date en dessous ; il figure dans À venir, TJM et localité de l'opportunité affichés ; le lead et le nouveau contact (retrouvé dans Contacts, rôle Contact, type Commercial) affichent tous deux le lien vers cet entretien ; la card Entretiens de la page du lead vide avant l'enregistrement. Aucune ligne de la liste des opportunités ne porte de bouton « Nouvel entretien ».

- [ ] **Step 2 : Mené par, échange et issue**

Cliquer « Nouvel entretien » dans l'en-tête de l'écran Entretiens, choisir l'opportunité via l'ESN, laisser « ESN », puis changer pour l'opportunité en client direct.
Expected: l'option ESN devient « ESN (aucune) », désactivée, et le choix passe au client final. Dans la card Échange, Type et Date et heure se tiennent sur la même ligne, Statut occupe seul la ligne suivante tant qu'Issue est masquée. Passer Statut à Fait : Issue apparaît à ses côtés sur la même ligne, facultative, glyphe visible dans son select ; la laisser vide n'empêche pas l'enregistrement. La choisir : l'enregistrement aboutit et ramène à l'écran Entretiens. Repasser Statut à Planifié sur un entretien Fait : Issue se masque et Statut reprend la pleine largeur, l'enregistrement aboutit toujours.

- [ ] **Step 3 : Journal, titres et précédent**

Créer sur l'opportunité via l'ESN un Premier contact la semaine dernière (statut Fait, issue Positif) ; ouvrir le Journal puis la vue détail du Technique.
Expected: le Technique vient en premier ; il s'intitule toujours « Entretien 1 · Technique » dans À venir comme au Journal ; son sous-titre est le nom de l'ESN seul ; son bloc Opportunité porte une ligne cliquable vers la page de l'opportunité, puis TJM, Contrat, Mode, Localité ; son bloc Échange ne répète ni le statut ni l'ESN, Correspondants cliquables vers Contacts ; sa vue détail nomme le Premier contact comme entretien précédent, cliquable. Cliquer ce lien.
Expected: ouvre le Journal avec la vue détail du Premier contact déjà affichée (`?detail=`).

- [ ] **Step 4 : Opportunité close et correspondant opposé**

Passer l'opportunité via l'ESN à Refusée, puis le lead en « ne plus contacter » ; rouvrir la page du Technique (crayon de la ligne ou « Modifier » de sa vue détail).
Expected: l'opportunité reste affichée dans le champ, sans être proposée à un nouvel entretien ; le bouton « Nouvel entretien » de sa page ouvre le formulaire sans opportunité choisie ; le lead opposé reste parmi les correspondants, marqué « Ne plus contacter » dans la vue détail, et n'est plus proposé pour un autre entretien.

- [ ] **Step 5 : Fiches reliées et suppressions**

Ouvrir la vue détail puis la page de l'opportunité et du lead ; afficher Leads > Tous. Supprimer le Premier contact, puis l'opportunité.
Expected: bloc Entretiens sur les deux vues détail, card Entretiens sur les deux pages, chaque entretien menant à sa page ; colonne Entretiens du lead à 1 ; après suppression du Premier contact, le Technique reste « Entretien 1 · Technique » ; la suppression de l'opportunité prévient que ses entretiens partent avec elle et les supprime. Puis `just stop`.
