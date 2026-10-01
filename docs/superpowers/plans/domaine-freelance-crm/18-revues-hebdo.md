# Revues hebdo : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le modèle `WeeklyReview`, le calcul des sept compteurs d'une semaine depuis le CRM, les trois taux, et l'écran Revues hebdo (vues Revue, Calendrier, Journal, formulaire, détail, suppression).

**Architecture:** Trois modules purs testés portent les règles : `weekly-reviews` (libellés, semaine, taux), `review-counters` (bornes de la semaine à Paris, comptage) et `review-views` (période). Les actions enregistrent le vendredi de clôture et refusent une seconde revue sur ce vendredi ; `computeWeekCounters` lit actions, entretiens et leads sans rien écrire, pour pré-remplir le formulaire. L'écran reprend les motifs des listes admin et l'EventCalendar du `12`, dont les textes français sortent dans un module commun.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4, Next.js 16 (Server Actions, App Router), React 19, `@date-fns/tz`, ReUI EventCalendar, shadcn/ui `radix-nova`, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/18-revues-hebdo-design.md`

## Global Constraints

- **Prérequis** : plans `07` (`NONE_VALUE`, `optionalTextField`, `src/lib/schemas/person.ts`), `08` (`SelectField`), `09` (actions, canaux, statuts, `respondedAt`), `12` (EventCalendar, `src/lib/action-calendar.ts`, `@date-fns/tz`) et `16` (`Interview`, `leadDisplayStatus(lead, now)`, `AdminLead.interviews`) implémentés.
- **Enums, valeurs exactes** : `ReviewStatus` `BONNE`, `MOYENNE`, `MAUVAISE` ; `ReviewMotivation` `HAUTE`, `POSITIVE`, `NEUTRE`, `BASSE`.
- **Semaine** : les sept jours qui finissent le vendredi de clôture, du samedi 0 h au samedi suivant 0 h, fuseau `Europe/Paris` (règle de `/crm-weekly-review`) ; la revue stocke son vendredi (`@db.Date`), une seule par vendredi ; le formulaire n'accepte qu'un vendredi, par défaut aujourd'hui si c'est un vendredi, sinon le dernier passé. Aucun refus d'une semaine manquante : une semaine oubliée se rattrape. Libellé « S36 · Semaine du 31/08/2026 » : numéro de semaine ISO sur deux chiffres, puis date du lundi (vendredi − 4), écart à la maquette décidé par le propriétaire ; le vendredi a sa propre colonne « Vendredi ».
- **Comptage** : Connexions envoyées (Connexion LinkedIn hors À faire, date d'envoi), Connexions acceptées (Connexion LinkedIn Répondu ou Converti, date de réponse), Messages envoyés (DM LinkedIn, Email, SMS/WhatsApp hors À faire, date d'envoi), Conversations engagées (ces canaux, Répondu ou Converti, date de réponse), RDV décrochés (ces canaux, Converti, date de réponse), Entretiens (entretiens au statut Fait, date dans la semaine), Leads actifs (personnes au rôle Lead, non opposées, au statut affiché Suspect, Discussion ou RDV planifié).
- **Taux** : acceptation = acceptées / envoyées, réponse = conversations / messages, conversion RDV = RDV / conversations ; entier arrondi, « 50 % » (espace insécable), valeur absente (`null`, rendue par `EmptyValue`) si le dénominateur est nul.
- **Textes** : « Une revue existe déjà pour cette semaine » (`review_week_exists`) ; « Choisissez un vendredi » ; « Un entier de 0 à 999 » ; titres, sous-titres, périodes, colonnes, formulaire et texte de suppression de la maquette (`revViewTitle`, `revViewHint`, `revPeriodItems`, `REV_COLS`, `dlgReviewForm` : « Clôturer la semaine » à la création, « Modifier S36 · Semaine du 31/08/2026 » (`weekLabel`) en modification, `dlgDeleteReview`). Le titre de suppression reste celui de `ConfirmDeleteDialog` (« Supprimer « Semaine du … » ? »), commun aux écrans admin.
- **Routes** : Revue `/admin/revues-hebdo`, Calendrier `/admin/revues-hebdo/calendrier`, Journal `/admin/revues-hebdo/journal`.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Semaine du changement d'heure** (dernier dimanche d'octobre) : bornes au samedi 0 h de Paris des deux côtés, la semaine faisant 169 heures. Couvert par « keeps the week from Saturday to Friday in Paris time », qui prend la semaine close le vendredi 30 octobre 2026 (Task 2).
- **Revue faite en retard un samedi** : le formulaire propose la veille, jamais le vendredi suivant. Couvert par « defaults to today on a Friday, otherwise to the last Friday », dont un cas tombe un samedi (Task 1).
- **Modifier une revue sans changer sa semaine** : pas de refus pour doublon d'elle-même. Couvert par « ignores the review being edited when checking its week » (Task 4).
- **Vendredi choisi dans un navigateur à l'ouest de Greenwich** : le vendredi enregistré reste celui cliqué, jamais la veille (date locale envoyée en AAAA-MM-JJ, relue en UTC). Vérifié à la Task 8, Step 1.
- **Calendrier** : une revue apparaît sur son vendredi, pas la veille, quel que soit le fuseau du navigateur. Vérifié à la Task 8, Step 3.

---

### Task 1 : Modèle, migration, libellés et taux

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_weekly_reviews/migration.sql`
- Create: `src/lib/weekly-reviews.ts`
- Test: `src/lib/weekly-reviews.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: modèle `WeeklyReview`, enums `ReviewStatus`, `ReviewMotivation` ; `REVIEW_STATUS_LABELS`, `REVIEW_MOTIVATION_LABELS`, `REVIEW_FIELD_LABELS` ; `isoDayToDate(isoDay: string): Date` ; `isFridayIso(isoDay: string): boolean` ; `defaultClosingFriday(now: Date): Date` ; `weekLabel(closingFriday: Date): string` ; `formatWeekDate(date: Date): string` ; `interface ReviewCounts` ; `reviewRates(review: ReviewCounts): { acceptance: number | null; response: number | null; meetingConversion: number | null }` ; `formatRate(value: number | null): string | null`

- [ ] **Step 1 : Enums et modèle**

Dans `prisma/schema.prisma`, après l'enum `InterviewDecision` :

```prisma
enum ReviewStatus {
  BONNE
  MOYENNE
  MAUVAISE

  @@schema("freelance")
}

enum ReviewMotivation {
  HAUTE
  POSITIVE
  NEUTRE
  BASSE

  @@schema("freelance")
}
```

Après le modèle `Interview` :

```prisma
model WeeklyReview {
  id                   String            @id @default(uuid(7))
  // Vendredi de clôture : la période comptée et le libellé s'en déduisent. Une revue par vendredi.
  closingFriday        DateTime          @unique @db.Date
  // Figés à l'enregistrement : un recalcul réécrirait l'historique.
  connectionsSent      Int               @default(0)
  connectionsAccepted  Int               @default(0)
  messagesSent         Int               @default(0)
  conversationsEngaged Int               @default(0)
  meetingsBooked       Int               @default(0)
  interviewsHeld       Int               @default(0)
  activeLeads          Int               @default(0)
  status               ReviewStatus?
  motivation           ReviewMotivation?
  wins                 String?
  blockers             String?
  nextWeekPlan         String?
  notes            String?

  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@schema("freelance")
}
```

- [ ] **Step 2 : Migration**

Run: `pnpm prisma migrate dev --name weekly_reviews`, puis `just db-test`
Expected: migration créée et appliquée en dev et en test ; deux types d'enum, la table `"freelance"."WeeklyReview"` et l'index unique `WeeklyReview_closingFriday_key`. Aucune modification à la main.

- [ ] **Step 3 : Écrire les tests des taux et du libellé**

`src/lib/weekly-reviews.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { defaultClosingFriday, formatRate, reviewRates, weekLabel } from "./weekly-reviews"

const COUNTS = {
  connectionsSent: 18,
  connectionsAccepted: 9,
  messagesSent: 14,
  conversationsEngaged: 5,
  meetingsBooked: 2,
  interviewsHeld: 1,
  activeLeads: 4,
}

describe("reviewRates", () => {
  it("computes the three rates rounded to the unit", () => {
    const rates = reviewRates(COUNTS)

    expect(rates).toEqual({ acceptance: 50, response: 36, meetingConversion: 40 })
    expect(formatRate(rates.acceptance)).toBe("50 %")
  })

  it("leaves the rate empty when the denominator is zero", () => {
    const rates = reviewRates({ ...COUNTS, messagesSent: 0, conversationsEngaged: 0 })

    expect(rates.response).toBeNull()
    expect(rates.meetingConversion).toBeNull()
    expect(formatRate(rates.response)).toBeNull()
  })
})

