# Écran des missions : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'écran Missions (trois vues, liste, formulaire, détail, suppression), les missions sur les fiches entreprise et lead, les clients finaux et la travaillée d'une entreprise étendus à ses missions acceptées et le statut « Deal » d'un lead déduit de ses missions acceptées.

**Architecture:** Des modules purs testés portent les règles : statut affiché du lead (`lead-display-status`), vues des leads relues sur ce statut, vues des missions (`mission-views`), clients finaux et travaillée étendue aux missions acceptées (`companies`). `AdminLead` et `AdminCompany` incluent leurs missions, sans lecture de plus. L'écran Missions reprend les motifs de `LeadsTable` et `LeadForm` (`08`) : page de création et de modification en cards ; les pages du lead et de l'entreprise listent leurs missions dans une `RelatedLinksCard` (`08`).

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7, shadcn/ui `radix-nova` (Card, Select, Popover, Command), Pages CMS Editor (ADR-024), Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/15-ecran-missions-design.md`

## Global Constraints

- **Prérequis** : plans `02` (`ZONES`, `ZONE_LABELS` dans `src/lib/zones.ts`), `03` (éditeur `Editor` du champ Détails), `04` (`CompaniesTable` et sa vue détail), `07` (`findPersonOptionsWithLeadRole`, `personDisplayName` dans `src/lib/persons.ts`, `NONE_VALUE` dans `src/lib/schemas/person.ts`), `08` (`LeadsTable`, `lead-views`, `LeadForm`, pages du lead et de l'entreprise, `RelatedLinksCard`, `findCompanyOptions`, `SelectField`), `10` (état de `LeadsTable` et `LeadsViewPage` après ses ajouts) et `14` (`Mission`, `createMission`, `updateMission`, `deleteMission`, `AdminMission`, `findAllMissionsForAdmin`, `MISSION_STATUS_LABELS`, `MISSION_FIELD_LABELS`, `formatStartMonth`, `toMonthValue`) implémentés.
- **Routes et titres** : En cours `/admin/missions` « Missions en cours », Acceptées `/admin/missions/acceptees` « Missions acceptées », Toutes `/admin/missions/toutes` « Toutes les missions » ; création `/admin/missions/nouvelle`, modification `/admin/missions/<id>`.
- **Page ou modale** (arbitrages « Page ou modale d'édition » et « Élément rattaché à une fiche » de DESIGN.md) : la mission se crée et se modifie sur sa page, en cards Mission, Relations, Détails, Conditions, Calendrier, Notes ; la ligne ne porte que Modifier (lien) et Supprimer.
- **Sous-titres** : « Opportunités proposées, en process ou avec une offre reçue. », « Missions gagnées, point de départ du suivi de mission. », « Toutes les opportunités, en pause et closes comprises. »
- **Vues** : En cours = `PROPOSEE`, `EN_PROCESS`, `OFFRE_RECUE`, démarrage le plus proche d'abord ; Acceptées = `ACCEPTEE`, démarrage le plus récent d'abord ; Toutes = toutes, mise à jour la plus récente d'abord ; sans démarrage, en dernier.
- **Localité de la mission** : `Mission.zone` au singulier (`Zone?`) ; formulaire en `SelectField`, colonne et facette à une valeur.
- **Apporteur** : `Mission.referrerId` référence `Person.id` (relation `"MissionReferrer"`) ; se choisit avec `findPersonOptionsWithLeadRole()` (personnes au rôle Lead non opposées), s'affiche avec `personDisplayName` ; un apporteur opposé s'affiche « Ne plus contacter », lu sur `mission.referrer.optedOutAt`.
- **Entreprises** : `worked` s'étend aux missions `ACCEPTEE` (comme ESN ou comme client final, en plus des `ClientMeta` du `04`) ; `endClients` se calcule depuis elles (`joinedEndClientNames`, dédoublonné, trié `localeCompare("fr")`) ; la colonne « Clients finaux » de `CompaniesTable` devient un livrable du `15` (le `04` ne la fournit plus), visible par défaut dans Toutes et Travaillées ; Travaillées inclut désormais les entreprises à mission acceptée.
- **Statut affiché du lead** : « Deal » dès qu'une mission apportée est `ACCEPTEE`, sinon le statut saisi ; En cours et Chauds excluent un lead « Deal ».
- **Textes** : suppression d'une mission « L'apporteur, l'ESN et le client final restent. » ; refus de suppression d'une entreprise « Cette entreprise est rattachée à <liens> et ne peut pas être supprimée. », <liens> ne nommant que les comptes non nuls.
- **Menu** : entrée « Missions » du groupe CRM, entre Leads et Actions prospection.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Démarrage à moitié saisi** (mois sans année ou l'inverse) : refusé avec « Mois de démarrage invalide », jamais enregistré vide en silence. Couvert par « sends an incomplete month so that validation refuses it » (Task 4).
- **Lead « Deal » par sa mission, remis en Perdu à la main** : il reste affiché « Deal ». Couvert par « shows Deal once one of its missions is accepted » (Task 1), dont le lead saisi est Perdu.
- **Entreprise ESN d'une mission et client final d'une autre** : son bloc Missions liste les deux avec le bon rôle. Vérifié à la Task 8, Step 4.
- **ESN d'une mission qui perd son type ESN / Recrutement** : le formulaire de la mission l'affiche toujours, sans la proposer aux autres. Vérifié à la Task 8, Step 3.
- **Client final sur deux missions Acceptée d'une même ESN** : une seule fois dans « Clients finaux ». Couvert par « names each accepted mission's end client once, sorted » (Task 3).

---

### Task 1 : Statut affiché du lead

**Files:**
- Create: `src/lib/lead-display-status.ts`
- Test: `src/lib/lead-display-status.test.ts`
- Modify: `src/lib/lead-views.ts`
- Test: `src/lib/lead-views.test.ts`
- Modify: `src/server/queries/leads.ts`

**Interfaces:**
- Consumes: `LeadStatus`, `MissionStatus`
- Produces: `type LeadDisplayStatus = LeadStatus | "DEAL"` ; `LEAD_DISPLAY_STATUSES: readonly LeadDisplayStatus[]` ; `LEAD_DISPLAY_STATUS_LABELS: Record<LeadDisplayStatus, string>` ; `leadDisplayStatus(lead: LeadStatusSource): LeadDisplayStatus` ; `AdminLead.missions: { id, title, status, client: { name } | null }[]`

`LeadStatus` n'a jamais porté `DEAL` (`07`) : « Deal » est une valeur affichée, jamais saisie.

- [ ] **Step 1 : Écrire les tests du statut affiché**

`src/lib/lead-display-status.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { leadDisplayStatus } from "./lead-display-status"

describe("leadDisplayStatus", () => {
  it("shows Deal once one of its missions is accepted", () => {
    const lead = {
      status: "PERDU" as const,
      missions: [{ status: "REFUSEE" as const }, { status: "ACCEPTEE" as const }],
    }

    const status = leadDisplayStatus(lead)

    expect(status).toBe("DEAL")
  })

  it("keeps the entered status otherwise", () => {
    const lead = { status: "DISCUSSION" as const, missions: [{ status: "OFFRE_RECUE" as const }] }

    const status = leadDisplayStatus(lead)

    expect(status).toBe("DISCUSSION")
  })
})
```

Run: `pnpm vitest run --project unit src/lib/lead-display-status.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Statut affiché**

`src/lib/lead-display-status.ts` :

```ts
import type { LeadStatus, MissionStatus } from "@/generated/prisma/client"
import { LEAD_STATUS_LABELS } from "@/lib/leads"
import { LEAD_STATUSES } from "@/lib/schemas/lead"

export type LeadDisplayStatus = LeadStatus | "DEAL"

export const LEAD_DISPLAY_STATUSES: readonly LeadDisplayStatus[] = [...LEAD_STATUSES, "DEAL"]

export const LEAD_DISPLAY_STATUS_LABELS: Record<LeadDisplayStatus, string> = {
  ...LEAD_STATUS_LABELS,
  DEAL: "Deal",
}

export interface LeadStatusSource {
  status: LeadStatus
  missions: readonly { status: MissionStatus }[]
}

// Le deal est un fait de la mission : une mission acceptée l'emporte sur le statut saisi.
export function leadDisplayStatus(lead: LeadStatusSource): LeadDisplayStatus {
  return lead.missions.some((mission) => mission.status === "ACCEPTEE") ? "DEAL" : lead.status
}
```

Run: `pnpm vitest run --project unit src/lib/lead-display-status.test.ts`
Expected: PASS.

- [ ] **Step 3 : Vues des leads, tests**

Dans `src/lib/lead-views.test.ts` :

- retirer `"DEAL",` de `STATUSES` ;
- ajouter `missions: { status: MissionStatus }[]` à `TestLead` (import de type `MissionStatus` depuis `@/generated/prisma/client`) et `missions: [],` aux valeurs par défaut de `lead()` ;
- dans « keeps hot leads outside deal, lost and out-of-profile in the hot view », remplacer le tableau `["DEAL", "PERDU", "HORS_ICP", "DISCUSSION"]` par `["PERDU", "HORS_ICP", "DISCUSSION"]` et ajouter à `leads` :

