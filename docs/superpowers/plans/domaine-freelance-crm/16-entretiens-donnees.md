# Données des entretiens : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le modèle `Interview` rattaché à une mission (correspondants, type, statut, issue, date, score, décision), son titre déduit de l'ordre dans la mission, ses gabarits, ses Server Actions, et le statut « RDV planifié » d'un lead déduit de ses entretiens à venir.

**Architecture:** Modèle Prisma `Interview` dans le schema `freelance`, en cascade sous `Mission`, relié aux personnes par une relation plusieurs-à-plusieurs. Des fonctions pures testées portent le numéro et l'entretien précédent (`interviews`), le statut affiché du lead (`lead-display-status`, étendu depuis le `15`) et les gabarits. Les actions vérifient mission, côté et correspondants avant d'écrire, créent dans la même transaction une personne au rôle Contact pour un correspondant inconnu ; `erasePersonExchanges` retire la personne de ses entretiens quand l'effacement est demandé.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4, Next.js 16 Server Actions, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/16-entretiens-donnees-design.md`

## Global Constraints

- **Prérequis** : plans `07` (`Person`, `Lead`, `personFields`, `NONE_VALUE`, `findPersonOptions()`, `erasePersonExchanges`), `08` (`lead-views`, `details-templates` et `detailsAfterOriginChange`, `LeadsTable`), `09` (`erasePersonExchanges`, qui supprime les actions), `10` (`AdminLead._count`, instant `now` de `LeadsTable`), `13` (modèle `Contact`, `ContactType`, `ContactStatus`), `14` (modèle `Mission`, qui porte TJM, contrat, lieu, mode, ESN et client final) et `15` (`lead-display-status`, vues des leads relues sur lui, `AdminLead.missions`) implémentés.
- **Enums, valeurs exactes** : `InterviewSide` `ESN`, `CLIENT_FINAL` ; `InterviewType` `PREMIER_CONTACT`, `RECRUTEUR_RH`, `TECHNIQUE`, `MANAGER_EQUIPE`, `NEGOCIATION` ; `InterviewStatus` `PLANIFIE`, `FAIT`, `ANNULE` (défaut `PLANIFIE`) ; `InterviewOutcome` `POSITIF`, `NEGATIF`, `SANS_SUITE` ; `InterviewDecision` `OUI_TRES_INTERESSE`, `OUI_SOUS_CONDITIONS`, `NON`.
- **Libellés** : Premier contact, Recruteur/RH, Technique, Manager/Équipe, Négociation ; Planifié, Fait, Annulé ; Positif, Négatif, Sans suite ; « Oui, très intéressé », « Oui, sous conditions », « Non, pas pour moi ».
- **Titre** : « Premier contact », sinon « Entretien N · <type> », N comptant les entretiens hors Premier contact de la mission, rangés par date puis création.
- **Statut affiché du lead** : « Deal » si une mission apportée est `ACCEPTEE`, sinon « RDV planifié » si la personne au rôle Lead est correspondante d'un entretien `PLANIFIE` dont la date n'est pas passée, sinon le statut saisi. `LeadStatus` ne porte déjà plus `RDV_PLANIFIE` dans le schéma v2 : aucune migration n'est nécessaire pour le retirer.
- **Issue** : ne se saisit et ne s'enregistre que si `status` vaut `FAIT`, vidée sinon.
- **Correspondants** : personnes non opposées ; un correspondant inconnu est créé personne au rôle Contact (`types` `COMMERCIAL` si `jobRole` `RECRUTEUR`, sinon `CONTACT_TECH`, `status` `ACTIF`), dans la même transaction que l'entretien.
- **Messages** : « Choisissez une mission », « Cette mission n'a pas d'ESN : l'entretien est mené par le client final » (`mission_without_intermediary`), `mission_not_found`, `correspondent_not_found`, `correspondent_exists`, `unknown_error`.
- **Liens** : mission `onDelete: Cascade` ; correspondants plusieurs-à-plusieurs `InterviewCorrespondents` vers `Person`.
- **Chemins revalidés** : `/admin/entretiens`, `/admin/missions`, `/admin/leads`, variante `layout`.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Deux entretiens à la même heure dans une mission** : numéro stable, départagé par la création. Couvert par « keeps a stable number for two interviews at the same time » (Task 2).
- **Modifier les correspondants d'un entretien** : la liste enregistrée (existants et nouveaux) remplace l'ancienne. Couvert par « replaces the correspondents on update » (Task 5).
- **Même correspondant envoyé deux fois** : compté une fois, pas pris pour une personne disparue. Couvert par « connects the correspondents on create » (Task 5).
- **Nouveau correspondant à l'email déjà connu** : refusé (`correspondent_exists`), jamais dupliqué. Couvert par « refuses a new correspondent whose email is already known » (Task 5).
- **Mission supprimée** : ses entretiens partent avec elle, sans erreur de clé. Vérifié à la Task 7, Step 3.

---

### Task 1 : Modèle et migration des entretiens

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_interviews/migration.sql`

**Interfaces:**
- Consumes: `Mission`, `Person`
- Produces: modèle `Interview`, enums `InterviewSide`, `InterviewType`, `InterviewStatus`, `InterviewOutcome`, `InterviewDecision` ; `Person.interviews`, `Mission.interviews`

- [ ] **Step 1 : Enums et modèle**

Dans `prisma/schema.prisma`, après l'enum `MissionStatus` :

```prisma
enum InterviewSide {
  ESN
  CLIENT_FINAL

  @@schema("freelance")
}

enum InterviewType {
  PREMIER_CONTACT
  RECRUTEUR_RH
  TECHNIQUE
  MANAGER_EQUIPE
  NEGOCIATION

  @@schema("freelance")
}

// Où en est l'entretien.
enum InterviewStatus {
  PLANIFIE
  FAIT
  ANNULE

  @@schema("freelance")
}

// Ce qu'il a donné, une fois fait.
enum InterviewOutcome {
  POSITIF
  NEGATIF
  SANS_SUITE

  @@schema("freelance")
}