describe("weekLabel", () => {
  it("labels the week with its ISO number across the year boundary", () => {
    const summer = weekLabel(new Date(Date.UTC(2026, 8, 4)))
    const newYear = weekLabel(new Date(Date.UTC(2026, 0, 2)))
    const lastWeek = weekLabel(new Date(Date.UTC(2027, 0, 1)))

    expect(summer).toBe("S36 · Semaine du 31/08/2026")
    expect(newYear).toBe("S01 · Semaine du 29/12/2025")
    expect(lastWeek).toBe("S53 · Semaine du 28/12/2026")
  })
})

describe("defaultClosingFriday", () => {
  it("defaults to today on a Friday, otherwise to the last Friday", () => {
    const friday = defaultClosingFriday(new Date(2026, 8, 25, 18, 0))
    const saturday = defaultClosingFriday(new Date(2026, 8, 26, 10, 0))
    const thursday = defaultClosingFriday(new Date(2026, 9, 1, 9, 0))

    expect(friday).toEqual(new Date(2026, 8, 25))
    expect(saturday).toEqual(new Date(2026, 8, 25))
    expect(thursday).toEqual(new Date(2026, 8, 25))
  })
})
```

Run: `pnpm vitest run --project unit src/lib/weekly-reviews.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 4 : Libellés, semaine et taux**

`src/lib/weekly-reviews.ts` :

```ts
import type { ReviewMotivation, ReviewStatus } from "@/generated/prisma/client"

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  BONNE: "Bonne",
  MOYENNE: "Moyenne",
  MAUVAISE: "Mauvaise",
}

export const REVIEW_MOTIVATION_LABELS: Record<ReviewMotivation, string> = {
  HAUTE: "Haute",
  POSITIVE: "Positive",
  NEUTRE: "Neutre",
  BASSE: "Basse",
}

export const REVIEW_FIELD_LABELS = {
  week: "Semaine",
  closingFriday: "Date vendredi",
  friday: "Vendredi",
  status: "Statut",
  motivation: "Motivation",
  connectionsSent: "Connexions envoyées",
  connectionsAccepted: "Connexions acceptées",
  acceptanceRate: "Taux acceptation",
  messagesSent: "Messages envoyés",
  conversationsEngaged: "Conversations engagées",
  // Libellé court de la liste et de la vue détail (REV_COLS de la maquette), le formulaire gardant le long.
  conversations: "Conversations",
  responseRate: "Taux réponse",
  meetingsBooked: "RDV décrochés",
  meetingConversion: "Conversion RDV",
  interviewsHeld: "Entretiens",
  activeLeads: "Leads actifs",
  wins: "Victoires",
  blockers: "Blocages",
  nextWeekPlan: "Plan S+1",
  notes: "Notes libres",
} as const

const DAY_MS = 86_400_000

// Colonne date : le vendredi arrive à minuit UTC, il se lit et se formate en UTC.
const WEEK_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

export function isoDayToDate(isoDay: string): Date {
  const [year = 0, month = 1, day = 1] = isoDay.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function isFridayIso(isoDay: string): boolean {
  return isoDayToDate(isoDay).getUTCDay() === 5
}

// Revue faite en retard : clôture le dernier vendredi passé, jamais le suivant ; date locale, celle qu'attend le Calendar.
export function defaultClosingFriday(now: Date): Date {
  const daysSinceFriday = (now.getDay() + 2) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceFriday)
}

// Numéro ISO : le jeudi de la semaine fixe son année, d'où « S01 » pour une semaine qui commence en décembre.
function isoWeekNumber(closingFriday: Date): number {
  const thursday = new Date(closingFriday.getTime() - DAY_MS)
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.floor((thursday.getTime() - yearStart) / (7 * DAY_MS)) + 1
}

export function weekLabel(closingFriday: Date): string {
  const week = String(isoWeekNumber(closingFriday)).padStart(2, "0")
  const monday = new Date(closingFriday.getTime() - 4 * DAY_MS)
  return `S${week} · Semaine du ${WEEK_DATE.format(monday)}`
}

export function formatWeekDate(date: Date): string {
  return WEEK_DATE.format(date)
}

export interface ReviewCounts {
  connectionsSent: number
  connectionsAccepted: number
  messagesSent: number
  conversationsEngaged: number
  meetingsBooked: number
  interviewsHeld: number
  activeLeads: number
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100)
}

// Formules Notion reprises : jamais stockées, elles se déduisent des compteurs figés.
export function reviewRates(review: ReviewCounts): {
  acceptance: number | null
  response: number | null
  meetingConversion: number | null
} {
  return {
    acceptance: rate(review.connectionsAccepted, review.connectionsSent),
    response: rate(review.conversationsEngaged, review.messagesSent),
    meetingConversion: rate(review.meetingsBooked, review.conversationsEngaged),
  }
}

// Sans dénominateur, null : DataTable et DetailDialog posent alors EmptyValue, jamais un tiret de l'écran.
export function formatRate(value: number | null): string | null {
  return value === null ? null : `${value} %`
}
```

Run: `pnpm vitest run --project unit src/lib/weekly-reviews.test.ts`
Expected: PASS.

---

### Task 2 : Semaine à Paris et comptage

**Files:**
- Create: `src/lib/review-counters.ts`
- Test: `src/lib/review-counters.test.ts`

**Interfaces:**
- Consumes: `ReviewCounts` (Task 1) ; `leadDisplayStatus`, `LeadStatusSource` (`16`) ; types `ActionChannel`, `ActionStatus`, `InterviewStatus`
- Produces: `weekBounds(closingFriday: Date): { start: Date; end: Date }` ; `interface CounterSources` ; `countWeek(sources: CounterSources, bounds: { start: Date; end: Date }, now: number): ReviewCounts`

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/review-counters.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import type { ActionChannel, ActionStatus, InterviewStatus } from "@/generated/prisma/client"

import { countWeek, weekBounds, type CounterSources } from "./review-counters"

// Semaine close le vendredi 25 septembre 2026 : du 18 septembre 22 h UTC au 25 septembre 22 h UTC (heure d'été).
const BOUNDS = weekBounds(new Date(Date.UTC(2026, 8, 25)))
const IN_WEEK = new Date("2026-09-23T10:00:00.000Z")
const BEFORE = new Date("2026-09-18T10:00:00.000Z")
const NOW = new Date("2026-09-25T12:00:00.000Z").getTime()

function action(
  channel: ActionChannel,
  status: ActionStatus,
  occurredAt: Date,
  respondedAt: Date | null = null,
) {
  return { channel, status, occurredAt, respondedAt }
}

function sources(overrides: Partial<CounterSources> = {}): CounterSources {
  return { actions: [], interviews: [], leads: [], ...overrides }
}

type LeadSource = CounterSources["leads"][number]

function lead(status: LeadSource["status"], overrides: Partial<LeadSource> = {}): LeadSource {
  return { status, missions: [], interviews: [], optedOutAt: null, ...overrides }
}

describe("countWeek", () => {
  it("counts sent connections and messages by their sending date", () => {
    const counts = countWeek(
      sources({
        actions: [
          action("CONNEXION_LINKEDIN", "FAIT", IN_WEEK),
          action("CONNEXION_LINKEDIN", "REPONDU", IN_WEEK, IN_WEEK),
          action("CONNEXION_LINKEDIN", "A_FAIRE", IN_WEEK),
          action("CONNEXION_LINKEDIN", "FAIT", BEFORE),
          action("DM_LINKEDIN", "FAIT", IN_WEEK),
          action("EMAIL", "CONVERTI", IN_WEEK, IN_WEEK),
          action("CALL", "FAIT", IN_WEEK),
        ],
      }),
      BOUNDS,
      NOW,
    )

    expect(counts.connectionsSent).toBe(2)
    expect(counts.messagesSent).toBe(2)
  })

  it("counts acceptances, replies and booked meetings in the week the reply arrived", () => {
    const counts = countWeek(
      sources({
        actions: [
          action("CONNEXION_LINKEDIN", "REPONDU", BEFORE, IN_WEEK),
          action("DM_LINKEDIN", "REPONDU", BEFORE, IN_WEEK),
          action("SMS_WHATSAPP", "CONVERTI", BEFORE, IN_WEEK),
          action("EMAIL", "REPONDU", IN_WEEK, BEFORE),
        ],
      }),
      BOUNDS,
      NOW,
    )

    expect(counts.connectionsAccepted).toBe(1)
    expect(counts.conversationsEngaged).toBe(2)
    expect(counts.meetingsBooked).toBe(1)
    expect(counts.messagesSent).toBe(1)
  })

  it("counts interviews held in the week from the interview records", () => {
    const counts = countWeek(
      sources({
        interviews: [
          { status: "FAIT", scheduledAt: IN_WEEK },
          { status: "PLANIFIE", scheduledAt: IN_WEEK },
          { status: "ANNULE", scheduledAt: IN_WEEK },
          { status: "FAIT", scheduledAt: BEFORE },
        ],
      }),
      BOUNDS,
      NOW,
    )

    expect(counts.interviewsHeld).toBe(1)
  })

  it("counts active leads by their displayed status, opted-out leads excluded", () => {
    const counts = countWeek(
      sources({
        leads: [
          lead("SUSPECT"),
          lead("DISCUSSION"),
          lead("NOUVEAU", {
            interviews: [{ status: "PLANIFIE", scheduledAt: new Date("2026-09-30T10:00:00.000Z") }],
          }),
          lead("NOUVEAU"),
          lead("DISCUSSION", { missions: [{ status: "ACCEPTEE" }] }),
          lead("SUSPECT", { optedOutAt: new Date("2026-09-01T10:00:00.000Z") }),
        ],
      }),
      BOUNDS,
      NOW,
    )

    expect(counts.activeLeads).toBe(3)
  })
})