```ts
      lead({ id: "hot-deal", status: "DISCUSSION", interest: "HOT", missions: [{ status: "ACCEPTEE" }] }),
```

- ajouter dans `describe("leadsForView")` :

```ts
  it("keeps a lead with an accepted mission out of the ongoing and hot views", () => {
    const deal = lead({ id: "deal", status: "DISCUSSION", interest: "HOT", missions: [{ status: "ACCEPTEE" }] })

    const ongoing = leadsForView([deal], "en-cours")
    const hot = leadsForView([deal], "chauds")

    expect(ongoing).toEqual([])
    expect(hot).toEqual([])
  })
```

Run: `pnpm vitest run --project unit src/lib/lead-views.test.ts`
Expected: FAIL sur le nouveau test (le lead Deal reste en cours).

- [ ] **Step 4 : Vues des leads, règles**

Dans `src/lib/lead-views.ts` :

- importer `leadDisplayStatus`, `type LeadDisplayStatus`, `type LeadStatusSource` depuis `@/lib/lead-display-status` ;
- faire de `LeadViewRow` une extension : `export interface LeadViewRow extends LeadStatusSource { interest: LeadInterest; optedOutAt: Date | null; metAt: Date | null; name: string | null }` (le champ `status` vient de `LeadStatusSource`) ;
- remplacer `IN_PROGRESS`, `CLOSED` et `VIEW_FILTERS` par :

```ts
const IN_PROGRESS: ReadonlySet<LeadDisplayStatus> = new Set(["NOUVEAU", "SUSPECT", "DISCUSSION"])
const CLOSED: ReadonlySet<LeadDisplayStatus> = new Set(["DEAL", "PERDU", "HORS_ICP"])

// Vues lues sur le statut affiché (Deal compris) ; une fiche en opposition n'apparaît que dans Tous.
const VIEW_FILTERS: Record<LeadView, (lead: LeadViewRow) => boolean> = {
  "en-cours": (lead) => !lead.optedOutAt && IN_PROGRESS.has(leadDisplayStatus(lead)),
  chauds: (lead) =>
    !lead.optedOutAt && lead.interest === "HOT" && !CLOSED.has(leadDisplayStatus(lead)),
  "a-qualifier": (lead) => !lead.optedOutAt && leadDisplayStatus(lead) === "NOUVEAU",
  "stand-by": (lead) => !lead.optedOutAt && leadDisplayStatus(lead) === "STAND_BY",
  tous: () => true,
}
```

Run: `pnpm vitest run --project unit src/lib/lead-views.test.ts`
Expected: PASS.

- [ ] **Step 5 : Missions apportées en lecture**

Dans `src/server/queries/leads.ts` :

- ajouter `missions: { id: string; title: string; status: MissionStatus; client: { name: string } | null }[]` à `AdminLead` (`MissionStatus` importé depuis `@/generated/prisma/client`) ;
- ajouter à `adminLeadInclude.person.include`, à côté de `company` :

```ts
  referredMissions: {
    select: { id: true, title: true, status: true, client: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  },
```

- dans `toAdminLead`, ajouter `missions: row.person.referredMissions,`.

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 2 : Vues des missions, libellés, gabarit et largeurs

**Files:**
- Create: `src/lib/mission-views.ts`
- Test: `src/lib/mission-views.test.ts`
- Modify: `src/lib/missions.ts`
- Modify: `src/lib/details-templates.ts`
- Test: `src/lib/details-templates.test.ts`
- Modify: `src/lib/admin-table-widths.ts`

**Interfaces:**
- Consumes: `MissionStatus`
- Produces: `type MissionView = "en-cours" | "acceptees" | "toutes"` ; `MISSION_VIEWS` ; `missionsForView<T extends MissionViewRow>(missions: readonly T[], view: MissionView): T[]` ; `MISSION_VIEW_PAGES` ; `MISSION_SECTION_TITLES`, `formatRhythm(daysPerWeek: number | null, onSiteDays: number | null): string | null`, `formatDailyRate(rate: number | null): string | null`, `formatDuration(months: number | null): string | null` ; `MISSION_DETAILS_TEMPLATE` ; `MISSION_COLUMN_WIDTHS`, `MissionColumnKey`, `MISSION_VIEW_DEFAULT_VISIBLE_COLUMNS`, `missionSkeletonWidths(view: MissionView): readonly number[]`

- [ ] **Step 1 : Écrire les tests des vues**

`src/lib/mission-views.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import type { MissionStatus } from "@/generated/prisma/client"

import { missionsForView } from "./mission-views"

interface TestMission {
  id: string
  status: MissionStatus
  startMonth: Date | null
  updatedAt: Date
}

function mission(overrides: Partial<TestMission> = {}): TestMission {
  return {
    id: "m1",
    status: "PROPOSEE",
    startMonth: null,
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  }
}

function idsOf(missions: readonly TestMission[]): string[] {
  return missions.map((row) => row.id)
}

describe("missionsForView", () => {
  it("keeps proposed, in-process and offered missions in the ongoing view, soonest start first", () => {
    const missions = [
      mission({ id: "proposed", status: "PROPOSEE", startMonth: new Date("2026-06-01T00:00:00.000Z") }),
      mission({ id: "offered", status: "OFFRE_RECUE", startMonth: null }),
      mission({ id: "in-process", status: "EN_PROCESS", startMonth: new Date("2026-04-01T00:00:00.000Z") }),
      mission({ id: "accepted", status: "ACCEPTEE" }),
      mission({ id: "paused", status: "EN_PAUSE" }),
    ]

    const rows = missionsForView(missions, "en-cours")

    expect(idsOf(rows)).toEqual(["in-process", "proposed", "offered"])
  })

  it("keeps accepted missions in the accepted view", () => {
    const missions = [
      mission({ id: "older", status: "ACCEPTEE", startMonth: new Date("2025-01-01T00:00:00.000Z") }),
      mission({ id: "refused", status: "REFUSEE" }),
      mission({ id: "newer", status: "ACCEPTEE", startMonth: new Date("2026-01-01T00:00:00.000Z") }),
    ]

    const rows = missionsForView(missions, "acceptees")

    expect(idsOf(rows)).toEqual(["newer", "older"])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/mission-views.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Vues**

`src/lib/mission-views.ts` :

```ts
import type { MissionStatus } from "@/generated/prisma/client"

export type MissionView = "en-cours" | "acceptees" | "toutes"

export const MISSION_VIEWS: readonly MissionView[] = ["en-cours", "acceptees", "toutes"]

export interface MissionViewRow {
  status: MissionStatus
  startMonth: Date | null
  updatedAt: Date
}

const ONGOING: ReadonlySet<MissionStatus> = new Set(["PROPOSEE", "EN_PROCESS", "OFFRE_RECUE"])

const VIEW_FILTERS: Record<MissionView, (mission: MissionViewRow) => boolean> = {
  "en-cours": (mission) => ONGOING.has(mission.status),
  acceptees: (mission) => mission.status === "ACCEPTEE",
  toutes: () => true,
}

// Sans démarrage en dernier dans les deux sens : ni la plus proche, ni la plus récente.
function byStartMonth(direction: 1 | -1) {
  return (a: MissionViewRow, b: MissionViewRow): number => {
    if (!a.startMonth || !b.startMonth) return a.startMonth ? -1 : b.startMonth ? 1 : 0
    return direction * (a.startMonth.getTime() - b.startMonth.getTime())
  }
}

function byLatestUpdate(a: MissionViewRow, b: MissionViewRow): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

const VIEW_SORTS: Record<MissionView, (a: MissionViewRow, b: MissionViewRow) => number> = {
  "en-cours": byStartMonth(1),
  acceptees: byStartMonth(-1),
  toutes: byLatestUpdate,
}

// Ordre d'affichage par défaut : DataTable garde celui des lignes reçues tant qu'aucune colonne n'est triée.
export function missionsForView<T extends MissionViewRow>(
  missions: readonly T[],
  view: MissionView,
): T[] {
  return missions.filter(VIEW_FILTERS[view]).sort(VIEW_SORTS[view])
}

export const MISSION_VIEW_PAGES: Record<MissionView, { title: string; subtitle: string }> = {
  "en-cours": {
    title: "Missions en cours",
    subtitle: "Opportunités proposées, en process ou avec une offre reçue.",
  },
  acceptees: {
    title: "Missions acceptées",
    subtitle: "Missions gagnées, point de départ du suivi de mission.",
  },
  toutes: {
    title: "Toutes les missions",
    subtitle: "Toutes les opportunités, en pause et closes comprises.",
  },
}
```

Run: `pnpm vitest run --project unit src/lib/mission-views.test.ts`
Expected: PASS.

- [ ] **Step 3 : Titres et formats**

À la fin de `src/lib/missions.ts` :

```ts
export const MISSION_SECTION_TITLES = {
  conditions: "Conditions",
  calendar: "Calendrier",
  relations: "Relations",
  notes: "Notes",
  details: "Détails",
} as const

export function formatDailyRate(rate: number | null): string | null {
  return rate === null ? null : `${rate} €`
}