enum InterviewDecision {
  OUI_TRES_INTERESSE
  OUI_SOUS_CONDITIONS
  NON

  @@schema("freelance")
}
```

Après le modèle `Mission` :

```prisma
model Interview {
  id          String             @id @default(uuid(7))
  // L'entreprise se lit sur la mission : ESN ou client final, jamais ressaisie.
  side        InterviewSide
  type        InterviewType
  status      InterviewStatus    @default(PLANIFIE)
  outcome     InterviewOutcome?
  scheduledAt DateTime           @db.Timestamptz
  score       Int?
  decision    InterviewDecision?
  notes       String?
  details     String?

  missionId      String
  mission        Mission  @relation(fields: [missionId], references: [id], onDelete: Cascade)
  correspondents Person[] @relation("InterviewCorrespondents")

  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@index([missionId, scheduledAt])
  @@schema("freelance")
}
```

Dans `Mission`, après `client Company? …` : `interviews     Interview[]` ; dans `Person`, après `referredMissions Mission[]` (`14`) : `interviews Interview[] @relation("InterviewCorrespondents")` (le `19` ajoutera `signals Signal[]` juste après).

- [ ] **Step 2 : Migration**

Run: `pnpm prisma migrate dev --name interviews`, puis `just db-test`
Expected: migration créée et appliquée en dev et en test ; elle crée les cinq types d'enum (`InterviewSide`, `InterviewType`, `InterviewStatus`, `InterviewOutcome`, `InterviewDecision`), la table `"freelance"."Interview"`, l'index `(missionId, scheduledAt)`, la clé étrangère vers `Mission` en `ON DELETE CASCADE` et la table de liaison `"freelance"."_InterviewCorrespondents"` vers `Person`. Aucune modification à la main.

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 2 : Libellés, numéro et titre

**Files:**
- Create: `src/lib/interviews.ts`
- Test: `src/lib/interviews.test.ts`

**Interfaces:**
- Consumes: enums (Task 1)
- Produces: `INTERVIEW_TYPE_LABELS`, `INTERVIEW_STATUS_LABELS`, `INTERVIEW_OUTCOME_LABELS`, `INTERVIEW_DECISION_LABELS`, `INTERVIEW_SIDE_LABELS`, `INTERVIEW_FIELD_LABELS` ; `interface OrderedInterview` ; `interviewPlaces(interviews: readonly OrderedInterview[]): Map<string, { number: number | null; previousId: string | null }>` ; `interviewTitle(type: InterviewType, number: number | null): string`

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/interviews.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import type { InterviewType } from "@/generated/prisma/client"

import { interviewPlaces, interviewTitle } from "./interviews"

interface TestInterview {
  id: string
  missionId: string
  type: InterviewType
  scheduledAt: Date
  createdAt: Date
}

function interview(overrides: Partial<TestInterview> = {}): TestInterview {
  return {
    id: "i1",
    missionId: "m1",
    type: "RECRUTEUR_RH",
    scheduledAt: new Date(2026, 8, 1, 10, 0),
    createdAt: new Date(2026, 7, 20),
    ...overrides,
  }
}

const MISSION_INTERVIEWS = [
  interview({ id: "tech", type: "TECHNIQUE", scheduledAt: new Date(2026, 8, 15, 10, 0) }),
  interview({ id: "first", type: "PREMIER_CONTACT", scheduledAt: new Date(2026, 8, 1, 10, 0) }),
  interview({ id: "hr", type: "RECRUTEUR_RH", scheduledAt: new Date(2026, 8, 8, 10, 0) }),
  interview({ id: "other", missionId: "m2", type: "TECHNIQUE", scheduledAt: new Date(2026, 8, 2, 10, 0) }),
]

describe("interviewPlaces", () => {
  it("numbers interviews after the first contact within their mission, by date", () => {
    const places = interviewPlaces(MISSION_INTERVIEWS)

    expect(places.get("first")?.number).toBeNull()
    expect(places.get("hr")?.number).toBe(1)
    expect(places.get("tech")?.number).toBe(2)
    expect(places.get("other")?.number).toBe(1)
  })

  it("names the previous interview of the same mission", () => {
    const places = interviewPlaces(MISSION_INTERVIEWS)

    expect(places.get("tech")?.previousId).toBe("hr")
    expect(places.get("hr")?.previousId).toBe("first")
    expect(places.get("first")?.previousId).toBeNull()
    expect(places.get("other")?.previousId).toBeNull()
  })

  it("keeps a stable number for two interviews at the same time", () => {
    const sameTime = new Date(2026, 8, 8, 10, 0)
    const interviews = [
      interview({ id: "later", scheduledAt: sameTime, createdAt: new Date(2026, 7, 22) }),
      interview({ id: "earlier", scheduledAt: sameTime, createdAt: new Date(2026, 7, 21) }),
    ]

    const places = interviewPlaces(interviews)

    expect(places.get("earlier")?.number).toBe(1)
    expect(places.get("later")?.number).toBe(2)
  })
})

describe("interviewTitle", () => {
  it("titles a first contact by its type and a later interview by its number", () => {
    const first = interviewTitle("PREMIER_CONTACT", null)
    const technical = interviewTitle("TECHNIQUE", 2)

    expect(first).toBe("Premier contact")
    expect(technical).toBe("Entretien 2 · Technique")
  })
})
```

Run: `pnpm vitest run --project unit src/lib/interviews.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Écrire le module**

`src/lib/interviews.ts` :

```ts
import type {
  InterviewDecision,
  InterviewOutcome,
  InterviewSide,
  InterviewStatus,
  InterviewType,
} from "@/generated/prisma/client"

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  PREMIER_CONTACT: "Premier contact",
  RECRUTEUR_RH: "Recruteur/RH",
  TECHNIQUE: "Technique",
  MANAGER_EQUIPE: "Manager/Équipe",
  NEGOCIATION: "Négociation",
}

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  PLANIFIE: "Planifié",
  FAIT: "Fait",
  ANNULE: "Annulé",
}