describe("weekBounds", () => {
  it("keeps the week from Saturday to Friday in Paris time", () => {
    const summer = weekBounds(new Date(Date.UTC(2026, 8, 25)))
    const clockChange = weekBounds(new Date(Date.UTC(2026, 9, 30)))

    expect(summer.start.toISOString()).toBe("2026-09-18T22:00:00.000Z")
    expect(summer.end.toISOString()).toBe("2026-09-25T22:00:00.000Z")
    expect(clockChange.start.toISOString()).toBe("2026-10-23T22:00:00.000Z")
    expect(clockChange.end.toISOString()).toBe("2026-10-30T23:00:00.000Z")
  })
})
```

Run: `pnpm vitest run --project unit src/lib/review-counters.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Écrire le comptage**

`src/lib/review-counters.ts` :

```ts
import { TZDate } from "@date-fns/tz"

import type { ActionChannel, ActionStatus, InterviewStatus } from "@/generated/prisma/client"
import { leadDisplayStatus, type LeadStatusSource } from "@/lib/lead-display-status"
import type { ReviewCounts } from "@/lib/weekly-reviews"

const TIME_ZONE = "Europe/Paris"

// Sept jours du samedi 0 h au samedi suivant 0 h à Paris (le week-end compte dans la semaine suivante,
// /crm-weekly-review du toolkit) ; un changement d'heure ne décale pas les bornes.
export function weekBounds(closingFriday: Date): { start: Date; end: Date } {
  const year = closingFriday.getUTCFullYear()
  const month = closingFriday.getUTCMonth()
  const day = closingFriday.getUTCDate()
  return {
    start: new Date(new TZDate(year, month, day - 6, 0, 0, TIME_ZONE).getTime()),
    end: new Date(new TZDate(year, month, day + 1, 0, 0, TIME_ZONE).getTime()),
  }
}

export interface CounterSources {
  actions: readonly {
    channel: ActionChannel
    status: ActionStatus
    occurredAt: Date
    respondedAt: Date | null
  }[]
  interviews: readonly { status: InterviewStatus; scheduledAt: Date }[]
  leads: readonly (LeadStatusSource & { optedOutAt: Date | null })[]
}

const MESSAGE_CHANNELS: ReadonlySet<ActionChannel> = new Set(["DM_LINKEDIN", "EMAIL", "SMS_WHATSAPP"])
const REPLIED: ReadonlySet<ActionStatus> = new Set(["REPONDU", "CONVERTI"])
const ACTIVE = new Set(["SUSPECT", "DISCUSSION", "RDV_PLANIFIE"])

// Règles de kpis-hebdo.md (toolkit), corrigées : la réponse compte à respondedAt, l'entretien tenu au statut
// FAIT, l'issue ne jouant aucun rôle.
export function countWeek(
  sources: CounterSources,
  bounds: { start: Date; end: Date },
  now: number,
): ReviewCounts {
  const inWeek = (date: Date | null) =>
    date !== null && date >= bounds.start && date < bounds.end
  const sent = sources.actions.filter((action) => action.status !== "A_FAIRE" && inWeek(action.occurredAt))
  const replied = sources.actions.filter(
    (action) => REPLIED.has(action.status) && inWeek(action.respondedAt),
  )
  const isConnection = (action: { channel: ActionChannel }) => action.channel === "CONNEXION_LINKEDIN"
  const isMessage = (action: { channel: ActionChannel }) => MESSAGE_CHANNELS.has(action.channel)

  return {
    connectionsSent: sent.filter(isConnection).length,
    connectionsAccepted: replied.filter(isConnection).length,
    messagesSent: sent.filter(isMessage).length,
    conversationsEngaged: replied.filter(isMessage).length,
    meetingsBooked: replied.filter((action) => isMessage(action) && action.status === "CONVERTI").length,
    interviewsHeld: sources.interviews.filter(
      (interview) => interview.status === "FAIT" && inWeek(interview.scheduledAt),
    ).length,
    activeLeads: sources.leads.filter(
      (lead) => lead.optedOutAt === null && ACTIVE.has(leadDisplayStatus(lead, now)),
    ).length,
  }
}
```

Run: `pnpm vitest run --project unit src/lib/review-counters.test.ts`
Expected: PASS.

---

### Task 3 : Vues et largeurs

**Files:**
- Create: `src/lib/review-views.ts`
- Test: `src/lib/review-views.test.ts`
- Modify: `src/lib/admin-table-widths.ts`

**Interfaces:**
- Consumes: rien
- Produces: `type ReviewView = "revue" | "calendrier" | "journal"` ; `type ReviewPeriod = "30j" | "mois" | "annee"` ; `REVIEW_PERIODS: readonly { value: ReviewPeriod; label: string }[]` ; `isReviewPeriod(value: string): value is ReviewPeriod` ; `reviewsForPeriod<T extends { closingFriday: Date }>(reviews: readonly T[], period: ReviewPeriod, now: Date): T[]` ; `reviewsByRecency<T extends { closingFriday: Date }>(reviews: readonly T[]): T[]` ; `REVIEW_VIEW_PAGES` ; `REVIEW_COLUMN_WIDTHS`, `ReviewColumnKey`, `REVIEW_DEFAULT_VISIBLE_COLUMNS`, `reviewSkeletonWidths()`

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/review-views.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { reviewsForPeriod } from "./review-views"

const NOW = new Date(2026, 8, 27, 12, 0)

function review(id: string, friday: [number, number, number]) {
  return { id, closingFriday: new Date(Date.UTC(...friday)) }
}