export function formatDuration(months: number | null): string | null {
  return months === null ? null : `${months} mois`
}

export function formatRhythm(daysPerWeek: number | null, onSiteDays: number | null): string | null {
  if (daysPerWeek === null) return onSiteDays === null ? null : `${onSiteDays} j sur site`
  return onSiteDays === null ? `${daysPerWeek} j` : `${daysPerWeek} j dont ${onSiteDays} sur site`
}
```

- [ ] **Step 4 : Gabarit**

Ajouter à `src/lib/details-templates.test.ts` (import de `MISSION_DETAILS_TEMPLATE`) :

```ts
describe("MISSION_DETAILS_TEMPLATE", () => {
  it("gives the mission template its three sections", () => {
    const headings = MISSION_DETAILS_TEMPLATE.split("\n").filter((line) => line.startsWith("# "))

    expect(headings).toEqual(["# 🎯 Contexte", "# 👤 Profil recherché", "# 🛠️ Contenu technique"])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: FAIL, export absent.

À la fin de `src/lib/details-templates.ts` :

```ts
// Secteur et taille vivent sur l'entreprise, TJM/lieu/rythme sur la mission : il ne reste ici que le texte.
export const MISSION_DETAILS_TEMPLATE = `# 🎯 Contexte

# 👤 Profil recherché

# 🛠️ Contenu technique
`
```

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: PASS.

- [ ] **Step 5 : Largeurs**

À la fin de `src/lib/admin-table-widths.ts` (l'import de type va en tête : `import type { MissionView } from "@/lib/mission-views"`) :

```ts
export const MISSION_COLUMN_WIDTHS = {
  title: 220,
  status: 130,
  referrer: 180,
  intermediary: 180,
  client: 180,
  dailyRate: 90,
  contract: 120,
  workMode: 120,
  rhythm: 170,
  zone: 160,
  startMonth: 130,
  duration: 100,
  notes: 220,
  actions: 88,
} as const

export type MissionColumnKey = keyof typeof MISSION_COLUMN_WIDTHS

export const MISSION_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<MissionView, readonly MissionColumnKey[]> = {
  "en-cours": ["status", "intermediary", "client", "dailyRate", "workMode", "rhythm", "startMonth"],
  acceptees: ["intermediary", "client", "dailyRate", "contract", "rhythm", "startMonth", "duration"],
  toutes: ["status", "referrer", "intermediary", "client", "dailyRate", "contract", "workMode", "rhythm", "zone", "startMonth", "duration", "notes"],
}

export function missionSkeletonWidths(view: MissionView): readonly number[] {
  const keys: readonly MissionColumnKey[] = [
    "title",
    ...MISSION_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
    "actions",
  ]
  return keys.map((key) => MISSION_COLUMN_WIDTHS[key])
}
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 3 : Entreprises : missions en lecture, clients finaux et travaillée étendue

**Files:**
- Modify: `src/server/queries/companies.ts`
- Modify: `src/lib/companies.ts`
- Test: `src/lib/companies.test.ts`

**Interfaces:**
- Consumes: modèle `Mission` (`14`)
- Produces: `AdminCompany.missionsAsIntermediary` et `.missionsAsClient` (`{ id, title, status, dailyRate, client: { id, name } | null }[]`) ; `AdminCompany._count.missionsAsIntermediary`, `._count.missionsAsClient` ; `AdminCompany.worked` étendu aux missions Acceptée, `.endClients` ; `CompanyOption.types` ; `joinedEndClientNames(company): string[]` ; `hasAcceptedMission(company): boolean` ; `companyLinksLabel(projects: number, missions: number): string`

- [ ] **Step 1 : Écrire les tests**

`src/lib/companies.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { hasAcceptedMission, joinedEndClientNames } from "./companies"

describe("joinedEndClientNames", () => {
  it("names each accepted mission's end client once, sorted", () => {
    const company = {
      missionsAsIntermediary: [
        { status: "ACCEPTEE" as const, client: { id: "c-boreal", name: "Boréal Énergie" } },
        { status: "ACCEPTEE" as const, client: { id: "c-axa", name: "AXA Assistance" } },
        { status: "ACCEPTEE" as const, client: { id: "c-axa", name: "AXA Assistance" } },
        { status: "PROPOSEE" as const, client: { id: "c-helios", name: "Helios Retail" } },
        { status: "ACCEPTEE" as const, client: null },
      ],
    }

    const names = joinedEndClientNames(company)

    expect(names).toEqual(["AXA Assistance", "Boréal Énergie"])
  })
})

describe("hasAcceptedMission", () => {
  it("marks a company worked once one of its missions is accepted, as intermediary or as client", () => {
    const asClient = {
      missionsAsIntermediary: [],
      missionsAsClient: [{ status: "ACCEPTEE" as const }],
    }
    const none = {
      missionsAsIntermediary: [{ status: "PROPOSEE" as const }],
      missionsAsClient: [],
    }

    expect(hasAcceptedMission(asClient)).toBe(true)
    expect(hasAcceptedMission(none)).toBe(false)
  })
})
```

Run: `pnpm vitest run --project unit src/lib/companies.test.ts`
Expected: FAIL, `joinedEndClientNames` et `hasAcceptedMission` absents.

- [ ] **Step 2 : Clients finaux, travaillée étendue et libellé des liens**

À la fin de `src/lib/companies.ts` (import de type `MissionStatus` depuis `@/generated/prisma/client` en tête) :

```ts
// Rien n'est écrit : le client final se lit sur les missions gagnées, jamais saisi sur l'ESN.
export function joinedEndClientNames(company: {
  missionsAsIntermediary: readonly {
    status: MissionStatus
    client: { id: string; name: string } | null
  }[]
}): string[] {
  const names = new Map<string, string>()
  for (const mission of company.missionsAsIntermediary) {
    if (mission.status === "ACCEPTEE" && mission.client) names.set(mission.client.id, mission.client.name)
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, "fr"))
}

export function hasAcceptedMission(company: {
  missionsAsIntermediary: readonly { status: MissionStatus }[]
  missionsAsClient: readonly { status: MissionStatus }[]
}): boolean {
  return (
    company.missionsAsIntermediary.some((mission) => mission.status === "ACCEPTEE") ||
    company.missionsAsClient.some((mission) => mission.status === "ACCEPTEE")
  )
}

function counted(count: number, singular: string, plural: string): string | null {
  return count === 0 ? null : `${count} ${count > 1 ? plural : singular}`
}

export function companyLinksLabel(projects: number, missions: number): string {
  return [counted(projects, "projet", "projets"), counted(missions, "mission", "missions")]
    .filter((part): part is string => part !== null)
    .join(" et ")
}
```

Run: `pnpm vitest run --project unit src/lib/companies.test.ts`
Expected: PASS.

- [ ] **Step 3 : Lectures**

Dans `src/server/queries/companies.ts` :

- avant `adminCompanyInclude`, ajouter :

```ts
const missionSummarySelect = {
  id: true,
  title: true,
  status: true,
  dailyRate: true,
  client: { select: { id: true, name: true } },
} as const

const companyCounts = {
  _count: { select: { clientMetas: true, missionsAsIntermediary: true, missionsAsClient: true } },
} as const
```

- ajouter à `adminCompanyInclude` :

```ts
  missionsAsIntermediary: { select: missionSummarySelect, orderBy: { updatedAt: "desc" } },
  missionsAsClient: { select: missionSummarySelect, orderBy: { updatedAt: "desc" } },
```

- dans le type `AdminCompany`, remplacer `{ _count: { select: { clientMetas: true } } }` par `typeof companyCounts` et ajouter `endClients: string[]` à l'intersection des dérivés ; dans `findAllCompaniesForAdmin`, remplacer la même sélection par `...companyCounts` ;
- dans `toAdminCompany` (`04`), qui calcule `worked` (`findCompanyByIdForAdmin` ne l'appelle pas, la vue détail lit `AdminCompany` de la liste), étendre `worked` avec `|| hasAcceptedMission(company)` et ajouter `endClients: joinedEndClientNames(company)` (imports depuis `@/lib/companies`) ;
- dans `findCompanyOptions`, ajouter `types: true` au `select`.

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Formulaire et suppression d'une mission

**Files:**
- Create: `src/components/features/admin/MonthField.tsx`
- Test: `src/components/features/admin/MonthField.test.tsx`
- Create: `src/components/features/admin/missions/MissionForm.tsx`
- Create: `src/components/features/admin/missions/DeleteMissionDialog.tsx`
- Modify: `src/lib/missions.ts` (titre de la card Mission)
- Modify: `src/server/queries/missions.ts`
- Create: `src/app/admin/(protected)/missions/nouvelle/page.tsx` et `loading.tsx`, `src/app/admin/(protected)/missions/[id]/page.tsx` et `loading.tsx`
- Modify: `docs/DESIGN.md` (ligne « Mois de démarrage »)

**Interfaces:**
- Consumes: Tasks 2 et 3 ; `createMission`, `updateMission`, `deleteMission`, `initialMissionFormState`, `MISSION_STATUSES`, `toMonthValue` (`14`) ; `SelectField`, `ComboboxPopover`, `CompanyLogoTile`, `RowActionButton`, `ConfirmDeleteDialog`, `Editor`, `Card`, `AdminBreadcrumb`, `StackedSkeleton` ; `CONTRACT_STATUS_LABELS`, `WORK_MODE_LABELS` (`@/lib/projects`) ; `personDisplayName` (`07`) ; `findPersonOptionsWithLeadRole` (`07`), `findCompanyOptions` (`08`)
- Produces: `MonthField({ id, name, label, errors, defaultValue }: { id: string; name: string; label: string; errors: string[] | undefined; defaultValue: string })` ; `MissionForm({ mission, referrerOptions, companyOptions })` ; `DeleteMissionDialog({ mission })` ; `findMissionByIdForAdmin(id)` ; routes `/admin/missions/nouvelle` et `/admin/missions/<id>`

- [ ] **Step 1 : Écrire le test du champ mois**

`src/components/features/admin/MonthField.test.tsx` (projet `unit`, environnement jsdom comme les autres tests de composants, `.claude/rules/vitest/components.md`) :

```tsx
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MonthField } from "./MonthField"

function hiddenValue(container: HTMLElement): string | undefined {
  return container.querySelector<HTMLInputElement>('input[type="hidden"][name="startMonth"]')?.value
}

describe("MonthField", () => {
  it("sends the chosen month as YYYY-MM", () => {
    const { container } = render(
      <MonthField id="m" name="startMonth" label="Démarrage" errors={undefined} defaultValue="2026-04" />,
    )

    expect(hiddenValue(container)).toBe("2026-04")
  })

  it("sends an incomplete month so that validation refuses it", () => {
    const { container } = render(
      <MonthField id="m" name="startMonth" label="Démarrage" errors={undefined} defaultValue="-04" />,
    )

    expect(hiddenValue(container)).toBe("-04")
  })
})
```

Run: `pnpm vitest run --project unit src/components/features/admin/MonthField.test.tsx`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Champ mois**

`src/components/features/admin/MonthField.tsx` :

```tsx
"use client"

import { useState } from "react"

import { FormField } from "@/components/ui/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NONE_VALUE } from "@/lib/schemas/person"

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
].map((label, index) => ({ value: String(index + 1).padStart(2, "0"), label }))

interface Props {
  id: string
  name: string
  label: string
  errors: string[] | undefined
  // « AAAA-MM », vide si aucun mois.
  defaultValue: string
}

export function MonthField({ id, name, label, errors, defaultValue }: Props) {
  const [defaultYear = "", defaultMonth = ""] = defaultValue.split("-")
  const [year, setYear] = useState(defaultYear || NONE_VALUE)
  const [month, setMonth] = useState(defaultMonth || NONE_VALUE)
  const [currentYear] = useState(() => new Date().getFullYear())

  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(String)
  if (year !== NONE_VALUE && !years.includes(year)) years.unshift(year)

  // Un choix à moitié fait part tel quel : la validation le refuse plutôt que de le perdre.
  const value =
    year === NONE_VALUE && month === NONE_VALUE
      ? ""
      : `${year === NONE_VALUE ? "" : year}-${month === NONE_VALUE ? "" : month}`

  return (
    <FormField id={id} label={label} errors={errors}>
      <div className="grid grid-cols-2 gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger
            id={id}
            className="w-full"
            aria-invalid={!!errors?.length}
            aria-describedby={`${id}-error`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Mois</SelectItem>
            {MONTHS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-full" aria-label={`${label}, année`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Année</SelectItem>
            {years.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <input type="hidden" name={name} value={value} />
    </FormField>
  )
}
```

Run: `pnpm vitest run --project unit src/components/features/admin/MonthField.test.tsx`
Expected: PASS.

- [ ] **Step 3 : Suppression**

`src/components/features/admin/missions/DeleteMissionDialog.tsx` :

```tsx
"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteMission } from "@/server/actions/missions"
import type { AdminMission } from "@/server/queries/missions"

interface Props {
  mission: AdminMission
}

export function DeleteMissionDialog({ mission }: Props) {
  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${mission.title}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={mission.title}
      description="L'apporteur, l'ESN et le client final restent."
      successMessage="Mission supprimée"
      onDelete={async () => {
        const result = await deleteMission(mission.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
```

- [ ] **Step 4 : Formulaire en cards**

Dans `src/lib/missions.ts`, ajouter en tête de `MISSION_SECTION_TITLES` (Task 2) l'entrée `mission: "Mission"`.

`src/components/features/admin/missions/MissionForm.tsx`, sur le motif de `LeadForm` (`08`) ; les cards reprennent les blocs de la vue détail :

```tsx
"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { MonthField } from "@/components/features/admin/MonthField"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import type { ContractStatus, WorkMode } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { MISSION_DETAILS_TEMPLATE } from "@/lib/details-templates"
import {
  MISSION_FIELD_LABELS as LABELS,
  MISSION_SECTION_TITLES,
  MISSION_STATUS_LABELS,
  toMonthValue,
} from "@/lib/missions"
import { personDisplayName } from "@/lib/persons"
import { CONTRACT_STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/projects"
import { MISSION_STATUSES } from "@/lib/schemas/mission"
import { NONE_VALUE } from "@/lib/schemas/person"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import { createMission, updateMission } from "@/server/actions/missions"
import { initialMissionFormState } from "@/server/actions/missions.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminMission } from "@/server/queries/missions"
import type { PersonOption } from "@/server/queries/persons"

const CONTRACTS = Object.keys(CONTRACT_STATUS_LABELS) as ContractStatus[]
const WORK_MODES = Object.keys(WORK_MODE_LABELS) as WorkMode[]
const DAYS_PER_WEEK = ["1", "2", "3", "4", "5"]
const ON_SITE_DAYS = ["0", "1", "2", "3", "4", "5"]
const DAY_LABELS: Record<string, string> = Object.fromEntries(
  ON_SITE_DAYS.map((days) => [days, `${days} j`]),
)
const MISSIONS_PATH = "/admin/missions"

interface CompanyPickerProps {
  id: string
  name: string
  label: string
  errors: string[] | undefined
  options: readonly CompanyOption[]
  value: string
  onChange: (value: string) => void
  // L'entreprise déjà reliée peut être sortie des choix (type changé) : son nom reste affiché.
  fallbackName: string | null
}

function CompanyPicker({
  id,
  name,
  label,
  errors,
  options,
  value,
  onChange,
  fallbackName,
}: CompanyPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((company) => company.id === value) ?? null
  const selectedName = selected?.name ?? (value !== NONE_VALUE ? fallbackName : null)

  return (
    <FormField id={id} label={label} errors={errors}>
      <ComboboxPopover
        id={id}
        open={open}
        onOpenChange={setOpen}
        triggerContent={
          selectedName ? (
            <span className="flex min-w-0 items-center gap-2">
              {selected ? <CompanyLogoTile logoFilename={selected.logoFilename} size="sm" /> : null}
              <span className="truncate">{selectedName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Aucune</span>
          )
        }
        ariaInvalid={!!errors?.length}
        ariaDescribedby={`${id}-error`}
        searchPlaceholder="Chercher une entreprise"
        emptyMessage="Aucune entreprise ne correspond."
      >
        <CommandGroup>
          <CommandItem
            value={NONE_VALUE}
            keywords={["Aucune"]}
            data-checked={value === NONE_VALUE}
            onSelect={() => {
              onChange(NONE_VALUE)
              setOpen(false)
            }}
          >
            Aucune
          </CommandItem>
          {options.map((company) => (
            <CommandItem
              key={company.id}
              value={company.id}
              keywords={[company.name]}
              data-checked={value === company.id}
              onSelect={() => {
                onChange(company.id)
                setOpen(false)
              }}
            >
              <CompanyLogoTile logoFilename={company.logoFilename} size="sm" />
              <span className="truncate">{company.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </ComboboxPopover>
      <input type="hidden" name={name} value={value} />
    </FormField>
  )
}

interface Props {
  mission: AdminMission | null
  referrerOptions: readonly PersonOption[]
  companyOptions: readonly CompanyOption[]
}

export function MissionForm({ mission, referrerOptions, companyOptions }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = mission ? updateMission.bind(null, mission.id) : createMission
  const [state, formAction, pending] = useActionState(action, initialMissionFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  const [referrerId, setReferrerId] = useState(mission?.referrerId ?? NONE_VALUE)
  const [referrerOpen, setReferrerOpen] = useState(false)
  const [intermediaryId, setIntermediaryId] = useState(mission?.intermediaryId ?? NONE_VALUE)
  const [clientId, setClientId] = useState(mission?.clientId ?? NONE_VALUE)
  // Le gabarit ne se pose qu'à la création : un Détails vidé exprès reste vide.
  const [details, setDetails] = useState(mission ? (mission.details ?? "") : MISSION_DETAILS_TEMPLATE)

  const esnOptions = companyOptions.filter((company) => company.types.includes("ESN_RECRUTEMENT"))
  const clientOptions = companyOptions.filter((company) => company.id !== intermediaryId)
  // L'apporteur peut être sorti des choix (opposition) : son nom reste affiché.
  const selectedReferrerLabel =
    referrerOptions.find((option) => option.id === referrerId)?.name ??
    (mission?.referrer && mission.referrer.id === referrerId ? personDisplayName(mission.referrer) : null)

  function handleIntermediaryChange(next: string) {
    setIntermediaryId(next)
    // Une même entreprise ne peut pas être l'ESN et le client final.
    if (next !== NONE_VALUE && next === clientId) setClientId(NONE_VALUE)
  }

  useEffect(() => {
    if (state.ok === true) {
      toast.success(mission ? "Mission mise à jour" : "Mission créée")
      router.push(MISSIONS_PATH)
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, mission, router])

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {mission ? mission.title : "Nouvelle mission"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href={MISSIONS_PATH}>Annuler</Link>
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
              <CardTitle>{MISSION_SECTION_TITLES.mission}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${formId}-title`} label={LABELS.title} errors={state.errors.title}>
                <Input
                  id={`${formId}-title`}
                  name="title"
                  defaultValue={mission?.title ?? ""}
                  placeholder="Plateforme IA interne"
                  aria-invalid={!!state.errors.title?.length}
                  aria-describedby={`${formId}-title-error`}
                />
              </FormField>

              <FormField id={`${formId}-role`} label={LABELS.role} errors={state.errors.role}>
                <Input
                  id={`${formId}-role`}
                  name="role"
                  defaultValue={mission?.role ?? ""}
                  placeholder="Dev Fullstack IA"
                  aria-invalid={!!state.errors.role?.length}
                  aria-describedby={`${formId}-role-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-status`}
                name="status"
                label={LABELS.status}
                options={MISSION_STATUSES}
                labels={MISSION_STATUS_LABELS}
                defaultValue={mission?.status ?? "PROPOSEE"}
                errors={state.errors.status}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{MISSION_SECTION_TITLES.relations}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField id={`${formId}-referrerId`} label={LABELS.referrerId} errors={state.errors.referrerId}>
                  <ComboboxPopover
                    id={`${formId}-referrerId`}
                    open={referrerOpen}
                    onOpenChange={setReferrerOpen}
                    triggerContent={
                      selectedReferrerLabel ? (
                        <span className="truncate">{selectedReferrerLabel}</span>
                      ) : (
                        <span className="text-muted-foreground">Aucun</span>
                      )
                    }
                    ariaInvalid={!!state.errors.referrerId?.length}
                    ariaDescribedby={`${formId}-referrerId-error`}
                    searchPlaceholder="Chercher un apporteur"
                    emptyMessage="Aucun apporteur ne correspond."
                  >
                    <CommandGroup>
                      <CommandItem
                        value={NONE_VALUE}
                        keywords={["Aucun"]}
                        data-checked={referrerId === NONE_VALUE}
                        onSelect={() => {
                          setReferrerId(NONE_VALUE)
                          setReferrerOpen(false)
                        }}
                      >
                        Aucun
                      </CommandItem>
                      {referrerOptions.map((person) => (
                        <CommandItem
                          key={person.id}
                          value={person.id}
                          keywords={[person.name ?? "", person.company?.name ?? ""]}
                          data-checked={referrerId === person.id}
                          onSelect={() => {
                            setReferrerId(person.id)
                            setReferrerOpen(false)
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
                  <input type="hidden" name="referrerId" value={referrerId} />
                </FormField>
              </div>

              <CompanyPicker
                id={`${formId}-intermediaryId`}
                name="intermediaryId"
                label={LABELS.intermediaryId}
                errors={state.errors.intermediaryId}
                options={esnOptions}
                value={intermediaryId}
                onChange={handleIntermediaryChange}
                fallbackName={mission?.intermediary?.name ?? null}
              />

              <CompanyPicker
                id={`${formId}-clientId`}
                name="clientId"
                label={LABELS.clientId}
                errors={state.errors.clientId}
                options={clientOptions}
                value={clientId}
                onChange={setClientId}
                fallbackName={mission?.client?.name ?? null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{MISSION_SECTION_TITLES.details}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                id={`${formId}-details`}
                label={LABELS.details}
                errors={state.errors.details}
                help="Raccourcis : « # » un titre, « - » une liste, « / » le menu des blocs."
              >
                <Editor
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
              <CardTitle>{MISSION_SECTION_TITLES.conditions}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${formId}-dailyRate`} label={LABELS.dailyRate} errors={state.errors.dailyRate} help="En euros HT par jour.">
                <Input
                  id={`${formId}-dailyRate`}
                  name="dailyRate"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={10}
                  defaultValue={mission?.dailyRate?.toString() ?? ""}
                  placeholder="580"
                  className="text-right tabular-nums"
                  aria-invalid={!!state.errors.dailyRate?.length}
                  aria-describedby={`${formId}-dailyRate-help ${formId}-dailyRate-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-contract`}
                name="contract"
                label={LABELS.contract}
                options={CONTRACTS}
                labels={CONTRACT_STATUS_LABELS}
                defaultValue={mission?.contract ?? NONE_VALUE}
                errors={state.errors.contract}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-workMode`}
                name="workMode"
                label={LABELS.workMode}
                options={WORK_MODES}
                labels={WORK_MODE_LABELS}
                defaultValue={mission?.workMode ?? NONE_VALUE}
                errors={state.errors.workMode}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-daysPerWeek`}
                name="daysPerWeek"
                label={LABELS.daysPerWeek}
                options={DAYS_PER_WEEK}
                labels={DAY_LABELS}
                defaultValue={mission?.daysPerWeek?.toString() ?? NONE_VALUE}
                errors={state.errors.daysPerWeek}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-onSiteDays`}
                name="onSiteDays"
                label={LABELS.onSiteDays}
                options={ON_SITE_DAYS}
                labels={DAY_LABELS}
                defaultValue={mission?.onSiteDays?.toString() ?? NONE_VALUE}
                errors={state.errors.onSiteDays}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-zone`}
                name="zone"
                label={LABELS.zone}
                options={ZONES}
                labels={ZONE_LABELS}
                defaultValue={mission?.zone ?? NONE_VALUE}
                errors={state.errors.zone}
                noneLabel="Non renseigné"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{MISSION_SECTION_TITLES.calendar}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <MonthField
                id={`${formId}-startMonth`}
                name="startMonth"
                label={LABELS.startMonth}
                errors={state.errors.startMonth}
                defaultValue={mission?.startMonth ? toMonthValue(mission.startMonth) : ""}
              />

              <FormField
                id={`${formId}-durationMonths`}
                label={LABELS.durationMonths}
                errors={state.errors.durationMonths}
                help="En mois."
              >
                <Input
                  id={`${formId}-durationMonths`}
                  name="durationMonths"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  defaultValue={mission?.durationMonths?.toString() ?? ""}
                  className="text-right tabular-nums"
                  aria-invalid={!!state.errors.durationMonths?.length}
                  aria-describedby={`${formId}-durationMonths-help ${formId}-durationMonths-error`}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{MISSION_SECTION_TITLES.notes}</CardTitle>
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
                  defaultValue={mission?.notes ?? ""}
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

`SelectField` envoie la sentinelle `NONE_VALUE` pour « Non renseigné » ; pour Rythme et Jours sur site, le schéma du `14` attend une chaîne vide : dans `src/lib/schemas/mission.ts`, faire lire à `optionalInt` la sentinelle comme une valeur vide (`value === "" || value === NONE_VALUE` dans le `refine`, et la même condition dans le `transform`).

- [ ] **Step 5 : Pages de création et de modification**

À la fin de `src/server/queries/missions.ts` :

```ts
export async function findMissionByIdForAdmin(id: string): Promise<AdminMission | null> {
  return prisma.mission.findUnique({ where: { id }, include: adminMissionInclude })
}
```

`src/app/admin/(protected)/missions/nouvelle/page.tsx` :

```tsx
import { Suspense } from "react"

import { MissionForm } from "@/components/features/admin/missions/MissionForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findPersonOptionsWithLeadRole } from "@/server/queries/persons"

const MISSION_PAGE_SKELETON = ["h-[24px]", "h-[200px]", "h-[220px]", "h-[320px]"]

async function NewMissionSection() {
  const [referrerOptions, companyOptions] = await Promise.all([
    findPersonOptionsWithLeadRole(),
    findCompanyOptions(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Missions", href: "/admin/missions" }, { label: "Nouvelle mission" }]}
      />
      <MissionForm mission={null} referrerOptions={referrerOptions} companyOptions={companyOptions} />
    </div>
  )
}

export default async function NewMissionPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={MISSION_PAGE_SKELETON} />}>
        <NewMissionSection />
      </Suspense>
    </div>
  )
}
```

`src/app/admin/(protected)/missions/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { MissionForm } from "@/components/features/admin/missions/MissionForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findMissionByIdForAdmin } from "@/server/queries/missions"
import { findPersonOptionsWithLeadRole } from "@/server/queries/persons"

const MISSION_PAGE_SKELETON = ["h-[24px]", "h-[200px]", "h-[220px]", "h-[320px]"]

async function EditMissionSection({ id }: { id: string }) {
  const [mission, referrerOptions, companyOptions] = await Promise.all([
    findMissionByIdForAdmin(id),
    findPersonOptionsWithLeadRole(),
    findCompanyOptions(),
  ])
  if (!mission) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb items={[{ label: "Missions", href: "/admin/missions" }, { label: mission.title }]} />
      <MissionForm mission={mission} referrerOptions={referrerOptions} companyOptions={companyOptions} />
    </div>
  )
}

export default async function EditMissionPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={MISSION_PAGE_SKELETON} />}>
        <EditMissionSection id={id} />
      </Suspense>
    </div>
  )
}
```

La card Entretiens de la mission (`17`) se placera sous `MissionForm`, dans la `div` de `EditMissionSection`, hors du `<form>`.

Les dossiers `nouvelle/` et `[id]/` reçoivent chacun un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 6 : Mapping de `docs/DESIGN.md`**

Charger le skill `design-doc`, puis déplacer la ligne « Mois de démarrage » de § Post-MVP (non installés) vers § Formulaires, sans sa dernière phrase (« Rejoint § … ») : le composant est installé.

- [ ] **Step 7 : Vérifier**

Run: `just typecheck`
Expected: aucune erreur.

Run: `pnpm vitest run --project unit src/server/actions/missions.test.ts`
Expected: PASS, les tests du `14` inchangés.

---

### Task 5 : Liste, pages et menu

**Files:**
- Create: `src/components/features/admin/missions/MissionsTable.tsx`
- Create: `src/components/features/admin/missions/MissionsViewPage.tsx`
- Create: `src/app/admin/(protected)/missions/page.tsx` et `loading.tsx`, `acceptees/page.tsx` et `loading.tsx`, `toutes/page.tsx` et `loading.tsx`
- Modify: `src/config/admin-nav-items.ts`

**Interfaces:**
- Consumes: Tasks 2 à 4 ; `findAllMissionsForAdmin` (`14`) ; `RowActionButton`
- Produces: `MissionsTable({ missions, view })`, `MissionsViewPage({ view })`

- [ ] **Step 1 : Table**

`src/components/features/admin/missions/MissionsTable.tsx` :

```tsx
"use client"

import { useMemo, useState } from "react"
import { Handshake, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  type DetailSection,
  DetailDialog,
} from "@/components/features/admin/DetailDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteMissionDialog } from "@/components/features/admin/missions/DeleteMissionDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import type { ContractStatus, WorkMode } from "@/generated/prisma/client"
import {
  MISSION_COLUMN_WIDTHS,
  MISSION_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type MissionColumnKey,
} from "@/lib/admin-table-widths"
import { missionsForView, type MissionView } from "@/lib/mission-views"
import {
  formatDailyRate,
  formatDuration,
  formatRhythm,
  formatStartMonth,
  MISSION_FIELD_LABELS as LABELS,
  MISSION_SECTION_TITLES,
  MISSION_STATUS_LABELS,
} from "@/lib/missions"
import { personDisplayName } from "@/lib/persons"
import { CONTRACT_STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/projects"
import { MISSION_STATUSES } from "@/lib/schemas/mission"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminMission } from "@/server/queries/missions"

const OPTED_OUT_LABEL = "Ne plus contacter"

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
}

function companyCell(company: AdminMission["client"]) {
  if (!company) return null
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompanyLogoTile logoFilename={company.logoFilename} size="sm" />
      <TruncateTooltip className="min-w-0">{company.name}</TruncateTooltip>
    </span>
  )
}

function hideable(
  view: MissionView,
  key: Exclude<MissionColumnKey, "title" | "actions">,
): Pick<Column<AdminMission>, "hideable" | "defaultVisible"> {
  return { hideable: true, defaultVisible: MISSION_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key) }
}

function buildDataColumns(view: MissionView): readonly Column<AdminMission>[] {
  return [
    {
      key: "title",
      header: LABELS.title,
      width: MISSION_COLUMN_WIDTHS.title,
      sortValue: (mission) => mission.title,
      searchValue: (mission) =>
        [mission.title, mission.role ?? "", mission.intermediary?.name ?? "", mission.client?.name ?? ""].join(" "),
      cell: (mission) => (
        <TruncateTooltip className="block w-full font-medium">{mission.title}</TruncateTooltip>
      ),
    },
    {
      key: "status",
      header: LABELS.status,
      width: MISSION_COLUMN_WIDTHS.status,
      ...hideable(view, "status"),
      cell: (mission) => <Badge variant="secondary">{MISSION_STATUS_LABELS[mission.status]}</Badge>,
    },
    {
      key: "referrer",
      header: LABELS.referrerId,
      width: MISSION_COLUMN_WIDTHS.referrer,
      ...hideable(view, "referrer"),
      sortValue: (mission) => (mission.referrer ? personDisplayName(mission.referrer) : ""),
      cell: (mission) => (
        <TruncatedCell value={mission.referrer ? personDisplayName(mission.referrer) : null} />
      ),
    },
    {
      key: "intermediary",
      header: LABELS.intermediaryId,
      width: MISSION_COLUMN_WIDTHS.intermediary,
      ...hideable(view, "intermediary"),
      sortValue: (mission) => mission.intermediary?.name ?? "",
      cell: (mission) => companyCell(mission.intermediary),
    },
    {
      key: "client",
      header: LABELS.clientId,
      width: MISSION_COLUMN_WIDTHS.client,
      ...hideable(view, "client"),
      sortValue: (mission) => mission.client?.name ?? "",
      cell: (mission) => companyCell(mission.client),
    },
    {
      key: "dailyRate",
      header: LABELS.dailyRate,
      width: MISSION_COLUMN_WIDTHS.dailyRate,
      align: "right",
      className: "tabular-nums",
      ...hideable(view, "dailyRate"),
      sortValue: (mission) => mission.dailyRate ?? -1,
      cell: (mission) => formatDailyRate(mission.dailyRate),
    },
    {
      key: "contract",
      header: LABELS.contract,
      width: MISSION_COLUMN_WIDTHS.contract,
      ...hideable(view, "contract"),
      cell: (mission) =>
        mission.contract ? <Badge variant="secondary">{CONTRACT_STATUS_LABELS[mission.contract]}</Badge> : null,
    },
    {
      key: "workMode",
      header: LABELS.workMode,
      width: MISSION_COLUMN_WIDTHS.workMode,
      ...hideable(view, "workMode"),
      cell: (mission) =>
        mission.workMode ? <Badge variant="secondary">{WORK_MODE_LABELS[mission.workMode]}</Badge> : null,
    },
    {
      key: "rhythm",
      header: LABELS.daysPerWeek,
      width: MISSION_COLUMN_WIDTHS.rhythm,
      className: "text-muted-foreground",
      ...hideable(view, "rhythm"),
      cell: (mission) => formatRhythm(mission.daysPerWeek, mission.onSiteDays),
    },
    {
      key: "zone",
      header: LABELS.zone,
      width: MISSION_COLUMN_WIDTHS.zone,
      ...hideable(view, "zone"),
      cell: (mission) =>
        mission.zone ? <Badge variant="secondary">{ZONE_LABELS[mission.zone]}</Badge> : null,
    },
    {
      key: "startMonth",
      header: LABELS.startMonth,
      width: MISSION_COLUMN_WIDTHS.startMonth,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "startMonth"),
      sortValue: (mission) => mission.startMonth?.getTime() ?? 0,
      cell: (mission) => formatStartMonth(mission.startMonth),
    },
    {
      key: "duration",
      header: LABELS.durationMonths,
      width: MISSION_COLUMN_WIDTHS.duration,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "duration"),
      sortValue: (mission) => mission.durationMonths ?? 0,
      cell: (mission) => formatDuration(mission.durationMonths),
    },
    {
      key: "notes",
      header: LABELS.notes,
      width: MISSION_COLUMN_WIDTHS.notes,
      className: "text-muted-foreground",
      ...hideable(view, "notes"),
      cell: (mission) => <TruncatedCell value={mission.notes} />,
    },
  ]
}

// Arbitrage « bloc sans donnée » : un bloc dont aucun champ n'est renseigné disparaît.
function keepFilled(section: DetailSection): DetailSection[] {
  return section.rows.some((row) => row.value !== null && row.value !== undefined) ? [section] : []
}

function buildMissionDetail(mission: AdminMission, onEdit: () => void): DetailContent {
  const via = mission.intermediary ? `via ${mission.intermediary.name}` : "client direct"
  const subtitle = [mission.role, via].filter((part): part is string => !!part).join(" · ")

  return {
    title: mission.title,
    subtitle,
    status: (
      <Badge variant="outline" meta>
        {MISSION_STATUS_LABELS[mission.status]}
      </Badge>
    ),
    sections: [
      ...keepFilled({
        title: MISSION_SECTION_TITLES.conditions,
        rows: [
          { label: LABELS.dailyRate, value: formatDailyRate(mission.dailyRate) },
          {
            label: LABELS.contract,
            value: mission.contract ? <Badge variant="secondary">{CONTRACT_STATUS_LABELS[mission.contract]}</Badge> : null,
          },
          {
            label: LABELS.workMode,
            value: mission.workMode ? <Badge variant="secondary">{WORK_MODE_LABELS[mission.workMode]}</Badge> : null,
          },
          { label: LABELS.daysPerWeek, value: formatRhythm(mission.daysPerWeek, mission.onSiteDays) },
          {
            label: LABELS.zone,
            value: mission.zone ? <Badge variant="secondary">{ZONE_LABELS[mission.zone]}</Badge> : null,
          },
        ],
      }),
      ...keepFilled({
        title: MISSION_SECTION_TITLES.calendar,
        rows: [
          { label: LABELS.startMonth, value: formatStartMonth(mission.startMonth) },
          { label: LABELS.durationMonths, value: formatDuration(mission.durationMonths) },
        ],
      }),
      ...keepFilled({
        title: MISSION_SECTION_TITLES.relations,
        rows: [
          {
            label: LABELS.referrerId,
            value: mission.referrer ? (
              <span className="flex flex-wrap items-center gap-2">
                {personDisplayName(mission.referrer)}
                {mission.referrer.optedOutAt ? (
                  <Badge variant="outline">{OPTED_OUT_LABEL}</Badge>
                ) : null}
              </span>
            ) : null,
          },
          { label: LABELS.intermediaryId, value: mission.intermediary?.name ?? null },
          { label: LABELS.clientId, value: mission.client?.name ?? null },
        ],
      }),
      ...(mission.notes
        ? [{ title: MISSION_SECTION_TITLES.notes, rows: [{ value: mission.notes, fullWidth: true }] }]
        : []),
      ...(mission.details
        ? [
            {
              title: MISSION_SECTION_TITLES.details,
              rows: [
                {
                  value: <MarkdownContent markdown={mission.details} variant="admin" />,
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

const facets: readonly Facet<AdminMission>[] = [
  {
    key: "status",
    label: LABELS.status,
    options: MISSION_STATUSES.map((status) => ({ value: status, label: MISSION_STATUS_LABELS[status] })),
    value: (mission) => mission.status,
  },
  {
    key: "contract",
    label: LABELS.contract,
    options: (Object.keys(CONTRACT_STATUS_LABELS) as ContractStatus[]).map((contract) => ({
      value: contract,
      label: CONTRACT_STATUS_LABELS[contract],
    })),
    value: (mission) => (mission.contract ? [mission.contract] : []),
  },
  {
    key: "workMode",
    label: LABELS.workMode,
    options: (Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((mode) => ({
      value: mode,
      label: WORK_MODE_LABELS[mode],
    })),
    value: (mission) => (mission.workMode ? [mission.workMode] : []),
  },
  {
    key: "zone",
    label: LABELS.zone,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (mission) => (mission.zone ? [mission.zone] : []),
  },
]

interface Props {
  missions: readonly AdminMission[]
  view: MissionView
}

export function MissionsTable({ missions, view }: Props) {
  const router = useRouter()
  const [selectedMission, setSelectedMission] = useState<AdminMission | null>(null)

  const viewMissions = useMemo(() => missionsForView(missions, view), [missions, view])

  const columns = useMemo<readonly Column<AdminMission>[]>(
    () => [
      ...buildDataColumns(view),
      {
        key: "actions",
        header: "Actions",
        width: MISSION_COLUMN_WIDTHS.actions,
        align: "right",
        cell: (mission) => (
          <span className="inline-flex gap-0">
            <RowActionButton aria-label={`Modifier ${mission.title}`} asChild>
              <Link href={`/admin/missions/${mission.id}`}>
                <Pencil className="size-4" />
              </Link>
            </RowActionButton>
            <DeleteMissionDialog mission={mission} />
          </span>
        ),
      },
    ],
    [view],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedMission
        ? buildMissionDetail(selectedMission, () => {
            router.push(`/admin/missions/${selectedMission.id}`)
          })
        : null,
    [selectedMission, router],
  )

  return (
    <>
      <DataTable
        rows={viewMissions}
        columns={columns}
        getRowId={(mission) => mission.id}
        searchPlaceholder="Rechercher une mission, une ESN ou un client"
        noun="mission"
        onRowClick={setSelectedMission}
        rowLabel={(mission) => mission.title}
        facets={facets}
        empty={{
          icon: Handshake,
          title: "Aucune mission",
          description: "Aucune mission dans cette vue. Créez-en une via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedMission(null)
        }}
      />
    </>
  )
}
```

- [ ] **Step 2 : Coquille commune**

`src/components/features/admin/missions/MissionsViewPage.tsx` :

```tsx
import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { MissionsTable } from "@/components/features/admin/missions/MissionsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { missionSkeletonWidths } from "@/lib/admin-table-widths"
import { MISSION_VIEW_PAGES, type MissionView } from "@/lib/mission-views"
import { findAllMissionsForAdmin } from "@/server/queries/missions"

async function MissionsSection({ view }: { view: MissionView }) {
  const missions = await findAllMissionsForAdmin()
  return <MissionsTable missions={missions} view={view} />
}

interface Props {
  view: MissionView
}

export function MissionsViewPage({ view }: Props) {
  const { title, subtitle } = MISSION_VIEW_PAGES[view]

  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href="/admin/missions/nouvelle">
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle mission
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={missionSkeletonWidths(view)} />}>
        <MissionsSection view={view} />
      </Suspense>
    </AdminPageShell>
  )
}
```

- [ ] **Step 3 : Les trois pages**

`src/app/admin/(protected)/missions/page.tsx` :

```tsx
import { MissionsViewPage } from "@/components/features/admin/missions/MissionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminMissionsPage() {
  await getCurrentUser()

  return <MissionsViewPage view="en-cours" />
}
```

`src/app/admin/(protected)/missions/acceptees/page.tsx` :

```tsx
import { MissionsViewPage } from "@/components/features/admin/missions/MissionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminMissionsAccepteesPage() {
  await getCurrentUser()

  return <MissionsViewPage view="acceptees" />
}
```

`src/app/admin/(protected)/missions/toutes/page.tsx` :

```tsx
import { MissionsViewPage } from "@/components/features/admin/missions/MissionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminMissionsToutesPage() {
  await getCurrentUser()

  return <MissionsViewPage view="toutes" />
}
```

Chacun des trois dossiers reçoit un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 4 : Menu**

Dans `src/config/admin-nav-items.ts`, importer `Handshake` depuis `lucide-react` et insérer après l'entrée Leads :

```ts
      {
        label: "Missions",
        icon: Handshake,
        href: "/admin/missions",
        subItems: [
          { label: "En cours", href: "/admin/missions" },
          { label: "Acceptées", href: "/admin/missions/acceptees" },
          { label: "Toutes", href: "/admin/missions/toutes" },
        ],
      },
```

- [ ] **Step 5 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur (si le typage des `href` échoue, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

---

### Task 6 : Côté entreprises

**Files:**
- Modify: `src/components/features/admin/companies/CompaniesTable.tsx`
- Modify: `src/components/features/admin/companies/DeleteCompanyDialog.tsx`
- Modify: `src/app/admin/(protected)/entreprises/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 3 ; `MISSION_STATUS_LABELS` (`14`), `formatDailyRate` (Task 2) ; `RelatedLinksCard`, `RelatedLink` (`08`)
- Produces: colonne et ligne « Clients finaux » de `CompaniesTable`

- [ ] **Step 1 : Colonne et ligne Clients finaux**

Le `04` ne fournit plus cette colonne ni cette ligne (clients finaux saisis retirés) : le `15` les crée.

Dans `src/lib/admin-table-widths.ts`, ajouter aux largeurs des colonnes d'entreprise (`04`) : `endClients: 220,`.

Dans `CompaniesTable.tsx` (import de `joinedEndClientNames` depuis `@/lib/companies`, de `BadgeList` depuis `@/components/features/admin/BadgeList`), ajouter aux colonnes de la table, masquable, visible par défaut dans les vues Toutes et Travaillées :

```tsx
{
  key: "endClients",
  header: "Clients finaux",
  width: COMPANY_COLUMN_WIDTHS.endClients,
  hideable: true,
  defaultVisible: view === "toutes" || view === "travaillees",
  cell: (company) => <BadgeList labels={joinedEndClientNames(company)} noun="clients" />,
},
```

et, dans la section Relation de `buildCompanyDetail` (`04`, qui affiche déjà Travaillée et Premier contact en lecture), une ligne de plus :

```tsx
{
  label: "Clients finaux",
  value:
    joinedEndClientNames(company).length > 0 ? (
      <BadgeList labels={joinedEndClientNames(company)} noun="clients" max={Infinity} />
    ) : null,
},
```

La vue Travaillées se lit déjà sur `company.worked` (`04`) : l'étendre aux missions acceptées (Task 3) suffit à y faire apparaître les entreprises concernées, sans autre changement.

- [ ] **Step 2 : Bloc Missions**

Toujours dans `CompaniesTable.tsx`, importer `MISSION_STATUS_LABELS`, `formatDailyRate` depuis `@/lib/missions`, ajouter avant `buildCompanyDetail` :

```tsx
// Une entreprise peut être l'ESN d'une mission et le client final d'une autre : chacune dit son rôle.
function missionsSection(company: AdminCompany): DetailSection[] {
  const missions = [
    ...company.missionsAsIntermediary.map((mission) => ({ mission, role: "ESN" })),
    ...company.missionsAsClient.map((mission) => ({ mission, role: "Client final" })),
  ]
  if (missions.length === 0) return []
  return [
    {
      title: "Missions",
      rows: [
        {
          fullWidth: true,
          value: (
            <ul className="flex flex-col gap-1">
              {missions.map(({ mission, role }) => (
                <li key={`${role}-${mission.id}`} className="flex flex-wrap gap-x-2 text-sm">
                  <span className="font-medium">{mission.title}</span>
                  <span className="text-muted-foreground">
                    {MISSION_STATUS_LABELS[mission.status]} · {role}
                  </span>
                  {mission.dailyRate !== null ? (
                    <span className="tabular-nums text-muted-foreground">
                      {formatDailyRate(mission.dailyRate)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ),
        },
      ],
    },
  ]
}
```

et, dans `buildCompanyDetail`, insérer `...missionsSection(company),` juste avant `...notesSections,`.

- [ ] **Step 3 : Refus de suppression**

Dans `DeleteCompanyDialog.tsx`, importer `companyLinksLabel` depuis `@/lib/companies` et remplacer le calcul et le texte du refus par :

```tsx
  const projectCount = company._count.clientMetas
  const missionCount = company._count.missionsAsIntermediary + company._count.missionsAsClient
  const links = companyLinksLabel(projectCount, missionCount)
```

```tsx
      denied={
        links ? `Cette entreprise est rattachée à ${links} et ne peut pas être supprimée.` : null
      }
```

et, dans `onDelete`, le texte de `company_in_use` par « Cette entreprise est rattachée à des projets ou des missions et ne peut pas être supprimée. »

- [ ] **Step 4 : Card Missions de la page entreprise**

L'entreprise lue par `findCompanyByIdForAdmin` porte déjà ses missions (Task 3). Dans `src/app/admin/(protected)/entreprises/[id]/page.tsx`, importer `MISSION_STATUS_LABELS` depuis `@/lib/missions`, et ajouter sous la card Leads (`08`) :

```tsx
      <RelatedLinksCard
        title="Missions"
        links={[
          ...company.missionsAsIntermediary.map(
            (mission): RelatedLink => ({
              id: `esn-${mission.id}`,
              href: `/admin/missions/${mission.id}`,
              label: mission.title,
              meta: `${MISSION_STATUS_LABELS[mission.status]} · ESN`,
            }),
          ),
          ...company.missionsAsClient.map(
            (mission): RelatedLink => ({
              id: `client-${mission.id}`,
              href: `/admin/missions/${mission.id}`,
              label: mission.title,
              meta: `${MISSION_STATUS_LABELS[mission.status]} · Client final`,
            }),
          ),
        ]}
        emptyText="Aucune mission pour cette entreprise."
      />
```

- [ ] **Step 5 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 7 : Côté leads

**Files:**
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`
- Modify: `src/app/admin/(protected)/leads/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 1 ; `MISSION_STATUS_LABELS` (`14`) ; `RelatedLinksCard`, `RelatedLink` (`08`)
- Produces: rien

- [ ] **Step 1 : Statut affiché**

Dans `LeadsTable.tsx`, importer `leadDisplayStatus`, `LEAD_DISPLAY_STATUSES`, `LEAD_DISPLAY_STATUS_LABELS` depuis `@/lib/lead-display-status`, puis :

- dans `statusBadge`, remplacer `LEAD_STATUS_LABELS[lead.status]` par `LEAD_DISPLAY_STATUS_LABELS[leadDisplayStatus(lead)]` ;
- dans `buildLeadDetail`, même remplacement dans le badge de statut de l'en-tête ;
- dans les filtres, remplacer l'entrée `status` par :

```tsx
    {
      key: "status",
      label: LEAD_FIELD_LABELS.status,
      options: LEAD_DISPLAY_STATUSES.map((status) => ({
        value: status,
        label: LEAD_DISPLAY_STATUS_LABELS[status],
      })),
      value: (lead) => leadDisplayStatus(lead),
    },
```

(retirer ensuite les imports devenus inutiles, `just lint` les signale).

- [ ] **Step 2 : Missions apportées**

Importer `MISSION_STATUS_LABELS` depuis `@/lib/missions`, ajouter avant `buildLeadDetail` :

```tsx
function missionsSection(lead: AdminLead): DetailSection[] {
  if (lead.missions.length === 0) return []
  return [
    {
      title: "Missions apportées",
      rows: [
        {
          fullWidth: true,
          value: (
            <ul className="flex flex-col gap-1">
              {lead.missions.map((mission) => (
                <li key={mission.id} className="flex flex-wrap gap-x-2 text-sm">
                  <span className="font-medium">{mission.title}</span>
                  <span className="text-muted-foreground">
                    {MISSION_STATUS_LABELS[mission.status]}
                    {mission.client ? ` · ${mission.client.name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ),
        },
      ],
    },
  ]
}
```

et insérer `...missionsSection(lead),` juste après `...historySection(history, ranks),` dans les deux branches de `buildLeadDetail` (fiche active et fiche en opposition : la mission reste, `01`).

- [ ] **Step 3 : Card Missions apportées de la page du lead**

Le lead lu par `findLeadByIdForAdmin` porte ses missions (Task 1). Dans `src/app/admin/(protected)/leads/[id]/page.tsx`, importer `RelatedLinksCard`, `type RelatedLink` et `MISSION_STATUS_LABELS`, et ajouter sous la card Actions (`10`) :

```tsx
      <RelatedLinksCard
        title="Missions apportées"
        links={lead.missions.map(
          (mission): RelatedLink => ({
            id: mission.id,
            href: `/admin/missions/${mission.id}`,
            label: mission.title,
            meta: `${MISSION_STATUS_LABELS[mission.status]}${mission.client ? ` · ${mission.client.name}` : ""}`,
          }),
        )}
        emptyText="Aucune mission apportée par ce lead."
      />
```

- [ ] **Step 4 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

---

### Task 8 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 7
- Produces: rien

- [ ] **Step 1 : Menu et création**

Run: `just dev`, se connecter ; avoir un lead en Discussion d'intérêt Hot, une entreprise de type ESN / Recrutement et une entreprise cliente.
Expected: l'entrée Missions, entre Leads et Actions prospection, mène à « Missions en cours ». « Nouvelle mission » mène à `/admin/missions/nouvelle`, cards Mission, Relations, Détails, Conditions, Calendrier, Notes ; Détails pré-rempli (Contexte, Profil recherché, Contenu technique) ; la liste ESN ne propose que l'entreprise ESN ; une fois l'ESN choisie, la liste Client final ne la propose plus. Créer la mission (lead, ESN, client, TJM 580, Freelance, Hybride, 4 j dont 2 sur site, avril 2026, 6 mois) : elle apparaît dans En cours, « 580 € », « 4 j dont 2 sur site », « avril 2026 ».

- [ ] **Step 2 : Mois et règles**

Rouvrir la page de la mission (crayon de la ligne, ou « Modifier » de sa vue détail), choisir un mois sans année, enregistrer ; puis mettre 3 j de rythme et 4 j sur site.
Expected: « Mois de démarrage invalide » sous Démarrage, puis « Pas plus de jours sur site que de jours travaillés » sous Jours sur site, la page gardant la saisie.

- [ ] **Step 3 : Acceptée et Deal**

Passer la mission à Acceptée ; changer ensuite, dans Entreprises, le type de l'ESN pour Partenaire et rouvrir la mission.
Expected: la mission quitte En cours pour Acceptées ; le lead affiche « Deal » dans Leads > Tous et sort de En cours et Chauds ; le filtre Statut des leads propose « Deal ». L'ESN et le client final apparaissent désormais dans la vue Travaillées des entreprises. Le formulaire de la mission affiche toujours l'ancienne ESN, que la liste ESN ne propose plus ; remettre ensuite son type ESN / Recrutement.

- [ ] **Step 4 : Fiches reliées**

Créer une seconde mission dont l'entreprise cliente de la première est l'ESN (lui ajouter le type ESN / Recrutement) ; ouvrir les vues détail du lead, de l'ESN et de cette entreprise.
Expected: le lead montre « Missions apportées » ; l'ESN montre la mission (rôle ESN) et sa ligne « Clients finaux » contient le client de la mission ; l'entreprise à double rôle liste une mission comme client final et l'autre comme ESN. Sur leurs pages, la card « Missions apportées » du lead et la card « Missions » des entreprises listent les mêmes missions, chacune menant à sa page.

- [ ] **Step 5 : Suppressions**

Tenter de supprimer l'ESN depuis Entreprises ; supprimer une mission ; passer le lead en « ne plus contacter ».
Expected: suppression de l'ESN désactivée, « rattachée à 1 mission » (ou « 2 missions ») ; la mission supprimée disparaît, lead et entreprises restent ; la mission du lead opposé reste et sa vue détail marque le lead « Ne plus contacter ». Puis `just stop`.