export const INTERVIEW_OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  POSITIF: "Positif",
  NEGATIF: "Négatif",
  SANS_SUITE: "Sans suite",
}

export const INTERVIEW_DECISION_LABELS: Record<InterviewDecision, string> = {
  OUI_TRES_INTERESSE: "Oui, très intéressé",
  OUI_SOUS_CONDITIONS: "Oui, sous conditions",
  NON: "Non, pas pour moi",
}

export const INTERVIEW_SIDE_LABELS: Record<InterviewSide, string> = {
  ESN: "ESN",
  CLIENT_FINAL: "Client final",
}

export const INTERVIEW_FIELD_LABELS = {
  missionId: "Mission",
  side: "Mené par",
  correspondentIds: "Correspondants",
  type: "Type",
  status: "Statut",
  outcome: "Issue",
  scheduledAt: "Date et heure",
  score: "Score",
  decision: "Je continue le process ?",
  notes: "Notes",
  details: "Détails",
} as const

export interface OrderedInterview {
  id: string
  missionId: string
  type: InterviewType
  scheduledAt: Date
  createdAt: Date
}

export interface InterviewPlace {
  number: number | null
  previousId: string | null
}

function byDateThenCreation(a: OrderedInterview, b: OrderedInterview): number {
  return (
    a.scheduledAt.getTime() - b.scheduledAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime()
  )
}

// Numéro et entretien précédent se déduisent de l'ordre dans la mission, la création départageant une même heure.
export function interviewPlaces(
  interviews: readonly OrderedInterview[],
): Map<string, InterviewPlace> {
  const byMission = new Map<string, OrderedInterview[]>()
  for (const interview of interviews) {
    const list = byMission.get(interview.missionId) ?? []
    list.push(interview)
    byMission.set(interview.missionId, list)
  }

  const places = new Map<string, InterviewPlace>()
  for (const list of byMission.values()) {
    list.sort(byDateThenCreation)
    let count = 0
    list.forEach((interview, index) => {
      if (interview.type !== "PREMIER_CONTACT") count += 1
      places.set(interview.id, {
        number: interview.type === "PREMIER_CONTACT" ? null : count,
        previousId: list[index - 1]?.id ?? null,
      })
    })
  }
  return places
}

export function interviewTitle(type: InterviewType, number: number | null): string {
  return number === null
    ? INTERVIEW_TYPE_LABELS[type]
    : `Entretien ${number} · ${INTERVIEW_TYPE_LABELS[type]}`
}
```

Run: `pnpm vitest run --project unit src/lib/interviews.test.ts`
Expected: PASS.

---

### Task 3 : « RDV planifié » déduit

**Files:**
- Modify: `src/lib/lead-display-status.ts`
- Test: `src/lib/lead-display-status.test.ts`
- Modify: `src/lib/lead-views.ts`
- Test: `src/lib/lead-views.test.ts`
- Modify: `src/server/queries/leads.ts`
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`

**Interfaces:**
- Consumes: `InterviewStatus` (Task 1)
- Produces: `type LeadDisplayStatus = LeadStatus | "DEAL" | "RDV_PLANIFIE"` ; `leadDisplayStatus(lead: LeadStatusSource, now: number): LeadDisplayStatus` ; `leadsForView<T extends LeadViewRow>(leads: readonly T[], view: LeadView, now: number): T[]` ; `AdminLead.interviews: { status, scheduledAt }[]`, `AdminLead.interviewsCount: number`

`LeadStatus` (`07`) ne porte déjà plus `RDV_PLANIFIE` dans le schéma v2 : aucune migration n'est nécessaire pour le retirer, cette Task ne touche pas `prisma/schema.prisma`.

- [ ] **Step 1 : Écrire les tests du statut affiché**

Dans `src/lib/lead-display-status.test.ts` :

- ajouter en tête `const NOW = new Date(2026, 8, 27, 12, 0).getTime()` ;
- ajouter `interviews: []` à chaque lead des deux tests existants et passer `NOW` en second argument de `leadDisplayStatus` ;
- ajouter :

```ts
  it("shows a scheduled meeting when the lead is a correspondent of an upcoming planned interview", () => {
    const lead = {
      status: "DISCUSSION" as const,
      missions: [],
      interviews: [{ status: "PLANIFIE" as const, scheduledAt: new Date(2026, 8, 28, 10, 0) }],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("RDV_PLANIFIE")
  })

  it("keeps Deal ahead of a scheduled meeting", () => {
    const lead = {
      status: "DISCUSSION" as const,
      missions: [{ status: "ACCEPTEE" as const }],
      interviews: [{ status: "PLANIFIE" as const, scheduledAt: new Date(2026, 8, 28, 10, 0) }],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DEAL")
  })

  it("ignores a past interview and one no longer planned", () => {
    const lead = {
      status: "DISCUSSION" as const,
      missions: [],
      interviews: [
        { status: "PLANIFIE" as const, scheduledAt: new Date(2026, 8, 27, 9, 0) },
        { status: "FAIT" as const, scheduledAt: new Date(2026, 8, 28, 10, 0) },
      ],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DISCUSSION")
  })
```

Run: `pnpm vitest run --project unit src/lib/lead-display-status.test.ts`
Expected: FAIL (le statut affiché ne lit pas encore les entretiens).

- [ ] **Step 2 : Statut affiché**

Remplacer le contenu de `src/lib/lead-display-status.ts` par :