describe("reviewsForPeriod", () => {
  it("keeps the reviews of the chosen period, most recent first", () => {
    const reviews = [
      review("early-september", [2026, 8, 11]),
      review("mid-august", [2026, 7, 21]),
      review("last-week", [2026, 8, 25]),
    ]

    const rows = reviewsForPeriod(reviews, "30j", NOW)

    expect(rows.map((row) => row.id)).toEqual(["last-week", "early-september"])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/review-views.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Écrire les vues**

`src/lib/review-views.ts` :

```ts
export type ReviewView = "revue" | "calendrier" | "journal"

export type ReviewPeriod = "30j" | "mois" | "annee"

export const REVIEW_PERIODS: readonly { value: ReviewPeriod; label: string }[] = [
  { value: "30j", label: "30 derniers jours" },
  { value: "mois", label: "Mois en cours" },
  { value: "annee", label: "Année en cours" },
]

export function isReviewPeriod(value: string): value is ReviewPeriod {
  return REVIEW_PERIODS.some((period) => period.value === value)
}

const DAY_MS = 86_400_000

export function reviewsByRecency<T extends { closingFriday: Date }>(reviews: readonly T[]): T[] {
  return [...reviews].sort((a, b) => b.closingFriday.getTime() - a.closingFriday.getTime())
}

// Colonne date : le vendredi arrive à minuit UTC, son mois et son année se lisent en UTC.
export function reviewsForPeriod<T extends { closingFriday: Date }>(
  reviews: readonly T[],
  period: ReviewPeriod,
  now: Date,
): T[] {
  const keep = (review: T) => {
    const friday = review.closingFriday
    if (period === "30j") return friday.getTime() >= now.getTime() - 30 * DAY_MS
    if (period === "annee") return friday.getUTCFullYear() === now.getFullYear()
    return friday.getUTCFullYear() === now.getFullYear() && friday.getUTCMonth() === now.getMonth()
  }
  return reviewsByRecency(reviews.filter(keep))
}

export const REVIEW_VIEW_PAGES: Record<ReviewView, { title: string; subtitle: string }> = {
  revue: {
    title: "Revue hebdo",
    subtitle: "Les dernières semaines pour lire la tendance. Rituel du vendredi 17 h. Les taux se calculent.",
  },
  calendrier: {
    title: "Calendrier des revues",
    subtitle: "Une revue par semaine, posée sur son vendredi de clôture.",
  },
  journal: {
    title: "Journal des revues",
    subtitle: "Toutes les revues, la plus récente en premier.",
  },
}
```

Run: `pnpm vitest run --project unit src/lib/review-views.test.ts`
Expected: PASS.

- [ ] **Step 3 : Largeurs**

Dans `src/lib/admin-table-widths.ts`, ajouter en tête l'import de type `import type { ReviewView } from "@/lib/review-views"` (Task 3), puis à la fin :

```ts
export const REVIEW_COLUMN_WIDTHS = {
  // Libellé le plus long : « S53 · Semaine du 28/12/2026 ».
  week: 240,
  friday: 110,
  // Une colonne triable tient son en-tête sur une ligne : libellé, icône de tri et marges du bouton dictent sa largeur.
  connectionsSent: 180,
  connectionsAccepted: 190,
  acceptanceRate: 150,
  messagesSent: 160,
  conversationsEngaged: 140,
  responseRate: 130,
  meetingsBooked: 140,
  meetingConversion: 150,
  interviewsHeld: 110,
  activeLeads: 120,
  status: 110,
  motivation: 110,
  actions: 88,
} as const

export type ReviewColumnKey = keyof typeof REVIEW_COLUMN_WIDTHS

// Revue : colonnes affichées de la maquette (revCols), plus le vendredi des vues Notion.
// Journal, la vue complète, montre toutes ses colonnes (arbitrage « Colonnes par vue »). Le calendrier,
// sans table, garde celles de Revue pour son squelette de chargement.
export const REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<ReviewView, readonly ReviewColumnKey[]> = {
  revue: [
    "friday",
    "connectionsSent",
    "connectionsAccepted",
    "acceptanceRate",
    "messagesSent",
    "responseRate",
    "meetingsBooked",
    "activeLeads",
    "status",
    "motivation",
  ],
  calendrier: [
    "friday",
    "connectionsSent",
    "connectionsAccepted",
    "acceptanceRate",
    "messagesSent",
    "responseRate",
    "meetingsBooked",
    "activeLeads",
    "status",
    "motivation",
  ],
  journal: [
    "friday",
    "connectionsSent",
    "connectionsAccepted",
    "acceptanceRate",
    "messagesSent",
    "conversationsEngaged",
    "responseRate",
    "meetingsBooked",
    "meetingConversion",
    "interviewsHeld",
    "activeLeads",
    "status",
    "motivation",
  ],
}

export function reviewSkeletonWidths(view: ReviewView): readonly number[] {
  const keys: readonly ReviewColumnKey[] = [
    "week",
    ...REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
    "actions",
  ]
  return keys.map((key) => REVIEW_COLUMN_WIDTHS[key])
}
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Validation, Server Actions et lecture

**Files:**
- Create: `src/lib/schemas/weekly-review.ts`
- Create: `src/server/actions/weekly-reviews.types.ts`
- Create: `src/server/actions/weekly-reviews.ts`
- Test: `src/server/actions/weekly-reviews.test.ts`
- Create: `src/server/queries/weekly-reviews.ts`

**Interfaces:**
- Consumes: Tasks 1 et 2 ; `NONE_VALUE`, `optionalTextField` (`07`) ; `nullifyNoneValue` ; `saveEntity`, `deleteEntity` ; `createActionLogger`, `isPrismaError`, `stringField`
- Produces: `weeklyReviewSchema`, `WeeklyReviewInput`, `REVIEW_STATUSES`, `REVIEW_MOTIVATIONS` ; `WeeklyReviewFormState`, `initialWeeklyReviewFormState` ; `createWeeklyReview(prev, formData)`, `updateWeeklyReview(id, prev, formData)`, `deleteWeeklyReview(id)` ; `computeWeekCounters(isoFriday: string): Promise<{ ok: true; counts: ReviewCounts } | { ok: false }>` ; `AdminWeeklyReview`, `findAllWeeklyReviewsForAdmin()`

- [ ] **Step 1 : Schéma**

`src/lib/schemas/weekly-review.ts` :

```ts
import { z } from "zod"

import { ReviewMotivation, ReviewStatus } from "@/generated/prisma/browser"
import { nullifyNoneValue } from "@/lib/schemas/none-value"
import { NONE_VALUE, optionalTextField } from "@/lib/schemas/person"
import { isFridayIso, isoDayToDate } from "@/lib/weekly-reviews"

export const REVIEW_STATUSES = Object.values(ReviewStatus)
export const REVIEW_MOTIVATIONS = Object.values(ReviewMotivation)

const counter = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 999), {
    error: "Un entier de 0 à 999",
  })
  .transform((value) => (value === "" ? 0 : Number(value)))

export const weeklyReviewSchema = z.object({
  closingFriday: z.iso
    .date({ error: "Choisissez un vendredi" })
    .refine(isFridayIso, { error: "Choisissez un vendredi" })
    .transform(isoDayToDate),
  connectionsSent: counter,
  connectionsAccepted: counter,
  messagesSent: counter,
  conversationsEngaged: counter,
  meetingsBooked: counter,
  interviewsHeld: counter,
  activeLeads: counter,
  status: z
    .union([z.enum(ReviewStatus), z.literal(NONE_VALUE), z.literal("")], { error: "Statut inconnu" })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  motivation: z
    .union([z.enum(ReviewMotivation), z.literal(NONE_VALUE), z.literal("")], {
      error: "Motivation inconnue",
    })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  wins: optionalTextField,
  blockers: optionalTextField,
  nextWeekPlan: optionalTextField,
  notes: optionalTextField,
})

export type WeeklyReviewInput = z.infer<typeof weeklyReviewSchema>
```

- [ ] **Step 2 : Types de l'état**

`src/server/actions/weekly-reviews.types.ts` :

```ts
import type { FormActionState } from "@/lib/form-state"
import type { WeeklyReviewInput } from "@/lib/schemas/weekly-review"

export type WeeklyReviewFormMessage = "review_week_exists" | "unknown_error" | null

export type WeeklyReviewFormState = FormActionState<WeeklyReviewInput, WeeklyReviewFormMessage>

export const initialWeeklyReviewFormState: WeeklyReviewFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

- [ ] **Step 3 : Écrire les tests qui échouent**

`src/server/actions/weekly-reviews.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    weeklyReview: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findFirst: vi.fn() },
  },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/person"

import { createWeeklyReview, updateWeeklyReview } from "./weekly-reviews"
import { initialWeeklyReviewFormState } from "./weekly-reviews.types"

const BASE_FIELDS = {
  closingFriday: "2026-09-11",
  connectionsSent: "18",
  connectionsAccepted: "9",
  messagesSent: "14",
  conversationsEngaged: "5",
  meetingsBooked: "2",
  interviewsHeld: "1",
  activeLeads: "4",
  status: NONE_VALUE,
  motivation: NONE_VALUE,
  wins: "",
  blockers: "",
  nextWeekPlan: "",
  notes: "",
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

// `vi.clearAllMocks` n'efface que les appels : les réponses sont remises à chaque test.
beforeEach(() => {
  vi.mocked(prisma.weeklyReview.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.weeklyReview.create).mockResolvedValue({ id: "r1" } as never)
  vi.mocked(prisma.weeklyReview.update).mockResolvedValue({ id: "r1" } as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("createWeeklyReview", () => {
  it("rejects a day that is not a Friday", async () => {
    const state = await createWeeklyReview(
      initialWeeklyReviewFormState,
      buildFormData({ closingFriday: "2026-09-10" }),
    )

    expect(state.errors.closingFriday).toEqual(["Choisissez un vendredi"])
    expect(prisma.weeklyReview.create).not.toHaveBeenCalled()
  })

  it("refuses a second review for the same week", async () => {
    vi.mocked(prisma.weeklyReview.findFirst).mockResolvedValue({ id: "r0" } as never)

    const state = await createWeeklyReview(initialWeeklyReviewFormState, buildFormData())

    expect(state.message).toBe("review_week_exists")
    expect(state.errors.closingFriday).toEqual(["Une revue existe déjà pour cette semaine"])
    expect(prisma.weeklyReview.create).not.toHaveBeenCalled()
  })

  it("rejects a negative counter", async () => {
    const state = await createWeeklyReview(
      initialWeeklyReviewFormState,
      buildFormData({ messagesSent: "-1" }),
    )

    expect(state.errors.messagesSent).toEqual(["Un entier de 0 à 999"])
    expect(prisma.weeklyReview.create).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createWeeklyReview(initialWeeklyReviewFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.weeklyReview.findFirst).not.toHaveBeenCalled()
  })
})

describe("updateWeeklyReview", () => {
  it("ignores the review being edited when checking its week", async () => {
    await updateWeeklyReview("r1", initialWeeklyReviewFormState, buildFormData())

    expect(prisma.weeklyReview.findFirst).toHaveBeenCalledWith(
      objectMatch({ where: objectMatch({ NOT: { id: "r1" } }) }),
    )
  })
})
```

Run: `pnpm vitest run --project unit src/server/actions/weekly-reviews.test.ts`
Expected: FAIL, module `./weekly-reviews` introuvable.

- [ ] **Step 4 : Écrire les actions**

`src/server/actions/weekly-reviews.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { countWeek, weekBounds } from "@/lib/review-counters"
import { weeklyReviewSchema, type WeeklyReviewInput } from "@/lib/schemas/weekly-review"
import { createActionLogger, isPrismaError, stringField } from "@/lib/server-utils"
import { isFridayIso, isoDayToDate, type ReviewCounts } from "@/lib/weekly-reviews"

import { deleteEntity, saveEntity } from "./shared"
import type { WeeklyReviewFormState } from "./weekly-reviews.types"

const REVIEWS_PATH = "/admin/revues-hebdo"
const WEEK_TAKEN = "Une revue existe déjà pour cette semaine"

class WeekTakenError extends Error {}

const COUNTER_FIELDS = [
  "connectionsSent",
  "connectionsAccepted",
  "messagesSent",
  "conversationsEngaged",
  "meetingsBooked",
  "interviewsHeld",
  "activeLeads",
] as const

function collectValues(formData: FormData): WeeklyReviewFormState["values"] {
  const values: Record<string, string> = {}
  for (const key of [
    "closingFriday",
    ...COUNTER_FIELDS,
    "status",
    "motivation",
    "wins",
    "blockers",
    "nextWeekPlan",
    "notes",
  ]) {
    values[key] = stringField(formData, key)
  }
  return values as WeeklyReviewFormState["values"]
}

async function assertFreeWeek(closingFriday: Date, currentId: string | null): Promise<void> {
  const taken = await prisma.weeklyReview.findFirst({
    where: { closingFriday, ...(currentId ? { NOT: { id: currentId } } : {}) },
    select: { id: true },
  })
  if (taken) throw new WeekTakenError()
}

function mapReviewError(
  err: unknown,
  values: WeeklyReviewFormState["values"],
): WeeklyReviewFormState | null {
  if (err instanceof WeekTakenError || isPrismaError(err, "P2002")) {
    return { ok: false, errors: { closingFriday: [WEEK_TAKEN] }, message: "review_week_exists", values }
  }
  return null
}

function saveReview(
  actionName: string,
  events: { success: string; failure: string },
  formData: FormData,
  persist: (data: WeeklyReviewInput) => Promise<unknown>,
): Promise<WeeklyReviewFormState> {
  const values = collectValues(formData)

  return saveEntity<WeeklyReviewInput, WeeklyReviewFormState, unknown>({
    actionName,
    events,
    schema: weeklyReviewSchema,
    input: values,
    persist,
    invalidateCaches: () => {
      revalidatePath(REVIEWS_PATH, "layout")
    },
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapReviewError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

export async function createWeeklyReview(
  _prevState: WeeklyReviewFormState,
  formData: FormData,
): Promise<WeeklyReviewFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveReview(
    "createWeeklyReview",
    { success: "weekly_review:created", failure: "weekly_review:create_failed" },
    formData,
    async (data) => {
      await assertFreeWeek(data.closingFriday, null)
      return prisma.weeklyReview.create({ data })
    },
  )
}

export async function updateWeeklyReview(
  id: string,
  _prevState: WeeklyReviewFormState,
  formData: FormData,
): Promise<WeeklyReviewFormState> {
  await getCurrentUser()

  return saveReview(
    "updateWeeklyReview",
    { success: "weekly_review:updated", failure: "weekly_review:update_failed" },
    formData,
    async (data) => {
      await assertFreeWeek(data.closingFriday, id)
      return prisma.weeklyReview.update({ where: { id }, data })
    },
  )
}

export async function deleteWeeklyReview(id: string): Promise<WeeklyReviewFormState> {
  await getCurrentUser()

  return deleteEntity<WeeklyReviewFormState>({
    actionName: "deleteWeeklyReview",
    events: { success: "weekly_review:deleted", failure: "weekly_review:delete_failed" },
    successLogFields: { id },
    destroy: () => prisma.weeklyReview.delete({ where: { id } }),
    invalidateCaches: () => {
      revalidatePath(REVIEWS_PATH, "layout")
    },
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}

// Lecture seule : les compteurs pré-remplissent le formulaire, rien n'est écrit avant « Enregistrer ».
export async function computeWeekCounters(
  isoFriday: string,
): Promise<{ ok: true; counts: ReviewCounts } | { ok: false }> {
  await getCurrentUser()

  return createActionLogger("computeWeekCounters", async ({ log }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoFriday) || !isFridayIso(isoFriday)) return { ok: false }
    const bounds = weekBounds(isoDayToDate(isoFriday))
    try {
      const inWeek = { gte: bounds.start, lt: bounds.end }
      const [actions, interviews, leads] = await Promise.all([
        prisma.prospectingAction.findMany({
          where: { OR: [{ occurredAt: inWeek }, { respondedAt: inWeek }] },
          select: { channel: true, status: true, occurredAt: true, respondedAt: true },
        }),
        prisma.interview.findMany({
          where: { scheduledAt: inWeek },
          select: { status: true, scheduledAt: true },
        }),
        // Missions apportées et entretiens vivent sur la personne, pas sur le rôle Lead : `Lead` ne porte plus ni l'une ni l'autre relation.
        prisma.lead.findMany({
          where: { person: { optedOutAt: null } },
          select: {
            status: true,
            person: {
              select: {
                optedOutAt: true,
                referredMissions: { select: { status: true } },
                interviews: { select: { status: true, scheduledAt: true } },
              },
            },
          },
        }),
      ])
      const activeLeadSources = leads.map(({ person, ...lead }) => ({
        ...lead,
        missions: person.referredMissions,
        interviews: person.interviews,
        optedOutAt: person.optedOutAt,
      }))
      return {
        ok: true,
        counts: countWeek({ actions, interviews, leads: activeLeadSources }, bounds, Date.now()),
      }
    } catch (err) {
      log.error({ err, event: "weekly_review:count_failed" })
      return { ok: false }
    }
  })
}
```

Run: `pnpm vitest run --project unit src/server/actions/weekly-reviews.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5 : Lecture**

`src/server/queries/weekly-reviews.ts` :

```ts
import "server-only"

import { prisma } from "@/lib/prisma"

// Sans 'use cache', comme les autres lectures admin : l'administration relit la base juste après ses mutations.
export async function findAllWeeklyReviewsForAdmin() {
  return prisma.weeklyReview.findMany({ orderBy: { closingFriday: "desc" } })
}

export type AdminWeeklyReview = Awaited<ReturnType<typeof findAllWeeklyReviewsForAdmin>>[number]
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 5 : Textes français communs et calendrier des revues

**Files:**
- Create: `src/lib/event-calendar-fr.ts`
- Modify: `src/lib/action-calendar.ts`
- Create: `src/components/features/admin/revues/ReviewsCalendar.tsx`

**Interfaces:**
- Consumes: EventCalendar (`12`) ; Task 1 ; `AdminWeeklyReview` (Task 4)
- Produces: `EVENT_CALENDAR_FR: EventCalendarI18nOverrides` ; `ReviewsCalendar({ reviews, onOpen }: { reviews: readonly AdminWeeklyReview[]; onOpen: (review: AdminWeeklyReview) => void })`

- [ ] **Step 1 : Textes communs**

`src/lib/event-calendar-fr.ts` reçoit les textes de `ACTION_CALENDAR_I18N` (`12`) qui ne parlent pas d'actions :

```ts
import type { EventCalendarI18nOverrides } from "@/components/reui/event-calendar/event-calendar-i18n"

export const EVENT_CALENDAR_FR = {
  labels: {
    today: "Aujourd'hui",
    previous: "Précédent",
    next: "Suivant",
    allDay: "Toute la journée",
    more: (count: number) => `+${count} autres`,
    selectView: "Choisir la vue",
    week: (weekNumber: number) => `S${weekNumber}`,
    goToDate: "Aller à la date",
    dropNotAllowed: "Déplacement impossible",
    continues: "suite",
    timeRange: (from: string, to: string) => `${from} - ${to}`,
  },
  viewNames: { month: "Mois" },
  formats: {
    dayTitle: "EEEE d MMMM yyyy",
    moreDayHeader: "EEEE d MMMM",
    eventTime: "HH:mm",
    timeGutter: "HH'h'",
    timeGutterMinute: "HH:mm",
  },
} satisfies EventCalendarI18nOverrides
```

Dans `src/lib/action-calendar.ts`, remplacer `ACTION_CALENDAR_I18N` par :

```ts
export const ACTION_CALENDAR_I18N: EventCalendarI18nOverrides = {
  ...EVENT_CALENDAR_FR,
  labels: {
    ...EVENT_CALENDAR_FR.labels,
    addEvent: "Nouvelle action",
    noEvents: "Aucune action",
    loading: "Chargement des actions",
    event: "action",
    events: (count) => (count === 1 ? "1 action" : `${count} actions`),
  },
}
```

(import de `EVENT_CALENDAR_FR` depuis `@/lib/event-calendar-fr`).

- [ ] **Step 2 : Calendrier des revues**

`src/components/features/admin/revues/ReviewsCalendar.tsx` :

```tsx
"use client"

import { fr } from "date-fns/locale"

import { EventCalendar } from "@/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content"
import { EventCalendarNav } from "@/components/reui/event-calendar/event-calendar-nav"
import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types"
import type { ReviewStatus } from "@/generated/prisma/client"
import { EVENT_CALENDAR_FR } from "@/lib/event-calendar-fr"
import { weekLabel } from "@/lib/weekly-reviews"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

const STATUS_COLORS: Record<ReviewStatus, string> = {
  BONNE: "var(--color-success)",
  MOYENNE: "var(--color-warning)",
  MAUVAISE: "var(--color-destructive)",
}

const REVIEWS_I18N = {
  ...EVENT_CALENDAR_FR,
  labels: {
    ...EVENT_CALENDAR_FR.labels,
    noEvents: "Aucune revue",
    loading: "Chargement des revues",
    event: "revue",
    events: (count: number) => (count === 1 ? "1 revue" : `${count} revues`),
  },
}

// Journée entière : début et fin à minuit du fuseau d'affichage (exigence du composant) ; le vendredi, sans
// heure, est relu en UTC puis reconstruit en heure locale.
function reviewEvents(reviews: readonly AdminWeeklyReview[]): CalendarEvent<AdminWeeklyReview>[] {
  return reviews.map((review) => {
    const friday = review.closingFriday
    const start = new Date(friday.getUTCFullYear(), friday.getUTCMonth(), friday.getUTCDate())
    return {
      id: review.id,
      title: weekLabel(review.closingFriday),
      start,
      end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
      allDay: true,
      color: review.status ? STATUS_COLORS[review.status] : "var(--color-muted-foreground)",
      draggable: false,
      resizable: false,
      data: review,
    }
  })
}

interface Props {
  reviews: readonly AdminWeeklyReview[]
  onOpen: (review: AdminWeeklyReview) => void
}

export function ReviewsCalendar({ reviews, onOpen }: Props) {
  return (
    <EventCalendar
      events={reviewEvents(reviews)}
      onEventClick={(occurrence) => {
        if (occurrence.event.data) onOpen(occurrence.event.data)
      }}
      views={["month"]}
      defaultView="month"
      locale={fr}
      weekStartsOn={1}
      i18n={REVIEWS_I18N}
      interactions={{ drag: false, resize: false, selectSlot: false }}
      scrollMode="page"
      className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10"
    >
      <EventCalendarNav showViewSwitcher={false} />
      <EventCalendarContent />
    </EventCalendar>
  )
}
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 6 : Formulaire et suppression d'une revue

**Files:**
- Create: `src/components/features/admin/revues/ReviewFormDialog.tsx`
- Create: `src/components/features/admin/revues/DeleteReviewDialog.tsx`

**Interfaces:**
- Consumes: Tasks 1 et 4 ; `SelectField` ; `toIsoDate` (`@/lib/projects`)
- Produces: `ReviewFormDialog({ review, triggerRef }: { review: AdminWeeklyReview | null; triggerRef?: Ref<HTMLButtonElement> })` ; `DeleteReviewDialog({ review })`

- [ ] **Step 1 : Suppression**

`src/components/features/admin/revues/DeleteReviewDialog.tsx` :

```tsx
"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { weekLabel } from "@/lib/weekly-reviews"
import { deleteWeeklyReview } from "@/server/actions/weekly-reviews"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

interface Props {
  review: AdminWeeklyReview
}

export function DeleteReviewDialog({ review }: Props) {
  const name = weekLabel(review.closingFriday)

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      description="Les KPIs de cette semaine disparaissent de l'historique. Les actions et les leads comptés ne sont pas touchés."
      successMessage="Revue supprimée"
      onDelete={async () => {
        const result = await deleteWeeklyReview(review.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
```

`ConfirmDeleteDialog` titre « Supprimer « <name> » ? » sur tous les écrans admin : la maquette dit « Supprimer la revue « … » ? », écart commun gardé tel quel.

- [ ] **Step 2 : Formulaire**

`src/components/features/admin/revues/ReviewFormDialog.tsx` :

```tsx
"use client"

import {
  useActionState,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  useTransition,
  type Ref,
} from "react"
import { fr } from "date-fns/locale"
import { Calculator, Calendar as CalendarIcon, Pencil, Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Textarea } from "@/components/ui/textarea"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { toIsoDate } from "@/lib/projects"
import { REVIEW_MOTIVATIONS, REVIEW_STATUSES } from "@/lib/schemas/weekly-review"
import { NONE_VALUE } from "@/lib/schemas/person"
import { cn } from "@/lib/utils"
import {
  defaultClosingFriday,
  isoDayToDate,
  REVIEW_FIELD_LABELS as LABELS,
  REVIEW_MOTIVATION_LABELS,
  REVIEW_STATUS_LABELS,
  weekLabel,
  type ReviewCounts,
} from "@/lib/weekly-reviews"
import {
  computeWeekCounters,
  createWeeklyReview,
  updateWeeklyReview,
} from "@/server/actions/weekly-reviews"
import { initialWeeklyReviewFormState } from "@/server/actions/weekly-reviews.types"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

const COUNTER_KEYS = [
  "connectionsSent",
  "connectionsAccepted",
  "messagesSent",
  "conversationsEngaged",
  "meetingsBooked",
  "interviewsHeld",
  "activeLeads",
] as const satisfies readonly (keyof ReviewCounts)[]

type CounterValues = Record<keyof ReviewCounts, string>

const TEXT_FIELDS = [
  { key: "wins", placeholder: "Ce qui a avancé cette semaine" },
  { key: "blockers", placeholder: "Ce qui coince" },
  { key: "nextWeekPlan", placeholder: "Les actions de la semaine prochaine" },
  { key: "notes", placeholder: "" },
] as const

interface Props {
  review: AdminWeeklyReview | null
  // La vue détail rouvre ce même dialogue en cliquant ce bouton par ref.
  triggerRef?: Ref<HTMLButtonElement>
}

export function ReviewFormDialog({ review, triggerRef }: Props) {
  const [open, setOpen] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Nouvelle clé à chaque ouverture : le formulaire repart d'un état neuf.
    if (next) setInstanceKey((key) => key + 1)
  }

  // Identité stable : le formulaire reste monté pendant l'animation de fermeture, un callback recréé doublerait le toast.
  const handleDone = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {review ? (
        <DialogTrigger asChild>
          <RowActionButton ref={triggerRef} aria-label={`Modifier ${weekLabel(review.closingFriday)}`}>
            <Pencil className="size-4" />
          </RowActionButton>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus aria-hidden data-icon="inline-start" />
            Clôturer la semaine
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-160">
        <ReviewForm key={instanceKey} review={review} onDone={handleDone} />
      </DialogContent>
    </Dialog>
  )
}

function ReviewForm({ review, onDone }: { review: AdminWeeklyReview | null; onDone: () => void }) {
  const formId = useId()
  const action = review ? updateWeeklyReview.bind(null, review.id) : createWeeklyReview
  const [state, formAction, pending] = useActionState(action, initialWeeklyReviewFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const [counting, startCounting] = useTransition()

  // Le vendredi enregistré arrive à minuit UTC : il se relit en heure locale pour le calendrier.
  const [day, setDay] = useState<Date | undefined>(
    review
      ? new Date(
          review.closingFriday.getUTCFullYear(),
          review.closingFriday.getUTCMonth(),
          review.closingFriday.getUTCDate(),
        )
      : defaultClosingFriday(new Date()),
  )
  const [dayOpen, setDayOpen] = useState(false)
  const [counters, setCounters] = useState<CounterValues>(() =>
    Object.fromEntries(
      COUNTER_KEYS.map((key) => [key, String(review?.[key] ?? 0)]),
    ) as CounterValues,
  )

  function handleCompute() {
    if (!day) return
    startCounting(async () => {
      const result = await computeWeekCounters(toIsoDate(day))
      if (result.ok) {
        setCounters(
          Object.fromEntries(
            COUNTER_KEYS.map((key) => [key, String(result.counts[key])]),
          ) as CounterValues,
        )
        toast.success("Compteurs calculés depuis le CRM")
      } else {
        toast.error("Une erreur est survenue, réessayez")
      }
    })
  }

  const notifySaved = useEffectEvent(() => {
    toast.success(review ? "Revue mise à jour" : "Revue créée")
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
        <DialogTitle>{review ? `Modifier ${weekLabel(review.closingFriday)}` : "Clôturer la semaine"}</DialogTitle>
        <DialogDescription>
          {review ? "Modifier les informations de cette revue." : "Créer le bilan de la semaine écoulée."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-4 overflow-y-auto sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField
            id={`${formId}-closingFriday`}
            label={LABELS.closingFriday}
            errors={state.errors.closingFriday}
          >
            <Popover open={dayOpen} onOpenChange={setDayOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  id={`${formId}-closingFriday`}
                  aria-invalid={!!state.errors.closingFriday?.length}
                  aria-describedby={`${formId}-closingFriday-error`}
                  className={cn("w-full justify-start font-normal", !day && "text-muted-foreground")}
                >
                  <CalendarIcon aria-hidden data-icon="inline-start" />
                  {day ? weekLabel(isoDayToDate(toIsoDate(day))) : "Choisir un vendredi"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  locale={fr}
                  mode="single"
                  selected={day}
                  defaultMonth={day ?? new Date()}
                  disabled={{ dayOfWeek: [0, 1, 2, 3, 4, 6] }}
                  onSelect={(next) => {
                    setDay(next)
                    setDayOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            <input type="hidden" name="closingFriday" value={day ? toIsoDate(day) : ""} />
          </FormField>
        </div>

        <SelectField
          id={`${formId}-status`}
          name="status"
          label={LABELS.status}
          options={REVIEW_STATUSES}
          labels={REVIEW_STATUS_LABELS}
          defaultValue={review?.status ?? NONE_VALUE}
          errors={state.errors.status}
          noneLabel="Non renseigné"
        />

        <SelectField
          id={`${formId}-motivation`}
          name="motivation"
          label={LABELS.motivation}
          options={REVIEW_MOTIVATIONS}
          labels={REVIEW_MOTIVATION_LABELS}
          defaultValue={review?.motivation ?? NONE_VALUE}
          errors={state.errors.motivation}
          noneLabel="Non renseignée"
        />

        <div className="flex justify-end sm:col-span-2">
          <Button type="button" variant="outline" disabled={!day || counting} onClick={handleCompute}>
            <Calculator aria-hidden data-icon="inline-start" />
            {counting ? "Calcul..." : "Calculer depuis le CRM"}
          </Button>
        </div>

        {COUNTER_KEYS.map((key) => (
          <FormField key={key} id={`${formId}-${key}`} label={LABELS[key]} errors={state.errors[key]}>
            <Input
              id={`${formId}-${key}`}
              name={key}
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              step={1}
              value={counters[key]}
              onChange={(event) => {
                setCounters((previous) => ({ ...previous, [key]: event.target.value }))
              }}
              className="text-right tabular-nums"
              aria-invalid={!!state.errors[key]?.length}
              aria-describedby={`${formId}-${key}-error`}
            />
          </FormField>
        ))}

        {TEXT_FIELDS.map(({ key, placeholder }) => (
          <div key={key} className="sm:col-span-2">
            <FormField id={`${formId}-${key}`} label={LABELS[key]} errors={state.errors[key]}>
              <Textarea
                id={`${formId}-${key}`}
                name={key}
                rows={3}
                defaultValue={review?.[key] ?? ""}
                placeholder={placeholder}
                aria-invalid={!!state.errors[key]?.length}
                aria-describedby={`${formId}-${key}-error`}
              />
            </FormField>
          </div>
        ))}
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

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 7 : Liste, pages et menu

**Files:**
- Create: `src/components/features/admin/revues/ReviewsTable.tsx`
- Create: `src/components/features/admin/revues/ReviewsViewPage.tsx`
- Create: `src/app/admin/(protected)/revues-hebdo/page.tsx`, `calendrier/page.tsx`, `journal/page.tsx`, chacun avec son `loading.tsx`
- Modify: `src/config/admin-nav-items.ts`

**Interfaces:**
- Consumes: Tasks 1 à 6
- Produces: `ReviewsTable({ reviews, view })`, `ReviewsViewPage({ view })`

- [ ] **Step 1 : Table, période et calendrier**

`src/components/features/admin/revues/ReviewsTable.tsx` :

```tsx
"use client"

import { useMemo, useRef, useState } from "react"
import { CalendarClock } from "lucide-react"

import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  type DetailSection,
  DetailDialog,
} from "@/components/features/admin/DetailDialog"
import { DeleteReviewDialog } from "@/components/features/admin/revues/DeleteReviewDialog"
import { ReviewFormDialog } from "@/components/features/admin/revues/ReviewFormDialog"
import { ReviewsCalendar } from "@/components/features/admin/revues/ReviewsCalendar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  REVIEW_COLUMN_WIDTHS,
  REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type ReviewColumnKey,
} from "@/lib/admin-table-widths"
import {
  isReviewPeriod,
  REVIEW_PERIODS,
  reviewsByRecency,
  reviewsForPeriod,
  type ReviewPeriod,
  type ReviewView,
} from "@/lib/review-views"
import { REVIEW_STATUSES } from "@/lib/schemas/weekly-review"
import {
  formatRate,
  formatWeekDate,
  REVIEW_FIELD_LABELS as LABELS,
  REVIEW_MOTIVATION_LABELS,
  REVIEW_STATUS_LABELS,
  reviewRates,
  weekLabel,
  type ReviewCounts,
} from "@/lib/weekly-reviews"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

function hideable(
  view: ReviewView,
  key: Exclude<ReviewColumnKey, "week" | "actions">,
): Pick<Column<AdminWeeklyReview>, "hideable" | "defaultVisible"> {
  return { hideable: true, defaultVisible: REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key) }
}

function counterColumn(
  view: ReviewView,
  key: keyof ReviewCounts,
  header: string = LABELS[key],
): Column<AdminWeeklyReview> {
  return {
    key,
    header,
    width: REVIEW_COLUMN_WIDTHS[key],
    align: "right",
    className: "tabular-nums",
    ...hideable(view, key),
    sortValue: (review) => review[key],
    cell: (review) => review[key],
  }
}

function rateColumn(
  view: ReviewView,
  key: "acceptanceRate" | "responseRate" | "meetingConversion",
  pick: (rates: ReturnType<typeof reviewRates>) => number | null,
): Column<AdminWeeklyReview> {
  return {
    key,
    header: LABELS[key],
    width: REVIEW_COLUMN_WIDTHS[key],
    align: "right",
    className: "tabular-nums text-muted-foreground",
    ...hideable(view, key),
    sortValue: (review) => pick(reviewRates(review)) ?? -1,
    cell: (review) => formatRate(pick(reviewRates(review))),
  }
}

function dataColumns(view: ReviewView): readonly Column<AdminWeeklyReview>[] {
  return [
    {
      key: "week",
      header: LABELS.week,
      width: REVIEW_COLUMN_WIDTHS.week,
      sortValue: (review) => review.closingFriday.getTime(),
      searchValue: (review) => weekLabel(review.closingFriday),
      cell: (review) => <span className="font-medium">{weekLabel(review.closingFriday)}</span>,
    },
    {
      key: "friday",
      header: LABELS.friday,
      width: REVIEW_COLUMN_WIDTHS.friday,
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "friday"),
      sortValue: (review) => review.closingFriday.getTime(),
      cell: (review) => formatWeekDate(review.closingFriday),
    },
    counterColumn(view, "connectionsSent"),
    counterColumn(view, "connectionsAccepted"),
    rateColumn(view, "acceptanceRate", (rates) => rates.acceptance),
    counterColumn(view, "messagesSent"),
    counterColumn(view, "conversationsEngaged", LABELS.conversations),
    rateColumn(view, "responseRate", (rates) => rates.response),
    counterColumn(view, "meetingsBooked"),
    rateColumn(view, "meetingConversion", (rates) => rates.meetingConversion),
    counterColumn(view, "interviewsHeld"),
    counterColumn(view, "activeLeads"),
    {
      key: "status",
      header: LABELS.status,
      width: REVIEW_COLUMN_WIDTHS.status,
      ...hideable(view, "status"),
      cell: (review) =>
        review.status ? <Badge variant="secondary">{REVIEW_STATUS_LABELS[review.status]}</Badge> : null,
    },
    {
      key: "motivation",
      header: LABELS.motivation,
      width: REVIEW_COLUMN_WIDTHS.motivation,
      ...hideable(view, "motivation"),
      cell: (review) =>
        review.motivation ? <Badge variant="secondary">{REVIEW_MOTIVATION_LABELS[review.motivation]}</Badge> : null,
    },
  ]
}

// Arbitrage « bloc sans donnée » : un bloc dont aucun champ n'est renseigné disparaît.
function keepFilled(section: DetailSection): DetailSection[] {
  return section.rows.some((row) => row.value !== null && row.value !== undefined) ? [section] : []
}

function textSection(title: string, text: string | null): DetailSection[] {
  return text
    ? [{ title, rows: [{ value: <span className="whitespace-pre-line">{text}</span>, fullWidth: true }] }]
    : []
}

function buildReviewDetail(review: AdminWeeklyReview, onEdit: () => void): DetailContent {
  const rates = reviewRates(review)

  return {
    title: weekLabel(review.closingFriday),
    subtitle: `clôture le ${formatWeekDate(review.closingFriday)}`,
    ...(review.status
      ? {
          status: (
            <Badge variant="outline" meta>
              {REVIEW_STATUS_LABELS[review.status]}
            </Badge>
          ),
        }
      : {}),
    sections: [
      {
        title: "Prospection",
        rows: [
          { label: LABELS.connectionsSent, value: review.connectionsSent },
          { label: LABELS.connectionsAccepted, value: review.connectionsAccepted },
          { label: LABELS.acceptanceRate, value: formatRate(rates.acceptance) },
          { label: LABELS.messagesSent, value: review.messagesSent },
          { label: LABELS.conversations, value: review.conversationsEngaged },
          { label: LABELS.responseRate, value: formatRate(rates.response) },
          { label: LABELS.meetingsBooked, value: review.meetingsBooked },
          { label: LABELS.meetingConversion, value: formatRate(rates.meetingConversion) },
        ],
      },
      {
        title: "Pipeline",
        rows: [
          { label: LABELS.interviewsHeld, value: review.interviewsHeld },
          { label: LABELS.activeLeads, value: review.activeLeads },
        ],
      },
      ...keepFilled({
        title: "Ressenti",
        rows: [
          {
            label: LABELS.motivation,
            value: review.motivation ? <Badge variant="secondary">{REVIEW_MOTIVATION_LABELS[review.motivation]}</Badge> : null,
          },
        ],
      }),
      ...textSection(LABELS.wins, review.wins),
      ...textSection(LABELS.blockers, review.blockers),
      ...textSection(LABELS.nextWeekPlan, review.nextWeekPlan),
      ...textSection(LABELS.notes, review.notes),
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminWeeklyReview>[] = [
  {
    key: "status",
    label: LABELS.status,
    options: REVIEW_STATUSES.map((status) => ({ value: status, label: REVIEW_STATUS_LABELS[status] })),
    value: (review) => (review.status ? [review.status] : []),
  },
]

interface Props {
  reviews: readonly AdminWeeklyReview[]
  view: ReviewView
}

export function ReviewsTable({ reviews, view }: Props) {
  const editTriggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const [selectedReview, setSelectedReview] = useState<AdminWeeklyReview | null>(null)
  const [period, setPeriod] = useState<ReviewPeriod>("30j")
  // Instant figé au montage : la période reste stable pendant la consultation.
  const [now] = useState(() => new Date())

  const rows = useMemo(
    () => (view === "revue" ? reviewsForPeriod(reviews, period, now) : reviewsByRecency(reviews)),
    [reviews, view, period, now],
  )

  // editTriggerRefs reste une fermeture lexicale : une ref ne se lit qu'au clic (react-hooks/refs).
  const columns = useMemo<readonly Column<AdminWeeklyReview>[]>(
    () => [
      ...dataColumns(view),
      {
        key: "actions",
        header: "Actions",
        width: REVIEW_COLUMN_WIDTHS.actions,
        align: "right",
        cell: (review) => (
          <span className="inline-flex gap-0">
            <ReviewFormDialog
              review={review}
              triggerRef={(element) => {
                if (element) editTriggerRefs.current.set(review.id, element)
                else editTriggerRefs.current.delete(review.id)
              }}
            />
            <DeleteReviewDialog review={review} />
          </span>
        ),
      },
    ],
    [view],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedReview
        ? buildReviewDetail(selectedReview, () => {
            editTriggerRefs.current.get(selectedReview.id)?.click()
          })
        : null,
    [selectedReview],
  )

  return (
    <div className="flex flex-col gap-4">
      {view === "revue" ? (
        <Select
          value={period}
          onValueChange={(value) => {
            if (isReviewPeriod(value)) setPeriod(value)
          }}
        >
          <SelectTrigger className="w-50" aria-label="Période">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_PERIODS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {view === "calendrier" ? (
        <ReviewsCalendar reviews={reviews} onOpen={setSelectedReview} />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(review) => review.id}
          searchPlaceholder="Rechercher une semaine"
          noun="revue"
          onRowClick={setSelectedReview}
          rowLabel={(review) => weekLabel(review.closingFriday)}
          facets={facets}
          empty={{
            icon: CalendarClock,
            title: "Aucune revue",
            description: "Aucune revue dans cette vue. Clôturez la semaine via le bouton ci-dessus.",
          }}
        />
      )}

      {/* Les boutons de ligne portent le formulaire : le calendrier les monte hors écran pour la modification depuis la vue détail. */}
      {view === "calendrier" ? (
        <div hidden>
          {reviews.map((review) => (
            <ReviewFormDialog
              key={review.id}
              review={review}
              triggerRef={(element) => {
                if (element) editTriggerRefs.current.set(review.id, element)
                else editTriggerRefs.current.delete(review.id)
              }}
            />
          ))}
        </div>
      ) : null}

      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedReview(null)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2 : Coquille commune**

`src/components/features/admin/revues/ReviewsViewPage.tsx` :

```tsx
import { Suspense } from "react"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { ReviewFormDialog } from "@/components/features/admin/revues/ReviewFormDialog"
import { ReviewsTable } from "@/components/features/admin/revues/ReviewsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { reviewSkeletonWidths } from "@/lib/admin-table-widths"
import { REVIEW_VIEW_PAGES, type ReviewView } from "@/lib/review-views"
import { findAllWeeklyReviewsForAdmin } from "@/server/queries/weekly-reviews"

async function ReviewsSection({ view }: { view: ReviewView }) {
  const reviews = await findAllWeeklyReviewsForAdmin()
  return <ReviewsTable reviews={reviews} view={view} />
}

interface Props {
  view: ReviewView
}

export function ReviewsViewPage({ view }: Props) {
  const { title, subtitle } = REVIEW_VIEW_PAGES[view]

  return (
    <AdminPageShell title={title} subtitle={subtitle} actions={<ReviewFormDialog review={null} />}>
      <Suspense fallback={<DataTableSkeleton columnWidths={reviewSkeletonWidths(view)} />}>
        <ReviewsSection view={view} />
      </Suspense>
    </AdminPageShell>
  )
}
```

(le bouton « Clôturer la semaine » ne lit rien : il se rend sans `<Suspense>`).

- [ ] **Step 3 : Pages**

`src/app/admin/(protected)/revues-hebdo/page.tsx` :

```tsx
import { ReviewsViewPage } from "@/components/features/admin/revues/ReviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminReviewsPage() {
  await getCurrentUser()

  return <ReviewsViewPage view="revue" />
}
```

`src/app/admin/(protected)/revues-hebdo/calendrier/page.tsx` :

```tsx
import { ReviewsViewPage } from "@/components/features/admin/revues/ReviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminReviewsCalendarPage() {
  await getCurrentUser()

  return <ReviewsViewPage view="calendrier" />
}
```

`src/app/admin/(protected)/revues-hebdo/journal/page.tsx` :

```tsx
import { ReviewsViewPage } from "@/components/features/admin/revues/ReviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminReviewsJournalPage() {
  await getCurrentUser()

  return <ReviewsViewPage view="journal" />
}
```

Chacun des trois dossiers reçoit un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 4 : Menu**

Dans `src/config/admin-nav-items.ts`, remplacer :

```ts
      { label: "Revues hebdo", icon: CalendarClock },
```

par :

```ts
      {
        label: "Revues hebdo",
        icon: CalendarClock,
        href: "/admin/revues-hebdo",
        subItems: [
          { label: "Revue", href: "/admin/revues-hebdo" },
          { label: "Calendrier", href: "/admin/revues-hebdo/calendrier" },
          { label: "Journal", href: "/admin/revues-hebdo/journal" },
        ],
      },
```

- [ ] **Step 5 : Qualité**

Run: `just typecheck`
Expected: aucune erreur (si le typage des `href` échoue, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

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

- [ ] **Step 1 : Calcul et enregistrement**

Run: `just dev`, se connecter ; avoir, entre le dernier samedi et le prochain vendredi, des connexions et des DM envoyés, une réponse reçue et une conversion, un entretien Fait, quelques leads Suspect ou Discussion ; une connexion datée du samedi d'avant. Si possible, navigateur dans un fuseau à l'ouest de Greenwich (outils de développement, capteurs de position).
Expected: Revues hebdo mène à « Revue hebdo » ; « Clôturer la semaine » propose aujourd'hui si c'est un vendredi, sinon le dernier vendredi passé, affiché « S<NN> · Semaine du <lundi> » ; le calendrier ne laisse cliquer que des vendredis. Choisir le prochain vendredi ; « Calculer depuis le CRM » remplit les sept compteurs conformément aux données, sans la connexion du samedi d'avant ; toast « Compteurs calculés depuis le CRM ». Corriger Conversations engagées, écrire une victoire, enregistrer : la revue apparaît dans la vue Revue sur le vendredi cliqué (colonne Vendredi), avec ses trois taux.

- [ ] **Step 2 : Doublon et vues**

Créer une seconde revue sur le même vendredi ; puis ouvrir le Journal et changer la période de la vue Revue.
Expected: « Une revue existe déjà pour cette semaine » sous Date vendredi ; le Journal liste toutes les revues, la plus récente d'abord ; les périodes Mois en cours et Année en cours filtrent selon le vendredi.

- [ ] **Step 3 : Calendrier**

Ouvrir le Calendrier, navigateur dans un fuseau à l'ouest de Greenwich si possible (outils de développement, capteurs de position), puis cliquer la pastille.
Expected: la revue est posée sur son vendredi, pas la veille, couleur de son statut ; le clic ouvre sa vue détail, dont « Modifier » ouvre le formulaire.

- [ ] **Step 4 : Détail et suppression**

Ouvrir la vue détail d'une revue sans motivation ni textes, puis la supprimer.
Expected: blocs Prospection et Pipeline avec les taux, sans bloc Ressenti ni blocs de texte vides ; la suppression affiche le texte de la maquette et retire la revue des trois vues. Puis `just stop`.
