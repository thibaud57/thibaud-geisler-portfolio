# Écran des opportunités : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'écran Opportunités (trois vues, liste, formulaire, détail, suppression), les opportunités sur les fiches entreprise et lead, les clients finaux et la travaillée d'une entreprise étendus à ses opportunités acceptées et le statut « Deal » d'un lead déduit de ses opportunités acceptées.

**Architecture:** Des modules purs testés portent les règles : statut affiché du lead (`lead-display-status`), vues des leads relues sur ce statut, vues des opportunités (`opportunity-views`), clients finaux et travaillée étendue aux opportunités acceptées (`companies`). `AdminLead` et `AdminCompany` incluent leurs opportunités, sans lecture de plus. L'écran Opportunités reprend les motifs de `LeadsTable` et `LeadForm` (`08`) : page de création et de modification en cards ; les pages du lead et de l'entreprise listent leurs opportunités dans une `RelatedLinksCard` (`08`), qui enveloppe un `RelatedLinksList`.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7, shadcn/ui `radix-nova` (Card, Select, Popover, Command), Pages CMS Editor (ADR-024), Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/15-ecran-opportunites-design.md`

## Global Constraints

- **Prérequis** : plans `02` (`ZONES`, `ZONE_LABELS` dans `src/lib/zones.ts`), `03` (éditeur `Editor` du champ Détails), `04` (`CompaniesTable` et sa vue détail), `07` (`findPersonOptionsWithLeadRole`, `personDisplayName` dans `src/lib/persons.ts`, `NONE_VALUE` dans `src/lib/schemas/person.ts`), `08` (`LeadsTable`, `lead-views`, `LeadForm`, pages du lead et de l'entreprise, `RelatedLinksCard`, `RelatedLinksList`, prop `relatedCards` des formulaires, prop `initialDetailId` de `DataTable`, `findCompanyOptions`, `SelectField` avec son prop `icons`), `10` (état de `LeadsTable` et `LeadsViewPage` après ses ajouts), `13` (`personDetailHref`, `src/lib/person-links.ts`, pour l'apporteur d'une opportunité, qui peut être lead ou contact) et `14` (`Opportunity`, `createOpportunity`, `updateOpportunity`, `deleteOpportunity`, `AdminOpportunity`, `findAllOpportunitiesForAdmin`, `OPPORTUNITY_STATUS_LABELS`, `OPPORTUNITY_STATUS_ICONS`, `OPPORTUNITY_FIELD_LABELS`, `formatStartMonth`, `toMonthValue`, `CONTRACT_STATUS_ICONS`, `WORK_MODE_ICONS`) implémentés.
- **Routes et titres** : En cours `/admin/opportunites` « Opportunités en cours », Acceptées `/admin/opportunites/acceptees` « Opportunités acceptées », Toutes `/admin/opportunites/toutes` « Toutes les opportunités » ; création `/admin/opportunites/nouvelle`, modification `/admin/opportunites/<id>`.
- **Page ou modale** (arbitrages « Page ou modale d'édition » et « Cards rattachées des pages » de DESIGN.md) : l'opportunité se crée et se modifie sur sa page, en cards Opportunité, Relations, Détails, Conditions, Calendrier, Notes ; la ligne ne porte que Modifier (lien) et Supprimer.
- **Sous-titres** : « Opportunités proposées, en process ou avec une offre reçue. », « Opportunités gagnées, point de départ du suivi de mission. », « Toutes les opportunités, en pause et closes comprises. »
- **Vues** : En cours = `PROPOSEE`, `EN_PROCESS`, `OFFRE_RECUE`, démarrage le plus proche d'abord ; Acceptées = `ACCEPTEE`, démarrage le plus récent d'abord ; Toutes = toutes, mise à jour la plus récente d'abord ; sans démarrage, en dernier.
- **Localité de l'opportunité** : `Opportunity.zone` au singulier (`Zone?`) ; formulaire en `SelectField`, colonne et facette à une valeur.
- **Apporteur** : `Opportunity.referrerId` référence `Person.id` (relation `"OpportunityReferrer"`) ; se choisit avec `findPersonOptionsWithLeadRole()` (personnes au rôle Lead non opposées), s'affiche avec `personDisplayName` ; un apporteur opposé s'affiche « Ne plus contacter », lu sur `opportunity.referrer.optedOutAt`.
- **Entreprises** : `worked` s'étend aux opportunités `ACCEPTEE` (comme ESN ou comme client final, en plus des `ClientMeta` du `04`) ; `endClients` se calcule depuis elles (`joinedEndClientNames`, dédoublonné, trié `localeCompare("fr")`) ; la colonne « Clients finaux » de `CompaniesTable` devient un livrable du `15` (le `04` ne la fournit plus), visible par défaut dans Toutes et Travaillées ; Travaillées inclut désormais les entreprises à opportunité acceptée.
- **Statut affiché du lead** : « Deal » dès qu'une opportunité apportée est `ACCEPTEE`, sinon le statut saisi ; En cours et Chauds excluent un lead « Deal ».
- **Glyphes** : `OPPORTUNITY_STATUS_ICONS`, `CONTRACT_STATUS_ICONS`, `WORK_MODE_ICONS` (`14`) affichés via `EnumBadge` dans la liste, la vue détail et les `Select` du formulaire (statut, contrat, mode de travail) ; la Localité reste en `Badge` simple, sans glyphe.
- **Détail depuis une autre fiche** : chaque page de vue lit `searchParams.detail` et le passe en `initialDetailId` à `OpportunitiesTable`, qui le transmet à `DataTable` (prop ajoutée par le `08`), pour ouvrir le détail d'une opportunité au chargement.
- **Textes** : suppression d'une opportunité « L'apporteur, l'ESN et le client final restent. » ; refus de suppression d'une entreprise « Cette entreprise est rattachée à <liens> et ne peut pas être supprimée. », <liens> ne nommant que les comptes non nuls.
- **Menu** : entrée « Opportunités » du groupe CRM, entre Revues hebdo et Entretiens.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Valeur de démarrage malformée** (une valeur par défaut corrompue, ex. une année sans mois) : passe telle quelle dans le champ caché, jamais corrigée en silence ; la validation du `14` la refuse avec « Mois de démarrage invalide ». Couvert par « sends an incomplete month so that validation refuses it » (Task 4).
- **Lead « Deal » par son opportunité, remis en Perdu à la main** : il reste affiché « Deal ». Couvert par « shows Deal once one of its opportunities is accepted » (Task 1), dont le lead saisi est Perdu.
- **Entreprise ESN d'une opportunité et client final d'une autre** : son bloc Opportunités liste les deux avec le bon rôle. Vérifié à la Task 8, Step 4.
- **ESN d'une opportunité qui perd son type ESN / Recrutement** : le formulaire de l'opportunité l'affiche toujours, sans la proposer aux autres. Vérifié à la Task 8, Step 3.
- **Client final sur deux opportunités Acceptée d'une même ESN** : une seule fois dans « Clients finaux ». Couvert par « names each accepted opportunity's end client once, sorted » (Task 3).

---

### Task 1 : Statut affiché du lead

**Files:**
- Create: `src/lib/lead-display-status.ts`
- Test: `src/lib/lead-display-status.test.ts`
- Modify: `src/lib/lead-views.ts`
- Test: `src/lib/lead-views.test.ts`
- Modify: `src/server/queries/leads.ts`

**Interfaces:**
- Consumes: `LeadStatus`, `OpportunityStatus`
- Produces: `type LeadDisplayStatus = LeadStatus | "DEAL"` ; `LEAD_DISPLAY_STATUSES: readonly LeadDisplayStatus[]` ; `LEAD_DISPLAY_STATUS_LABELS: Record<LeadDisplayStatus, string>` ; `leadDisplayStatus(lead: LeadStatusSource): LeadDisplayStatus` ; `AdminLead.opportunities: { id, title, status, client: { name } | null }[]`

`LeadStatus` n'a jamais porté `DEAL` (`07`) : « Deal » est une valeur affichée, jamais saisie.

- [ ] **Step 1 : Écrire les tests du statut affiché**

`src/lib/lead-display-status.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { leadDisplayStatus } from "./lead-display-status"