```ts
import type { InterviewStatus, LeadStatus, MissionStatus } from "@/generated/prisma/client"
import { LEAD_STATUS_LABELS } from "@/lib/leads"
import { LEAD_STATUSES } from "@/lib/schemas/lead"

export type LeadDisplayStatus = LeadStatus | "RDV_PLANIFIE" | "DEAL"

export const LEAD_DISPLAY_STATUSES: readonly LeadDisplayStatus[] = [
  ...LEAD_STATUSES,
  "RDV_PLANIFIE",
  "DEAL",
]

export const LEAD_DISPLAY_STATUS_LABELS: Record<LeadDisplayStatus, string> = {
  ...LEAD_STATUS_LABELS,
  RDV_PLANIFIE: "RDV planifié",
  DEAL: "Deal",
}

export interface LeadStatusSource {
  status: LeadStatus
  missions: readonly { status: MissionStatus }[]
  interviews: readonly { status: InterviewStatus; scheduledAt: Date }[]
}

// Deal et RDV planifié sont des faits déduits qui l'emportent sur le statut saisi, le deal d'abord.
export function leadDisplayStatus(lead: LeadStatusSource, now: number): LeadDisplayStatus {
  if (lead.missions.some((mission) => mission.status === "ACCEPTEE")) return "DEAL"
  const hasUpcomingMeeting = lead.interviews.some(
    (interview) => interview.status === "PLANIFIE" && interview.scheduledAt.getTime() >= now,
  )
  return hasUpcomingMeeting ? "RDV_PLANIFIE" : lead.status
}
```

Run: `pnpm vitest run --project unit src/lib/lead-display-status.test.ts`
Expected: PASS.

- [ ] **Step 3 : Vues des leads**

Dans `src/lib/lead-views.ts` :

- ajouter `"RDV_PLANIFIE"` à `IN_PROGRESS` : un rendez-vous planifié reste une étape en cours, comme avant que le statut ne devienne un dérivé ;
- `leadsForView` reçoit l'instant : `export function leadsForView<T extends LeadViewRow>(leads: readonly T[], view: LeadView, now: number): T[]` et filtre par `leads.filter((lead) => VIEW_FILTERS[view](lead, now))` ;
- `VIEW_FILTERS` devient `Record<LeadView, (lead: LeadViewRow, now: number) => boolean>`, chaque filtre appelant `leadDisplayStatus(lead, now)` au lieu de `leadDisplayStatus(lead)` (`tous` reste `() => true`).

Dans `src/lib/lead-views.test.ts` :

- ajouter `const NOW = new Date(2026, 8, 27, 12, 0).getTime()` ;
- retirer `"RDV_PLANIFIE",` de `STATUSES` ; ajouter `interviews: { status: InterviewStatus; scheduledAt: Date }[]` à `TestLead` (import de type `InterviewStatus`) et `interviews: [],` aux valeurs par défaut de `lead()` ;
- passer `NOW` en troisième argument de chaque appel à `leadsForView` ;
- dans « keeps only new, suspect and discussion leads in the in-progress view », renommer le test « keeps only new, suspect, discussion and scheduled leads in the in-progress view » et ajouter à `leads` :

```ts
      lead({
        id: "meeting",
        status: "DISCUSSION",
        interviews: [{ status: "PLANIFIE", scheduledAt: new Date(2026, 8, 28, 10, 0) }],
      }),
```

  (la déclaration devient `const leads = [...STATUSES.map((status) => lead({ id: status, status })), lead({ … })]`) et attendre `["DISCUSSION", "NOUVEAU", "SUSPECT", "meeting"]`.

Run: `pnpm vitest run --project unit src/lib/lead-views.test.ts`
Expected: PASS.

- [ ] **Step 4 : Lecture et table des leads**

Dans `src/server/queries/leads.ts`, les entretiens appartiennent à la personne (`Person.interviews`), jamais au rôle Lead :

- ajouter à `adminLeadInclude.person.include`, à côté de `company` et `prospectingActions` :

```ts
      interviews: { select: { status: true, scheduledAt: true } },
```

- compléter le `_count` de `person.include` : `_count: { select: { prospectingActions: true, interviews: true } }` ;
- ajouter à `AdminLead` `interviews: { status: InterviewStatus; scheduledAt: Date }[]` et `interviewsCount: number` (import de type `InterviewStatus`) ;
- dans `toAdminLead`, ajouter `interviews: row.person.interviews,` et `interviewsCount: row.person._count.interviews,`.

Dans `LeadsTable.tsx`, où l'instant `now` (nombre, figé au montage, `10`) existe déjà :

- `statusBadge(lead)` devient `statusBadge(lead: AdminLead, now: number)` et appelle `leadDisplayStatus(lead, now)` ;
- `buildDataColumns(view)` devient `buildDataColumns(view: LeadView, now: number)`, sa colonne `status` rendant `(lead) => statusBadge(lead, now)` ;
- `buildLeadDetail` reçoit `now: number` en dernier paramètre et l'emploie pour le badge de l'en-tête ;
- `leadsForView(leads, view)` devient `leadsForView(leads, view, now)` ;
- le filtre Statut lit `leadDisplayStatus(lead, now)` ;
- ajouter `now` aux dépendances des `useMemo` qui l'emploient.

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Gabarits des entretiens

**Files:**
- Modify: `src/lib/details-templates.ts`
- Test: `src/lib/details-templates.test.ts`

**Interfaces:**
- Consumes: `InterviewType`
- Produces: `detailsAfterTemplateChange(details: string, previousTemplate: string, nextTemplate: string): string` ; `interviewDetailsTemplate(type: InterviewType | ""): string`

- [ ] **Step 1 : Écrire le test**

Ajouter à `src/lib/details-templates.test.ts` (import de `interviewDetailsTemplate`) :

