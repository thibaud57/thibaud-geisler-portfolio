# Écran des leads : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'écran Leads de l'espace admin : cinq vues au menu, liste filtrable, page de création et de modification en cards avec Détails pré-rempli selon l'origine, vue détail, suppression et opposition RGPD en deux temps ; la vue Prospects des entreprises.

**Architecture:** Deux modules purs testés portent les règles : `src/lib/lead-views.ts` (appartenance et tri de chaque vue) et `src/lib/details-templates.ts` (gabarits et bascule selon l'origine). `LeadsTable` filtre en mémoire les leads de `findAllLeadsForAdmin` selon la vue, sur le motif de `CompaniesTable` ; `LeadForm` reprend le motif de `CompanyForm` (page en cards, `useActionState`, retour à la liste), sur les routes `/admin/leads/nouveau` et `/admin/leads/<id>`, avec une seule Server Action par écriture (`createLead`, `updateLead`) qui écrit la personne et le rôle ; cinq pages d'une ligne partagent `LeadsViewPage`. Deux dialogues séparés portent l'opposition RGPD (`OptOutPersonDialog`, `ErasePersonExchangesDialog`), tous deux sur la personne. `AdminCompany.isProspect`, calculé dans `findAllCompaniesForAdmin` depuis le rôle Lead, active la vue Prospects des entreprises.

**Tech Stack:** Next.js 16 App Router, React 19, shadcn/ui `radix-nova` (Card, AlertDialog, Checkbox, Select, Popover, Calendar, Command), Pages CMS Editor (ADR-024), date-fns `fr`, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/08-ecran-leads-design.md`

## Global Constraints

- **Prérequis** : plans `01` (rubrique « Demandes RGPD » de `docs/PRODUCTION.md`), `07` (modèles `Person`/`Lead`, actions `createLead` / `updateLead` / `deleteLead`, `optOutPerson` / `erasePersonExchanges` / `PersonLockedError`, `AdminLead`, `findAllLeadsForAdmin`, `findPersonsWithoutLeadRole`, `PersonOption`, `NONE_VALUE = "aucun"`, `LEAD_ORIGINS`, `LEAD_STATUSES`, `LEAD_INTERESTS`, `LEAD_CHANNELS`, `PERSON_FIELD_LABELS`, `personDisplayName`, libellés, `JOB_ROLES`) et `03` (éditeur `Editor` depuis `@/components/ui/editor`, `src/lib/details-templates.ts`) implémentés ; `ZONES`, `ZONE_LABELS` (`@/lib/zones`, plan `02`).
- **Vues et routes** : En cours `/admin/leads`, Chauds `/admin/leads/chauds`, À qualifier `/admin/leads/a-qualifier`, Stand-by `/admin/leads/stand-by`, Tous `/admin/leads/tous` ; création `/admin/leads/nouveau`, modification `/admin/leads/<id>`. Une fiche en opposition (`optedOutAt` non nul) n'entre que dans Tous et sa page de modification renvoie vers Tous.
- **Page ou modale** (arbitrages « Page ou modale d'édition » et « Élément rattaché à une fiche » de DESIGN.md) : le lead se crée et se modifie sur sa page, en cards Personne, Coordonnées, Détails, Pipeline, Notes ; la ligne ne porte que Modifier (lien vers la page) et Supprimer.
- **Règles des vues** : En cours = Nouveau, Suspect, Discussion ; Chauds = intérêt Hot hors Perdu, Hors ICP ; À qualifier = Nouveau ; Stand-by = Stand-by ; tri par date de rencontre (décroissant pour En cours et Chauds, croissant pour À qualifier et Stand-by), date absente en dernier ; Tous trié par nom, fiches en opposition en dernier. Ni RDV planifié ni Deal, jamais stockés (`07`), n'entrent dans ces filtres à ce stade.
- **Gabarits** : Outbound = `# 💡 Hypothèse / Angle` (Hypothèse de besoin, Angle de pitch, Objectif du contact) puis `# 🎯 Contexte` ; Inbound = `# 🎯 Contexte`. Appliqués à la création seulement ; un texte saisi n'est jamais écrasé.
- **Textes** : bouton « Nouveau lead » ; card Personne « Nouvelle personne » / « Personne existante », picker « Choisir une personne » ; suppression « Un lead perdu se garde plutôt avec le statut « Perdu ». Si cette personne n'est pas aussi un contact, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses missions restent sans apporteur. » ; opposition « Ne plus contacter « <nom> » ? » et « La fiche est vidée : seuls l'email, le lien LinkedIn et la date sont gardés, pour ne jamais recontacter cette personne. Ses actions et ses signaux restent dans son historique, sans être réutilisés, sauf si elle en demande l'effacement. Action irréversible. » ; case « La personne demande aussi l'effacement de nos échanges » ; badge « Ne plus contacter ».
- **Prospect** : entreprise non travaillée (`worked`) avec au moins une personne au rôle Lead, non opposée, au statut Nouveau, Suspect ou Discussion.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/react/hooks.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Page d'un lead en opposition ouverte par son adresse** : renvoyée vers Tous, jamais éditable. Vérifié à la Task 8, Step 5.
- **Gabarit réécrit par l'éditeur** : Tiptap peut normaliser le markdown du gabarit dès son affichage (espaces, puces) ; la comparaison ignore les espaces, mais une réécriture plus profonde bloquerait la bascule, ce qui laisse le texte en place (sens sûr). Vérifié à la Task 8, Step 3.
- **Liste qui ne se rafraîchit pas** : un lead créé doit apparaître au retour sur la liste sans recharger ; le `07` revalide `/admin/leads` en variante `layout`. Vérifié à la Task 8, Step 2.
- **Case d'effacement non cochée** : `OptOutPersonDialog` sans la case ne doit appeler que `optOutPerson`, jamais `erasePersonExchanges` derrière. Vérifié à la Task 8, Step 5.
- **Date de rencontre décalée d'un jour** : le champ caché passe par `toIsoDate` (heure locale), jamais `toISOString`. Vérifié à la Task 8, Step 2.

---

### Task 1 : Règles des vues

**Files:**
- Create: `src/lib/lead-views.ts`
- Test: `src/lib/lead-views.test.ts`

**Interfaces:**
- Consumes: types `LeadStatus`, `LeadInterest` (`@/generated/prisma/client`)
- Produces: `type LeadView = "en-cours" | "chauds" | "a-qualifier" | "stand-by" | "tous"` ; `LEAD_VIEWS: readonly LeadView[]` ; `leadsForView<T extends LeadViewRow>(leads: readonly T[], view: LeadView): T[]` ; `LEAD_VIEW_PAGES: Record<LeadView, { title: string; subtitle: string }>`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
import { describe, expect, it } from "vitest"

import type { LeadInterest, LeadStatus } from "@/generated/prisma/client"

import { LEAD_VIEWS, leadsForView } from "./lead-views"

const STATUSES: readonly LeadStatus[] = [
  "NOUVEAU",
  "SUSPECT",
  "DISCUSSION",
  "HORS_ICP",
  "PERDU",
  "STAND_BY",
]

interface TestLead {
  id: string
  status: LeadStatus
  interest: LeadInterest | null
  optedOutAt: Date | null
  metAt: Date | null
  name: string | null
}

function lead(overrides: Partial<TestLead> = {}): TestLead {
  return {
    id: "l1",
    status: "NOUVEAU",
    interest: null,
    optedOutAt: null,
    metAt: null,
    name: "Claire Morel",
    ...overrides,
  }
}

function idsOf(leads: readonly TestLead[]): string[] {
  return leads.map((row) => row.id)
}

describe("leadsForView", () => {
  it("keeps only new, suspect and discussion leads in the in-progress view", () => {
    const leads = STATUSES.map((status) => lead({ id: status, status }))

    const rows = leadsForView(leads, "en-cours")

    expect(idsOf(rows).sort()).toEqual(["DISCUSSION", "NOUVEAU", "SUSPECT"])
  })

  it("keeps hot leads outside lost and out-of-profile in the hot view", () => {
    const leads = [
      ...(["PERDU", "HORS_ICP", "DISCUSSION"] as const).map((status) =>
        lead({ id: `hot-${status}`, status, interest: "HOT" }),
      ),
      lead({ id: "warm-DISCUSSION", status: "DISCUSSION", interest: "WARM" }),
    ]

    const rows = leadsForView(leads, "chauds")

    expect(idsOf(rows)).toEqual(["hot-DISCUSSION"])
  })

  it("keeps opted-out leads out of every view but all", () => {
    const optedOut = lead({
      id: "opted-out",
      status: "NOUVEAU",
      interest: "HOT",
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
      name: null,
    })
    const standBy = lead({ id: "opted-out-stand-by", status: "STAND_BY", optedOutAt: new Date() })

    const visibleIn = LEAD_VIEWS.filter(
      (view) => leadsForView([optedOut, standBy], view).length > 0,
    )

    expect(visibleIn).toEqual(["tous"])
  })

  it("sorts leads without a meeting date last, whatever the direction", () => {
    const leads = [
      lead({ id: "january", metAt: new Date(2026, 0, 10) }),
      lead({ id: "none", metAt: null }),
      lead({ id: "march", metAt: new Date(2026, 2, 10) }),
    ]

    const newestFirst = leadsForView(leads, "en-cours")
    const oldestFirst = leadsForView(leads, "a-qualifier")

    expect(idsOf(newestFirst)).toEqual(["march", "january", "none"])
    expect(idsOf(oldestFirst)).toEqual(["january", "march", "none"])
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/lead-views.test.ts`
Expected: FAIL, module `./lead-views` introuvable.

- [ ] **Step 3 : Écrire les règles**

```ts
import type { LeadInterest, LeadStatus } from "@/generated/prisma/client"

export type LeadView = "en-cours" | "chauds" | "a-qualifier" | "stand-by" | "tous"

export const LEAD_VIEWS: readonly LeadView[] = ["en-cours", "chauds", "a-qualifier", "stand-by", "tous"]

export interface LeadViewRow {
  status: LeadStatus
  interest: LeadInterest | null
  optedOutAt: Date | null
  metAt: Date | null
  name: string | null
}

const IN_PROGRESS: ReadonlySet<LeadStatus> = new Set(["NOUVEAU", "SUSPECT", "DISCUSSION"])
// RDV planifié et Deal, jamais stockés, n'entrent pas dans ce filtre : ce sont l'entretien planifié à venir et la mission acceptée, pas un statut de lead.
const CLOSED: ReadonlySet<LeadStatus> = new Set(["PERDU", "HORS_ICP"])

// Une fiche en opposition n'a plus rien à faire dans une vue de travail : seul Tous la montre, pour la retrouver et la supprimer à l'échéance de conservation.
const VIEW_FILTERS: Record<LeadView, (lead: LeadViewRow) => boolean> = {
  "en-cours": (lead) => !lead.optedOutAt && IN_PROGRESS.has(lead.status),
  chauds: (lead) => !lead.optedOutAt && lead.interest === "HOT" && !CLOSED.has(lead.status),
  "a-qualifier": (lead) => !lead.optedOutAt && lead.status === "NOUVEAU",
  "stand-by": (lead) => !lead.optedOutAt && lead.status === "STAND_BY",
  tous: () => true,
}

// Date absente en dernier dans les deux sens : un lead jamais rencontré n'est ni le plus récent ni le plus ancien.
function byMetAt(direction: 1 | -1) {
  return (a: LeadViewRow, b: LeadViewRow): number => {
    if (!a.metAt || !b.metAt) return a.metAt ? -1 : b.metAt ? 1 : 0
    return direction * (a.metAt.getTime() - b.metAt.getTime())
  }
}

function byName(a: LeadViewRow, b: LeadViewRow): number {
  if (a.name === null || b.name === null) return a.name !== null ? -1 : b.name !== null ? 1 : 0
  return a.name.localeCompare(b.name, "fr")
}

const VIEW_SORTS: Record<LeadView, (a: LeadViewRow, b: LeadViewRow) => number> = {
  "en-cours": byMetAt(-1),
  chauds: byMetAt(-1),
  "a-qualifier": byMetAt(1),
  "stand-by": byMetAt(1),
  tous: byName,
}

// L'ordre rendu ici est l'ordre d'affichage par défaut : DataTable garde celui des lignes reçues tant qu'aucune colonne n'est triée.
export function leadsForView<T extends LeadViewRow>(leads: readonly T[], view: LeadView): T[] {
  return leads.filter(VIEW_FILTERS[view]).sort(VIEW_SORTS[view])
}

export const LEAD_VIEW_PAGES: Record<LeadView, { title: string; subtitle: string }> = {
  "en-cours": {
    title: "Leads en cours",
    subtitle: "Pipeline actif : Nouveau, Suspect, Discussion. Plus récents en premier.",
  },
  chauds: {
    title: "Leads chauds",
    subtitle: "Intérêt fort dans le pipeline actif. Priorité commerciale maximale.",
  },
  "a-qualifier": {
    title: "Leads à qualifier",
    subtitle: "Créés sans qualification, à requalifier. Les plus anciens d'abord.",
  },
  "stand-by": {
    title: "Leads en stand-by",
    subtitle: "Parqués en sommeil, à réanimer hors séquence dans 2 à 6 mois avec un angle nouveau.",
  },
  tous: {
    title: "Tous les leads",
    subtitle: "Sans filtre, fiches « Ne plus contacter » comprises, triés par nom.",
  },
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/lead-views.test.ts`
Expected: PASS.

---

### Task 2 : Gabarits de Détails selon l'origine

**Files:**
- Modify: `src/lib/details-templates.ts`
- Test: `src/lib/details-templates.test.ts`

**Interfaces:**
- Consumes: `COMPANY_DETAILS_TEMPLATE` déjà présent (plan `03`) ; type `LeadOrigin`
- Produces: `LEAD_OUTBOUND_DETAILS_TEMPLATE`, `LEAD_INBOUND_DETAILS_TEMPLATE`, `leadDetailsTemplate(origin: LeadOrigin | ""): string`, `detailsAfterOriginChange(details: string, previousOrigin: LeadOrigin | "", nextOrigin: LeadOrigin | ""): string`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
import { describe, expect, it } from "vitest"

import {
  detailsAfterOriginChange,
  LEAD_INBOUND_DETAILS_TEMPLATE,
  LEAD_OUTBOUND_DETAILS_TEMPLATE,
  leadDetailsTemplate,
} from "./details-templates"

describe("leadDetailsTemplate", () => {
  it("gives the outbound template the hypothesis and context sections", () => {
    const template = leadDetailsTemplate("OUTBOUND")

    expect(template).toContain("# 💡 Hypothèse / Angle")
    expect(template).toContain("# 🎯 Contexte")
    expect(template).not.toContain("Signal")
  })

  it("gives the inbound template the context section only", () => {
    const template = leadDetailsTemplate("INBOUND")

    expect(template).toBe("# 🎯 Contexte\n")
  })
})

describe("detailsAfterOriginChange", () => {
  it("swaps the template when the origin changes before anything is written", () => {
    const fromNothing = detailsAfterOriginChange("", "", "OUTBOUND")
    const fromUntouched = detailsAfterOriginChange(LEAD_OUTBOUND_DETAILS_TEMPLATE, "OUTBOUND", "INBOUND")
    const fromReformatted = detailsAfterOriginChange(
      `${LEAD_OUTBOUND_DETAILS_TEMPLATE.replaceAll("\n\n", "\n")}\n`,
      "OUTBOUND",
      "INBOUND",
    )

    expect(fromNothing).toBe(LEAD_OUTBOUND_DETAILS_TEMPLATE)
    expect(fromUntouched).toBe(LEAD_INBOUND_DETAILS_TEMPLATE)
    expect(fromReformatted).toBe(LEAD_INBOUND_DETAILS_TEMPLATE)
  })

  it("keeps written details when the origin changes", () => {
    const written = "# 🎯 Contexte\n\nRencontré au salon IA de Luxembourg."

    const details = detailsAfterOriginChange(written, "INBOUND", "OUTBOUND")

    expect(details).toBe(written)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: FAIL, exports absents.

- [ ] **Step 3 : Ajouter les gabarits des leads**

À la fin de `src/lib/details-templates.ts` (le type s'importe en tête du fichier) :

```ts
import type { LeadOrigin } from "@/generated/prisma/client"
```

```ts
// Le signal qui déclenche une prospection et la mission proposée par un inbound ont chacun leur propre modèle : il ne reste ici que le texte d'analyse.
export const LEAD_OUTBOUND_DETAILS_TEMPLATE = `# 💡 Hypothèse / Angle

- **Hypothèse de besoin** :
- **Angle de pitch** :
- **Objectif du contact** :

# 🎯 Contexte
`

export const LEAD_INBOUND_DETAILS_TEMPLATE = `# 🎯 Contexte
`

const LEAD_DETAILS_TEMPLATES: Record<LeadOrigin, string> = {
  INBOUND: LEAD_INBOUND_DETAILS_TEMPLATE,
  OUTBOUND: LEAD_OUTBOUND_DETAILS_TEMPLATE,
}

export function leadDetailsTemplate(origin: LeadOrigin | ""): string {
  return origin === "" ? "" : LEAD_DETAILS_TEMPLATES[origin]
}

// L'éditeur peut réécrire les espaces du gabarit dès son affichage : la comparaison les ignore.
function sameText(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim()
}

// Un texte saisi n'est jamais écrasé : seul un Détails vide, ou resté tel que le gabarit de l'origine précédente l'a posé, suit le changement d'origine.
export function detailsAfterOriginChange(
  details: string,
  previousOrigin: LeadOrigin | "",
  nextOrigin: LeadOrigin | "",
): string {
  const untouched = details.trim() === "" || sameText(details, leadDetailsTemplate(previousOrigin))
  return untouched ? leadDetailsTemplate(nextOrigin) : details
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: PASS.

---

### Task 3 : Largeurs, titres, options d'entreprise et détail sans édition

**Files:**
- Modify: `src/lib/admin-table-widths.ts`
- Modify: `src/lib/leads.ts`
- Modify: `src/lib/persons.ts`
- Modify: `src/server/queries/companies.ts`
- Modify: `src/components/features/admin/DetailDialog.tsx`

**Interfaces:**
- Consumes: `LeadView` (Task 1) ; `PERSON_FIELD_LABELS`, `personDisplayName` (`07`, `@/lib/persons`)
- Produces: `LEAD_COLUMN_WIDTHS`, `LeadColumnKey`, `LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<LeadView, readonly LeadColumnKey[]>`, `leadSkeletonWidths(view: LeadView): readonly number[]` ; `LEAD_SECTION_TITLES` (`@/lib/leads`), `PERSON_SECTION_TITLES` (`@/lib/persons`) ; `findCompanyOptions()`, `type CompanyOption = { id: string; name: string }` (repris tel quel par `16`, `17`) ; `DetailContent.onEdit` facultatif

- [ ] **Step 1 : Largeurs et colonnes par vue**

À la fin de `src/lib/admin-table-widths.ts` :

```ts
import type { LeadView } from "@/lib/lead-views"
```

(l'import va en tête du fichier)

```ts
export const LEAD_COLUMN_WIDTHS = {
  // Une colonne triable tient son en-tête sur une ligne : libellé, icône de tri et marges du bouton dictent sa largeur.
  name: 200,
  status: 130,
  interest: 104,
  score: 90,
  origin: 110,
  channel: 130,
  metAt: 160,
  jobRole: 140,
  company: 180,
  zone: 140,
  linkedinUrl: 170,
  email: 200,
  phone: 140,
  notes: 220,
  actions: 88,
} as const

export type LeadColumnKey = keyof typeof LEAD_COLUMN_WIDTHS

// Colonnes de la maquette par vue, sans Stack (retirée des leads), plus Poste ; Tous les montre toutes.
export const LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<LeadView, readonly LeadColumnKey[]> = {
  "en-cours": [
    "status",
    "interest",
    "score",
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "company",
    "zone",
    "linkedinUrl",
    "email",
    "phone",
    "notes",
  ],
  chauds: [
    "status",
    "score",
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "company",
    "zone",
    "linkedinUrl",
    "email",
    "phone",
    "notes",
  ],
  "a-qualifier": [
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "company",
    "zone",
    "linkedinUrl",
    "email",
    "phone",
    "notes",
  ],
  "stand-by": ["interest", "score", "origin", "channel", "metAt", "jobRole", "company", "zone", "notes"],
  tous: [
    "status",
    "interest",
    "score",
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "company",
    "zone",
    "linkedinUrl",
    "email",
    "phone",
    "notes",
  ],
}

export function leadSkeletonWidths(view: LeadView): readonly number[] {
  const keys: readonly LeadColumnKey[] = [
    "name",
    ...LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
    "actions",
  ]
  return keys.map((key) => LEAD_COLUMN_WIDTHS[key])
}
```

- [ ] **Step 2 : Titres des blocs**

À la fin de `src/lib/leads.ts` :

```ts
export const LEAD_SECTION_TITLES = {
  pipeline: "Pipeline",
} as const
```

À la fin de `src/lib/persons.ts` (créé par le `07`) :

```ts
// Titres des blocs communs à toute personne, quel que soit son rôle.
export const PERSON_SECTION_TITLES = {
  person: "Personne",
  contact: "Coordonnées",
  notes: "Notes",
  details: "Détails",
  optOut: "Opposition",
} as const
```

- [ ] **Step 3 : Options d'entreprise du formulaire**

À la fin de `src/server/queries/companies.ts` :

```ts
// Forme minimale : un identifiant et un nom, repris tel quel par les autres pickers d'entreprise.
export async function findCompanyOptions() {
  return prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export type CompanyOption = Awaited<ReturnType<typeof findCompanyOptions>>[number]
```

- [ ] **Step 4 : Détail sans bouton « Modifier »**

Dans `src/components/features/admin/DetailDialog.tsx`, dans `interface DetailContent`, remplacer :

```tsx
  // Navigation (Entreprises, Projets) ou ouverture d'une autre modale (Tags) : au composant de
  // rester ignorant du cas, il se contente d'appeler ce callback après sa propre fermeture.
  onEdit: () => void
```

par :

```tsx
  // Navigation ou ouverture d'une autre modale : au composant de rester ignorant du cas, il appelle ce callback après sa fermeture ; absent pour une fiche qui ne se modifie plus, le pied n'offre alors que « Fermer ».
  onEdit?: () => void
```

et, dans le pied, remplacer le bouton « Modifier » par :

```tsx
          {shown.onEdit ? (
            <Button type="button" onClick={handleEdit}>
              <Pencil aria-hidden data-icon="inline-start" />
              Modifier
            </Button>
          ) : null}
```

(`handleEdit` teste déjà la présence du callback.)

- [ ] **Step 5 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Page du lead et opposition RGPD

**Files:**
- Create: `src/components/features/admin/persons/OptOutPersonDialog.tsx`
- Create: `src/components/features/admin/SelectField.tsx`
- Create: `src/components/features/admin/ReadOnlyField.tsx`
- Create: `src/components/features/admin/leads/LeadForm.tsx`
- Create: `src/app/admin/(protected)/leads/nouveau/page.tsx` et `loading.tsx`
- Create: `src/app/admin/(protected)/leads/[id]/page.tsx` et `loading.tsx`

**Interfaces:**
- Consumes: Tasks 2 et 3 ; `OptionalDateField` (`05`, `@/components/features/admin/OptionalDateField`) ; `createLead`, `updateLead`, `initialLeadFormState`, `findLeadByIdForAdmin` (`07`) ; `optOutPerson`, `erasePersonExchanges` (`07`, `@/server/actions/persons`) ; `findPersonsWithoutLeadRole`, `PersonWithoutLeadRole` (`07`, `@/server/queries/persons`) ; `personDisplayName`, `PERSON_FIELD_LABELS`, `PERSON_SECTION_TITLES` (`07`/Task 3, `@/lib/persons`) ; `Editor` (`03`) ; `ComboboxPopover`, `FormField`, `AdminBreadcrumb`, `StackedSkeleton`, `Card`, `Checkbox` ; `formatShortDate`, `toIsoDate` (`@/lib/projects`)
- Produces: `LeadForm({ lead, companyOptions, personOptions }: { lead: AdminLead | null; companyOptions: readonly CompanyOption[]; personOptions: readonly PersonWithoutLeadRole[] })` ; `OptOutTarget`, `OptOutPersonDialog({ person, onDone }: { person: OptOutTarget; onDone: () => void })` ; `SelectField`, `OptionalDateField`, `ReadOnlyField` (`@/components/features/admin/`) ; routes `/admin/leads/nouveau` et `/admin/leads/<id>`, où les sub-projects suivants ajoutent leurs cards sous le formulaire

- [ ] **Step 1 : Confirmation « ne plus contacter », avec l'effacement en option**

`src/components/features/admin/persons/OptOutPersonDialog.tsx` :

```tsx
"use client"

import { useState, useTransition, type MouseEvent } from "react"
import { TriangleAlert, UserX } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

import { personDisplayName } from "@/lib/persons"
import { erasePersonExchanges, optOutPerson } from "@/server/actions/persons"

// Forme commune au lead et au contact : la même que celle attendue par `personDisplayName`. `AdminLead` et `AdminContact` en portent chacun un sur-ensemble.
export interface OptOutTarget {
  id: string
  name: string | null
  email: string | null
  linkedinUrl: string | null
}

interface Props {
  person: OptOutTarget
  onDone: () => void
}

export function OptOutPersonDialog({ person, onDone }: Props) {
  const [open, setOpen] = useState(false)
  const [eraseToo, setEraseToo] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setEraseToo(false)
  }

  // AlertDialogAction referme la modale d'office : preventDefault pour ne la fermer qu'une fois le résultat connu.
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await optOutPerson(person.id)
      if (result.ok && eraseToo) {
        await erasePersonExchanges(person.id)
      }
      setOpen(false)
      if (result.ok) {
        toast.success("Personne passée en « ne plus contacter »")
        onDone()
      } else {
        toast.error("Une erreur est survenue, réessayez")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-destructive">
          <UserX aria-hidden data-icon="inline-start" />
          Ne plus contacter
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="size-8 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Ne plus contacter « {personDisplayName(person)} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            La fiche est vidée : seuls l&apos;email, le lien LinkedIn et la date sont gardés, pour
            ne jamais recontacter cette personne. Ses actions et ses signaux restent dans son
            historique, sans être réutilisés, sauf si elle en demande l&apos;effacement. Action
            irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={eraseToo} onCheckedChange={(checked) => setEraseToo(checked === true)} />
          <span>La personne demande aussi l&apos;effacement de nos échanges</span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? "Enregistrement..." : "Ne plus contacter"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2 : Champs partagés du formulaire**

Deux champs, communs à `LeadForm` et à `ContactForm` (`13`) : extraits ici, au premier plan qui en a besoin, pour que `13`, `15`, `17`, `18` et `19` les importent plutôt que d'en dupliquer une copie locale. Le troisième, `OptionalDateField`, existe depuis le `05`.

`src/components/features/admin/SelectField.tsx` :

```tsx
"use client"

import { FormField } from "@/components/ui/form-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NONE_VALUE } from "@/lib/schemas/person"

interface Props {
  id: string
  name: string
  label: string
  options: readonly string[]
  labels: Readonly<Record<string, string>>
  defaultValue: string
  errors: string[] | undefined
  // Champ facultatif : cette option envoie la sentinelle, que le schéma traduit en null.
  noneLabel?: string
}

export function SelectField({ id, name, label, options, labels, defaultValue, errors, noneLabel }: Props) {
  return (
    <FormField id={id} label={label} errors={errors}>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={!!errors?.length}
          aria-describedby={`${id}-error`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {noneLabel ? <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}
```

`src/components/features/admin/ReadOnlyField.tsx` (une personne existante choisie se lit, jamais ne s'édite : la valeur réelle voyage par un champ caché) :

```tsx
import { FormField } from "@/components/ui/form-field"

interface Props {
  id: string
  label: string
  name: string
  value: string
  display: string
}

export function ReadOnlyField({ id, label, name, value, display }: Props) {
  return (
    <FormField id={id} label={label} errors={undefined}>
      <p
        id={id}
        className="flex h-9 items-center truncate rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
      >
        {display}
      </p>
      <input type="hidden" name={name} value={value} />
    </FormField>
  )
}
```

- [ ] **Step 3 : Formulaire en cards**

`src/components/features/admin/leads/LeadForm.tsx`, sur le motif de `CompanyForm` (en-tête titre et boutons, deux colonnes de cards, retour à la liste après enregistrement) ; les cards reprennent les blocs de la vue détail :

```tsx
"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { OptionalDateField } from "@/components/features/admin/OptionalDateField"
import { OptOutPersonDialog } from "@/components/features/admin/persons/OptOutPersonDialog"
import { ReadOnlyField } from "@/components/features/admin/ReadOnlyField"
import { SelectField } from "@/components/features/admin/SelectField"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"

import type { LeadOrigin } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { detailsAfterOriginChange } from "@/lib/details-templates"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import {
  LEAD_CHANNEL_LABELS,
  LEAD_FIELD_LABELS,
  LEAD_INTEREST_LABELS,
  LEAD_ORIGIN_LABELS,
  LEAD_SECTION_TITLES,
  LEAD_STATUS_LABELS,
} from "@/lib/leads"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/persons"
import { formatShortDate, toIsoDate } from "@/lib/projects"
import { LEAD_CHANNELS, LEAD_INTERESTS, LEAD_ORIGINS, LEAD_STATUSES } from "@/lib/schemas/lead"
import { NONE_VALUE } from "@/lib/schemas/person"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import { createLead, updateLead } from "@/server/actions/leads"
import { initialLeadFormState } from "@/server/actions/leads.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminLead } from "@/server/queries/leads"
import type { PersonWithoutLeadRole } from "@/server/queries/persons"

const LEADS_PATH = "/admin/leads"

interface Props {
  lead: AdminLead | null
  companyOptions: readonly CompanyOption[]
  personOptions: readonly PersonWithoutLeadRole[]
}

export function LeadForm({ lead, companyOptions, personOptions }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = lead ? updateLead.bind(null, lead.id) : createLead
  const [state, formAction, pending] = useActionState(action, initialLeadFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  const [origin, setOrigin] = useState<LeadOrigin | "">(lead?.origin ?? "")
  const [details, setDetails] = useState(lead?.details ?? "")
  // Rien ne garantit que l'éditeur relise `value` après son montage : une nouvelle clé le remonte sur le gabarit posé par un changement d'origine.
  const [editorKey, setEditorKey] = useState(0)
  const [companyId, setCompanyId] = useState(lead?.company?.id ?? NONE_VALUE)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [metAt, setMetAt] = useState<Date | undefined>(lead?.metAt ?? undefined)

  // Card Personne, à la création seulement : une personne au rôle Contact rencontrée en entretien peut devenir aussi prospect sans être recréée.
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [personId, setPersonId] = useState("")
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const selectedPerson = personOptions.find((person) => person.id === personId) ?? null
  // Personne existante choisie : le reste du formulaire se remplit depuis elle, en lecture.
  const readOnly = mode === "existing" && selectedPerson !== null
  const source = selectedPerson ?? lead

  const selectedCompany = companyOptions.find((company) => company.id === companyId) ?? null

  useEffect(() => {
    if (state.ok === true) {
      toast.success(lead ? "Lead mis à jour" : "Lead créé")
      router.push(LEADS_PATH)
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    } else if (state.ok === false && state.message === "lead_opted_out_locked") {
      toast.error("Cette personne s'est opposée à la prospection : sa fiche ne se modifie plus")
    }
  }, [state, lead, router])

  function handleOriginChange(next: string) {
    const nextOrigin = next as LeadOrigin
    if (!lead) {
      const nextDetails = detailsAfterOriginChange(details, origin, nextOrigin)
      if (nextDetails !== details) {
        setDetails(nextDetails)
        setEditorKey((key) => key + 1)
      }
    }
    setOrigin(nextOrigin)
  }

  function handleModeChange(next: "new" | "existing") {
    setMode(next)
    if (next === "new") setPersonId("")
  }

  function handlePersonSelect(person: PersonWithoutLeadRole) {
    setPersonId(person.id)
    setPersonPickerOpen(false)
    setCompanyId(person.company?.id ?? NONE_VALUE)
    setMetAt(person.metAt ?? undefined)
    setDetails(person.details ?? "")
    setEditorKey((key) => key + 1)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {lead ? personDisplayName(lead) : "Nouveau lead"}
        </h1>
        <div className="flex flex-wrap gap-2">
          {lead ? (
            <OptOutPersonDialog
              person={lead}
              onDone={() => {
                // La fiche vidée ne vit plus que dans Tous.
                router.push("/admin/leads/tous")
              }}
            />
          ) : null}
          <Button type="button" variant="ghost" asChild>
            <Link href={LEADS_PATH}>Annuler</Link>
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
              <CardTitle>{PERSON_SECTION_TITLES.person}</CardTitle>
              <CardDescription>
                {mode === "new"
                  ? "L'entreprise vient du CRM."
                  : "Le reste de sa fiche vient de la personne choisie, rien n'est recopié."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!lead ? (
                <RadioGroup
                  value={mode}
                  onValueChange={(value) => handleModeChange(value as "new" | "existing")}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id={`${formId}-mode-new`} value="new" />
                    <Label htmlFor={`${formId}-mode-new`}>Nouvelle personne</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id={`${formId}-mode-existing`} value="existing" />
                    <Label htmlFor={`${formId}-mode-existing`}>Personne existante</Label>
                  </div>
                </RadioGroup>
              ) : null}

              {mode === "existing" ? (
                <FormField id={`${formId}-personId`} label="Personne" errors={state.errors.personId}>
                  <ComboboxPopover
                    id={`${formId}-personId`}
                    open={personPickerOpen}
                    onOpenChange={setPersonPickerOpen}
                    triggerContent={
                      selectedPerson ? (
                        <span className="truncate">
                          {personDisplayName(selectedPerson)}
                          {selectedPerson.company ? ` · ${selectedPerson.company.name}` : ""}
                        </span>
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
                          keywords={[personDisplayName(person)]}
                          data-checked={personId === person.id}
                          onSelect={() => handlePersonSelect(person)}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate">
                              {personDisplayName(person)}
                              {person.company ? ` · ${person.company.name}` : ""}
                            </span>
                            {person.hasContactRole ? <Badge variant="outline">Contact</Badge> : null}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </ComboboxPopover>
                  <input type="hidden" name="personId" value={personId} />
                </FormField>
              ) : (
                <input type="hidden" name="personId" value={NONE_VALUE} />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {readOnly ? (
                  <ReadOnlyField
                    id={`${formId}-name`}
                    name="name"
                    label={PERSON_FIELD_LABELS.name}
                    value={source?.name ?? ""}
                    display={source?.name ?? ""}
                  />
                ) : (
                  <FormField id={`${formId}-name`} label={PERSON_FIELD_LABELS.name} errors={state.errors.name}>
                    <Input
                      id={`${formId}-name`}
                      name="name"
                      defaultValue={source?.name ?? ""}
                      placeholder="Claire Morel"
                      aria-invalid={!!state.errors.name?.length}
                      aria-describedby={`${formId}-name-error`}
                    />
                  </FormField>
                )}

                {readOnly ? (
                  <ReadOnlyField
                    id={`${formId}-jobRole`}
                    name="jobRole"
                    label={PERSON_FIELD_LABELS.jobRole}
                    value={source?.jobRole ?? NONE_VALUE}
                    display={source?.jobRole ? JOB_ROLE_LABELS[source.jobRole] : "Non renseigné"}
                  />
                ) : (
                  <SelectField
                    id={`${formId}-jobRole`}
                    name="jobRole"
                    label={PERSON_FIELD_LABELS.jobRole}
                    options={JOB_ROLES}
                    labels={JOB_ROLE_LABELS}
                    defaultValue={source?.jobRole ?? NONE_VALUE}
                    errors={state.errors.jobRole}
                    noneLabel="Non renseigné"
                  />
                )}

                <div className="sm:col-span-2">
                  {readOnly ? (
                    <ReadOnlyField
                      id={`${formId}-companyId`}
                      name="companyId"
                      label={PERSON_FIELD_LABELS.companyId}
                      value={companyId}
                      display={selectedCompany?.name ?? "Aucune"}
                    />
                  ) : (
                    <FormField
                      id={`${formId}-companyId`}
                      label={PERSON_FIELD_LABELS.companyId}
                      errors={state.errors.companyId}
                    >
                      <ComboboxPopover
                        id={`${formId}-companyId`}
                        open={companyOpen}
                        onOpenChange={setCompanyOpen}
                        triggerContent={
                          selectedCompany ? (
                            <span className="truncate">{selectedCompany.name}</span>
                          ) : (
                            <span className="text-muted-foreground">Aucune</span>
                          )
                        }
                        ariaInvalid={!!state.errors.companyId?.length}
                        ariaDescribedby={`${formId}-companyId-error`}
                        searchPlaceholder="Chercher une entreprise"
                        emptyMessage="Aucune entreprise ne correspond."
                      >
                        <CommandGroup>
                          <CommandItem
                            value={NONE_VALUE}
                            keywords={["Aucune"]}
                            data-checked={companyId === NONE_VALUE}
                            onSelect={() => {
                              setCompanyId(NONE_VALUE)
                              setCompanyOpen(false)
                            }}
                          >
                            Aucune
                          </CommandItem>
                          {companyOptions.map((company) => (
                            <CommandItem
                              key={company.id}
                              value={company.id}
                              keywords={[company.name]}
                              data-checked={companyId === company.id}
                              onSelect={() => {
                                setCompanyId(company.id)
                                setCompanyOpen(false)
                              }}
                            >
                              {company.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </ComboboxPopover>
                      <input type="hidden" name="companyId" value={companyId} />
                    </FormField>
                  )}
                </div>

                {readOnly ? (
                  <ReadOnlyField
                    id={`${formId}-zone`}
                    name="zone"
                    label={PERSON_FIELD_LABELS.zone}
                    value={source?.zone ?? NONE_VALUE}
                    display={source?.zone ? ZONE_LABELS[source.zone] : "Non renseignée"}
                  />
                ) : (
                  <SelectField
                    id={`${formId}-zone`}
                    name="zone"
                    label={PERSON_FIELD_LABELS.zone}
                    options={ZONES}
                    labels={ZONE_LABELS}
                    defaultValue={source?.zone ?? NONE_VALUE}
                    errors={state.errors.zone}
                    noneLabel="Non renseignée"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PERSON_SECTION_TITLES.contact}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {readOnly ? (
                <ReadOnlyField
                  id={`${formId}-email`}
                  name="email"
                  label={PERSON_FIELD_LABELS.email}
                  value={source?.email ?? ""}
                  display={source?.email ?? ""}
                />
              ) : (
                <FormField id={`${formId}-email`} label={PERSON_FIELD_LABELS.email} errors={state.errors.email}>
                  <Input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    defaultValue={source?.email ?? ""}
                    placeholder="prenom@entreprise.com"
                    aria-invalid={!!state.errors.email?.length}
                    aria-describedby={`${formId}-email-error`}
                  />
                </FormField>
              )}

              {readOnly ? (
                <ReadOnlyField
                  id={`${formId}-phone`}
                  name="phone"
                  label={PERSON_FIELD_LABELS.phone}
                  value={source?.phone ?? ""}
                  display={source?.phone ?? ""}
                />
              ) : (
                <FormField id={`${formId}-phone`} label={PERSON_FIELD_LABELS.phone} errors={state.errors.phone}>
                  <Input
                    id={`${formId}-phone`}
                    name="phone"
                    type="tel"
                    defaultValue={source?.phone ?? ""}
                    placeholder="+33 6 …"
                    aria-invalid={!!state.errors.phone?.length}
                    aria-describedby={`${formId}-phone-error`}
                  />
                </FormField>
              )}

              <div className="sm:col-span-2">
                {readOnly ? (
                  <ReadOnlyField
                    id={`${formId}-linkedinUrl`}
                    name="linkedinUrl"
                    label={PERSON_FIELD_LABELS.linkedinUrl}
                    value={source?.linkedinUrl ?? ""}
                    display={source?.linkedinUrl ?? ""}
                  />
                ) : (
                  <FormField
                    id={`${formId}-linkedinUrl`}
                    label={PERSON_FIELD_LABELS.linkedinUrl}
                    errors={state.errors.linkedinUrl}
                  >
                    <Input
                      id={`${formId}-linkedinUrl`}
                      name="linkedinUrl"
                      type="url"
                      defaultValue={source?.linkedinUrl ?? ""}
                      placeholder="linkedin.com/in/…"
                      aria-invalid={!!state.errors.linkedinUrl?.length}
                      aria-describedby={`${formId}-linkedinUrl-error`}
                    />
                  </FormField>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PERSON_SECTION_TITLES.details}</CardTitle>
            </CardHeader>
            <CardContent>
              {readOnly ? (
                <>
                  <div className="rounded-md border border-input bg-muted p-3">
                    <MarkdownContent markdown={source?.details ?? ""} variant="admin" />
                  </div>
                  <input type="hidden" name="details" value={source?.details ?? ""} />
                </>
              ) : (
                <>
                  <FormField
                    id={`${formId}-details`}
                    label={PERSON_FIELD_LABELS.details}
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
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <Card>
            <CardHeader>
              <CardTitle>{LEAD_SECTION_TITLES.pipeline}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id={`${formId}-status`}
                name="status"
                label={LEAD_FIELD_LABELS.status}
                options={LEAD_STATUSES}
                labels={LEAD_STATUS_LABELS}
                defaultValue={lead?.status ?? "NOUVEAU"}
                errors={state.errors.status}
              />

              <SelectField
                id={`${formId}-interest`}
                name="interest"
                label={LEAD_FIELD_LABELS.interest}
                options={LEAD_INTERESTS}
                labels={LEAD_INTEREST_LABELS}
                defaultValue={lead?.interest ?? NONE_VALUE}
                errors={state.errors.interest}
                noneLabel="Non renseigné"
              />

              <FormField id={`${formId}-origin`} label={LEAD_FIELD_LABELS.origin} errors={state.errors.origin}>
                <Select name="origin" value={origin} onValueChange={handleOriginChange}>
                  <SelectTrigger
                    id={`${formId}-origin`}
                    className="w-full"
                    aria-invalid={!!state.errors.origin?.length}
                    aria-describedby={`${formId}-origin-error`}
                  >
                    <SelectValue placeholder="Choisir une origine" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_ORIGINS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {LEAD_ORIGIN_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <SelectField
                id={`${formId}-channel`}
                name="channel"
                label={LEAD_FIELD_LABELS.channel}
                options={LEAD_CHANNELS}
                labels={LEAD_CHANNEL_LABELS}
                defaultValue={lead?.channel ?? NONE_VALUE}
                errors={state.errors.channel}
                noneLabel="Non renseigné"
              />

              {readOnly ? (
                <ReadOnlyField
                  id={`${formId}-metAt`}
                  name="metAt"
                  label={PERSON_FIELD_LABELS.metAt}
                  value={source?.metAt ? toIsoDate(source.metAt) : ""}
                  display={source?.metAt ? formatShortDate(source.metAt) : ""}
                />
              ) : (
                <OptionalDateField
                  id={`${formId}-metAt`}
                  name="metAt"
                  label={PERSON_FIELD_LABELS.metAt}
                  value={metAt}
                  onChange={setMetAt}
                  errors={state.errors.metAt}
                />
              )}

              <FormField id={`${formId}-score`} label={LEAD_FIELD_LABELS.score} errors={state.errors.score} help="De 0 à 10.">
                <Input
                  id={`${formId}-score`}
                  name="score"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  step={1}
                  defaultValue={lead?.score?.toString() ?? ""}
                  aria-invalid={!!state.errors.score?.length}
                  aria-describedby={`${formId}-score-help ${formId}-score-error`}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PERSON_SECTION_TITLES.notes}</CardTitle>
            </CardHeader>
            <CardContent>
              {readOnly ? (
                <ReadOnlyField
                  id={`${formId}-notes`}
                  name="notes"
                  label={PERSON_FIELD_LABELS.notes}
                  value={source?.notes ?? ""}
                  display={source?.notes ?? ""}
                />
              ) : (
                <FormField
                  id={`${formId}-notes`}
                  label={PERSON_FIELD_LABELS.notes}
                  errors={state.errors.notes}
                  help="Une ligne de marqueurs, séparés par |"
                >
                  <Input
                    id={`${formId}-notes`}
                    name="notes"
                    maxLength={200}
                    defaultValue={source?.notes ?? ""}
                    placeholder="Décideur technique | Scala/Angular"
                    aria-invalid={!!state.errors.notes?.length}
                    aria-describedby={`${formId}-notes-help ${formId}-notes-error`}
                  />
                </FormField>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 4 : Pages de création et de modification**

`src/app/admin/(protected)/leads/nouveau/page.tsx` :

```tsx
import { Suspense } from "react"

import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findPersonsWithoutLeadRole } from "@/server/queries/persons"

const LEAD_PAGE_SKELETON = ["h-[24px]", "h-[280px]", "h-[200px]", "h-[320px]"]

async function NewLeadSection() {
  const [companyOptions, personOptions] = await Promise.all([
    findCompanyOptions(),
    findPersonsWithoutLeadRole(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb items={[{ label: "Leads", href: "/admin/leads" }, { label: "Nouveau lead" }]} />
      <LeadForm lead={null} companyOptions={companyOptions} personOptions={personOptions} />
    </div>
  )
}

export default async function NewLeadPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={LEAD_PAGE_SKELETON} />}>
        <NewLeadSection />
      </Suspense>
    </div>
  )
}
```

`src/app/admin/(protected)/leads/[id]/page.tsx` :

```tsx
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { personDisplayName } from "@/lib/persons"
import { findCompanyOptions } from "@/server/queries/companies"
import { findLeadByIdForAdmin } from "@/server/queries/leads"

const LEAD_PAGE_SKELETON = ["h-[24px]", "h-[280px]", "h-[200px]", "h-[320px]"]

async function EditLeadSection({ id }: { id: string }) {
  const [lead, companyOptions] = await Promise.all([findLeadByIdForAdmin(id), findCompanyOptions()])
  if (!lead) notFound()
  // Une fiche en opposition ne se modifie plus : sa trace se lit dans Tous.
  if (lead.optedOutAt) redirect("/admin/leads/tous")

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Leads", href: "/admin/leads" }, { label: personDisplayName(lead) }]}
      />
      {/* Le picker « Personne existante » n'a de sens qu'à la création : LeadForm ne l'affiche
      jamais en modification, quel que soit le contenu de personOptions. */}
      <LeadForm lead={lead} companyOptions={companyOptions} personOptions={[]} />
    </div>
  )
}

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={LEAD_PAGE_SKELETON} />}>
        <EditLeadSection id={id} />
      </Suspense>
    </div>
  )
}
```

Les cards des éléments rattachés à la personne (actions `10`, missions `15`, entretiens `17`, signaux `19`) se placeront sous `LeadForm`, dans la `div` de `EditLeadSection`, hors du `<form>` : elles ont leurs propres boutons et leur propre enregistrement (arbitrage « Élément rattaché à une fiche » de DESIGN.md).

Les dossiers `nouveau/` et `[id]/` reçoivent chacun un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 5 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur. Si l'éditeur installé au `03` n'accepte pas `id` ou `aria-*`, reprendre l'extension de ses props décrite au plan `03` (Task 3, Step 1).

---
### Task 5 : Liste, vue détail et suppression

**Files:**
- Create: `src/components/features/admin/leads/DeleteLeadDialog.tsx`
- Create: `src/components/features/admin/persons/ErasePersonExchangesDialog.tsx`
- Create: `src/components/features/admin/leads/LeadsTable.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 4 ; `deleteLead` (`07`) ; `erasePersonExchanges` (`07`, `@/server/actions/persons`) ; `personDisplayName`, `PERSON_FIELD_LABELS`, `PERSON_SECTION_TITLES` (`07`/Task 3, `@/lib/persons`) ; `ConfirmDeleteDialog`, `DataTable`, `DetailDialog`, `ExternalUrl`, `TruncateTooltip`, `CompanyLogoTile`, `MarkdownContent`, `RowActionButton`
- Produces: `LeadsTable({ leads, view }: { leads: readonly AdminLead[]; view: LeadView })`, `ErasePersonExchangesDialog({ person }: { person: OptOutTarget })`

- [ ] **Step 1 : Suppression**

Le texte non opposé porte désormais la phrase sur le rôle Contact du brief ; `AdminLead.hasContactRole` (`07`, toujours `false` avant `13`) ne fait pas encore varier ce texte, `13` s'en chargera.

`src/components/features/admin/leads/DeleteLeadDialog.tsx` :

```tsx
"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { personDisplayName } from "@/lib/persons"
import { deleteLead } from "@/server/actions/leads"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead
}

export function DeleteLeadDialog({ lead }: Props) {
  const name = personDisplayName(lead)

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      description={
        // Supprimer une fiche en opposition efface la seule trace du « stop » : le dire avant.
        lead.optedOutAt
          ? "La trace de son opposition disparaît : plus rien n'empêchera de recontacter cette personne."
          : "Un lead perdu se garde plutôt avec le statut « Perdu ». Si cette personne n'est pas aussi un contact, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses missions restent sans apporteur."
      }
      successMessage="Lead supprimé"
      onDelete={async () => {
        const result = await deleteLead(lead.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
```

- [ ] **Step 2 : Effacement des échanges**

`src/components/features/admin/persons/ErasePersonExchangesDialog.tsx`, disponible dans Leads > Tous sur une fiche opposée sans `exchangesErasedAt` :

```tsx
"use client"

import { useState, useTransition, type MouseEvent } from "react"
import { Eraser, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { RowActionButton } from "@/components/features/admin/RowActionButton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { personDisplayName } from "@/lib/persons"
import { erasePersonExchanges } from "@/server/actions/persons"
import type { OptOutTarget } from "@/components/features/admin/persons/OptOutPersonDialog"

interface Props {
  person: OptOutTarget
}

export function ErasePersonExchangesDialog({ person }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const name = personDisplayName(person)

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await erasePersonExchanges(person.id)
      setOpen(false)
      if (result.ok) {
        toast.success("Échanges effacés")
      } else {
        toast.error("Une erreur est survenue, réessayez")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <RowActionButton aria-label={`Effacer les échanges de ${name}`}>
          <Eraser className="size-4" />
        </RowActionButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="size-8 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Effacer les échanges de « {name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les actions et les signaux de cette personne sont supprimés définitivement, ainsi que
            sa présence dans ses entretiens. Action irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? "Enregistrement..." : "Effacer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 3 : Table**

`src/components/features/admin/leads/LeadsTable.tsx` :

```tsx
"use client"

import { useMemo, useState } from "react"
import { Pencil, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  type DetailSection,
  DetailDialog,
} from "@/components/features/admin/DetailDialog"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteLeadDialog } from "@/components/features/admin/leads/DeleteLeadDialog"
import { ErasePersonExchangesDialog } from "@/components/features/admin/persons/ErasePersonExchangesDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import {
  LEAD_COLUMN_WIDTHS,
  LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type LeadColumnKey,
} from "@/lib/admin-table-widths"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import { leadsForView, type LeadView } from "@/lib/lead-views"
import {
  LEAD_CHANNEL_LABELS,
  LEAD_FIELD_LABELS,
  LEAD_INTEREST_LABELS,
  LEAD_ORIGIN_LABELS,
  LEAD_SECTION_TITLES,
  LEAD_STATUS_LABELS,
} from "@/lib/leads"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/persons"
import { formatShortDate } from "@/lib/projects"
import { LEAD_INTERESTS, LEAD_ORIGINS, LEAD_STATUSES } from "@/lib/schemas/lead"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminLead } from "@/server/queries/leads"

const OPTED_OUT_LABEL = "Ne plus contacter"

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
}

function enumBadge(label: string | null) {
  return label ? <Badge variant="secondary">{label}</Badge> : null
}

function statusBadge(lead: AdminLead) {
  return lead.optedOutAt ? (
    <Badge variant="outline">{OPTED_OUT_LABEL}</Badge>
  ) : (
    <Badge variant="secondary">{LEAD_STATUS_LABELS[lead.status]}</Badge>
  )
}

function companyCell(lead: AdminLead) {
  if (!lead.company) return null
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompanyLogoTile logoFilename={lead.company.logoFilename} size="sm" />
      <TruncateTooltip className="min-w-0">{lead.company.name}</TruncateTooltip>
    </span>
  )
}

function hideable(
  view: LeadView,
  key: Exclude<LeadColumnKey, "name" | "actions">,
): Pick<Column<AdminLead>, "hideable" | "defaultVisible"> {
  return {
    hideable: true,
    defaultVisible: LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key),
  }
}

function buildDataColumns(view: LeadView): readonly Column<AdminLead>[] {
  return [
    {
      key: "name",
      header: PERSON_FIELD_LABELS.name,
      width: LEAD_COLUMN_WIDTHS.name,
      sortValue: (lead) => personDisplayName(lead),
      searchValue: (lead) =>
        [personDisplayName(lead), lead.company?.name ?? "", lead.email ?? ""].join(" "),
      cell: (lead) => (
        <TruncateTooltip className="block w-full font-medium">{personDisplayName(lead)}</TruncateTooltip>
      ),
    },
    {
      key: "status",
      header: LEAD_FIELD_LABELS.status,
      width: LEAD_COLUMN_WIDTHS.status,
      ...hideable(view, "status"),
      cell: statusBadge,
    },
    {
      key: "interest",
      header: LEAD_FIELD_LABELS.interest,
      width: LEAD_COLUMN_WIDTHS.interest,
      ...hideable(view, "interest"),
      cell: (lead) => enumBadge(lead.interest ? LEAD_INTEREST_LABELS[lead.interest] : null),
    },
    {
      key: "score",
      header: LEAD_FIELD_LABELS.score,
      width: LEAD_COLUMN_WIDTHS.score,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "score"),
      sortValue: (lead) => lead.score ?? -1,
      cell: (lead) => lead.score,
    },
    {
      key: "origin",
      header: LEAD_FIELD_LABELS.origin,
      width: LEAD_COLUMN_WIDTHS.origin,
      ...hideable(view, "origin"),
      cell: (lead) => enumBadge(LEAD_ORIGIN_LABELS[lead.origin]),
    },
    {
      key: "channel",
      header: LEAD_FIELD_LABELS.channel,
      width: LEAD_COLUMN_WIDTHS.channel,
      ...hideable(view, "channel"),
      cell: (lead) => enumBadge(lead.channel ? LEAD_CHANNEL_LABELS[lead.channel] : null),
    },
    {
      key: "metAt",
      header: PERSON_FIELD_LABELS.metAt,
      width: LEAD_COLUMN_WIDTHS.metAt,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "metAt"),
      sortValue: (lead) => lead.metAt?.getTime() ?? 0,
      cell: (lead) => formatShortDate(lead.metAt),
    },
    {
      key: "jobRole",
      header: PERSON_FIELD_LABELS.jobRole,
      width: LEAD_COLUMN_WIDTHS.jobRole,
      ...hideable(view, "jobRole"),
      cell: (lead) => enumBadge(lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : null),
    },
    {
      key: "company",
      header: PERSON_FIELD_LABELS.companyId,
      width: LEAD_COLUMN_WIDTHS.company,
      ...hideable(view, "company"),
      sortValue: (lead) => lead.company?.name ?? "",
      cell: companyCell,
    },
    {
      key: "zone",
      header: PERSON_FIELD_LABELS.zone,
      width: LEAD_COLUMN_WIDTHS.zone,
      ...hideable(view, "zone"),
      cell: (lead) => enumBadge(lead.zone ? ZONE_LABELS[lead.zone] : null),
    },
    {
      key: "linkedinUrl",
      header: PERSON_FIELD_LABELS.linkedinUrl,
      width: LEAD_COLUMN_WIDTHS.linkedinUrl,
      ...hideable(view, "linkedinUrl"),
      cell: (lead) =>
        lead.linkedinUrl ? (
          <TruncateTooltip className="block w-full">
            <ExternalUrl url={lead.linkedinUrl} />
          </TruncateTooltip>
        ) : null,
    },
    {
      key: "email",
      header: PERSON_FIELD_LABELS.email,
      width: LEAD_COLUMN_WIDTHS.email,
      ...hideable(view, "email"),
      cell: (lead) => <TruncatedCell value={lead.email} />,
    },
    {
      key: "phone",
      header: PERSON_FIELD_LABELS.phone,
      width: LEAD_COLUMN_WIDTHS.phone,
      className: "tabular-nums",
      ...hideable(view, "phone"),
      cell: (lead) => <TruncatedCell value={lead.phone} />,
    },
    {
      key: "notes",
      header: PERSON_FIELD_LABELS.notes,
      width: LEAD_COLUMN_WIDTHS.notes,
      className: "text-muted-foreground",
      ...hideable(view, "notes"),
      cell: (lead) => <TruncatedCell value={lead.notes} />,
    },
  ]
}

// Arbitrage « bloc sans donnée » : un bloc dont aucun champ n'est renseigné disparaît.
function keepFilled(section: DetailSection): DetailSection[] {
  return section.rows.some((row) => row.value !== null && row.value !== undefined) ? [section] : []
}

function buildLeadDetail(lead: AdminLead, onEdit: (() => void) | undefined): DetailContent {
  if (lead.optedOutAt) {
    return {
      title: personDisplayName(lead),
      status: (
        <Badge variant="outline" meta>
          {OPTED_OUT_LABEL}
        </Badge>
      ),
      sections: [
        {
          title: PERSON_SECTION_TITLES.optOut,
          rows: [
            { label: PERSON_FIELD_LABELS.email, value: lead.email },
            {
              label: PERSON_FIELD_LABELS.linkedinUrl,
              value: lead.linkedinUrl ? (
                <ExternalUrl url={lead.linkedinUrl} className="wrap-anywhere" />
              ) : null,
            },
            { label: PERSON_FIELD_LABELS.optedOutAt, value: formatShortDate(lead.optedOutAt) },
            {
              label: PERSON_FIELD_LABELS.exchangesErasedAt,
              value: lead.exchangesErasedAt ? formatShortDate(lead.exchangesErasedAt) : null,
            },
          ],
        },
      ],
    }
  }

  const subtitle = [lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : null, lead.company?.name ?? null]
    .filter((part): part is string => part !== null)
    .join(" · ")

  return {
    title: personDisplayName(lead),
    ...(subtitle ? { subtitle } : {}),
    status: (
      <Badge variant="outline" meta>
        {LEAD_STATUS_LABELS[lead.status]}
      </Badge>
    ),
    sections: [
      // Le statut n'y figure pas : l'en-tête le porte déjà.
      {
        title: LEAD_SECTION_TITLES.pipeline,
        rows: [
          {
            label: LEAD_FIELD_LABELS.interest,
            value: lead.interest ? <Badge variant="secondary">{LEAD_INTEREST_LABELS[lead.interest]}</Badge> : null,
          },
          { label: LEAD_FIELD_LABELS.origin, value: <Badge variant="secondary">{LEAD_ORIGIN_LABELS[lead.origin]}</Badge> },
          {
            label: LEAD_FIELD_LABELS.channel,
            value: lead.channel ? <Badge variant="secondary">{LEAD_CHANNEL_LABELS[lead.channel]}</Badge> : null,
          },
          { label: PERSON_FIELD_LABELS.metAt, value: formatShortDate(lead.metAt) },
          { label: LEAD_FIELD_LABELS.score, value: lead.score === null ? null : `${lead.score} / 10` },
        ],
      },
      ...keepFilled({
        title: PERSON_SECTION_TITLES.person,
        rows: [
          { label: PERSON_FIELD_LABELS.jobRole, value: lead.jobRole ? <Badge variant="secondary">{JOB_ROLE_LABELS[lead.jobRole]}</Badge> : null },
          { label: PERSON_FIELD_LABELS.companyId, value: lead.company?.name ?? null },
          { label: PERSON_FIELD_LABELS.zone, value: lead.zone ? <Badge variant="secondary">{ZONE_LABELS[lead.zone]}</Badge> : null },
        ],
      }),
      ...keepFilled({
        title: PERSON_SECTION_TITLES.contact,
        rows: [
          { label: PERSON_FIELD_LABELS.email, value: lead.email },
          { label: PERSON_FIELD_LABELS.phone, value: lead.phone },
          {
            label: PERSON_FIELD_LABELS.linkedinUrl,
            value: lead.linkedinUrl ? (
              <ExternalUrl url={lead.linkedinUrl} className="wrap-anywhere" />
            ) : null,
          },
        ],
      }),
      ...(lead.notes
        ? [{ title: PERSON_SECTION_TITLES.notes, rows: [{ value: lead.notes, fullWidth: true }] }]
        : []),
      ...(lead.details
        ? [
            {
              title: PERSON_SECTION_TITLES.details,
              rows: [
                {
                  value: <MarkdownContent markdown={lead.details} variant="admin" />,
                  fullWidth: true,
                },
              ],
            },
          ]
        : []),
    ],
    ...(onEdit ? { onEdit } : {}),
  }
}

const facets: readonly Facet<AdminLead>[] = [
  {
    key: "status",
    label: LEAD_FIELD_LABELS.status,
    options: LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] })),
    value: (lead) => lead.status,
  },
  {
    key: "interest",
    label: LEAD_FIELD_LABELS.interest,
    options: LEAD_INTERESTS.map((interest) => ({
      value: interest,
      label: LEAD_INTEREST_LABELS[interest],
    })),
    value: (lead) => (lead.interest ? [lead.interest] : []),
  },
  {
    key: "origin",
    label: LEAD_FIELD_LABELS.origin,
    options: LEAD_ORIGINS.map((origin) => ({ value: origin, label: LEAD_ORIGIN_LABELS[origin] })),
    value: (lead) => lead.origin,
  },
  {
    key: "jobRole",
    label: PERSON_FIELD_LABELS.jobRole,
    options: JOB_ROLES.map((role) => ({ value: role, label: JOB_ROLE_LABELS[role] })),
    value: (lead) => (lead.jobRole ? [lead.jobRole] : []),
  },
  {
    key: "zone",
    label: PERSON_FIELD_LABELS.zone,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (lead) => (lead.zone ? [lead.zone] : []),
  },
]

interface Props {
  leads: readonly AdminLead[]
  view: LeadView
}

export function LeadsTable({ leads, view }: Props) {
  const router = useRouter()
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null)

  const viewLeads = useMemo(() => leadsForView(leads, view), [leads, view])

  const columns = useMemo<readonly Column<AdminLead>[]>(
    () => [
      ...buildDataColumns(view),
      {
        key: "actions",
        header: "Actions",
        width: LEAD_COLUMN_WIDTHS.actions,
        align: "right",
        cell: (lead) => (
          <span className="inline-flex gap-0">
            {lead.optedOutAt ? null : (
              <RowActionButton aria-label={`Modifier ${personDisplayName(lead)}`} asChild>
                <Link href={`/admin/leads/${lead.id}`}>
                  <Pencil className="size-4" />
                </Link>
              </RowActionButton>
            )}
            {lead.optedOutAt && !lead.exchangesErasedAt ? (
              <ErasePersonExchangesDialog person={lead} />
            ) : null}
            <DeleteLeadDialog lead={lead} />
          </span>
        ),
      },
    ],
    [view],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedLead
        ? buildLeadDetail(
            selectedLead,
            selectedLead.optedOutAt
              ? undefined
              : () => {
                  router.push(`/admin/leads/${selectedLead.id}`)
                },
          )
        : null,
    [selectedLead, router],
  )

  return (
    <>
      <DataTable
        rows={viewLeads}
        columns={columns}
        getRowId={(lead) => lead.id}
        searchPlaceholder="Rechercher un nom ou une entreprise"
        noun="lead"
        onRowClick={setSelectedLead}
        rowLabel={personDisplayName}
        facets={facets}
        empty={{
          icon: UserPlus,
          title: "Aucun lead",
          description: "Aucun lead dans cette vue. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null)
        }}
      />
    </>
  )
}
```

- [ ] **Step 4 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---
### Task 6 : Pages et menu

**Files:**
- Create: `src/components/features/admin/leads/LeadsViewPage.tsx`
- Create: `src/app/admin/(protected)/leads/page.tsx`, `src/app/admin/(protected)/leads/loading.tsx`
- Create: `src/app/admin/(protected)/leads/chauds/page.tsx` et `loading.tsx`
- Create: `src/app/admin/(protected)/leads/a-qualifier/page.tsx` et `loading.tsx`
- Create: `src/app/admin/(protected)/leads/stand-by/page.tsx` et `loading.tsx`
- Create: `src/app/admin/(protected)/leads/tous/page.tsx` et `loading.tsx`
- Modify: `src/config/admin-nav-items.ts`
- Create: `src/components/features/admin/RelatedLinksCard.tsx`
- Modify: `src/server/queries/leads.ts`
- Modify: `src/app/admin/(protected)/entreprises/[id]/page.tsx`
- Modify: `docs/DESIGN.md` (ligne « Fiches rattachées »)

**Interfaces:**
- Consumes: `LeadsTable` (Task 5) ; route `/admin/leads/nouveau` (Task 4) ; `LEAD_VIEW_PAGES`, `LeadView` (Task 1) ; `leadSkeletonWidths` (Task 3) ; `findAllLeadsForAdmin` (`07`) ; `personDisplayName` (`07`, `@/lib/persons`)
- Produces: `LeadsViewPage({ view }: { view: LeadView })` ; `RelatedLinksCard({ title, links, emptyText, action })`, `interface RelatedLink { id: string; href: Route; label: string; meta?: string }` ; `findLeadsOfCompany(companyId: string)`

- [ ] **Step 1 : Coquille commune**

`src/components/features/admin/leads/LeadsViewPage.tsx` :

```tsx
import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { LeadsTable } from "@/components/features/admin/leads/LeadsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { leadSkeletonWidths } from "@/lib/admin-table-widths"
import { LEAD_VIEW_PAGES, type LeadView } from "@/lib/lead-views"
import { findAllLeadsForAdmin } from "@/server/queries/leads"

async function LeadsSection({ view }: { view: LeadView }) {
  const leads = await findAllLeadsForAdmin()
  return <LeadsTable leads={leads} view={view} />
}

interface Props {
  view: LeadView
}

export function LeadsViewPage({ view }: Props) {
  const { title, subtitle } = LEAD_VIEW_PAGES[view]

  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href="/admin/leads/nouveau">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau lead
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={leadSkeletonWidths(view)} />}>
        <LeadsSection view={view} />
      </Suspense>
    </AdminPageShell>
  )
}
```

- [ ] **Step 2 : Les cinq pages**

`src/app/admin/(protected)/leads/page.tsx` :

```tsx
import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsPage() {
  await getCurrentUser()

  return <LeadsViewPage view="en-cours" />
}
```

`src/app/admin/(protected)/leads/chauds/page.tsx` :

```tsx
import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsChaudsPage() {
  await getCurrentUser()

  return <LeadsViewPage view="chauds" />
}
```

`src/app/admin/(protected)/leads/a-qualifier/page.tsx` :

```tsx
import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsAQualifierPage() {
  await getCurrentUser()

  return <LeadsViewPage view="a-qualifier" />
}
```

`src/app/admin/(protected)/leads/stand-by/page.tsx` :

```tsx
import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsStandByPage() {
  await getCurrentUser()

  return <LeadsViewPage view="stand-by" />
}
```

`src/app/admin/(protected)/leads/tous/page.tsx` :

```tsx
import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsTousPage() {
  await getCurrentUser()

  return <LeadsViewPage view="tous" />
}
```

Chacun des cinq dossiers (`leads/`, `chauds/`, `a-qualifier/`, `stand-by/`, `tous/`) reçoit un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 3 : Menu**

Dans `src/config/admin-nav-items.ts`, remplacer :

```ts
      { label: "Leads", icon: UserPlus },
```

par :

```ts
      {
        label: "Leads",
        icon: UserPlus,
        href: "/admin/leads",
        subItems: [
          { label: "En cours", href: "/admin/leads" },
          { label: "Chauds", href: "/admin/leads/chauds" },
          { label: "À qualifier", href: "/admin/leads/a-qualifier" },
          { label: "Stand-by", href: "/admin/leads/stand-by" },
          { label: "Tous", href: "/admin/leads/tous" },
        ],
      },
```

- [ ] **Step 4 : Card Leads de la page entreprise**

Arbitrage « Élément rattaché à une fiche » de DESIGN.md : la page d'une fiche liste ses fiches rattachées dans des cards sous le formulaire, chacune menant à sa page. La card est commune : missions (`15`) et entretiens (`17`) la reprennent.

`src/components/features/admin/RelatedLinksCard.tsx` :

```tsx
import type { Route } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface RelatedLink {
  id: string
  href: Route
  label: string
  meta?: string
}

interface Props {
  title: string
  links: readonly RelatedLink[]
  emptyText: string
  // Création d'un élément rattaché depuis la page de sa fiche, jamais depuis une ligne de liste.
  action?: ReactNode
}

export function RelatedLinksCard({ title, links, emptyText, action }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.id} className="flex flex-wrap gap-x-2 text-sm">
                <Link href={link.href} className="font-medium underline-offset-4 hover:underline">
                  {link.label}
                </Link>
                {link.meta ? <span className="text-muted-foreground">{link.meta}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
```

À la fin de `src/server/queries/leads.ts` :

```ts
// Leads d'une entreprise (card Leads de sa page) : une fiche en opposition a perdu son entreprise, elle n'y apparaît plus. Relation lue imbriquée exprès, cette liste ne sert qu'à construire des liens ; `AdminLead` reste la seule forme aplatie.
export async function findLeadsOfCompany(companyId: string) {
  return prisma.lead.findMany({
    where: { person: { companyId } },
    select: {
      personId: true,
      person: { select: { name: true, email: true, linkedinUrl: true, jobRole: true } },
    },
    orderBy: { person: { name: { sort: "asc", nulls: "last" } } },
  })
}
```

Dans `src/app/admin/(protected)/entreprises/[id]/page.tsx`, dans la section qui lit l'entreprise, lire aussi `findLeadsOfCompany(id)` dans le même `Promise.all`, puis ajouter sous `<CompanyForm … />` :

```tsx
      <RelatedLinksCard
        title="Leads"
        links={leads.map(
          (lead): RelatedLink => ({
            id: lead.personId,
            href: `/admin/leads/${lead.personId}`,
            label: personDisplayName(lead.person),
            ...(lead.person.jobRole ? { meta: JOB_ROLE_LABELS[lead.person.jobRole] } : {}),
          }),
        )}
        emptyText="Aucun lead dans cette entreprise."
      />
```

(imports : `RelatedLinksCard` et `type RelatedLink` depuis `@/components/features/admin/RelatedLinksCard`, `personDisplayName` depuis `@/lib/persons`, `JOB_ROLE_LABELS` depuis `@/lib/job-roles`, `findLeadsOfCompany` depuis `@/server/queries/leads`.)

- [ ] **Step 5 : Mapping de `docs/DESIGN.md`**

Charger le skill `design-doc`, puis déplacer la ligne « Fiches rattachées » de § Post-MVP (non installés) vers § Cards et grilles, sans sa dernière phrase (« Rejoint § … ») : le composant est installé.

- [ ] **Step 6 : Qualité**

Run: `just typecheck`
Expected: aucune erreur (si le typage des `href` échoue, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

---

### Task 7 : Vue Prospects des entreprises

**Files:**
- Modify: `src/server/queries/companies.ts` (dérivé `isProspect`)
- Modify: `src/lib/admin-table-widths.ts` (`CompanyView` étendu, colonnes de la vue Prospects)
- Modify: `src/components/features/admin/companies/CompaniesTable.tsx` (`VIEW_FILTER.prospects`)
- Create: `src/app/admin/(protected)/entreprises/prospects/page.tsx` et `loading.tsx`
- Modify: `src/config/admin-nav-items.ts` (entrée Prospects)

**Interfaces:**
- Consumes: `toAdminCompany`, `AdminCompany`, `adminCompanyInclude` (`04`, `@/server/queries/companies`, point d'entrée unique des dérivés) ; `CompanyView`, `COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS` (`04`, `@/lib/admin-table-widths`) ; `CompaniesViewPage` (`04`) ; type `LeadStatus` (`@/generated/prisma/client`)
- Produces: `AdminCompany.isProspect: boolean` ; `CompanyView` étendu de `"prospects"` ; route `/admin/entreprises/prospects`

- [ ] **Step 1 : Calculer `isProspect`**

`toAdminCompany` (`src/server/queries/companies.ts`) est le point d'entrée unique des dérivés d'`AdminCompany` : `worked` (`04`) y a déjà posé le motif, `isProspect` le suit à côté.

Dans l'`include` de `findAllCompaniesForAdmin`, ajouter :

```ts
      // Chargé seulement pour calculer `isProspect` dans `toAdminCompany`, jamais renvoyé.
      persons: { select: { optedOutAt: true, lead: { select: { status: true } } } },
```

Dans `AdminCompanyRaw`, ajouter au même niveau que `clientMetas` :

```ts
    persons: { select: { optedOutAt: true; lead: { select: { status: true } } } }
```

Remplacer `AdminCompany` et `toAdminCompany` par :

```ts
export type AdminCompany = Omit<AdminCompanyRaw, "clientMetas" | "persons"> & {
  worked: boolean
  isProspect: boolean
}

const PROSPECT_STATUSES: readonly LeadStatus[] = ["NOUVEAU", "SUSPECT", "DISCUSSION"]

// Worked pose déjà le motif ci-dessus, un deuxième dérivé le rejoint plutôt que d'ouvrir un second point de calcul : prospect = non travaillée et au moins une personne au rôle Lead, non opposée, à un statut actif.
function toAdminCompany({ clientMetas, persons, ...company }: AdminCompanyRaw): AdminCompany {
  const worked = clientMetas.some((meta) => meta.project.type === "CLIENT")
  const isProspect =
    !worked &&
    persons.some(
      (person) =>
        !person.optedOutAt && person.lead !== null && PROSPECT_STATUSES.includes(person.lead.status),
    )
  return { ...company, worked, isProspect }
}
```

(import `LeadStatus` depuis `@/generated/prisma/client` en tête de fichier.)

- [ ] **Step 2 : Vue et colonnes**

Dans `src/lib/admin-table-widths.ts`, remplacer :

```ts
export type CompanyView = "toutes" | "travaillees" | "recrutement"
```

par :

```ts
export type CompanyView = "toutes" | "travaillees" | "recrutement" | "prospects"
```

Dans `COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS`, ajouter après `recrutement` :

```ts
  prospects: [
    "types",
    "sectors",
    "zones",
    "size",
    "relationStatus",
    "worked",
    "legalEntity",
    "websiteUrl",
    "notes",
    "projects",
  ],
```

Dans `src/components/features/admin/companies/CompaniesTable.tsx`, dans `VIEW_FILTER`, ajouter après `recrutement` :

```ts
  prospects: (company) => company.isProspect,
```

- [ ] **Step 3 : Page et menu**

`src/app/admin/(protected)/entreprises/prospects/page.tsx` :

```tsx
import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesProspectsPage() {
  await getCurrentUser()

  return (
    <CompaniesViewPage
      view="prospects"
      title="Prospects"
      subtitle="Non travaillées, avec un lead actif."
    />
  )
}
```

`src/app/admin/(protected)/entreprises/prospects/loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

Dans `src/config/admin-nav-items.ts`, remplacer la sous-entrée sans lien :

```ts
      { label: "Prospects" },
```

par :

```ts
      { label: "Prospects", href: "/admin/entreprises/prospects" },
```

- [ ] **Step 4 : Qualité**

Run: `just typecheck`
Expected: aucune erreur (si le typage du `href` échoue, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

---

### Task 8 : Parcours manuel et procédure RGPD

**Files:**
- Modify: `docs/PRODUCTION.md` (rubrique « Demandes RGPD », noms concrets)

**Interfaces:**
- Consumes: Tasks 1 à 7 ; rubrique « Demandes RGPD » (`01`)
- Produces: rien

- [ ] **Step 1 : Menu et vues**

Run: `just dev`, se connecter. Créer au préalable quelques leads aux statuts Nouveau, Discussion, Perdu et Stand-by, dont un Hot en Discussion, avec des dates de rencontre différentes et une sans date.
Expected: Leads dans le menu mène à « Leads en cours » (Nouveau et Discussion, plus récents d'abord, sans date en dernier) ; Chauds, À qualifier, Stand-by et Tous montrent leurs seuls leads ; l'entrée active suit la page ; le squelette de chargement a le bon nombre de colonnes.

- [ ] **Step 2 : Création depuis une autre vue**

Depuis « Leads à qualifier », cliquer « Nouveau lead » : la page `/admin/leads/nouveau` s'ouvre, fil d'Ariane « Leads › Nouveau lead ». Saisir un nom, une entreprise, une date de rencontre, une localité, enregistrer.
Expected: « Lead créé », retour sur la liste, où le lead apparaît sans recharger ; sa date de rencontre est bien celle choisie (pas la veille). Ouvrir la page de son entreprise : la card Leads le liste et son nom mène à la page du lead. Cette entreprise, non travaillée, apparaît maintenant dans Entreprises > Prospects.

- [ ] **Step 3 : Personne existante**

Depuis la page d'une entreprise, ouvrir sa card Leads et créer un premier lead outbound dessus. Revenir sur « Nouveau lead », cliquer « Personne existante », choisir cette même personne dans le picker.
Expected: Poste, Entreprise, Localité, Coordonnées, Détails et Notes disparaissent du formulaire, Pipeline reste éditable. Enregistrer refuse avec « Ce lead existe déjà : <nom> » sous le champ Personne, puisqu'elle a déjà le rôle. Recharger la page, choisir une autre personne sans rôle Lead, enregistrer : « Lead créé », aucune nouvelle personne n'apparaît dans la card Leads de l'entreprise au-delà de celle choisie.

- [ ] **Step 4 : Gabarit et éditeur**

Ouvrir « Nouveau lead », choisir Outbound, puis Inbound, puis écrire une ligne dans Détails et revenir à Outbound.
Expected: Outbound pose Hypothèse / Angle et Contexte ; Inbound remplace par Contexte seul ; après saisie, changer d'origine ne touche plus au texte. Dans l'éditeur, le menu `/` et la bulle de mise en forme s'ouvrent et répondent au clic.

- [ ] **Step 5 : Doublon et détail**

Créer un lead avec le lien LinkedIn d'un lead existant copié en `fr.linkedin.com/in/…/`.
Expected: « Ce lead existe déjà : <nom> » sous LinkedIn, la saisie reste en place. Cliquer ensuite la ligne d'un lead complet : blocs Pipeline, Personne, Coordonnées, Notes et Détails mis en forme, statut en tête ; « Modifier » mène à sa page, comme le crayon de la ligne.

- [ ] **Step 6 : Opposition en deux temps et suppression**

Ouvrir un lead sur sa page, cliquer « Ne plus contacter » sans cocher la case, confirmer.
Expected: toast, arrivée sur Tous ; le lead n'apparaît plus que dans Tous, badge « Ne plus contacter », sans bouton Modifier, avec une action « Effacer les échanges » sur sa ligne ; sa vue détail ne montre que l'email, le LinkedIn et la date du stop, sans « Modifier ». Rouvrir `/admin/leads/<id>` de ce lead : renvoi vers Tous.

Cliquer « Effacer les échanges » sur sa ligne, confirmer.
Expected: toast, l'action disparaît de la ligne ; sa vue détail montre désormais la date d'effacement.

Ouvrir un second lead sur sa page, cliquer « Ne plus contacter », cocher « La personne demande aussi l'effacement de nos échanges », confirmer.
Expected: toast, arrivée sur Tous ; sa ligne dans Tous ne porte pas l'action « Effacer les échanges », sa vue détail montre déjà la date d'effacement.

Cliquer Supprimer sur la ligne d'un lead opposé : le texte prévient que la trace de l'opposition disparaîtra. Annuler. Cliquer Supprimer sur la ligne d'un lead non opposé : le texte parle du statut Perdu et du rôle Contact. Annuler, puis `just stop`.

- [ ] **Step 7 : Compléter PRODUCTION.md**

Charger `Skill[production-doc]` avant d'écrire. Dans `docs/PRODUCTION.md`, rubrique « Demandes RGPD » (`01`), compléter l'opposition et l'effacement avec les noms concrets : bouton « Ne plus contacter » (`OptOutPersonDialog`), qui appelle `optOutPerson(id)`, sa case « La personne demande aussi l'effacement de nos échanges » enchaînant `erasePersonExchanges(id)` ; bouton « Effacer les échanges » (`ErasePersonExchangesDialog`), qui appelle seul `erasePersonExchanges(id)` sur une fiche déjà opposée, dans Leads > Tous et Contacts.

Run: `just lint`
Expected: aucune erreur de formatage markdown.