describe("leadDisplayStatus", () => {
  it("shows Deal once one of its opportunities is accepted", () => {
    const lead = {
      status: "PERDU" as const,
      opportunities: [{ status: "REFUSEE" as const }, { status: "ACCEPTEE" as const }],
    }

    const status = leadDisplayStatus(lead)

    expect(status).toBe("DEAL")
  })

  it("keeps the entered status otherwise", () => {
    const lead = { status: "DISCUSSION" as const, opportunities: [{ status: "OFFRE_RECUE" as const }] }

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
import type { LeadStatus, OpportunityStatus } from "@/generated/prisma/client"
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
  opportunities: readonly { status: OpportunityStatus }[]
}

// Le deal est un fait de l'opportunité : une opportunité acceptée l'emporte sur le statut saisi.
export function leadDisplayStatus(lead: LeadStatusSource): LeadDisplayStatus {
  return lead.opportunities.some((opportunity) => opportunity.status === "ACCEPTEE") ? "DEAL" : lead.status
}
```

Run: `pnpm vitest run --project unit src/lib/lead-display-status.test.ts`
Expected: PASS.

- [ ] **Step 3 : Vues des leads, tests**

Dans `src/lib/lead-views.test.ts` :

- retirer `"DEAL",` de `STATUSES` ;
- ajouter `opportunities: { status: OpportunityStatus }[]` à `TestLead` (import de type `OpportunityStatus` depuis `@/generated/prisma/client`) et `opportunities: [],` aux valeurs par défaut de `lead()` ;
- dans « keeps hot leads outside deal, lost and out-of-profile in the hot view », remplacer le tableau `["DEAL", "PERDU", "HORS_ICP", "DISCUSSION"]` par `["PERDU", "HORS_ICP", "DISCUSSION"]` et ajouter à `leads` :

```ts
      lead({ id: "hot-deal", status: "DISCUSSION", interest: "HOT", opportunities: [{ status: "ACCEPTEE" }] }),
```

- ajouter dans `describe("leadsForView")` :

```ts
  it("keeps a lead with an accepted opportunity out of the ongoing and hot views", () => {
    const deal = lead({
      id: "deal",
      status: "DISCUSSION",
      interest: "HOT",
      opportunities: [{ status: "ACCEPTEE" }],
    })

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

- [ ] **Step 5 : Opportunités apportées en lecture**

Dans `src/server/queries/leads.ts` :

- ajouter `opportunities: { id: string; title: string; status: OpportunityStatus; client: { name: string } | null }[]` à `AdminLead` (`OpportunityStatus` importé depuis `@/generated/prisma/client`) ;
- ajouter à `adminLeadInclude.person.include`, à côté de `company` :

```ts
  referredOpportunities: {
    select: { id: true, title: true, status: true, client: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  },
```

- dans `toAdminLead`, ajouter `opportunities: row.person.referredOpportunities,`.

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 2 : Vues des opportunités, libellés, gabarit et largeurs

**Files:**
- Create: `src/lib/opportunity-views.ts`
- Test: `src/lib/opportunity-views.test.ts`
- Modify: `src/lib/opportunities.ts`
- Modify: `src/lib/details-templates.ts`
- Test: `src/lib/details-templates.test.ts`
- Modify: `src/lib/admin-table-widths.ts`

**Interfaces:**
- Consumes: `OpportunityStatus`
- Produces: `type OpportunityView = "en-cours" | "acceptees" | "toutes"` ; `OPPORTUNITY_VIEWS` ; `opportunitiesForView<T extends OpportunityViewRow>(opportunities: readonly T[], view: OpportunityView): T[]` ; `OPPORTUNITY_VIEW_PAGES` ; `OPPORTUNITY_SECTION_TITLES`, `formatRhythm(daysPerWeek: number | null, onSiteDays: number | null): string | null`, `formatDailyRate(rate: number | null): string | null`, `formatDuration(months: number | null): string | null` ; `OPPORTUNITY_DETAILS_TEMPLATE` ; `OPPORTUNITY_COLUMN_WIDTHS`, `OpportunityColumnKey`, `OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS`, `opportunitySkeletonWidths(view: OpportunityView): readonly number[]`

- [ ] **Step 1 : Écrire les tests des vues**

`src/lib/opportunity-views.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import type { OpportunityStatus } from "@/generated/prisma/client"

import { opportunitiesForView } from "./opportunity-views"

interface TestOpportunity {
  id: string
  status: OpportunityStatus
  startMonth: Date | null
  updatedAt: Date
}

function opportunity(overrides: Partial<TestOpportunity> = {}): TestOpportunity {
  return {
    id: "o1",
    status: "PROPOSEE",
    startMonth: null,
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  }
}

function idsOf(opportunities: readonly TestOpportunity[]): string[] {
  return opportunities.map((row) => row.id)
}

describe("opportunitiesForView", () => {
  it("keeps proposed, in-process and offered opportunities in the ongoing view, soonest start first", () => {
    const opportunities = [
      opportunity({ id: "proposed", status: "PROPOSEE", startMonth: new Date("2026-06-01T00:00:00.000Z") }),
      opportunity({ id: "offered", status: "OFFRE_RECUE", startMonth: null }),
      opportunity({ id: "in-process", status: "EN_PROCESS", startMonth: new Date("2026-04-01T00:00:00.000Z") }),
      opportunity({ id: "accepted", status: "ACCEPTEE" }),
      opportunity({ id: "paused", status: "EN_PAUSE" }),
    ]

    const rows = opportunitiesForView(opportunities, "en-cours")

    expect(idsOf(rows)).toEqual(["in-process", "proposed", "offered"])
  })

  it("keeps accepted opportunities in the accepted view", () => {
    const opportunities = [
      opportunity({ id: "older", status: "ACCEPTEE", startMonth: new Date("2025-01-01T00:00:00.000Z") }),
      opportunity({ id: "refused", status: "REFUSEE" }),
      opportunity({ id: "newer", status: "ACCEPTEE", startMonth: new Date("2026-01-01T00:00:00.000Z") }),
    ]

    const rows = opportunitiesForView(opportunities, "acceptees")

    expect(idsOf(rows)).toEqual(["newer", "older"])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/opportunity-views.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Vues**

`src/lib/opportunity-views.ts` :

```ts
import type { OpportunityStatus } from "@/generated/prisma/client"

export type OpportunityView = "en-cours" | "acceptees" | "toutes"

export const OPPORTUNITY_VIEWS: readonly OpportunityView[] = ["en-cours", "acceptees", "toutes"]

export interface OpportunityViewRow {
  status: OpportunityStatus
  startMonth: Date | null
  updatedAt: Date
}

const ONGOING: ReadonlySet<OpportunityStatus> = new Set(["PROPOSEE", "EN_PROCESS", "OFFRE_RECUE"])

const VIEW_FILTERS: Record<OpportunityView, (opportunity: OpportunityViewRow) => boolean> = {
  "en-cours": (opportunity) => ONGOING.has(opportunity.status),
  acceptees: (opportunity) => opportunity.status === "ACCEPTEE",
  toutes: () => true,
}

// Sans démarrage en dernier dans les deux sens : ni la plus proche, ni la plus récente.
function byStartMonth(direction: 1 | -1) {
  return (a: OpportunityViewRow, b: OpportunityViewRow): number => {
    if (!a.startMonth || !b.startMonth) return a.startMonth ? -1 : b.startMonth ? 1 : 0
    return direction * (a.startMonth.getTime() - b.startMonth.getTime())
  }
}

function byLatestUpdate(a: OpportunityViewRow, b: OpportunityViewRow): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

const VIEW_SORTS: Record<OpportunityView, (a: OpportunityViewRow, b: OpportunityViewRow) => number> = {
  "en-cours": byStartMonth(1),
  acceptees: byStartMonth(-1),
  toutes: byLatestUpdate,
}

// Ordre d'affichage par défaut : DataTable garde celui des lignes reçues tant qu'aucune colonne n'est triée.
export function opportunitiesForView<T extends OpportunityViewRow>(
  opportunities: readonly T[],
  view: OpportunityView,
): T[] {
  return opportunities.filter(VIEW_FILTERS[view]).sort(VIEW_SORTS[view])
}

export const OPPORTUNITY_VIEW_PAGES: Record<OpportunityView, { title: string; subtitle: string }> = {
  "en-cours": {
    title: "Opportunités en cours",
    subtitle: "Opportunités proposées, en process ou avec une offre reçue.",
  },
  acceptees: {
    title: "Opportunités acceptées",
    subtitle: "Opportunités gagnées, point de départ du suivi de mission.",
  },
  toutes: {
    title: "Toutes les opportunités",
    subtitle: "Toutes les opportunités, en pause et closes comprises.",
  },
}
```

Run: `pnpm vitest run --project unit src/lib/opportunity-views.test.ts`
Expected: PASS.

- [ ] **Step 3 : Titres et formats**

À la fin de `src/lib/opportunities.ts` :

```ts
export const OPPORTUNITY_SECTION_TITLES = {
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

Ajouter à `src/lib/details-templates.test.ts` (import de `OPPORTUNITY_DETAILS_TEMPLATE`) :

```ts
describe("OPPORTUNITY_DETAILS_TEMPLATE", () => {
  it("gives the opportunity template its three sections", () => {
    const headings = OPPORTUNITY_DETAILS_TEMPLATE.split("\n").filter((line) => line.startsWith("# "))

    expect(headings).toEqual(["# 🎯 Contexte", "# 👤 Profil recherché", "# 🛠️ Contenu technique"])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: FAIL, export absent.

À la fin de `src/lib/details-templates.ts` :

```ts
// Secteur et taille vivent sur l'entreprise, TJM/lieu/rythme sur l'opportunité : il ne reste ici que le texte.
export const OPPORTUNITY_DETAILS_TEMPLATE = `# 🎯 Contexte

# 👤 Profil recherché

# 🛠️ Contenu technique
`
```

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: PASS.

- [ ] **Step 5 : Largeurs**

À la fin de `src/lib/admin-table-widths.ts` (l'import de type va en tête : `import type { OpportunityView } from "@/lib/opportunity-views"`) :

```ts
export const OPPORTUNITY_COLUMN_WIDTHS = {
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

export type OpportunityColumnKey = keyof typeof OPPORTUNITY_COLUMN_WIDTHS

export const OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<OpportunityView, readonly OpportunityColumnKey[]> = {
  "en-cours": ["status", "intermediary", "client", "dailyRate", "workMode", "rhythm", "startMonth"],
  acceptees: ["intermediary", "client", "dailyRate", "contract", "rhythm", "startMonth", "duration"],
  toutes: ["status", "referrer", "intermediary", "client", "dailyRate", "contract", "workMode", "rhythm", "zone", "startMonth", "duration", "notes"],
}

export function opportunitySkeletonWidths(view: OpportunityView): readonly number[] {
  const keys: readonly OpportunityColumnKey[] = [
    "title",
    ...OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
    "actions",
  ]
  return keys.map((key) => OPPORTUNITY_COLUMN_WIDTHS[key])
}
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 3 : Entreprises : opportunités en lecture, clients finaux et travaillée étendue

**Files:**
- Modify: `src/server/queries/companies.ts`
- Modify: `src/lib/companies.ts`
- Test: `src/lib/companies.test.ts`

**Interfaces:**
- Consumes: modèle `Opportunity` (`14`)
- Produces: `AdminCompany.opportunitiesAsIntermediary` et `.opportunitiesAsClient` (`{ id, title, status, dailyRate, client: { id, name } | null }[]`) ; `AdminCompany._count.opportunitiesAsIntermediary`, `._count.opportunitiesAsClient` ; `AdminCompany.worked` étendu aux opportunités Acceptée, `.endClients` ; `CompanyOption.types` ; `joinedEndClientNames(company): string[]` ; `hasAcceptedOpportunity(company): boolean` ; `companyLinksLabel(projects: number, opportunities: number): string`

- [ ] **Step 1 : Écrire les tests**

`src/lib/companies.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { hasAcceptedOpportunity, joinedEndClientNames } from "./companies"

describe("joinedEndClientNames", () => {
  it("names each accepted opportunity's end client once, sorted", () => {
    const company = {
      opportunitiesAsIntermediary: [
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

describe("hasAcceptedOpportunity", () => {
  it("marks a company worked once one of its opportunities is accepted, as intermediary or as client", () => {
    const asClient = {
      opportunitiesAsIntermediary: [],
      opportunitiesAsClient: [{ status: "ACCEPTEE" as const }],
    }
    const none = {
      opportunitiesAsIntermediary: [{ status: "PROPOSEE" as const }],
      opportunitiesAsClient: [],
    }

    expect(hasAcceptedOpportunity(asClient)).toBe(true)
    expect(hasAcceptedOpportunity(none)).toBe(false)
  })
})
```

Run: `pnpm vitest run --project unit src/lib/companies.test.ts`
Expected: FAIL, `joinedEndClientNames` et `hasAcceptedOpportunity` absents.

- [ ] **Step 2 : Clients finaux, travaillée étendue et libellé des liens**

À la fin de `src/lib/companies.ts` (import de type `OpportunityStatus` depuis `@/generated/prisma/client` en tête) :

```ts
// Rien n'est écrit : le client final se lit sur les opportunités gagnées, jamais saisi sur l'ESN.
export function joinedEndClientNames(company: {
  opportunitiesAsIntermediary: readonly {
    status: OpportunityStatus
    client: { id: string; name: string } | null
  }[]
}): string[] {
  const names = new Map<string, string>()
  for (const opportunity of company.opportunitiesAsIntermediary) {
    if (opportunity.status === "ACCEPTEE" && opportunity.client) {
      names.set(opportunity.client.id, opportunity.client.name)
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, "fr"))
}

export function hasAcceptedOpportunity(company: {
  opportunitiesAsIntermediary: readonly { status: OpportunityStatus }[]
  opportunitiesAsClient: readonly { status: OpportunityStatus }[]
}): boolean {
  return (
    company.opportunitiesAsIntermediary.some((opportunity) => opportunity.status === "ACCEPTEE") ||
    company.opportunitiesAsClient.some((opportunity) => opportunity.status === "ACCEPTEE")
  )
}

function counted(count: number, singular: string, plural: string): string | null {
  return count === 0 ? null : `${count} ${count > 1 ? plural : singular}`
}

export function companyLinksLabel(projects: number, opportunities: number): string {
  return [counted(projects, "projet", "projets"), counted(opportunities, "opportunité", "opportunités")]
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
const opportunitySummarySelect = {
  id: true,
  title: true,
  status: true,
  dailyRate: true,
  client: { select: { id: true, name: true } },
} as const

const companyCounts = {
  _count: { select: { clientMetas: true, opportunitiesAsIntermediary: true, opportunitiesAsClient: true } },
} as const
```

- ajouter à `adminCompanyInclude` :

```ts
  opportunitiesAsIntermediary: { select: opportunitySummarySelect, orderBy: { updatedAt: "desc" } },
  opportunitiesAsClient: { select: opportunitySummarySelect, orderBy: { updatedAt: "desc" } },
```

- dans le type `AdminCompany`, remplacer `{ _count: { select: { clientMetas: true } } }` par `typeof companyCounts` et ajouter `endClients: string[]` à l'intersection des dérivés ; dans `findAllCompaniesForAdmin`, remplacer la même sélection par `...companyCounts` ;
- dans `toAdminCompany` (`04`), qui calcule `worked` (`findCompanyByIdForAdmin` ne l'appelle pas, la vue détail lit `AdminCompany` de la liste), étendre `worked` avec `|| hasAcceptedOpportunity(company)` et ajouter `endClients: joinedEndClientNames(company)` (imports depuis `@/lib/companies`) ;
- dans `findCompanyOptions`, ajouter `types: true` au `select`.

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Formulaire et suppression d'une opportunité

**Files:**
- Create: `src/components/features/admin/MonthField.tsx`
- Test: `src/components/features/admin/MonthField.test.tsx`
- Create: `src/components/features/admin/opportunities/OpportunityForm.tsx`
- Create: `src/components/features/admin/opportunities/DeleteOpportunityDialog.tsx`
- Modify: `src/lib/opportunities.ts` (titre de la card Opportunité)
- Modify: `src/lib/schemas/opportunity.ts` (sentinelle `NONE_VALUE` du rythme et des jours sur site)
- Modify: `src/server/queries/opportunities.ts`
- Create: `src/app/admin/(protected)/opportunites/nouvelle/page.tsx` et `loading.tsx`, `src/app/admin/(protected)/opportunites/[id]/page.tsx` et `loading.tsx`
- Modify: `docs/DESIGN.md` (ligne « Mois de démarrage »)

**Interfaces:**
- Consumes: Tasks 2 et 3 ; `createOpportunity`, `updateOpportunity`, `deleteOpportunity`, `initialOpportunityFormState`, `OPPORTUNITY_STATUSES`, `toMonthValue`, `OPPORTUNITY_STATUS_ICONS` (`14`) ; `SelectField` (avec son prop `icons`), `ComboboxPopover`, `CompanyLogoTile`, `RowActionButton`, `ConfirmDeleteDialog`, `Editor`, `Card`, `AdminBreadcrumb`, `StackedSkeleton` ; `CONTRACT_STATUS_LABELS`, `CONTRACT_STATUS_ICONS`, `WORK_MODE_LABELS`, `WORK_MODE_ICONS` (`@/lib/projects`, `14`) ; `personDisplayName` (`07`) ; `findPersonOptionsWithLeadRole` (`07`), `findCompanyOptions` (`08`)
- Produces: `MonthField({ id, name, label, errors, defaultValue }: { id: string; name: string; label: string; errors: string[] | undefined; defaultValue: string })` ; `OpportunityForm({ opportunity, referrerOptions, companyOptions, relatedCards })` ; `DeleteOpportunityDialog({ opportunity })` ; `findOpportunityByIdForAdmin(id)` ; routes `/admin/opportunites/nouvelle` et `/admin/opportunites/<id>`

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

Redessiné le 2026-10-02 (miroir `.design-sync/design-system/components/post-mvp/forms/MonthField.jsx`) : le même bouton calendrier que les champs de date du formulaire projet (`ProjectForm`, `Popover` + `Button` + icône `Calendar`), qui ouvre un panneau avec une année à faire défiler et une grille des douze mois. La valeur part telle quelle dans l'input caché, y compris malformée (`defaultValue` partiel) : plus de reconstruction depuis deux `Select` séparés, donc rien à recombiner.

`src/components/features/admin/MonthField.tsx` :

```tsx
"use client"

import { useState } from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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
]
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]

interface Picked {
  year: number
  month: number
}

function parseValue(value: string): Picked | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) }
}

interface Props {
  id: string
  name: string
  label: string
  errors: string[] | undefined
  // « AAAA-MM », vide si aucun mois ; une valeur partielle (ex. "-04") passe telle quelle, la validation la refuse.
  defaultValue: string
}

export function MonthField({ id, name, label, errors, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const picked = parseValue(value)
  const [year, setYear] = useState(picked?.year ?? new Date().getFullYear())
  const now = new Date()

  return (
    <FormField id={id} label={label} errors={errors}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setYear(picked?.year ?? now.getFullYear())
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-invalid={!!errors?.length}
            aria-describedby={`${id}-error`}
            className={cn("w-full justify-start font-normal", !picked && "text-muted-foreground")}
          >
            <CalendarIcon aria-hidden data-icon="inline-start" />
            {picked ? `${MONTHS[picked.month - 1]} ${picked.year}` : "Choisir un mois"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="flex items-center justify-between pb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Année précédente"
              onClick={() => setYear((current) => current - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span aria-live="polite" className="text-sm font-medium tabular-nums">
              {year}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Année suivante"
              onClick={() => setYear((current) => current + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div role="grid" className="grid grid-cols-3 gap-1">
            {MONTHS_SHORT.map((short, index) => {
              const month = index + 1
              const selected = picked?.year === year && picked.month === month
              const current = year === now.getFullYear() && month === now.getMonth() + 1
              return (
                <button
                  type="button"
                  key={month}
                  aria-pressed={selected}
                  aria-label={`${MONTHS[index]} ${year}`}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                    selected && "bg-primary text-primary-foreground hover:bg-primary",
                    current && !selected && "font-semibold",
                  )}
                  onClick={() => {
                    setValue(`${year}-${String(month).padStart(2, "0")}`)
                    setOpen(false)
                  }}
                >
                  {short}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-end border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue("")
                setOpen(false)
              }}
            >
              Effacer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={value} />
    </FormField>
  )
}
```

Run: `pnpm vitest run --project unit src/components/features/admin/MonthField.test.tsx`
Expected: PASS.

- [ ] **Step 3 : Suppression**

`src/components/features/admin/opportunities/DeleteOpportunityDialog.tsx` :

```tsx
"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteOpportunity } from "@/server/actions/opportunities"
import type { AdminOpportunity } from "@/server/queries/opportunities"

interface Props {
  opportunity: AdminOpportunity
}

export function DeleteOpportunityDialog({ opportunity }: Props) {
  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${opportunity.title}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={opportunity.title}
      description="L'apporteur, l'ESN et le client final restent."
      successMessage="Opportunité supprimée"
      onDelete={async () => {
        const result = await deleteOpportunity(opportunity.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
```

- [ ] **Step 4 : Formulaire en cards**

Dans `src/lib/opportunities.ts`, ajouter en tête de `OPPORTUNITY_SECTION_TITLES` (Task 2) l'entrée `opportunity: "Opportunité"`.

`src/components/features/admin/opportunities/OpportunityForm.tsx`, sur le motif de `LeadForm` (`08`) ; les cards reprennent les blocs de la vue détail. Les champs de Conditions sont réappariés (TJM + Contrat, Mode de travail + Localité, Rythme + Jours sur site) et Calendrier passe sur deux colonnes (Démarrage + Durée) ; Statut, Contrat et Mode de travail affichent leur glyphe via `icons` sur `SelectField` ; la prop `relatedCards` accueille, hors des champs, la card Entretiens que le `17` y transmettra :

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
import { OPPORTUNITY_DETAILS_TEMPLATE } from "@/lib/details-templates"
import {
  OPPORTUNITY_FIELD_LABELS as LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_ICONS,
  OPPORTUNITY_STATUS_LABELS,
  toMonthValue,
} from "@/lib/opportunities"
import { personDisplayName } from "@/lib/persons"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  WORK_MODE_ICONS,
  WORK_MODE_LABELS,
} from "@/lib/projects"
import { OPPORTUNITY_STATUSES } from "@/lib/schemas/opportunity"
import { NONE_VALUE } from "@/lib/schemas/person"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import { createOpportunity, updateOpportunity } from "@/server/actions/opportunities"
import { initialOpportunityFormState } from "@/server/actions/opportunities.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminOpportunity } from "@/server/queries/opportunities"
import type { PersonOption } from "@/server/queries/persons"

const CONTRACTS = Object.keys(CONTRACT_STATUS_LABELS) as ContractStatus[]
const WORK_MODES = Object.keys(WORK_MODE_LABELS) as WorkMode[]
const DAYS_PER_WEEK = ["1", "2", "3", "4", "5"]
const ON_SITE_DAYS = ["0", "1", "2", "3", "4", "5"]
const DAY_LABELS: Record<string, string> = Object.fromEntries(
  ON_SITE_DAYS.map((days) => [days, `${days} j`]),
)
const OPPORTUNITIES_PATH = "/admin/opportunites"

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
  opportunity: AdminOpportunity | null
  referrerOptions: readonly PersonOption[]
  companyOptions: readonly CompanyOption[]
  // Card Entretiens transmise par le 17 (arbitrage « Cards rattachées des pages »), hors des champs.
  relatedCards?: React.ReactNode
}

export function OpportunityForm({ opportunity, referrerOptions, companyOptions, relatedCards }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = opportunity ? updateOpportunity.bind(null, opportunity.id) : createOpportunity
  const [state, formAction, pending] = useActionState(action, initialOpportunityFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  const [referrerId, setReferrerId] = useState(opportunity?.referrerId ?? NONE_VALUE)
  const [referrerOpen, setReferrerOpen] = useState(false)
  const [intermediaryId, setIntermediaryId] = useState(opportunity?.intermediaryId ?? NONE_VALUE)
  const [clientId, setClientId] = useState(opportunity?.clientId ?? NONE_VALUE)
  // Le gabarit ne se pose qu'à la création : un Détails vidé exprès reste vide.
  const [details, setDetails] = useState(
    opportunity ? (opportunity.details ?? "") : OPPORTUNITY_DETAILS_TEMPLATE,
  )

  const esnOptions = companyOptions.filter((company) => company.types.includes("ESN_RECRUTEMENT"))
  const clientOptions = companyOptions.filter((company) => company.id !== intermediaryId)
  // L'apporteur peut être sorti des choix (opposition) : son nom reste affiché.
  const selectedReferrerLabel =
    referrerOptions.find((option) => option.id === referrerId)?.name ??
    (opportunity?.referrer && opportunity.referrer.id === referrerId
      ? personDisplayName(opportunity.referrer)
      : null)

  function handleIntermediaryChange(next: string) {
    setIntermediaryId(next)
    // Une même entreprise ne peut pas être l'ESN et le client final.
    if (next !== NONE_VALUE && next === clientId) setClientId(NONE_VALUE)
  }

  useEffect(() => {
    if (state.ok === true) {
      toast.success(opportunity ? "Opportunité mise à jour" : "Opportunité créée")
      router.push(OPPORTUNITIES_PATH)
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, opportunity, router])

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {opportunity ? opportunity.title : "Nouvelle opportunité"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href={OPPORTUNITIES_PATH}>Annuler</Link>
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
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.opportunity}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${formId}-title`} label={LABELS.title} errors={state.errors.title}>
                <Input
                  id={`${formId}-title`}
                  name="title"
                  defaultValue={opportunity?.title ?? ""}
                  placeholder="Plateforme IA interne"
                  aria-invalid={!!state.errors.title?.length}
                  aria-describedby={`${formId}-title-error`}
                />
              </FormField>

              <FormField id={`${formId}-role`} label={LABELS.role} errors={state.errors.role}>
                <Input
                  id={`${formId}-role`}
                  name="role"
                  defaultValue={opportunity?.role ?? ""}
                  placeholder="Dev Fullstack IA"
                  aria-invalid={!!state.errors.role?.length}
                  aria-describedby={`${formId}-role-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-status`}
                name="status"
                label={LABELS.status}
                options={OPPORTUNITY_STATUSES}
                labels={OPPORTUNITY_STATUS_LABELS}
                icons={OPPORTUNITY_STATUS_ICONS}
                defaultValue={opportunity?.status ?? "PROPOSEE"}
                errors={state.errors.status}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.relations}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  id={`${formId}-referrerId`}
                  label={LABELS.referrerId}
                  errors={state.errors.referrerId}
                >
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
                fallbackName={opportunity?.intermediary?.name ?? null}
              />

              <CompanyPicker
                id={`${formId}-clientId`}
                name="clientId"
                label={LABELS.clientId}
                errors={state.errors.clientId}
                options={clientOptions}
                value={clientId}
                onChange={setClientId}
                fallbackName={opportunity?.client?.name ?? null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.details}</CardTitle>
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

          {relatedCards}
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.conditions}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${formId}-dailyRate`} label={LABELS.dailyRate} errors={state.errors.dailyRate}>
                <Input
                  id={`${formId}-dailyRate`}
                  name="dailyRate"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={10}
                  defaultValue={opportunity?.dailyRate?.toString() ?? ""}
                  placeholder="580"
                  className="text-right tabular-nums"
                  aria-invalid={!!state.errors.dailyRate?.length}
                  aria-describedby={`${formId}-dailyRate-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-contract`}
                name="contract"
                label={LABELS.contract}
                options={CONTRACTS}
                labels={CONTRACT_STATUS_LABELS}
                icons={CONTRACT_STATUS_ICONS}
                defaultValue={opportunity?.contract ?? NONE_VALUE}
                errors={state.errors.contract}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-workMode`}
                name="workMode"
                label={LABELS.workMode}
                options={WORK_MODES}
                labels={WORK_MODE_LABELS}
                icons={WORK_MODE_ICONS}
                defaultValue={opportunity?.workMode ?? NONE_VALUE}
                errors={state.errors.workMode}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-zone`}
                name="zone"
                label={LABELS.zone}
                options={ZONES}
                labels={ZONE_LABELS}
                defaultValue={opportunity?.zone ?? NONE_VALUE}
                errors={state.errors.zone}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-daysPerWeek`}
                name="daysPerWeek"
                label={LABELS.daysPerWeek}
                options={DAYS_PER_WEEK}
                labels={DAY_LABELS}
                defaultValue={opportunity?.daysPerWeek?.toString() ?? NONE_VALUE}
                errors={state.errors.daysPerWeek}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-onSiteDays`}
                name="onSiteDays"
                label={LABELS.onSiteDays}
                options={ON_SITE_DAYS}
                labels={DAY_LABELS}
                defaultValue={opportunity?.onSiteDays?.toString() ?? NONE_VALUE}
                errors={state.errors.onSiteDays}
                noneLabel="Non renseigné"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.calendar}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <MonthField
                id={`${formId}-startMonth`}
                name="startMonth"
                label={LABELS.startMonth}
                errors={state.errors.startMonth}
                defaultValue={opportunity?.startMonth ? toMonthValue(opportunity.startMonth) : ""}
              />

              <FormField
                id={`${formId}-durationMonths`}
                label={LABELS.durationMonths}
                errors={state.errors.durationMonths}
              >
                <Input
                  id={`${formId}-durationMonths`}
                  name="durationMonths"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  defaultValue={opportunity?.durationMonths?.toString() ?? ""}
                  className="text-right tabular-nums"
                  aria-invalid={!!state.errors.durationMonths?.length}
                  aria-describedby={`${formId}-durationMonths-error`}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.notes}</CardTitle>
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
                  defaultValue={opportunity?.notes ?? ""}
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

`SelectField` envoie la sentinelle `NONE_VALUE` pour « Non renseigné » ; pour Rythme et Jours sur site, le schéma du `14` attend une chaîne vide : dans `src/lib/schemas/opportunity.ts`, faire lire à `optionalInt` la sentinelle comme une valeur vide (`value === "" || value === NONE_VALUE` dans le `refine`, et la même condition dans le `transform`).

- [ ] **Step 5 : L'apporteur peut être lead ou contact ; pages de création et de modification**

Dans `src/server/queries/opportunities.ts` (`adminOpportunityInclude` du `14`), étendre le `select` de `referrer` pour que la vue détail (Task 5, Step 1) puisse résoudre sa fiche par `personDetailHref` (`13`) :

```ts
  referrer: {
    select: {
      id: true,
      name: true,
      email: true,
      linkedinUrl: true,
      optedOutAt: true,
      lead: { select: { id: true } },
      contact: { select: { id: true } },
    },
  },
```

(remplace le `select` plus court posé par le `14`, qui n'avait que `id`, `name`, `email`, `linkedinUrl`, `optedOutAt` ; `intermediary` et `client` ne changent pas.)

À la fin du même fichier :

```ts
export async function findOpportunityByIdForAdmin(id: string): Promise<AdminOpportunity | null> {
  return prisma.opportunity.findUnique({ where: { id }, include: adminOpportunityInclude })
}
```

`src/app/admin/(protected)/opportunites/nouvelle/page.tsx` :

```tsx
import { Suspense } from "react"

import { OpportunityForm } from "@/components/features/admin/opportunities/OpportunityForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findPersonOptionsWithLeadRole } from "@/server/queries/persons"

const OPPORTUNITY_PAGE_SKELETON = ["h-[24px]", "h-[200px]", "h-[220px]", "h-[320px]"]

async function NewOpportunitySection() {
  const [referrerOptions, companyOptions] = await Promise.all([
    findPersonOptionsWithLeadRole(),
    findCompanyOptions(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Opportunités", href: "/admin/opportunites" }, { label: "Nouvelle opportunité" }]}
      />
      <OpportunityForm opportunity={null} referrerOptions={referrerOptions} companyOptions={companyOptions} />
    </div>
  )
}

export default async function NewOpportunityPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={OPPORTUNITY_PAGE_SKELETON} />}>
        <NewOpportunitySection />
      </Suspense>
    </div>
  )
}
```

`src/app/admin/(protected)/opportunites/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { OpportunityForm } from "@/components/features/admin/opportunities/OpportunityForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findOpportunityByIdForAdmin } from "@/server/queries/opportunities"
import { findPersonOptionsWithLeadRole } from "@/server/queries/persons"

const OPPORTUNITY_PAGE_SKELETON = ["h-[24px]", "h-[200px]", "h-[220px]", "h-[320px]"]

async function EditOpportunitySection({ id }: { id: string }) {
  const [opportunity, referrerOptions, companyOptions] = await Promise.all([
    findOpportunityByIdForAdmin(id),
    findPersonOptionsWithLeadRole(),
    findCompanyOptions(),
  ])
  if (!opportunity) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Opportunités", href: "/admin/opportunites" }, { label: opportunity.title }]}
      />
      <OpportunityForm opportunity={opportunity} referrerOptions={referrerOptions} companyOptions={companyOptions} />
    </div>
  )
}

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={OPPORTUNITY_PAGE_SKELETON} />}>
        <EditOpportunitySection id={id} />
      </Suspense>
    </div>
  )
}
```

Le `17` complète ces deux pages pour passer, via la prop `relatedCards` de `OpportunityForm`, la card Entretiens (`RelatedLinksList`) : pleine sur `[id]`, vide avec « Après l'enregistrement de l'opportunité. » et bouton désactivé sur `nouvelle`.

Les dossiers `nouvelle/` et `[id]/` reçoivent chacun un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 6 : Mapping de `docs/DESIGN.md`**

Charger le skill `design-doc`, puis déplacer la ligne « Mois de démarrage » de § Post-MVP (non installés) vers § Formulaires, sans sa dernière phrase (« Rejoint § … ») : le composant est installé, bouton calendrier et grille des douze mois plutôt que deux `Select`.

- [ ] **Step 7 : Vérifier**

Run: `just typecheck`
Expected: aucune erreur.

Run: `pnpm vitest run --project unit src/server/actions/opportunities.test.ts`
Expected: PASS, les tests du `14` inchangés.

---

### Task 5 : Liste, pages et menu

**Files:**
- Create: `src/components/features/admin/opportunities/OpportunitiesTable.tsx`
- Create: `src/components/features/admin/opportunities/OpportunitiesViewPage.tsx`
- Create: `src/app/admin/(protected)/opportunites/page.tsx` et `loading.tsx`, `acceptees/page.tsx` et `loading.tsx`, `toutes/page.tsx` et `loading.tsx`
- Modify: `src/config/admin-nav-items.ts`

**Interfaces:**
- Consumes: Tasks 2 à 4 ; `findAllOpportunitiesForAdmin` (`14`) ; `RowActionButton`, `EnumBadge`
- Produces: `OpportunitiesTable({ opportunities, view, initialDetailId })`, `OpportunitiesViewPage({ view, initialDetailId })`

- [ ] **Step 1 : Table**

`src/components/features/admin/opportunities/OpportunitiesTable.tsx` :

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
import { DeleteOpportunityDialog } from "@/components/features/admin/opportunities/DeleteOpportunityDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import type { ContractStatus, WorkMode } from "@/generated/prisma/client"
import {
  OPPORTUNITY_COLUMN_WIDTHS,
  OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type OpportunityColumnKey,
} from "@/lib/admin-table-widths"
import { opportunitiesForView, type OpportunityView } from "@/lib/opportunity-views"
import {
  formatDailyRate,
  formatDuration,
  formatRhythm,
  formatStartMonth,
  OPPORTUNITY_FIELD_LABELS as LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_ICONS,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/opportunities"
import { personDetailHref } from "@/lib/person-links"
import { personDisplayName } from "@/lib/persons"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  WORK_MODE_ICONS,
  WORK_MODE_LABELS,
} from "@/lib/projects"
import { OPPORTUNITY_STATUSES } from "@/lib/schemas/opportunity"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminOpportunity } from "@/server/queries/opportunities"

const OPTED_OUT_LABEL = "Ne plus contacter"

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
}

function companyCell(company: AdminOpportunity["client"]) {
  if (!company) return null
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompanyLogoTile logoFilename={company.logoFilename} size="sm" />
      <TruncateTooltip className="min-w-0">{company.name}</TruncateTooltip>
    </span>
  )
}

function hideable(
  view: OpportunityView,
  key: Exclude<OpportunityColumnKey, "title" | "actions">,
): Pick<Column<AdminOpportunity>, "hideable" | "defaultVisible"> {
  return { hideable: true, defaultVisible: OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key) }
}

function buildDataColumns(view: OpportunityView): readonly Column<AdminOpportunity>[] {
  return [
    {
      key: "title",
      header: LABELS.title,
      width: OPPORTUNITY_COLUMN_WIDTHS.title,
      sortValue: (opportunity) => opportunity.title,
      searchValue: (opportunity) =>
        [
          opportunity.title,
          opportunity.role ?? "",
          opportunity.intermediary?.name ?? "",
          opportunity.client?.name ?? "",
        ].join(" "),
      cell: (opportunity) => (
        <TruncateTooltip className="block w-full font-medium">{opportunity.title}</TruncateTooltip>
      ),
    },
    {
      key: "status",
      header: LABELS.status,
      width: OPPORTUNITY_COLUMN_WIDTHS.status,
      ...hideable(view, "status"),
      cell: (opportunity) => (
        <EnumBadge
          label={OPPORTUNITY_STATUS_LABELS[opportunity.status]}
          icon={OPPORTUNITY_STATUS_ICONS[opportunity.status]}
        />
      ),
    },
    {
      key: "referrer",
      header: LABELS.referrerId,
      width: OPPORTUNITY_COLUMN_WIDTHS.referrer,
      ...hideable(view, "referrer"),
      sortValue: (opportunity) => (opportunity.referrer ? personDisplayName(opportunity.referrer) : ""),
      cell: (opportunity) => (
        <TruncatedCell value={opportunity.referrer ? personDisplayName(opportunity.referrer) : null} />
      ),
    },
    {
      key: "intermediary",
      header: LABELS.intermediaryId,
      width: OPPORTUNITY_COLUMN_WIDTHS.intermediary,
      ...hideable(view, "intermediary"),
      sortValue: (opportunity) => opportunity.intermediary?.name ?? "",
      cell: (opportunity) => companyCell(opportunity.intermediary),
    },
    {
      key: "client",
      header: LABELS.clientId,
      width: OPPORTUNITY_COLUMN_WIDTHS.client,
      ...hideable(view, "client"),
      sortValue: (opportunity) => opportunity.client?.name ?? "",
      cell: (opportunity) => companyCell(opportunity.client),
    },
    {
      key: "dailyRate",
      header: LABELS.dailyRate,
      width: OPPORTUNITY_COLUMN_WIDTHS.dailyRate,
      align: "right",
      className: "tabular-nums",
      ...hideable(view, "dailyRate"),
      sortValue: (opportunity) => opportunity.dailyRate ?? -1,
      cell: (opportunity) => formatDailyRate(opportunity.dailyRate),
    },
    {
      key: "contract",
      header: LABELS.contract,
      width: OPPORTUNITY_COLUMN_WIDTHS.contract,
      ...hideable(view, "contract"),
      cell: (opportunity) =>
        opportunity.contract ? (
          <EnumBadge
            label={CONTRACT_STATUS_LABELS[opportunity.contract]}
            icon={CONTRACT_STATUS_ICONS[opportunity.contract]}
          />
        ) : null,
    },
    {
      key: "workMode",
      header: LABELS.workMode,
      width: OPPORTUNITY_COLUMN_WIDTHS.workMode,
      ...hideable(view, "workMode"),
      cell: (opportunity) =>
        opportunity.workMode ? (
          <EnumBadge
            label={WORK_MODE_LABELS[opportunity.workMode]}
            icon={WORK_MODE_ICONS[opportunity.workMode]}
          />
        ) : null,
    },
    {
      key: "rhythm",
      header: LABELS.daysPerWeek,
      width: OPPORTUNITY_COLUMN_WIDTHS.rhythm,
      className: "text-muted-foreground",
      ...hideable(view, "rhythm"),
      cell: (opportunity) => formatRhythm(opportunity.daysPerWeek, opportunity.onSiteDays),
    },
    {
      key: "zone",
      header: LABELS.zone,
      width: OPPORTUNITY_COLUMN_WIDTHS.zone,
      ...hideable(view, "zone"),
      cell: (opportunity) =>
        opportunity.zone ? <Badge variant="secondary">{ZONE_LABELS[opportunity.zone]}</Badge> : null,
    },
    {
      key: "startMonth",
      header: LABELS.startMonth,
      width: OPPORTUNITY_COLUMN_WIDTHS.startMonth,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "startMonth"),
      sortValue: (opportunity) => opportunity.startMonth?.getTime() ?? 0,
      cell: (opportunity) => formatStartMonth(opportunity.startMonth),
    },
    {
      key: "duration",
      header: LABELS.durationMonths,
      width: OPPORTUNITY_COLUMN_WIDTHS.duration,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "duration"),
      sortValue: (opportunity) => opportunity.durationMonths ?? 0,
      cell: (opportunity) => formatDuration(opportunity.durationMonths),
    },
    {
      key: "notes",
      header: LABELS.notes,
      width: OPPORTUNITY_COLUMN_WIDTHS.notes,
      className: "text-muted-foreground",
      ...hideable(view, "notes"),
      cell: (opportunity) => <TruncatedCell value={opportunity.notes} />,
    },
  ]
}