```ts
describe("interviewDetailsTemplate", () => {
  function headingsOf(template: string): string[] {
    return template.split("\n").filter((line) => line.startsWith("# "))
  }

  it("gives each interview type its template", () => {
    const firstContact = headingsOf(interviewDetailsTemplate("PREMIER_CONTACT"))
    const hr = headingsOf(interviewDetailsTemplate("RECRUTEUR_RH"))
    const negotiation = headingsOf(interviewDetailsTemplate("NEGOCIATION"))
    const technical = headingsOf(interviewDetailsTemplate("TECHNIQUE"))

    expect(firstContact).toEqual([
      "# 📋 Contexte du contact",
      "# 🚩 Red flags",
      "# ✅ Green flags",
      "# ➡️ Suite",
    ])
    expect(hr).toEqual([
      "# 🎯 Objectifs",
      "# 💪 Préparation ciblée",
      "# 🗒️ Déroulé",
      "# 🎯 Évaluation",
      "# 🚩 Red flags",
      "# ✅ Green flags",
      "# 🎬 Pourquoi et conditions",
      "# ➡️ Suite",
    ])
    expect(negotiation).toEqual(hr)
    expect(technical).toEqual([
      "# 🎯 Objectifs",
      "# 💪 Préparation ciblée",
      "# 💻 Exercice technique",
      "# 🗒️ Déroulé",
      "# 🎯 Évaluation",
      "# 🚩 Red flags",
      "# ✅ Green flags",
      "# 🎬 Pourquoi et conditions",
      "# ➡️ Suite",
    ])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: FAIL, export absent.

- [ ] **Step 2 : Bascule généralisée et gabarits**

Dans `src/lib/details-templates.ts` (import de type `InterviewType` en tête) :

- remplacer `detailsAfterOriginChange` par :

```ts
// Un texte saisi n'est jamais écrasé : seul un Détails resté vide ou au gabarit précédent suit le changement.
export function detailsAfterTemplateChange(
  details: string,
  previousTemplate: string,
  nextTemplate: string,
): string {
  const untouched = details.trim() === "" || sameText(details, previousTemplate)
  return untouched ? nextTemplate : details
}

export function detailsAfterOriginChange(
  details: string,
  previousOrigin: LeadOrigin | "",
  nextOrigin: LeadOrigin | "",
): string {
  return detailsAfterTemplateChange(
    details,
    leadDetailsTemplate(previousOrigin),
    leadDetailsTemplate(nextOrigin),
  )
}
```

- ajouter à la fin :

```ts
// Réduits à l'échange : mission et package vivent sur la mission, culture d'entreprise dans son Détails.
const INTERVIEW_FIRST_CONTACT_TEMPLATE = `# 📋 Contexte du contact

# 🚩 Red flags

# ✅ Green flags

# ➡️ Suite
`

function formalInterviewTemplate(extraSection: string): string {
  return `# 🎯 Objectifs

# 💪 Préparation ciblée
${extraSection}
# 🗒️ Déroulé

# 🎯 Évaluation

# 🚩 Red flags

# ✅ Green flags

# 🎬 Pourquoi et conditions

# ➡️ Suite
`
}

const INTERVIEW_TEMPLATES: Record<InterviewType, string> = {
  PREMIER_CONTACT: INTERVIEW_FIRST_CONTACT_TEMPLATE,
  RECRUTEUR_RH: formalInterviewTemplate(""),
  MANAGER_EQUIPE: formalInterviewTemplate(""),
  NEGOCIATION: formalInterviewTemplate(""),
  TECHNIQUE: formalInterviewTemplate("\n# 💻 Exercice technique\n"),
}

export function interviewDetailsTemplate(type: InterviewType | ""): string {
  return type === "" ? "" : INTERVIEW_TEMPLATES[type]
}
```

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: PASS, les tests des gabarits de leads compris.

---

### Task 5 : Validation, Server Actions et lecture

**Files:**
- Create: `src/lib/schemas/interview.ts`
- Create: `src/server/actions/interviews.types.ts`
- Create: `src/server/actions/interviews.ts`
- Test: `src/server/actions/interviews.test.ts`
- Create: `src/server/queries/interviews.ts`

**Interfaces:**
- Consumes: modèle et enums (Task 1) ; `personFields`, `NONE_VALUE`, `notesField`, `optionalTextField` (`src/lib/schemas/person.ts`, `07`) ; `nullifyNoneValue` ; `saveEntity`, `deleteEntity` (`./shared`) ; `stringField`, `stringValues` (`@/lib/server-utils`)
- Produces: `interviewSchema`, `InterviewInput`, `INTERVIEW_SIDES`, `INTERVIEW_TYPES`, `INTERVIEW_STATUSES`, `INTERVIEW_OUTCOMES`, `INTERVIEW_DECISIONS` ; `InterviewFormState`, `InterviewFormMessage`, `initialInterviewFormState` ; `createInterview(prev, formData)`, `updateInterview(id, prev, formData)`, `deleteInterview(id)` ; `AdminInterview`, `findAllInterviewsForAdmin(): Promise<AdminInterview[]>`

- [ ] **Step 1 : Schéma**

`src/lib/schemas/interview.ts` :

```ts
import { z } from "zod"

import {
  InterviewDecision,
  InterviewOutcome,
  InterviewSide,
  InterviewStatus,
  InterviewType,
} from "@/generated/prisma/browser"
import { nullifyNoneValue } from "@/lib/schemas/none-value"
import { NONE_VALUE, notesField, optionalTextField, personFields } from "@/lib/schemas/person"

export const INTERVIEW_SIDES = Object.values(InterviewSide)
export const INTERVIEW_TYPES = Object.values(InterviewType)
export const INTERVIEW_STATUSES = Object.values(InterviewStatus)
export const INTERVIEW_OUTCOMES = Object.values(InterviewOutcome)
export const INTERVIEW_DECISIONS = Object.values(InterviewDecision)

// Un correspondant inconnu du CRM : les mêmes champs qu'une personne, le nom déjà obligatoire par `personFields`.
const newCorrespondentSchema = z.object({ ...personFields })

export const interviewSchema = z
  .object({
    missionId: z.string().trim().min(1, "Choisissez une mission"),
    side: z.enum(InterviewSide, { error: "Choisissez qui mène l'entretien" }),
    // Un correspondant envoyé deux fois n'en fait qu'un.
    correspondentIds: z
      .array(z.string().trim().min(1))
      .transform((ids) => [...new Set(ids)]),
    // Encodés en JSON par le formulaire : un tableau d'objets ne se porte pas nativement en FormData.
    newCorrespondents: z
      .string()
      .transform((value, ctx) => {
        try {
          return value === "" ? [] : (JSON.parse(value) as unknown[])
        } catch {
          ctx.addIssue({ code: "custom", message: "Nouveaux correspondants invalides" })
          return z.NEVER
        }
      })
      .pipe(z.array(newCorrespondentSchema)),
    type: z.enum(InterviewType, { error: "Type inconnu" }),
    status: z.enum(InterviewStatus, { error: "Statut inconnu" }),
    outcome: z
      .union([z.enum(InterviewOutcome), z.literal(NONE_VALUE), z.literal("")], { error: "Issue inconnue" })
      .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
    // Instant complet avec décalage : le formulaire le calcule dans le fuseau du navigateur.
    scheduledAt: z.iso
      .datetime({ offset: true, error: "Date et heure requises" })
      .transform((value) => new Date(value)),
    score: z
      .string()
      .trim()
      .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 10), {
        error: "Le score est un entier de 0 à 10",
      })
      .transform((value) => (value === "" ? null : Number(value))),
    decision: z
      .union([z.enum(InterviewDecision), z.literal(NONE_VALUE), z.literal("")], {
        error: "Décision inconnue",
      })
      .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
    notes: notesField,
    details: optionalTextField,
  })
  // L'issue ne se saisit que sur un entretien Fait, facultative même alors ; un changement de statut la vide.
  .transform((data) => ({ ...data, outcome: data.status === "FAIT" ? data.outcome : null }))

export type InterviewInput = z.infer<typeof interviewSchema>
```

- [ ] **Step 2 : Types de l'état**

`src/server/actions/interviews.types.ts` :

```ts
import type { FormActionState } from "@/lib/form-state"
import type { InterviewInput } from "@/lib/schemas/interview"

export type InterviewFormMessage =
  | "mission_not_found"
  | "mission_without_intermediary"
  | "correspondent_not_found"
  | "correspondent_exists"
  | "unknown_error"
  | null

export type InterviewFormState = FormActionState<InterviewInput, InterviewFormMessage>

export const initialInterviewFormState: InterviewFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

- [ ] **Step 3 : Écrire les tests qui échouent**

`src/server/actions/interviews.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const client = {
    interview: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    mission: { findUnique: vi.fn() },
    person: { count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  }
  // Le mock rejoue la transaction avec le même client : pas de vraie base derrière `tx`.
  return {
    prisma: {
      ...client,
      $transaction: vi.fn((callback: (tx: typeof client) => unknown) => callback(client)),
    },
  }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/person"

import { createInterview, updateInterview } from "./interviews"
import { initialInterviewFormState } from "./interviews.types"

const MEETING = new Date("2026-09-28T08:00:00.000Z")

const BASE_FIELDS = {
  missionId: "m1",
  side: "ESN",
  type: "RECRUTEUR_RH",
  status: "PLANIFIE",
  outcome: NONE_VALUE,
  scheduledAt: MEETING.toISOString(),
  score: "",
  decision: NONE_VALUE,
  notes: "",
  details: "",
  newCorrespondents: "[]",
}

function buildFormData(
  overrides: Record<string, string> = {},
  correspondentIds: readonly string[] = [],
): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  for (const id of correspondentIds) data.append("correspondentIds", id)
  return data
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

// `vi.clearAllMocks` n'efface que les appels : les réponses sont remises à chaque test.
beforeEach(() => {
  vi.mocked(prisma.mission.findUnique).mockResolvedValue({ intermediaryId: "c-esn" } as never)
  vi.mocked(prisma.person.count).mockResolvedValue(0)
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.person.create).mockResolvedValue({ id: "new-1" } as never)
  vi.mocked(prisma.interview.create).mockResolvedValue({ id: "i1" } as never)
  vi.mocked(prisma.interview.update).mockResolvedValue({ id: "i1" } as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("createInterview", () => {
  it("rejects a missing mission or date", async () => {
    const state = await createInterview(
      initialInterviewFormState,
      buildFormData({ missionId: "", scheduledAt: "" }),
    )

    expect(state.errors.missionId).toEqual(["Choisissez une mission"])
    expect(state.errors.scheduledAt).toBeDefined()
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it("rejects a date without its time zone offset", async () => {
    const state = await createInterview(
      initialInterviewFormState,
      buildFormData({ scheduledAt: "2026-09-28T10:00" }),
    )

    expect(state.errors.scheduledAt).toBeDefined()
  })

  it("refuses an interview led by the intermediary of a mission without one", async () => {
    vi.mocked(prisma.mission.findUnique).mockResolvedValue({ intermediaryId: null } as never)

    const state = await createInterview(initialInterviewFormState, buildFormData({ side: "ESN" }))

    expect(state.message).toBe("mission_without_intermediary")
    expect(state.errors.side).toEqual([
      "Cette mission n'a pas d'ESN : l'entretien est mené par le client final",
    ])
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it("refuses an unknown or opted-out correspondent", async () => {
    vi.mocked(prisma.person.count).mockResolvedValue(1)

    const state = await createInterview(initialInterviewFormState, buildFormData({}, ["p1", "p2"]))

    expect(state.message).toBe("correspondent_not_found")
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it("connects the correspondents on create", async () => {
    vi.mocked(prisma.person.count).mockResolvedValue(2)

    await createInterview(initialInterviewFormState, buildFormData({}, ["p1", "p2", "p1"]))

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          scheduledAt: MEETING,
          correspondents: { connect: [{ id: "p1" }, { id: "p2" }] },
        }),
      }),
    )
  })

  it("creates a Contact-role person for a new correspondent", async () => {
    vi.mocked(prisma.person.create).mockResolvedValue({ id: "new-1" } as never)

    await createInterview(
      initialInterviewFormState,
      buildFormData({
        newCorrespondents: JSON.stringify([
          { name: "Nadia Kader", jobRole: "RECRUTEUR", email: "nadia@example.com" },
        ]),
      }),
    )

    expect(prisma.person.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          name: "Nadia Kader",
          contact: { create: { types: ["COMMERCIAL"], status: "ACTIF" } },
        }),
      }),
    )
    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ correspondents: { connect: [{ id: "new-1" }] } }) }),
    )
  })

  it("refuses a new correspondent whose email is already known", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({ id: "existing" } as never)

    const state = await createInterview(
      initialInterviewFormState,
      buildFormData({
        newCorrespondents: JSON.stringify([{ name: "Nadia Kader", email: "nadia@example.com" }]),
      }),
    )

    expect(state.message).toBe("correspondent_exists")
    expect(prisma.person.create).not.toHaveBeenCalled()
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it("empties the outcome when the status is not Fait", async () => {
    await createInterview(
      initialInterviewFormState,
      buildFormData({ status: "PLANIFIE", outcome: "POSITIF" }),
    )

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ outcome: null }) }),
    )
  })

  it("keeps an empty outcome on a Fait interview", async () => {
    await createInterview(initialInterviewFormState, buildFormData({ status: "FAIT" }))

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ outcome: null }) }),
    )
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createInterview(initialInterviewFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.mission.findUnique).not.toHaveBeenCalled()
  })
})

describe("updateInterview", () => {
  it("replaces the correspondents on update", async () => {
    vi.mocked(prisma.person.count).mockResolvedValue(1)

    await updateInterview("i1", initialInterviewFormState, buildFormData({}, ["p3"]))

    expect(prisma.interview.update).toHaveBeenCalledWith(
      objectMatch({
        where: { id: "i1" },
        data: objectMatch({ correspondents: { set: [{ id: "p3" }] } }),
      }),
    )
  })
})
```