// Arbitrage « bloc sans donnée » : un bloc dont aucun champ n'est renseigné disparaît.
function keepFilled(section: DetailSection): DetailSection[] {
  return section.rows.some((row) => row.value !== null && row.value !== undefined) ? [section] : []
}

function buildOpportunityDetail(opportunity: AdminOpportunity, onEdit: () => void): DetailContent {
  return {
    title: opportunity.title,
    subtitle: opportunity.role ?? undefined,
    status: (
      <Badge variant="outline" meta>
        {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
      </Badge>
    ),
    sections: [
      ...keepFilled({
        title: OPPORTUNITY_SECTION_TITLES.relations,
        rows: [
          {
            label: LABELS.referrerId,
            value: opportunity.referrer
              ? (() => {
                  // Un apporteur peut être lead, contact, les deux ou, perdu après la suppression de son seul rôle, ni l'un ni l'autre : personDetailHref (13) rend alors null : le nom reste en texte simple.
                  const href = personDetailHref(opportunity.referrer)
                  const name = personDisplayName(opportunity.referrer)
                  return (
                    <span className="flex flex-wrap items-center gap-2">
                      {href ? (
                        <Link href={href} className="hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <span>{name}</span>
                      )}
                      {opportunity.referrer.optedOutAt ? (
                        <Badge variant="outline">{OPTED_OUT_LABEL}</Badge>
                      ) : null}
                    </span>
                  )
                })()
              : null,
          },
          {
            label: LABELS.intermediaryId,
            value: opportunity.intermediary ? (
              <Link href={`/admin/entreprises?detail=${opportunity.intermediary.id}`} className="hover:underline">
                {opportunity.intermediary.name}
              </Link>
            ) : null,
          },
          {
            label: LABELS.clientId,
            value: opportunity.client ? (
              <Link href={`/admin/entreprises?detail=${opportunity.client.id}`} className="hover:underline">
                {opportunity.client.name}
              </Link>
            ) : null,
          },
        ],
      }),
      ...(opportunity.details
        ? [
            {
              title: OPPORTUNITY_SECTION_TITLES.details,
              rows: [
                {
                  value: <MarkdownContent markdown={opportunity.details} variant="admin" />,
                  fullWidth: true,
                },
              ],
            },
          ]
        : []),
      ...keepFilled({
        title: OPPORTUNITY_SECTION_TITLES.conditions,
        rows: [
          { label: LABELS.dailyRate, value: formatDailyRate(opportunity.dailyRate) },
          {
            label: LABELS.contract,
            value: opportunity.contract ? (
              <EnumBadge
                label={CONTRACT_STATUS_LABELS[opportunity.contract]}
                icon={CONTRACT_STATUS_ICONS[opportunity.contract]}
              />
            ) : null,
          },
          {
            label: LABELS.workMode,
            value: opportunity.workMode ? (
              <EnumBadge
                label={WORK_MODE_LABELS[opportunity.workMode]}
                icon={WORK_MODE_ICONS[opportunity.workMode]}
              />
            ) : null,
          },
          {
            label: LABELS.zone,
            value: opportunity.zone ? <Badge variant="secondary">{ZONE_LABELS[opportunity.zone]}</Badge> : null,
          },
          { label: LABELS.daysPerWeek, value: formatRhythm(opportunity.daysPerWeek, opportunity.onSiteDays) },
        ],
      }),
      ...keepFilled({
        title: OPPORTUNITY_SECTION_TITLES.calendar,
        rows: [
          { label: LABELS.startMonth, value: formatStartMonth(opportunity.startMonth) },
          { label: LABELS.durationMonths, value: formatDuration(opportunity.durationMonths) },
        ],
      }),
      ...(opportunity.notes
        ? [{ title: OPPORTUNITY_SECTION_TITLES.notes, rows: [{ value: opportunity.notes, fullWidth: true }] }]
        : []),
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminOpportunity>[] = [
  {
    key: "status",
    label: LABELS.status,
    options: OPPORTUNITY_STATUSES.map((status) => ({
      value: status,
      label: OPPORTUNITY_STATUS_LABELS[status],
    })),
    value: (opportunity) => opportunity.status,
  },
  {
    key: "contract",
    label: LABELS.contract,
    options: (Object.keys(CONTRACT_STATUS_LABELS) as ContractStatus[]).map((contract) => ({
      value: contract,
      label: CONTRACT_STATUS_LABELS[contract],
    })),
    value: (opportunity) => (opportunity.contract ? [opportunity.contract] : []),
  },
  {
    key: "workMode",
    label: LABELS.workMode,
    options: (Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((mode) => ({
      value: mode,
      label: WORK_MODE_LABELS[mode],
    })),
    value: (opportunity) => (opportunity.workMode ? [opportunity.workMode] : []),
  },
  {
    key: "zone",
    label: LABELS.zone,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (opportunity) => (opportunity.zone ? [opportunity.zone] : []),
  },
]

interface Props {
  opportunities: readonly AdminOpportunity[]
  view: OpportunityView
  initialDetailId?: string
}

export function OpportunitiesTable({ opportunities, view, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedOpportunity, setSelectedOpportunity] = useState<AdminOpportunity | null>(null)

  const viewOpportunities = useMemo(() => opportunitiesForView(opportunities, view), [opportunities, view])

  const columns = useMemo<readonly Column<AdminOpportunity>[]>(
    () => [
      ...buildDataColumns(view),
      {
        key: "actions",
        header: "Actions",
        width: OPPORTUNITY_COLUMN_WIDTHS.actions,
        align: "right",
        cell: (opportunity) => (
          <span className="inline-flex gap-0">
            <RowActionButton aria-label={`Modifier ${opportunity.title}`} asChild>
              <Link href={`/admin/opportunites/${opportunity.id}`}>
                <Pencil className="size-4" />
              </Link>
            </RowActionButton>
            <DeleteOpportunityDialog opportunity={opportunity} />
          </span>
        ),
      },
    ],
    [view],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedOpportunity
        ? buildOpportunityDetail(selectedOpportunity, () => {
            router.push(`/admin/opportunites/${selectedOpportunity.id}`)
          })
        : null,
    [selectedOpportunity, router],
  )

  return (
    <>
      <DataTable
        rows={viewOpportunities}
        columns={columns}
        getRowId={(opportunity) => opportunity.id}
        initialDetailId={initialDetailId}
        searchPlaceholder="Rechercher une opportunité, une ESN ou un client"
        noun="opportunité"
        onRowClick={setSelectedOpportunity}
        rowLabel={(opportunity) => opportunity.title}
        facets={facets}
        empty={{
          icon: Handshake,
          title: "Aucune opportunité",
          description: "Aucune opportunité dans cette vue. Créez-en une via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedOpportunity(null)
        }}
      />
    </>
  )
}
```

- [ ] **Step 2 : Coquille commune**

`src/components/features/admin/opportunities/OpportunitiesViewPage.tsx` :

```tsx
import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { OpportunitiesTable } from "@/components/features/admin/opportunities/OpportunitiesTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { opportunitySkeletonWidths } from "@/lib/admin-table-widths"
import { OPPORTUNITY_VIEW_PAGES, type OpportunityView } from "@/lib/opportunity-views"
import { findAllOpportunitiesForAdmin } from "@/server/queries/opportunities"

interface SectionProps {
  view: OpportunityView
  initialDetailId: string | undefined
}

async function OpportunitiesSection({ view, initialDetailId }: SectionProps) {
  const opportunities = await findAllOpportunitiesForAdmin()
  return <OpportunitiesTable opportunities={opportunities} view={view} initialDetailId={initialDetailId} />
}

interface Props {
  view: OpportunityView
  initialDetailId?: string
}

export function OpportunitiesViewPage({ view, initialDetailId }: Props) {
  const { title, subtitle } = OPPORTUNITY_VIEW_PAGES[view]

  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href="/admin/opportunites/nouvelle">
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle opportunité
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={opportunitySkeletonWidths(view)} />}>
        <OpportunitiesSection view={view} initialDetailId={initialDetailId} />
      </Suspense>
    </AdminPageShell>
  )
}
```

- [ ] **Step 3 : Les trois pages**

Chacune lit `searchParams.detail` (motif du `08`, `.claude/rules/nextjs/routing.md`) et le transmet en `initialDetailId`, pour ouvrir le détail d'une opportunité depuis la fiche d'un lead ou d'une entreprise.

`src/app/admin/(protected)/opportunites/page.tsx` :

```tsx
import { OpportunitiesViewPage } from "@/components/features/admin/opportunities/OpportunitiesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminOpportunitesPage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>
}) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <OpportunitiesViewPage view="en-cours" initialDetailId={detail} />
}
```

`src/app/admin/(protected)/opportunites/acceptees/page.tsx` :

```tsx
import { OpportunitiesViewPage } from "@/components/features/admin/opportunities/OpportunitiesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminOpportunitesAccepteesPage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>
}) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <OpportunitiesViewPage view="acceptees" initialDetailId={detail} />
}
```

`src/app/admin/(protected)/opportunites/toutes/page.tsx` :

```tsx
import { OpportunitiesViewPage } from "@/components/features/admin/opportunities/OpportunitiesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminOpportunitesToutesPage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>
}) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <OpportunitiesViewPage view="toutes" initialDetailId={detail} />
}
```

Chacun des trois dossiers reçoit un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 4 : Menu**

Dans `src/config/admin-nav-items.ts`, importer `Handshake` depuis `lucide-react` et insérer l'entrée après Revues hebdo, avant Entretiens :

```ts
      {
        label: "Opportunités",
        icon: Handshake,
        href: "/admin/opportunites",
        subItems: [
          { label: "En cours", href: "/admin/opportunites" },
          { label: "Acceptées", href: "/admin/opportunites/acceptees" },
          { label: "Toutes", href: "/admin/opportunites/toutes" },
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
- Modify: `src/app/admin/(protected)/entreprises/nouvelle/page.tsx`

**Interfaces:**
- Consumes: Task 3 ; `OPPORTUNITY_STATUS_LABELS` (`14`), `formatDailyRate` (Task 2) ; `RelatedLinksCard`, `RelatedLink`, prop `relatedCards` de `CompanyForm` (`08`)
- Produces: colonne et ligne « Clients finaux » de `CompaniesTable` ; card « Opportunités » transmise à `CompanyForm`

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

La vue Travaillées se lit déjà sur `company.worked` (`04`) : l'étendre aux opportunités acceptées (Task 3) suffit à y faire apparaître les entreprises concernées, sans autre changement.

- [ ] **Step 2 : Bloc Opportunités**

Toujours dans `CompaniesTable.tsx`, importer `OPPORTUNITY_STATUS_LABELS`, `formatDailyRate` depuis `@/lib/opportunities`, `RelatedLinksList` et `type RelatedLink` depuis `@/components/features/admin/RelatedLinksList` (le `08` les importe déjà pour le bloc Leads ; ne pas les redemander si déjà présents), ajouter avant `buildCompanyDetail` :

```tsx
// Une entreprise peut être l'ESN d'une opportunité et le client final d'une autre : chacune dit son rôle.
// Arbitrage « Fiches rattachées » : RelatedLinksList, chaque ligne menant à la vue détail de l'opportunité via ?detail=.
function opportunitiesSection(company: AdminCompany): DetailSection[] {
  const opportunities = [
    ...company.opportunitiesAsIntermediary.map((opportunity) => ({ opportunity, role: "ESN" })),
    ...company.opportunitiesAsClient.map((opportunity) => ({ opportunity, role: "Client final" })),
  ]
  if (opportunities.length === 0) return []
  return [
    {
      title: "Opportunités",
      rows: [
        {
          fullWidth: true,
          value: (
            <RelatedLinksList
              links={opportunities.map(
                ({ opportunity, role }): RelatedLink => ({
                  id: `${role}-${opportunity.id}`,
                  href: `/admin/opportunites/toutes?detail=${opportunity.id}`,
                  label: opportunity.title,
                  meta: `${OPPORTUNITY_STATUS_LABELS[opportunity.status]} · ${role}`,
                  ...(opportunity.dailyRate !== null
                    ? { trailing: formatDailyRate(opportunity.dailyRate) ?? undefined }
                    : {}),
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

et, dans `buildCompanyDetail`, insérer `...opportunitiesSection(company),` à la toute fin du tableau `sections`, juste après `...leadsSection(company),` (`08`) : Opportunités est le deuxième des trois blocs de fin de vue détail d'une entreprise (Leads `08`, Opportunités, Signaux `19`).

- [ ] **Step 3 : Refus de suppression**

Dans `DeleteCompanyDialog.tsx`, importer `companyLinksLabel` depuis `@/lib/companies` et remplacer le calcul et le texte du refus par :

```tsx
  const projectCount = company._count.clientMetas
  const opportunityCount = company._count.opportunitiesAsIntermediary + company._count.opportunitiesAsClient
  const links = companyLinksLabel(projectCount, opportunityCount)
```

```tsx
      denied={
        links ? `Cette entreprise est rattachée à ${links} et ne peut pas être supprimée.` : null
      }
```

et, dans `onDelete`, le texte de `company_in_use` par « Cette entreprise est rattachée à des projets ou des opportunités et ne peut pas être supprimée. »

- [ ] **Step 4 : Card Opportunités du formulaire entreprise**

L'entreprise lue par `findCompanyByIdForAdmin` porte déjà ses opportunités (Task 3). La card « Opportunités » (`RelatedLinksCard`, qui enveloppe un `RelatedLinksList`, `08`) rejoint, dans le fragment transmis à la prop `relatedCards` de `CompanyForm` (`03`), la card Leads ajoutée par le `08` : chaque ligne mène à la page de l'opportunité (page d'édition, arbitrage « cards des pages d'édition » de DESIGN.md), jamais à sa vue détail.

Dans `src/app/admin/(protected)/entreprises/[id]/page.tsx`, importer `OPPORTUNITY_STATUS_LABELS` et `formatDailyRate` depuis `@/lib/opportunities`, puis remplacer le fragment `relatedCards` passé à `CompanyForm` (`08`, card Leads seule) par :

```tsx
        relatedCards={
          <>
            <RelatedLinksCard
              title="Leads"
              links={leads.map(/* inchangé, 08 */ (lead): RelatedLink => ({
                id: lead.personId,
                href: `/admin/leads/${lead.personId}`,
                label: personDisplayName(lead.person),
                ...(lead.person.jobRole ? { meta: JOB_ROLE_LABELS[lead.person.jobRole] } : {}),
              }))}
              emptyText="Aucun lead dans cette entreprise."
            />
            <RelatedLinksCard
              title="Opportunités"
              links={[
                ...company.opportunitiesAsIntermediary.map(
                  (opportunity): RelatedLink => ({
                    id: `esn-${opportunity.id}`,
                    href: `/admin/opportunites/${opportunity.id}`,
                    label: opportunity.title,
                    meta: `${OPPORTUNITY_STATUS_LABELS[opportunity.status]} · ESN`,
                    trailing: formatDailyRate(opportunity.dailyRate),
                  }),
                ),
                ...company.opportunitiesAsClient.map(
                  (opportunity): RelatedLink => ({
                    id: `client-${opportunity.id}`,
                    href: `/admin/opportunites/${opportunity.id}`,
                    label: opportunity.title,
                    meta: `${OPPORTUNITY_STATUS_LABELS[opportunity.status]} · Client final`,
                    trailing: formatDailyRate(opportunity.dailyRate),
                  }),
                ),
              ]}
              emptyText="Aucune opportunité pour cette entreprise."
            />
          </>
        }
```

(la card Leads garde le code du `08`. Ni elle ni la card Opportunités ne portent de bouton de création : une opportunité se crée depuis sa liste, la création depuis une fiche n'étant pas décidée, 2026-10-02.)

Dans `src/app/admin/(protected)/entreprises/nouvelle/page.tsx`, ajouter la même card au fragment `relatedCards` (à côté de la card Leads vide du `08`), vide (`links={[]}`) :

```tsx
        relatedCards={
          <>
            <RelatedLinksCard title="Leads" links={[]} emptyText="Après l'enregistrement de l'entreprise." />
            <RelatedLinksCard
              title="Opportunités"
              links={[]}
              emptyText="Après l'enregistrement de l'entreprise."
            />
          </>
        }
```

- [ ] **Step 5 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 7 : Côté leads

**Files:**
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`
- Modify: `src/app/admin/(protected)/leads/[id]/page.tsx`
- Modify: `src/app/admin/(protected)/leads/nouveau/page.tsx`

**Interfaces:**
- Consumes: Task 1 ; `OPPORTUNITY_STATUS_LABELS` (`14`), `formatDailyRate` (Task 2) ; `RelatedLinksCard`, `RelatedLink`, prop `relatedCards` de `LeadForm` (`08`)
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

- [ ] **Step 2 : Opportunités apportées**

Importer `OPPORTUNITY_STATUS_LABELS` depuis `@/lib/opportunities`, `RelatedLinksList` et `type RelatedLink` depuis `@/components/features/admin/RelatedLinksList` (déjà importés par le `10` pour le bloc Historique ; ne pas les redemander si déjà présents), ajouter avant `buildLeadDetail` :

```tsx
// Arbitrage « Fiches rattachées » : RelatedLinksList, chaque ligne menant à la vue détail de l'opportunité via ?detail=.
function opportunitiesSection(lead: AdminLead): DetailSection[] {
  if (lead.opportunities.length === 0) return []
  return [
    {
      title: "Opportunités apportées",
      rows: [
        {
          fullWidth: true,
          value: (
            <RelatedLinksList
              links={lead.opportunities.map(
                (opportunity): RelatedLink => ({
                  id: opportunity.id,
                  href: `/admin/opportunites/toutes?detail=${opportunity.id}`,
                  label: opportunity.title,
                  meta: opportunity.client
                    ? `${OPPORTUNITY_STATUS_LABELS[opportunity.status]} · ${opportunity.client.name}`
                    : OPPORTUNITY_STATUS_LABELS[opportunity.status],
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

et insérer `...opportunitiesSection(lead),` juste après `...historySection(history, ranks),` (`10`) dans les deux branches de `buildLeadDetail` (fiche active et fiche en opposition : l'opportunité reste, `01`) : Opportunités apportées suit Réseau (`13`) et Actions (`10`), avant Entretiens (`17`) et Signaux (`19`).

- [ ] **Step 3 : Card Opportunités apportées du formulaire lead**

Le lead lu par `findLeadByIdForAdmin` porte ses opportunités (Task 1). La card « Opportunités apportées » (`RelatedLinksCard`, `08`) rejoint, dans le fragment transmis à la prop `relatedCards` de `LeadForm`, la card Actions du `10` : chaque ligne mène à la page de l'opportunité (page d'édition, arbitrage « cards des pages d'édition » de DESIGN.md).

Dans `src/app/admin/(protected)/leads/[id]/page.tsx`, importer `OPPORTUNITY_STATUS_LABELS`, `formatDailyRate`, `RelatedLinksCard`, `type RelatedLink` (`@/components/features/admin/RelatedLinksCard`), puis remplacer le fragment `relatedCards` passé à `LeadForm` (`10`, card Actions seule) par :

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
            />
          </>
        }
```

Dans `src/app/admin/(protected)/leads/nouveau/page.tsx`, ajouter la même card au fragment `relatedCards` (à côté de la card Actions vide du `10`), vide (`links={[]}`) :

```tsx
        relatedCards={
          <>
            <LeadActionsCard lead={null} actions={[]} />
            <RelatedLinksCard
              title="Opportunités apportées"
              links={[]}
              emptyText="Après l'enregistrement du lead."
            />
          </>
        }
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
Expected: l'entrée Opportunités, entre Revues hebdo et Entretiens, mène à « Opportunités en cours ». « Nouvelle opportunité » mène à `/admin/opportunites/nouvelle`, cards Opportunité, Relations, Détails, Conditions, Calendrier, Notes ; Détails pré-rempli (Contexte, Profil recherché, Contenu technique) ; le statut, le contrat et le mode de travail affichent leur glyphe dans leur liste ; la liste ESN ne propose que l'entreprise ESN ; une fois l'ESN choisie, la liste Client final ne la propose plus. Créer l'opportunité (lead, ESN, client, TJM 580, Freelance, Hybride, 4 j dont 2 sur site, avril 2026, 6 mois) : elle apparaît dans En cours, « 580 € », « 4 j dont 2 sur site », « avril 2026 ».

- [ ] **Step 2 : Mois et règles**

Rouvrir la page de l'opportunité (crayon de la ligne, ou « Modifier » de sa vue détail), ouvrir le champ Démarrage : le bouton affiche le mois choisi, le panneau une grille des douze mois sous l'année ; cliquer « Effacer », enregistrer sans démarrage, puis mettre 3 j de rythme et 4 j sur site.
Expected: le champ Démarrage revient à « Choisir un mois » après Effacer ; l'enregistrement sans démarrage passe ; « Pas plus de jours sur site que de jours travaillés » sous Jours sur site, la page gardant la saisie.

- [ ] **Step 3 : Acceptée et Deal**

Passer l'opportunité à Acceptée ; changer ensuite, dans Entreprises, le type de l'ESN pour Partenaire et rouvrir l'opportunité.
Expected: l'opportunité quitte En cours pour Acceptées ; le lead affiche « Deal » dans Leads > Tous et sort de En cours et Chauds ; le filtre Statut des leads propose « Deal ». L'ESN et le client final apparaissent désormais dans la vue Travaillées des entreprises. Le formulaire de l'opportunité affiche toujours l'ancienne ESN, que la liste ESN ne propose plus ; remettre ensuite son type ESN / Recrutement.

- [ ] **Step 4 : Fiches reliées**

Créer une seconde opportunité dont l'entreprise cliente de la première est l'ESN (lui ajouter le type ESN / Recrutement) ; ouvrir les vues détail du lead, de l'ESN et de cette entreprise.
Expected: le lead montre « Opportunités apportées » ; l'ESN montre l'opportunité (rôle ESN) et sa ligne « Clients finaux » contient le client de l'opportunité ; l'entreprise à double rôle liste une opportunité comme client final et l'autre comme ESN. Sur leurs pages, la card « Opportunités apportées » du lead et la card « Opportunités » des entreprises listent les mêmes opportunités (TJM en seconde ligne), chacune menant à sa page. Dans la vue détail d'une opportunité, l'apporteur, l'ESN et le client final sont cliquables vers leur fiche.

- [ ] **Step 5 : Suppressions et détail depuis une autre fiche**

Depuis la vue détail du lead (ligne cliquée dans Leads > Tous, pas sa page d'édition), cliquer la ligne d'une opportunité apportée dans le bloc Opportunités apportées : la liste Opportunités s'ouvre avec son détail (`?detail=<id>`). Depuis la page du lead, cliquer la même opportunité dans sa card : elle ouvre directement sa page d'édition. Tenter de supprimer l'ESN depuis Entreprises ; supprimer une opportunité ; passer le lead en « ne plus contacter ».
Expected: le détail de l'opportunité visée s'ouvre au chargement de la liste ; suppression de l'ESN désactivée, « rattachée à 1 opportunité » (ou « 2 opportunités ») ; l'opportunité supprimée disparaît, lead et entreprises restent ; l'opportunité du lead opposé reste et sa vue détail marque le lead « Ne plus contacter ». Puis `just stop`.