Run: `pnpm vitest run --project unit src/server/actions/interviews.test.ts`
Expected: FAIL, module `./interviews` introuvable.

- [ ] **Step 4 : Écrire les actions**

`src/server/actions/interviews.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { interviewSchema, type InterviewInput } from "@/lib/schemas/interview"
import { stringField, stringValues } from "@/lib/server-utils"

import { deleteEntity, saveEntity } from "./shared"
import type { InterviewFormMessage, InterviewFormState } from "./interviews.types"

// L'entretien s'affiche sur sa mission et fait le statut « RDV planifié » de ses correspondants.
function invalidateInterviewCaches(): void {
  revalidatePath("/admin/entretiens", "layout")
  revalidatePath("/admin/missions", "layout")
  revalidatePath("/admin/leads", "layout")
}

type RuleField = "missionId" | "side" | "correspondentIds" | "newCorrespondents"

class InterviewRuleError extends Error {
  readonly field: RuleField
  readonly code: Exclude<InterviewFormMessage, "unknown_error" | null>

  constructor(field: RuleField, code: InterviewRuleError["code"], message: string) {
    super(message)
    this.field = field
    this.code = code
  }
}

function collectValues(formData: FormData): InterviewFormState["values"] {
  return {
    missionId: stringField(formData, "missionId"),
    side: stringField(formData, "side"),
    correspondentIds: stringValues(formData, "correspondentIds"),
    newCorrespondents: stringField(formData, "newCorrespondents"),
    type: stringField(formData, "type"),
    status: stringField(formData, "status"),
    outcome: stringField(formData, "outcome"),
    scheduledAt: stringField(formData, "scheduledAt"),
    score: stringField(formData, "score"),
    decision: stringField(formData, "decision"),
    notes: stringField(formData, "notes"),
    details: stringField(formData, "details"),
  }
}

// Mener côté ESN suppose que la mission en a une ; les correspondants existants doivent exister et ne pas être opposés.
async function assertInterviewTargets(data: InterviewInput): Promise<void> {
  const mission = await prisma.mission.findUnique({
    where: { id: data.missionId },
    select: { intermediaryId: true },
  })
  if (!mission) {
    throw new InterviewRuleError("missionId", "mission_not_found", "Cette mission n'existe plus, recharge la page")
  }
  if (data.side === "ESN" && !mission.intermediaryId) {
    throw new InterviewRuleError(
      "side",
      "mission_without_intermediary",
      "Cette mission n'a pas d'ESN : l'entretien est mené par le client final",
    )
  }
  if (data.correspondentIds.length > 0) {
    const found = await prisma.person.count({
      where: { id: { in: data.correspondentIds }, optedOutAt: null },
    })
    if (found !== data.correspondentIds.length) {
      throw new InterviewRuleError(
        "correspondentIds",
        "correspondent_not_found",
        "Un des correspondants n'existe plus, recharge la page",
      )
    }
  }
}

// Correspondant inconnu : personne au rôle Contact créée dans la même transaction ; email ou LinkedIn déjà
// connu refusé plutôt que dupliqué (même détection qu'`assertNewIdentity`).
async function createNewCorrespondents(
  tx: Prisma.TransactionClient,
  newCorrespondents: InterviewInput["newCorrespondents"],
): Promise<string[]> {
  const ids: string[] = []
  for (const correspondent of newCorrespondents) {
    const identities: Prisma.PersonWhereInput[] = [
      ...(correspondent.email ? [{ email: correspondent.email }] : []),
      ...(correspondent.linkedinUrl ? [{ linkedinUrl: correspondent.linkedinUrl }] : []),
    ]
    if (identities.length > 0) {
      const existing = await tx.person.findFirst({ where: { OR: identities }, select: { id: true } })
      if (existing) {
        throw new InterviewRuleError(
          "newCorrespondents",
          "correspondent_exists",
          `${correspondent.email ?? correspondent.linkedinUrl} est déjà une personne connue`,
        )
      }
    }
    const person = await tx.person.create({
      data: {
        name: correspondent.name,
        jobRole: correspondent.jobRole,
        zone: correspondent.zone,
        email: correspondent.email,
        phone: correspondent.phone,
        linkedinUrl: correspondent.linkedinUrl,
        metAt: correspondent.metAt,
        notes: correspondent.notes,
        details: correspondent.details,
        companyId: correspondent.companyId,
        contact: {
          create: {
            types: correspondent.jobRole === "RECRUTEUR" ? ["COMMERCIAL"] : ["CONTACT_TECH"],
            status: "ACTIF",
          },
        },
      },
      select: { id: true },
    })
    ids.push(person.id)
  }
  return ids
}

function mapInterviewError(
  err: unknown,
  values: InterviewFormState["values"],
): InterviewFormState | null {
  if (!(err instanceof InterviewRuleError)) return null
  const errors: InterviewFormState["errors"] = {}
  errors[err.field] = [err.message]
  return { ok: false, errors, message: err.code, values }
}

interface SaveInterviewEvents {
  success: string
  failure: string
}

function saveInterview(
  actionName: string,
  events: SaveInterviewEvents,
  formData: FormData,
  persist: (data: InterviewInput) => Promise<unknown>,
): Promise<InterviewFormState> {
  const values = collectValues(formData)

  return saveEntity<InterviewInput, InterviewFormState, unknown>({
    actionName,
    events,
    schema: interviewSchema,
    input: values,
    persist,
    invalidateCaches: invalidateInterviewCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapInterviewError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

export async function createInterview(
  _prevState: InterviewFormState,
  formData: FormData,
): Promise<InterviewFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveInterview(
    "createInterview",
    { success: "interview:created", failure: "interview:create_failed" },
    formData,
    async ({ correspondentIds, newCorrespondents, ...data }) => {
      await assertInterviewTargets({ correspondentIds, newCorrespondents, ...data })
      return prisma.$transaction(async (tx) => {
        const createdIds = await createNewCorrespondents(tx, newCorrespondents)
        return tx.interview.create({
          data: {
            ...data,
            correspondents: { connect: [...correspondentIds, ...createdIds].map((id) => ({ id })) },
          },
        })
      })
    },
  )
}

export async function updateInterview(
  id: string,
  _prevState: InterviewFormState,
  formData: FormData,
): Promise<InterviewFormState> {
  await getCurrentUser()

  return saveInterview(
    "updateInterview",
    { success: "interview:updated", failure: "interview:update_failed" },
    formData,
    async ({ correspondentIds, newCorrespondents, ...data }) => {
      await assertInterviewTargets({ correspondentIds, newCorrespondents, ...data })
      return prisma.$transaction(async (tx) => {
        const createdIds = await createNewCorrespondents(tx, newCorrespondents)
        return tx.interview.update({
          where: { id },
          data: {
            ...data,
            correspondents: {
              set: [...correspondentIds, ...createdIds].map((personId) => ({ id: personId })),
            },
          },
        })
      })
    },
  )
}

export async function deleteInterview(id: string): Promise<InterviewFormState> {
  await getCurrentUser()

  return deleteEntity<InterviewFormState>({
    actionName: "deleteInterview",
    events: { success: "interview:deleted", failure: "interview:delete_failed" },
    successLogFields: { id },
    destroy: () => prisma.interview.delete({ where: { id } }),
    invalidateCaches: invalidateInterviewCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
```

Run: `pnpm vitest run --project unit src/server/actions/interviews.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5 : Lecture**

`src/server/queries/interviews.ts` :

```ts
import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminInterviewInclude = {
  mission: {
    select: {
      id: true,
      title: true,
      dailyRate: true,
      contract: true,
      workMode: true,
      zone: true,
      intermediary: { select: { id: true, name: true, logoFilename: true } },
      client: { select: { id: true, name: true, logoFilename: true } },
    },
  },
  correspondents: {
    select: { id: true, name: true, email: true, linkedinUrl: true, optedOutAt: true },
    orderBy: { name: "asc" },
  },
} as const

export type AdminInterview = Prisma.InterviewGetPayload<{ include: typeof adminInterviewInclude }>

// Sans 'use cache', comme les autres lectures admin : l'administration relit la base juste après ses mutations.
export async function findAllInterviewsForAdmin(): Promise<AdminInterview[]> {
  return prisma.interview.findMany({
    include: adminInterviewInclude,
    orderBy: { scheduledAt: "desc" },
  })
}
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 6 : Effacement demandé

**Files:**
- Modify: `src/server/actions/persons.ts`
- Test: `src/server/actions/persons.test.ts`

**Interfaces:**
- Consumes: `Person.interviews` (Task 1) ; `erasePersonExchanges(id)` (`07`, `09`)
- Produces: rien

- [ ] **Step 1 : Écrire le test qui échoue**

Dans `describe("erasePersonExchanges")` de `src/server/actions/persons.test.ts` :

```ts
  it("removes the person from its interviews", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: new Date("2026-09-01"),
      exchangesErasedAt: null,
    } as never)

    await erasePersonExchanges("p1")

    const data = vi.mocked(prisma.person.update).mock.calls[0]?.[0]?.data as Record<string, unknown>
    expect(data).toHaveProperty("interviews", { set: [] })
  })
```

Run: `pnpm vitest run --project unit src/server/actions/persons.test.ts`
Expected: FAIL, `interviews` absent des données écrites.

- [ ] **Step 2 : Retirer la personne de ses entretiens**

Dans `erasePersonExchanges` (`src/server/actions/persons.ts`), ajouter `interviews: { set: [] }` aux données écrites sur la personne : l'entretien et sa mission restent, seule l'identification de la personne en part.

Run: `pnpm vitest run --project unit src/server/actions/persons.test.ts`
Expected: PASS, les tests du `07` et du `09` compris.

---

### Task 7 : Qualité et contrôle en base

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 6
- Produces: rien

- [ ] **Step 1 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

- [ ] **Step 2 : Entretien et correspondants**

Run: `just db-studio`, puis, dans Studio : une mission via une ESN, deux leads ; créer un entretien Planifié demain, `side` `ESN`, relié à la mission et aux deux leads.
Expected: `status` à `PLANIFIE` par défaut, `outcome` vide ; la table `_InterviewCorrespondents` porte deux lignes vers `Person`.

Run: `just dev`, se connecter, ouvrir Leads > Tous.
Expected: les deux leads affichent « RDV planifié ». Passer l'entretien à `FAIT` dans Studio et recharger : ils reviennent à leur statut saisi.

- [ ] **Step 3 : Suppressions**

Supprimer la mission dans Studio.
Expected: l'entretien disparaît avec elle, les deux leads restent. Supprimer les fiches de test ; `just stop`, fermer Studio.
