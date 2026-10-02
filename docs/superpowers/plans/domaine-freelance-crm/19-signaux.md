# Signaux : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le modèle `Signal` rattaché à une entreprise ou à un lead outbound, sa fraîcheur selon la matrice du toolkit, ses Server Actions, son effacement avec les échanges d'un lead, et son interface : card Signaux des pages entreprise et lead, bloc Signaux en lecture des vues détail, filtre « Signal récent ».

**Architecture:** Un module pur testé (`src/lib/signals.ts`) porte les types par rattachement, la date affichée et la fraîcheur. Les actions fixent le rattachement à la création et vérifient qu'il accepte le type ; `erasePersonExchanges` supprime les signaux avec les actions de prospection de la personne. Les signaux se créent, se modifient et se suppriment dans une `SignalsCard` des pages entreprise et lead (fenêtre `SignalFormDialog`) ; les vues détail des tables Entreprises et Leads les montrent en lecture.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4, Next.js 16 (Server Actions), React 19, shadcn/ui `radix-nova`, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/19-signaux-design.md`

## Global Constraints

- **Prérequis** : plans `01` (Traitement 7, puce prospection), `03` (`CompanyForm`, prop `relatedCards`), `04` (`CompaniesTable`), `15` (`CompaniesTable`, `DeleteCompanyDialog`, card Opportunités de la page entreprise), `07` (`persons.ts`, `optOutPerson(id)`, `erasePersonExchanges(id)`), `08` (`OptOutPersonDialog`, `SelectField`, `OptionalDateField`, `RelatedLinksList`, `RelatedLinksCard`, `relatedCards` du formulaire des leads), `10`, `13`, `16` et `17` (`LeadsTable`, page du lead et ses cards, `DeleteLeadDialog`) implémentés.
- **Page ou modale** (arbitrages « Page ou modale d'édition » et « Élément rattaché à une fiche » de DESIGN.md) : un signal se saisit en fenêtre, ouverte depuis la card Signaux de la page de son entreprise ou de son lead ; aucun bouton de ligne ; la vue détail le montre en lecture.
- **Enums, valeurs exactes** : `SignalType` `OFFRE_POSTE`, `LEVEE`, `EXPANSION`, `NOUVEAU_PRODUIT`, `PIVOT`, `ACQUISITION`, `POST`, `COMMENTAIRE`, `CONFERENCE`, `INTERACTION`.
- **Types par rattachement** (listes du toolkit) : entreprise `OFFRE_POSTE`, `LEVEE`, `EXPANSION`, `NOUVEAU_PRODUIT`, `PIVOT`, `ACQUISITION` ; lead outbound `POST`, `COMMENTAIRE`, `CONFERENCE`, `INTERACTION`. Jamais de signal sur un lead inbound ou opposé. Une contrainte SQL (`Signal_type_check`) impose ce lien en base ; un nouveau type demande de la mettre à jour.
- **Fraîcheur** (matrice du toolkit, `strategie-canaux.md`) : Offre de poste récent moins de 3 mois, à confirmer jusqu'à 6, périmé au-delà ; Levée 6 et 18 ; Expansion d'équipe et Nouveau produit 6 et 12. Les autres types n'ont ni badge ni place dans « Signal récent ».
- **Date** : au jour (`DateTime @db.Date`) ; quand la source ne donne que le mois, le 1er à minuit UTC est saisi ; toujours affichée « 12/03/2026 », lue en UTC.
- **RGPD** : signaux d'une personne gardés à l'opposition simple (`optOutPerson`), supprimés par `erasePersonExchanges(id)` ; supprimés avec leur personne ou leur entreprise.
- **Textes** : « Nouveau signal », « Modifier le signal <type> · <date> », « Ajouter un signal à <nom>. », « Modifier les informations de ce signal. », « Signal créé », « Signal mis à jour », « Signal supprimé », « Choisissez un type », « Choisissez une date », « Décrivez le signal », « L'adresse du lien n'est pas valide », « Ce type ne concerne pas cette fiche », « Ce lead ne peut pas recevoir de signal » ; suppression « Ses signaux sont supprimés avec elle. » ; card avant le premier enregistrement « Après l'enregistrement de l'entreprise. », « Après l'enregistrement du lead. ».
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Opposition simple** : les signaux de la personne restent. Couvert par les tests existants d'`optOutPerson` (`07`), qui ne touchent pas `prisma.signal` ; « deletes the person's signals along with the exchanges » couvre `erasePersonExchanges` (Task 3).
- **Signal d'un lead opposé modifié par un appel direct** : refusé, la suppression seule reste possible. Couvert par « refuses to edit a signal of an opted-out lead » (Task 2).
- **1er du mois lu dans un fuseau à l'ouest de Greenwich** : reste affiché au bon jour. Couvert par « counts a month-dated signal from the first day of its month », dont le format est lu en UTC (Task 1).
- **Card Signaux après un ajout, une modification ou une suppression** : elle se met à jour sans recharger la page (revalidation en variante `layout`). Vérifié à la Task 8, Step 2.

---

### Task 1 : Modèle, migration, libellés et fraîcheur

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_signals/migration.sql`
- Create: `src/lib/signals.ts`
- Test: `src/lib/signals.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: modèle `Signal`, enum `SignalType`, relations `Company.signals`, `Person.signals` ; `COMPANY_SIGNAL_TYPES`, `LEAD_SIGNAL_TYPES`, `signalTypesFor(kind: SignalOwnerKind): readonly SignalType[]` ; `type SignalOwnerKind = "company" | "lead"` ; `interface SignalOwner { kind: SignalOwnerKind; id: string; name: string }` ; `interface SignalItem { id: string; type: SignalType; occurredOn: Date; content: string; sourceUrl: string | null }` ; `SIGNAL_TYPE_LABELS`, `SIGNAL_TYPE_ICONS`, `SIGNAL_FIELD_LABELS`, `SIGNAL_FRESHNESS_LABELS` ; `formatSignalDate(signal): string` ; `type SignalFreshness = "RECENT" | "A_CONFIRMER" | "PERIME"` ; `signalFreshness(signal, now: Date): SignalFreshness | null` ; `hasRecentSignal(signals, now: Date): boolean`

- [ ] **Step 1 : Enums, modèle et relations**

Dans `prisma/schema.prisma`, après l'enum `ReviewMotivation` :

```prisma
enum SignalType {
  OFFRE_POSTE
  LEVEE
  EXPANSION
  NOUVEAU_PRODUIT
  PIVOT
  ACQUISITION
  POST
  COMMENTAIRE
  CONFERENCE
  INTERACTION

  @@schema("freelance")
}
```

Après le modèle `WeeklyReview` :

```prisma
model Signal {
  id            String              @id @default(uuid(7))
  type          SignalType
  // Le jour quand la source le donne, le 1er du mois sinon : pas de précision à part, un seul calendrier.
  occurredOn    DateTime            @db.Date
  content       String
  sourceUrl     String?

  // Un seul rattachement, posé à la création, et un type propre à ce rattachement : la migration
  // ajoute en SQL les deux CHECK que Prisma ne sait pas écrire.
  companyId String?
  company   Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  personId  String?
  person    Person?  @relation(fields: [personId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@index([companyId])
  @@index([personId])
  @@schema("freelance")
}
```

Dans `model Company`, après `opportunitiesAsClient` : `signals Signal[]`. Dans `model Person`, après `interviews` : `signals Signal[]`.

- [ ] **Step 2 : Migration**

Run: `pnpm prisma migrate dev --name signals`
Expected: migration créée et appliquée en dev ; le type d'enum, la table `"freelance"."Signal"` avec ses deux clés étrangères en `ON DELETE CASCADE` et ses deux index.

Éditer ensuite `prisma/migrations/<horodatage>_signals/migration.sql` pour y ajouter, à la fin, les deux contraintes que Prisma ne sait pas écrire, dans le schéma `freelance` et la casse exacte des colonnes Prisma : un seul des deux rattachements posé, puis son type parmi ceux qu'autorise ce rattachement.

```sql
ALTER TABLE "freelance"."Signal" ADD CONSTRAINT "Signal_owner_check" CHECK (("companyId" IS NULL) <> ("personId" IS NULL));
ALTER TABLE "freelance"."Signal" ADD CONSTRAINT "Signal_type_check" CHECK (
  ("companyId" IS NOT NULL AND "type" IN ('OFFRE_POSTE', 'LEVEE', 'EXPANSION', 'NOUVEAU_PRODUIT', 'PIVOT', 'ACQUISITION'))
  OR ("personId" IS NOT NULL AND "type" IN ('POST', 'COMMENTAIRE', 'CONFERENCE', 'INTERACTION'))
);
```

Un `SignalType` ajouté plus tard demande de mettre à jour `Signal_type_check` dans une migration dédiée.

Run: `just db-test`
Expected: migration réappliquée en test avec les deux contraintes. Aucune autre modification à la main.

- [ ] **Step 3 : Écrire les tests qui échouent**

`src/lib/signals.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import type { SignalType } from "@/generated/prisma/client"

import { formatSignalDate, hasRecentSignal, signalFreshness } from "./signals"

const NOW = new Date("2026-09-27T12:00:00.000Z")

function signal(type: SignalType, isoDay: string) {
  return { type, occurredOn: new Date(`${isoDay}T00:00:00.000Z`) }
}

describe("signalFreshness", () => {
  it("rates a job offer recent, to confirm then stale at three and six months", () => {
    const recent = signalFreshness(signal("OFFRE_POSTE", "2026-07-01"), NOW)
    const toConfirm = signalFreshness(signal("OFFRE_POSTE", "2026-06-27"), NOW)
    const stale = signalFreshness(signal("OFFRE_POSTE", "2026-03-27"), NOW)

    expect([recent, toConfirm, stale]).toEqual(["RECENT", "A_CONFIRMER", "PERIME"])
  })

  it("applies the funding and team expansion thresholds of the toolkit", () => {
    const funding = signalFreshness(signal("LEVEE", "2025-09-01"), NOW)
    const expansion = signalFreshness(signal("EXPANSION", "2025-09-01"), NOW)

    expect(funding).toBe("A_CONFIRMER")
    expect(expansion).toBe("PERIME")
  })

  it("counts a month-dated signal from the first day of its month", () => {
    const juneOffer = { type: "OFFRE_POSTE" as const, occurredOn: new Date(Date.UTC(2026, 5, 1)) }

    const freshness = signalFreshness(juneOffer, NOW)

    expect(freshness).toBe("A_CONFIRMER")
    expect(formatSignalDate(juneOffer)).toBe("01/06/2026")
  })

  it("gives no freshness to a type the toolkit does not rate", () => {
    const pivot = signalFreshness(signal("PIVOT", "2026-09-01"), NOW)
    const post = signalFreshness(signal("POST", "2026-09-01"), NOW)

    expect(pivot).toBeNull()
    expect(post).toBeNull()
  })
})

describe("hasRecentSignal", () => {
  it("flags a record with at least one recent signal", () => {
    const unrated = [signal("PIVOT", "2026-09-01"), signal("LEVEE", "2024-01-01")]

    const without = hasRecentSignal(unrated, NOW)
    const withRecent = hasRecentSignal([...unrated, signal("NOUVEAU_PRODUIT", "2026-08-15")], NOW)

    expect(without).toBe(false)
    expect(withRecent).toBe(true)
  })
})
```

Run: `pnpm vitest run --project unit src/lib/signals.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 4 : Écrire le module**

`src/lib/signals.ts` :

```ts
import {
  Hand,
  Megaphone,
  Merge,
  MessageSquareText,
  Mic,
  Package,
  PenLine,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react"

import type { SignalType } from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"

// Listes du toolkit : `📡 Signaux` d'une entreprise, `🔍 Signal` d'un lead outbound.
export const COMPANY_SIGNAL_TYPES = [
  "OFFRE_POSTE",
  "LEVEE",
  "EXPANSION",
  "NOUVEAU_PRODUIT",
  "PIVOT",
  "ACQUISITION",
] as const satisfies readonly SignalType[]

export const LEAD_SIGNAL_TYPES = [
  "POST",
  "COMMENTAIRE",
  "CONFERENCE",
  "INTERACTION",
] as const satisfies readonly SignalType[]

export type SignalOwnerKind = "company" | "lead"

export interface SignalOwner {
  kind: SignalOwnerKind
  id: string
  name: string
}

export interface SignalItem {
  id: string
  type: SignalType
  occurredOn: Date
  content: string
  sourceUrl: string | null
}

export function signalTypesFor(kind: SignalOwnerKind): readonly SignalType[] {
  return kind === "company" ? COMPANY_SIGNAL_TYPES : LEAD_SIGNAL_TYPES
}

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  OFFRE_POSTE: "Offre de poste",
  LEVEE: "Levée",
  EXPANSION: "Expansion d'équipe",
  NOUVEAU_PRODUIT: "Nouveau produit",
  PIVOT: "Pivot",
  ACQUISITION: "Acquisition",
  POST: "Post engageant",
  COMMENTAIRE: "Commentaire",
  CONFERENCE: "Présence en conférence",
  INTERACTION: "Interaction directe",
}

export const SIGNAL_TYPE_ICONS: Record<SignalType, IconComponent | null> = {
  OFFRE_POSTE: Megaphone,
  LEVEE: TrendingUp,
  EXPANSION: Users,
  NOUVEAU_PRODUIT: Package,
  PIVOT: RotateCcw,
  ACQUISITION: Merge,
  POST: PenLine,
  COMMENTAIRE: MessageSquareText,
  CONFERENCE: Mic,
  INTERACTION: Hand,
}

export const SIGNAL_FIELD_LABELS = {
  type: "Type",
  occurredOn: "Date",
  content: "Contenu",
  sourceUrl: "Lien source",
} as const

// Colonne date : minuit UTC, relu en UTC pour ne pas reculer d'un jour à l'ouest de Greenwich.
const DAY_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

export function formatSignalDate(signal: { occurredOn: Date }): string {
  return DAY_DATE.format(signal.occurredOn)
}

export type SignalFreshness = "RECENT" | "A_CONFIRMER" | "PERIME"

export const SIGNAL_FRESHNESS_LABELS: Record<SignalFreshness, string> = {
  RECENT: "Récent",
  A_CONFIRMER: "À confirmer",
  PERIME: "Périmé",
}

// Décote temporelle du toolkit (strategie-canaux.md), en mois : fin de « récent », fin de « à confirmer » ;
// absente pour les types non notés.
const FRESHNESS_MONTHS: Partial<Record<SignalType, readonly [number, number]>> = {
  OFFRE_POSTE: [3, 6],
  LEVEE: [6, 18],
  EXPANSION: [6, 12],
  NOUVEAU_PRODUIT: [6, 12],
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()))
}

export function signalFreshness(
  signal: { type: SignalType; occurredOn: Date },
  now: Date,
): SignalFreshness | null {
  const bounds = FRESHNESS_MONTHS[signal.type]
  if (!bounds) return null
  const [recentMonths, toConfirmMonths] = bounds
  if (now < addUtcMonths(signal.occurredOn, recentMonths)) return "RECENT"
  if (now < addUtcMonths(signal.occurredOn, toConfirmMonths)) return "A_CONFIRMER"
  return "PERIME"
}

export function hasRecentSignal(
  signals: readonly { type: SignalType; occurredOn: Date }[],
  now: Date,
): boolean {
  return signals.some((signal) => signalFreshness(signal, now) === "RECENT")
}
```

Run: `pnpm vitest run --project unit src/lib/signals.test.ts`
Expected: PASS (5 tests).

---

### Task 2 : Validation, Server Actions et lectures

**Files:**
- Create: `src/lib/schemas/signal.ts`
- Create: `src/server/actions/signals.types.ts`
- Create: `src/server/actions/signals.ts`
- Test: `src/server/actions/signals.test.ts`
- Modify: `src/server/queries/companies.ts`
- Modify: `src/server/queries/leads.ts`

**Interfaces:**
- Consumes: Task 1 ; `saveEntity`, `deleteEntity` (`./shared`) ; `stringField` (`@/lib/server-utils`)
- Produces: `signalSchema`, `SignalInput` ; `SignalFormState`, `initialSignalFormState` ; `createCompanySignal(companyId, prev, formData)`, `createPersonSignal(personId, prev, formData)`, `updateSignal(id, prev, formData)`, `deleteSignal(id)` ; `signalsInclude` ; `AdminCompany.signals` et `AdminLead.signals` au format `SignalItem`

- [ ] **Step 1 : Schéma**

`src/lib/schemas/signal.ts` :

```ts
import { z } from "zod"

import { SignalType } from "@/generated/prisma/browser"

const SOURCE_URL_SCHEMA = z.url({ protocol: /^https?$/ })

export const signalSchema = z.object({
  type: z.enum(SignalType, { error: "Choisissez un type" }),
  occurredOn: z.iso
    .date({ error: "Choisissez une date" })
    // Minuit UTC : la colonne date garde ce jour-là, quel que soit le fuseau du navigateur.
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
  content: z.string().trim().min(1, { error: "Décrivez le signal" }),
  sourceUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || SOURCE_URL_SCHEMA.safeParse(value).success, {
      error: "L'adresse du lien n'est pas valide",
    })
    .transform((value) => (value === "" ? null : value)),
})

export type SignalInput = z.infer<typeof signalSchema>
```

- [ ] **Step 2 : Types de l'état**

`src/server/actions/signals.types.ts` :

```ts
import type { FormActionState } from "@/lib/form-state"
import type { SignalInput } from "@/lib/schemas/signal"

export type SignalFormMessage = "lead_not_eligible" | "unknown_error" | null

export type SignalFormState = FormActionState<SignalInput, SignalFormMessage>

export const initialSignalFormState: SignalFormState = { ok: null, errors: {}, message: null }
```

- [ ] **Step 3 : Écrire les tests qui échouent**

`src/server/actions/signals.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    signal: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    lead: { findUnique: vi.fn() },
  },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"

import { createCompanySignal, createPersonSignal, updateSignal } from "./signals"
import { initialSignalFormState } from "./signals.types"

const BASE_FIELDS = {
  type: "OFFRE_POSTE",
  occurredOn: "2026-09-14",
  content: "Recrute deux développeurs IA",
  sourceUrl: "https://example.com/jobs",
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
  vi.mocked(prisma.signal.create).mockResolvedValue({ id: "s1" } as never)
  vi.mocked(prisma.signal.update).mockResolvedValue({ id: "s1" } as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("createCompanySignal", () => {
  it("attaches a new signal to its company", async () => {
    await createCompanySignal("c1", initialSignalFormState, buildFormData())

    expect(prisma.signal.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          companyId: "c1",
          type: "OFFRE_POSTE",
          occurredOn: new Date(Date.UTC(2026, 8, 14)),
        }),
      }),
    )
  })

  it("refuses a person-level type on a company", async () => {
    const state = await createCompanySignal(
      "c1",
      initialSignalFormState,
      buildFormData({ type: "POST" }),
    )

    expect(state.errors.type).toEqual(["Ce type ne concerne pas cette fiche"])
    expect(prisma.signal.create).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createCompanySignal("c1", initialSignalFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.signal.create).not.toHaveBeenCalled()
  })
})

describe("createPersonSignal", () => {
  it("refuses a signal on an inbound or opted-out lead", async () => {
    vi.mocked(prisma.lead.findUnique)
      .mockResolvedValueOnce({ origin: "INBOUND", person: { optedOutAt: null } } as never)
      .mockResolvedValueOnce({
        origin: "OUTBOUND",
        person: { optedOutAt: new Date("2026-09-01T10:00:00.000Z") },
      } as never)

    const inbound = await createPersonSignal("l1", initialSignalFormState, buildFormData({ type: "POST" }))
    const optedOut = await createPersonSignal("l2", initialSignalFormState, buildFormData({ type: "POST" }))

    expect(inbound.message).toBe("lead_not_eligible")
    expect(optedOut.message).toBe("lead_not_eligible")
    expect(prisma.signal.create).not.toHaveBeenCalled()
  })
})

describe("updateSignal", () => {
  it("refuses to edit a signal of an opted-out lead", async () => {
    vi.mocked(prisma.signal.findUnique).mockResolvedValue({ companyId: null, personId: "l1" } as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      origin: "OUTBOUND",
      person: { optedOutAt: new Date("2026-09-01T10:00:00.000Z") },
    } as never)

    const state = await updateSignal("s1", initialSignalFormState, buildFormData({ type: "POST" }))

    expect(state.message).toBe("lead_not_eligible")
    expect(prisma.signal.update).not.toHaveBeenCalled()
  })
})
```

Run: `pnpm vitest run --project unit src/server/actions/signals.test.ts`
Expected: FAIL, module `./signals` introuvable.

- [ ] **Step 4 : Écrire les actions**

`src/server/actions/signals.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import type { SignalType } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { signalSchema, type SignalInput } from "@/lib/schemas/signal"
import { stringField } from "@/lib/server-utils"
import { signalTypesFor, type SignalOwnerKind } from "@/lib/signals"

import { deleteEntity, saveEntity } from "./shared"
import type { SignalFormState } from "./signals.types"

const SIGNAL_PATHS = ["/admin/entreprises", "/admin/leads"] as const
const TYPE_MISMATCH = "Ce type ne concerne pas cette fiche"

type Owner = { kind: SignalOwnerKind; id: string }

class SignalRefusedError extends Error {
  constructor(readonly reason: "type_mismatch" | "lead_not_eligible") {
    super(reason)
  }
}

function collectValues(formData: FormData): SignalFormState["values"] {
  const values: Record<string, string> = {}
  for (const key of ["type", "occurredOn", "content", "sourceUrl"]) {
    values[key] = stringField(formData, key)
  }
  return values as SignalFormState["values"]
}

function invalidateSignalPaths(): void {
  for (const path of SIGNAL_PATHS) revalidatePath(path, "layout")
}

// Le toolkit ne donne de signal qu'à un lead outbound, jamais à une personne opposée ; owner.id est l'id de
// la personne (Lead.personId).
async function assertOwnerAccepts(owner: Owner, type: SignalType): Promise<void> {
  if (!signalTypesFor(owner.kind).includes(type)) throw new SignalRefusedError("type_mismatch")
  if (owner.kind === "company") return
  const lead = await prisma.lead.findUnique({
    where: { personId: owner.id },
    select: { origin: true, person: { select: { optedOutAt: true } } },
  })
  if (!lead || lead.origin !== "OUTBOUND" || lead.person.optedOutAt) {
    throw new SignalRefusedError("lead_not_eligible")
  }
}

function mapSignalError(
  err: unknown,
  values: SignalFormState["values"],
): SignalFormState | null {
  if (!(err instanceof SignalRefusedError)) return null
  return err.reason === "type_mismatch"
    ? { ok: false, errors: { type: [TYPE_MISMATCH] }, message: null, values }
    : { ok: false, errors: {}, message: "lead_not_eligible", values }
}

function saveSignal(
  actionName: string,
  events: { success: string; failure: string },
  formData: FormData,
  persist: (data: SignalInput) => Promise<unknown>,
): Promise<SignalFormState> {
  const values = collectValues(formData)

  return saveEntity<SignalInput, SignalFormState, unknown>({
    actionName,
    events,
    schema: signalSchema,
    input: values,
    persist,
    invalidateCaches: invalidateSignalPaths,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapSignalError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

export async function createCompanySignal(
  companyId: string,
  _prevState: SignalFormState,
  formData: FormData,
): Promise<SignalFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveSignal(
    "createCompanySignal",
    { success: "signal:created", failure: "signal:create_failed" },
    formData,
    async (data) => {
      await assertOwnerAccepts({ kind: "company", id: companyId }, data.type)
      return prisma.signal.create({ data: { ...data, companyId } })
    },
  )
}

export async function createPersonSignal(
  personId: string,
  _prevState: SignalFormState,
  formData: FormData,
): Promise<SignalFormState> {
  await getCurrentUser()

  return saveSignal(
    "createPersonSignal",
    { success: "signal:created", failure: "signal:create_failed" },
    formData,
    async (data) => {
      await assertOwnerAccepts({ kind: "lead", id: personId }, data.type)
      return prisma.signal.create({ data: { ...data, personId } })
    },
  )
}

export async function updateSignal(
  id: string,
  _prevState: SignalFormState,
  formData: FormData,
): Promise<SignalFormState> {
  await getCurrentUser()

  return saveSignal(
    "updateSignal",
    { success: "signal:updated", failure: "signal:update_failed" },
    formData,
    async (data) => {
      // Le rattachement ne change jamais : il se relit pour valider le type et l'état de la personne.
      const current = await prisma.signal.findUnique({
        where: { id },
        select: { companyId: true, personId: true },
      })
      if (current?.companyId) {
        await assertOwnerAccepts({ kind: "company", id: current.companyId }, data.type)
      } else if (current?.personId) {
        await assertOwnerAccepts({ kind: "lead", id: current.personId }, data.type)
      }
      return prisma.signal.update({ where: { id }, data })
    },
  )
}

export async function deleteSignal(id: string): Promise<SignalFormState> {
  await getCurrentUser()

  return deleteEntity<SignalFormState>({
    actionName: "deleteSignal",
    events: { success: "signal:deleted", failure: "signal:delete_failed" },
    successLogFields: { id },
    destroy: () => prisma.signal.delete({ where: { id } }),
    invalidateCaches: invalidateSignalPaths,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
```

Un signal introuvable à la modification laisse `prisma.signal.update` lever son erreur, rendue en `unknown_error`.

Run: `pnpm vitest run --project unit src/server/actions/signals.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5 : Lectures**

Dans `src/server/queries/companies.ts`, avant `adminCompanyInclude` :

```ts
// Signaux d'une fiche, du plus récent au plus ancien : bloc Signaux et filtre « Signal récent ».
export const signalsInclude = {
  select: {
    id: true,
    type: true,
    occurredOn: true,
    content: true,
    sourceUrl: true,
  },
  orderBy: { occurredOn: "desc" },
} as const
```

et, dans `adminCompanyInclude`, après `opportunitiesAsClient` : `signals: signalsInclude,`.

Dans `src/server/queries/leads.ts`, importer `signalsInclude` depuis `@/server/queries/companies` et l'ajouter, après `interviews` (entrée posée par le `16`, sa forme finale du `17`), à l'inclusion de la personne dans `adminLeadInclude` (`07`, étendu par `09`, `10`, `16` et `17`) : `signals: signalsInclude,` ; le résultat aplati expose `AdminLead.signals` au format `SignalItem[]`.

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 3 : Signaux supprimés avec les échanges

**Files:**
- Modify: `src/server/actions/persons.ts` (`erasePersonExchanges`)
- Test: `src/server/actions/persons.test.ts`

**Interfaces:**
- Consumes: `Signal` (Task 1) ; `erasePersonExchanges(id)` (`07`), qui supprime déjà les actions de prospection de la personne et la retire de ses entretiens
- Produces: `erasePersonExchanges(id)` supprime aussi les signaux de la personne

- [ ] **Step 1 : Écrire le test qui échoue**

Dans `src/server/actions/persons.test.ts`, ajouter au mock `prisma` de tête, à côté de `prospectingAction` :

```ts
    signal: { deleteMany: vi.fn() },
```

Dans `describe("erasePersonExchanges")`, ajouter, à la suite des tests déjà écrits au `07` :

```ts
  it("deletes the person's signals along with the exchanges", async () => {
    await erasePersonExchanges("p1")

    expect(prisma.signal.deleteMany).toHaveBeenCalledWith({ where: { personId: "p1" } })
  })
```

Run: `pnpm vitest run --project unit src/server/actions/persons.test.ts`
Expected: FAIL sur « deletes the person's signals along with the exchanges ».

- [ ] **Step 2 : Supprimer les signaux**

Dans `erasePersonExchanges`, dans la transaction qui supprime les actions de prospection de la personne et la retire de ses entretiens (`07`), ajouter :

```ts
        await tx.signal.deleteMany({ where: { personId: id } })
```

Run: `pnpm vitest run --project unit src/server/actions/persons.test.ts`
Expected: PASS.

---

### Task 4 : Formulaire, suppression, liste et card des signaux

**Files:**
- Create: `src/components/features/admin/signals/SignalFormDialog.tsx`
- Create: `src/components/features/admin/signals/DeleteSignalDialog.tsx`
- Create: `src/components/features/admin/signals/SignalList.tsx`
- Create: `src/components/features/admin/signals/SignalsCard.tsx`

**Interfaces:**
- Consumes: Tasks 1 et 2 ; `SelectField` (`08`), `OptionalDateField` (`05`) ; `ExternalUrl`, `ConfirmDeleteDialog`, `RowActionButton`, `RelatedLinksList`, `Card`
- Produces: `SignalFormDialog({ owner, signal, triggerRef }: { owner: SignalOwner; signal: SignalItem | null; triggerRef?: Ref<HTMLButtonElement> })` ; `DeleteSignalDialog({ signal })` ; `signalRelatedRows(signals, now, options: { owner?: SignalOwner; onOpen?: (signal: SignalItem) => void })` (lignes `RelatedLinksList`, actions Modifier/Supprimer avec `owner`, clic vers la vue détail avec `onOpen`) ; `signalsSection(signals: readonly SignalItem[], now: number, onOpen: (signal: SignalItem) => void): DetailSection[]` (bloc en lecture de la vue détail) ; `interface SignalRelatedOwner extends SignalOwner { href: string }` ; `buildSignalDetail(signal: SignalItem, owner: SignalRelatedOwner, onEdit: () => void): DetailContent` (vue détail propre d'un signal) ; `SignalsCard({ signals, owner, canAdd, pendingLabel }: { signals: readonly SignalItem[]; owner: SignalOwner | null; canAdd: boolean; pendingLabel: string })` (`owner` à `null` tant que la fiche n'est pas enregistrée)

- [ ] **Step 1 : Suppression**

`src/components/features/admin/signals/DeleteSignalDialog.tsx` :

```tsx
"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { formatSignalDate, SIGNAL_TYPE_LABELS, type SignalItem } from "@/lib/signals"
import { deleteSignal } from "@/server/actions/signals"

interface Props {
  signal: SignalItem
}

export function DeleteSignalDialog({ signal }: Props) {
  const name = `${SIGNAL_TYPE_LABELS[signal.type]} · ${formatSignalDate(signal)}`

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer le signal ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      successMessage="Signal supprimé"
      onDelete={async () => {
        const result = await deleteSignal(signal.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
```

- [ ] **Step 2 : Formulaire**

`src/components/features/admin/signals/SignalFormDialog.tsx` (saisie courte en modale, arbitrage « Page ou modale d'édition » de DESIGN.md) :

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
import { Pencil, Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { OptionalDateField } from "@/components/features/admin/OptionalDateField"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import {
  formatSignalDate,
  SIGNAL_FIELD_LABELS as LABELS,
  SIGNAL_TYPE_LABELS,
  signalTypesFor,
  type SignalItem,
  type SignalOwner,
} from "@/lib/signals"
import {
  createCompanySignal,
  createPersonSignal,
  updateSignal,
} from "@/server/actions/signals"
import { initialSignalFormState } from "@/server/actions/signals.types"

interface Props {
  owner: SignalOwner
  signal: SignalItem | null
  // La vue détail du signal rouvre ce même dialogue en cliquant ce bouton par ref.
  triggerRef?: Ref<HTMLButtonElement>
}

export function SignalFormDialog({ owner, signal, triggerRef }: Props) {
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
      <DialogTrigger asChild>
        {signal ? (
          <RowActionButton
            ref={triggerRef}
            aria-label={`Modifier le signal ${SIGNAL_TYPE_LABELS[signal.type]} · ${formatSignalDate(signal)}`}
          >
            <Pencil className="size-4" />
          </RowActionButton>
        ) : (
          <Button type="button" size="sm">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau signal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-140">
        <SignalForm key={instanceKey} owner={owner} signal={signal} onDone={handleDone} />
      </DialogContent>
    </Dialog>
  )
}

function SignalForm({
  owner,
  signal,
  onDone,
}: {
  owner: SignalOwner
  signal: SignalItem | null
  onDone: () => void
}) {
  const formId = useId()
  const action = signal
    ? updateSignal.bind(null, signal.id)
    : owner.kind === "company"
      ? createCompanySignal.bind(null, owner.id)
      : createPersonSignal.bind(null, owner.id)
  const [state, formAction, pending] = useActionState(action, initialSignalFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const types = signalTypesFor(owner.kind)

  // Le jour enregistré arrive à minuit UTC : il se relit en heure locale pour le calendrier.
  const [occurredOn, setOccurredOn] = useState<Date | undefined>(
    signal
      ? new Date(
          signal.occurredOn.getUTCFullYear(),
          signal.occurredOn.getUTCMonth(),
          signal.occurredOn.getUTCDate(),
        )
      : undefined,
  )

  const notifySaved = useEffectEvent(() => {
    toast.success(signal ? "Signal mis à jour" : "Signal créé")
  })

  useEffect(() => {
    if (state.ok === true) {
      onDone()
      notifySaved()
    } else if (state.ok === false && state.message === "lead_not_eligible") {
      toast.error("Ce lead ne peut pas recevoir de signal")
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, onDone])

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col gap-4">
      <DialogHeader className="shrink-0">
        <DialogTitle>
          {signal
            ? `Modifier le signal ${SIGNAL_TYPE_LABELS[signal.type]} · ${formatSignalDate(signal)}`
            : "Nouveau signal"}
        </DialogTitle>
        <DialogDescription>
          {signal ? "Modifier les informations de ce signal." : `Ajouter un signal à ${owner.name}.`}
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-4 overflow-y-auto sm:grid-cols-2">
        <SelectField
          id={`${formId}-type`}
          name="type"
          label={LABELS.type}
          options={types}
          labels={SIGNAL_TYPE_LABELS}
          defaultValue={signal?.type ?? types[0] ?? ""}
          errors={state.errors.type}
        />

        <div className="sm:col-span-2">
          <OptionalDateField
            id={`${formId}-occurredOn`}
            name="occurredOn"
            label={LABELS.occurredOn}
            errors={state.errors.occurredOn}
            value={occurredOn}
            onChange={setOccurredOn}
          />
        </div>

        <div className="sm:col-span-2">
          <FormField
            id={`${formId}-sourceUrl`}
            label={LABELS.sourceUrl}
            errors={state.errors.sourceUrl}
          >
            <Input
              id={`${formId}-sourceUrl`}
              name="sourceUrl"
              type="url"
              placeholder="https://"
              defaultValue={signal?.sourceUrl ?? ""}
              aria-invalid={!!state.errors.sourceUrl?.length}
              aria-describedby={`${formId}-sourceUrl-error`}
            />
          </FormField>
        </div>

        <div className="sm:col-span-2">
          <FormField id={`${formId}-content`} label={LABELS.content} errors={state.errors.content}>
            <Textarea
              id={`${formId}-content`}
              name="content"
              rows={3}
              defaultValue={signal?.content ?? ""}
              aria-invalid={!!state.errors.content?.length}
              aria-describedby={`${formId}-content-error`}
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

- [ ] **Step 3 : Lignes `RelatedLinksList`, vue détail et card de la page**

`src/components/features/admin/signals/SignalList.tsx` (le nom du fichier garde l'historique du composant qu'il portait ; il n'exporte plus que des fonctions) :

```tsx
import type { DetailContent, DetailSection } from "@/components/features/admin/DetailDialog"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import type { RelatedLink } from "@/components/features/admin/RelatedLinksList"
import { RelatedLinksList } from "@/components/features/admin/RelatedLinksList"
import { DeleteSignalDialog } from "@/components/features/admin/signals/DeleteSignalDialog"
import { SignalFormDialog } from "@/components/features/admin/signals/SignalFormDialog"
import {
  formatSignalDate,
  SIGNAL_FIELD_LABELS,
  SIGNAL_FRESHNESS_LABELS,
  SIGNAL_TYPE_LABELS,
  signalFreshness,
  type SignalItem,
  type SignalOwner,
  type SignalOwnerKind,
} from "@/lib/signals"

interface SignalRowOptions {
  // Donné depuis la card de la page d'une fiche : actions Modifier et Supprimer.
  owner?: SignalOwner
  // Donné depuis le bloc en lecture d'une vue détail : clic ouvrant la vue détail du signal.
  onOpen?: (signal: SignalItem) => void
}

// Méta « décote · contenu » ; sans décote pour un type que le toolkit ne note pas (Pivot, Acquisition, Post…).
export function signalRelatedRows(
  signals: readonly SignalItem[],
  now: number,
  options: SignalRowOptions,
): RelatedLink[] {
  return signals.map((signal) => {
    const freshness = signalFreshness(signal, new Date(now))
    const freshLabel = freshness ? SIGNAL_FRESHNESS_LABELS[freshness] : null
    return {
      id: signal.id,
      label: SIGNAL_TYPE_LABELS[signal.type],
      meta: freshLabel ? `${freshLabel} · ${signal.content}` : signal.content,
      trailing: formatSignalDate(signal),
      ...(options.onOpen ? { onClick: () => options.onOpen?.(signal) } : {}),
      ...(options.owner
        ? {
            actions: (
              <>
                <SignalFormDialog owner={options.owner} signal={signal} />
                <DeleteSignalDialog signal={signal} />
              </>
            ),
          }
        : {}),
    }
  })
}

// Bloc en lecture de la vue détail ; arbitrage « bloc sans donnée » : pas de bloc sans signal.
export function signalsSection(
  signals: readonly SignalItem[],
  now: number,
  onOpen: (signal: SignalItem) => void,
): DetailSection[] {
  if (signals.length === 0) return []
  return [
    {
      title: "Signaux",
      rows: [{ fullWidth: true, value: <RelatedLinksList links={signalRelatedRows(signals, now, { onOpen })} /> }],
    },
  ]
}

export interface SignalRelatedOwner extends SignalOwner {
  // Vers la liste « toutes » de sa fiche : `/admin/entreprises?detail=<id>` ou `/admin/leads/tous?detail=<id>`.
  href: string
}

const OWNER_KIND_LABELS: Record<SignalOwnerKind, string> = {
  company: "Entreprise",
  lead: "Lead",
}

// Vue détail propre d'un signal, ouverte à la place de la vue courante depuis les lignes du bloc Signaux.
export function buildSignalDetail(
  signal: SignalItem,
  owner: SignalRelatedOwner,
  onEdit: () => void,
): DetailContent {
  const freshness = signalFreshness(signal, new Date())

  return {
    title: SIGNAL_TYPE_LABELS[signal.type],
    subtitle: formatSignalDate(signal),
    ...(freshness
      ? {
          status: (
            <Badge variant={freshness === "RECENT" ? "secondary" : "outline"} meta>
              {SIGNAL_FRESHNESS_LABELS[freshness]}
            </Badge>
          ),
        }
      : {}),
    sections: [
      {
        title: "Signal",
        rows: [
          {
            label: SIGNAL_FIELD_LABELS.sourceUrl,
            value: signal.sourceUrl ? <ExternalUrl url={signal.sourceUrl} /> : null,
            fullWidth: true,
          },
          {
            label: SIGNAL_FIELD_LABELS.content,
            value: <span className="whitespace-pre-line">{signal.content}</span>,
            fullWidth: true,
          },
        ],
      },
      {
        title: "Rattaché à",
        rows: [
          {
            fullWidth: true,
            value: (
              <RelatedLinksList
                links={[{ id: owner.id, label: owner.name, meta: OWNER_KIND_LABELS[owner.kind], href: owner.href }]}
              />
            ),
          },
        ],
      },
    ],
    onEdit,
  }
}
```

(import manquant à ajouter à ce fichier : `import { Badge } from "@/components/ui/badge"`, utilisé par `buildSignalDetail`.)

`src/components/features/admin/signals/SignalsCard.tsx` :

```tsx
"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { RelatedLinksList } from "@/components/features/admin/RelatedLinksList"
import { signalRelatedRows } from "@/components/features/admin/signals/SignalList"
import { SignalFormDialog } from "@/components/features/admin/signals/SignalFormDialog"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SignalItem, SignalOwner } from "@/lib/signals"

interface Props {
  signals: readonly SignalItem[]
  // `null` tant que la fiche n'est pas enregistrée : la card est visible dès la création (arbitrage « Cards rattachées des pages »).
  owner: SignalOwner | null
  canAdd: boolean
  // « de l'entreprise » ou « du lead », pour le texte vide avant le premier enregistrement.
  pendingLabel: string
}

// Card de la page d'une fiche (arbitrage « Élément rattaché à une fiche », DESIGN.md), hors du formulaire :
// chaque signal s'enregistre à part.
export function SignalsCard({ signals, owner, canAdd, pendingLabel }: Props) {
  // Instant figé au montage : la fraîcheur reste stable pendant la consultation.
  const [now] = useState(() => Date.now())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signaux</CardTitle>
        <CardAction>
          {!owner ? (
            <Button type="button" size="sm" disabled>
              <Plus aria-hidden data-icon="inline-start" />
              Nouveau signal
            </Button>
          ) : canAdd ? (
            <SignalFormDialog owner={owner} signal={null} />
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent>
        {!owner ? (
          <p className="text-sm text-muted-foreground">Après l'enregistrement {pendingLabel}.</p>
        ) : signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun signal.</p>
        ) : (
          <RelatedLinksList links={signalRelatedRows(signals, now, { owner })} />
        )}
      </CardContent>
    </Card>
  )
}
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 5 : Entreprises

**Files:**
- Modify: `src/components/features/admin/companies/CompaniesTable.tsx`
- Modify: `src/components/features/admin/companies/DeleteCompanyDialog.tsx`
- Modify: `src/app/admin/(protected)/entreprises/[id]/page.tsx`
- Modify: `src/app/admin/(protected)/entreprises/nouvelle/page.tsx`

**Interfaces:**
- Consumes: `signalsSection`, `buildSignalDetail`, `SignalRelatedOwner`, `SignalsCard` (Task 4) ; `hasRecentSignal` (Task 1) ; `AdminCompany.signals` (Task 2) ; `CompanyForm`, prop `relatedCards` (`03`) ; cards Leads (`08`) et Opportunités (`15`) déjà posées dans ce fragment, reprises telles quelles
- Produces: rien

- [ ] **Step 1 : Bloc Signaux de la vue détail**

Dans `CompaniesTable.tsx`, importer `signalsSection` depuis `@/components/features/admin/signals/SignalList` et `hasRecentSignal` depuis `@/lib/signals`. Changer la signature de `buildCompanyDetail` en `buildCompanyDetail(company: AdminCompany, onEdit: () => void, now: number, onOpenSignal: (signal: SignalItem) => void): DetailContent` et insérer, juste après `...opportunitiesSection(company),` :

```tsx
      ...signalsSection(company.signals, now, onOpenSignal),
```

- [ ] **Step 2 : Vue détail d'un signal depuis l'entreprise**

Un signal n'a pas de page propre : sa vue détail remplace la vue courante dans le même `DetailDialog`, avec les signaux déjà chargés sur `selectedCompany`. Importer `buildSignalDetail`, `type SignalRelatedOwner` depuis `@/components/features/admin/signals/SignalList`, `SignalFormDialog` et `type SignalItem` depuis `@/lib/signals`. Ajouter, après l'état `selectedCompany` :

```tsx
  const [selectedSignal, setSelectedSignal] = useState<SignalItem | null>(null)
  const signalEditRefs = useRef(new Map<string, HTMLButtonElement>())
```

Dans le `useMemo` du détail, brancher sur le signal sélectionné avant la branche entreprise :

```tsx
  const detail = useMemo<DetailContent | null>(() => {
    if (selectedSignal && selectedCompany) {
      const owner: SignalRelatedOwner = {
        kind: "company",
        id: selectedCompany.id,
        name: selectedCompany.name,
        href: `/admin/entreprises?detail=${selectedCompany.id}`,
      }
      return buildSignalDetail(selectedSignal, owner, () => {
        signalEditRefs.current.get(selectedSignal.id)?.click()
      })
    }
    return selectedCompany
      ? buildCompanyDetail(selectedCompany, () => { /* inchangé */ }, now, setSelectedSignal)
      : null
  }, [selectedCompany, selectedSignal, now, router])
```

Monter, hors écran, un `SignalFormDialog` par signal de l'entreprise affichée, pour que « Modifier » dans la vue détail du signal ouvre le même formulaire que la card :

```tsx
  {selectedCompany ? (
    <div hidden>
      {selectedCompany.signals.map((signal) => (
        <SignalFormDialog
          key={signal.id}
          owner={{ kind: "company", id: selectedCompany.id, name: selectedCompany.name }}
          signal={signal}
          triggerRef={(element) => {
            if (element) signalEditRefs.current.set(signal.id, element)
            else signalEditRefs.current.delete(signal.id)
          }}
        />
      ))}
    </div>
  ) : null}
```

Enfin, dans `onOpenChange` du `DetailDialog`, effacer aussi `selectedSignal` quand la fenêtre se ferme.

- [ ] **Step 3 : Filtre « Signal récent »**

Supprimer la constante de module `facets`. Dans `CompaniesTable`, après l'état `selectedCompany`, ajouter :

```tsx
  // Instant figé au montage : la fraîcheur et le filtre restent stables pendant la consultation.
  const [now] = useState(() => Date.now())

  const facets = useMemo<readonly Facet<AdminCompany>[]>(
    () => [
      {
        key: "relationStatus",
        label: COMPANY_FIELD_LABELS.relationStatus,
        options: RELATION_STATUSES.map((status) => ({
          value: status,
          label: RELATION_STATUS_LABELS[status],
        })),
        value: (company) => company.relationStatus,
      },
      {
        key: "types",
        label: COMPANY_FIELD_LABELS.types,
        options: COMPANY_TYPES.map((type) => ({ value: type, label: COMPANY_TYPE_LABELS[type] })),
        value: (company) => company.types,
      },
      {
        key: "zones",
        label: COMPANY_FIELD_LABELS.zones,
        options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
        value: (company) => company.zones,
      },
      {
        key: "signal",
        label: "Signal",
        options: [{ value: "recent", label: "Récent" }],
        value: (company) => (hasRecentSignal(company.signals, new Date(now)) ? ["recent"] : []),
      },
    ],
    [now],
  )
```

- [ ] **Step 4 : Card Signaux des pages entreprise**

Dans `src/app/admin/(protected)/entreprises/[id]/page.tsx`, importer `SignalsCard` depuis `@/components/features/admin/signals/SignalsCard`, puis remplacer le fragment `relatedCards` passé à `CompanyForm` (`08`, card Leads ; `15`, card Opportunités) par le même complété d'une `SignalsCard`, à la suite :

```tsx
      relatedCards={
        <>
          <RelatedLinksCard
            title="Leads"
            links={leads.map((lead): RelatedLink => ({
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
              ...company.opportunitiesAsIntermediary.map((opportunity): RelatedLink => ({
                id: `esn-${opportunity.id}`,
                href: `/admin/opportunites/${opportunity.id}`,
                label: opportunity.title,
                meta: `${OPPORTUNITY_STATUS_LABELS[opportunity.status]} · ESN`,
                trailing: formatDailyRate(opportunity.dailyRate),
              })),
              ...company.opportunitiesAsClient.map((opportunity): RelatedLink => ({
                id: `client-${opportunity.id}`,
                href: `/admin/opportunites/${opportunity.id}`,
                label: opportunity.title,
                meta: `${OPPORTUNITY_STATUS_LABELS[opportunity.status]} · Client final`,
                trailing: formatDailyRate(opportunity.dailyRate),
              })),
            ]}
            emptyText="Aucune opportunité pour cette entreprise."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/opportunites/nouvelle">
                  <Plus aria-hidden data-icon="inline-start" />
                  Nouvelle opportunité
                </Link>
              </Button>
            }
          />
          <SignalsCard
            signals={company.signals}
            owner={{ kind: "company", id: company.id, name: company.name }}
            canAdd
            pendingLabel="de l'entreprise"
          />
        </>
      }
```

(les cards Leads et Opportunités, inchangées, viennent du `08` et du `15` ; leurs imports restent ceux déjà posés là.) L'entreprise lue par `findCompanyByIdForAdmin` porte ses signaux (Task 2), et les actions revalident `/admin/entreprises` en variante `layout` : la card se met à jour sans recharger.

Dans `src/app/admin/(protected)/entreprises/nouvelle/page.tsx`, importer `SignalsCard`, puis remplacer de même le fragment `relatedCards` par le même complété d'une `SignalsCard` vide, présente aussi avant le premier enregistrement (arbitrage « Cards rattachées des pages ») :

```tsx
      relatedCards={
        <>
          <RelatedLinksCard title="Leads" links={[]} emptyText="Après l'enregistrement de l'entreprise." />
          <RelatedLinksCard
            title="Opportunités"
            links={[]}
            emptyText="Après l'enregistrement de l'entreprise."
            action={
              <Button variant="outline" size="sm" disabled>
                <Plus aria-hidden data-icon="inline-start" />
                Nouvelle opportunité
              </Button>
            }
          />
          <SignalsCard signals={[]} owner={null} canAdd={false} pendingLabel="de l'entreprise" />
        </>
      }
```

- [ ] **Step 5 : Suppression d'une entreprise**

Dans `DeleteCompanyDialog.tsx`, ajouter à `ConfirmDeleteDialog`, après `name` :

```tsx
      description="Ses signaux sont supprimés avec elle."
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 6 : Leads

**Files:**
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`
- Modify: `src/app/admin/(protected)/leads/[id]/page.tsx`
- Modify: `src/app/admin/(protected)/leads/nouveau/page.tsx`

**Interfaces:**
- Consumes: `signalsSection`, `buildSignalDetail`, `SignalRelatedOwner`, `SignalsCard` (Task 4) ; `hasRecentSignal` (Task 1) ; `AdminLead.signals` (Task 2) ; `personDisplayName` (`07`, `@/lib/persons`) ; `LeadForm`, prop `relatedCards` (`08`) ; cards Actions (`10`), Opportunités apportées (`15`) et Entretiens (`17`) déjà posées dans ce fragment, reprises telles quelles
- Produces: rien

- [ ] **Step 1 : Bloc Signaux de la vue détail**

Dans `LeadsTable.tsx`, importer `signalsSection` depuis `@/components/features/admin/signals/SignalList` et `hasRecentSignal` depuis `@/lib/signals`. Dans `buildLeadDetail`, insérer juste après `...interviewsSection(lead),`, dans la branche du lead opposé comme dans l'autre :

```tsx
        ...signalsSection(lead.signals, now, onOpenSignal),
```

`buildLeadDetail` gagne le paramètre `onOpenSignal: (signal: SignalItem) => void`. Un lead opposé garde ses signaux comme historique jusqu'à l'effacement de ses échanges : sa vue détail les montre en lecture.

- [ ] **Step 2 : Vue détail d'un signal depuis le lead**

Même mécanique que l'entreprise (Task 5, Step 2) : `selectedSignal`, `signalEditRefs`, un `SignalFormDialog` monté hors écran par signal du lead affiché, et la branche du détail avant celle du lead :

```tsx
  const detail = useMemo<DetailContent | null>(() => {
    if (selectedSignal && selectedLead) {
      const owner: SignalRelatedOwner = {
        kind: "lead",
        id: selectedLead.id,
        name: personDisplayName(selectedLead),
        href: `/admin/leads/tous?detail=${selectedLead.id}`,
      }
      return buildSignalDetail(selectedSignal, owner, () => {
        signalEditRefs.current.get(selectedSignal.id)?.click()
      })
    }
    return selectedLead ? buildLeadDetail(selectedLead, () => { /* inchangé */ }, now, setSelectedSignal) : null
  }, [selectedLead, selectedSignal, now, router])
```

- [ ] **Step 3 : Filtre « Signal récent »**

Dans le `useMemo` des `facets`, ajouter en dernière entrée :

```tsx
      {
        key: "signal",
        label: "Signal",
        options: [{ value: "recent", label: "Récent" }],
        value: (lead) => (hasRecentSignal(lead.signals, new Date(now)) ? ["recent"] : []),
      },
```

- [ ] **Step 4 : Card Signaux des pages lead**

Dans `src/app/admin/(protected)/leads/[id]/page.tsx`, importer `SignalsCard` depuis `@/components/features/admin/signals/SignalsCard`, puis remplacer le fragment `relatedCards` passé à `LeadForm` (`10`, card Actions ; `15`, card Opportunités apportées ; `17`, card Entretiens) par le même complété d'une `SignalsCard`, à la suite (`personDisplayName` est déjà importé par le `08`) :

```tsx
      relatedCards={
        <>
          <LeadActionsCard lead={lead} actions={actions} />
          <RelatedLinksCard
            title="Opportunités apportées"
            links={lead.opportunities.map((opportunity): RelatedLink => ({
              id: opportunity.id,
              href: `/admin/opportunites/${opportunity.id}`,
              label: opportunity.title,
              meta: opportunity.client
                ? `${OPPORTUNITY_STATUS_LABELS[opportunity.status]} · ${opportunity.client.name}`
                : OPPORTUNITY_STATUS_LABELS[opportunity.status],
              trailing: formatDailyRate(opportunity.dailyRate),
            }))}
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
            links={lead.interviews.map((interview): RelatedLink => ({
              id: interview.id,
              href: `/admin/entretiens/${interview.id}`,
              label: `${INTERVIEW_TYPE_LABELS[interview.type]} · ${interview.opportunity.title}`,
              meta: INTERVIEW_STATUS_LABELS[interview.status],
              trailing: formatShortDateTime(interview.scheduledAt),
            }))}
            emptyText="Aucun entretien pour ce lead."
          />
          {
            // Le toolkit ne donne de signal qu'à un lead outbound ; un lead passé inbound garde les siens.
            lead.origin === "OUTBOUND" || lead.signals.length > 0 ? (
              <SignalsCard
                signals={lead.signals}
                owner={{ kind: "lead", id: lead.id, name: personDisplayName(lead) }}
                canAdd={lead.origin === "OUTBOUND"}
                pendingLabel="du lead"
              />
            ) : null
          }
        </>
      }
```

(les cards Actions, Opportunités apportées et Entretiens, inchangées, viennent du `10`, du `15` et du `17` ; leurs imports restent ceux déjà posés là.) La page d'un lead opposé renvoie vers Tous (`08`) : un lead de cette page n'est jamais opposé.

Dans `src/app/admin/(protected)/leads/nouveau/page.tsx`, importer `SignalsCard`, puis remplacer de même le fragment `relatedCards` par le même complété d'une `SignalsCard` vide, présente aussi avant le premier enregistrement :

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
          <SignalsCard signals={[]} owner={null} canAdd={false} pendingLabel="du lead" />
        </>
      }
```

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 7 : Registre et politique de confidentialité

**Files:**
- Modify: `docs/registre-traitements.md`
- Modify: `content/legal/fr/confidentialite-intro.md`
- Modify: `content/legal/en/confidentialite-intro.md`

**Interfaces:**
- Consumes: Traitement 7 et puce prospection (`01`)
- Produces: rien

- [ ] **Step 1 : Registre**

Dans le Traitement 7 de `docs/registre-traitements.md`, remplacer la ligne :

```md
| Données | Identité, poste, entreprise, coordonnées professionnelles (email, téléphone), profil LinkedIn, notes d'échange, historique des actions de prospection et des entretiens |
```

par :

```md
| Données | Identité, poste, entreprise, coordonnées professionnelles (email, téléphone), profil LinkedIn, signaux d'activité professionnelle publique (publications, commentaires, présence en conférence), notes d'échange, historique des actions de prospection et des entretiens |
```

et passer la `date` du frontmatter au jour de la modification.

- [ ] **Step 2 : Politique**

Dans la puce « Prospection et relations professionnelles » de `content/legal/fr/confidentialite-intro.md`, remplacer « je conserve vos nom, poste, entreprise, coordonnées professionnelles, profil LinkedIn et nos échanges » par « je conserve vos nom, poste, entreprise, coordonnées professionnelles, profil LinkedIn, les signaux publics de votre activité professionnelle (publications, commentaires, présence en conférence) et nos échanges ».

Dans la puce « Prospecting and professional relationships » de `content/legal/en/confidentialite-intro.md`, remplacer « I keep your name, job title, company, professional contact details, LinkedIn profile and our exchanges » par « I keep your name, job title, company, professional contact details, LinkedIn profile, the public signals of your professional activity (posts, comments, conference attendance) and our exchanges ».

---

### Task 8 : Qualité et parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 7
- Produces: rien

- [ ] **Step 1 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

- [ ] **Step 2 : Entreprise**

Run: `just dev`, se connecter, ouvrir `/admin/entreprises/nouvelle`.
Expected: aucune ligne de la liste ne porte de bouton « Nouveau signal ». La card Signaux apparaît déjà sous Détails, « Après l'enregistrement de l'entreprise. », bouton « Nouveau signal » désactivé. Enregistrer l'entreprise, ouvrir sa page : la card affiche « Aucun signal. », bouton actif, qui ne propose que les six types d'entreprise. Une offre de poste datée du 1er du mois courant avec son lien s'enregistre, toast « Signal créé », et la card la montre aussitôt, type en libellé, décote « Récent » et contenu en méta, date à droite. Modifier son contenu, puis ajouter une levée datée au jour d'il y a 8 mois : la card montre les deux, la levée en « À confirmer », sans recharger. Dans la liste, ouvrir la vue détail de l'entreprise puis cliquer la ligne de la levée : sa vue détail remplace la vue courante (type en titre, date en sous-titre, badge « À confirmer », lien source et contenu, bloc « Rattaché à » vers l'entreprise), « Modifier » rouvre le formulaire ; le filtre Signal « Récent » garde l'entreprise ; supprimer l'offre de poste depuis la card, le filtre ne la garde plus.

- [ ] **Step 3 : Leads**

Ouvrir `/admin/leads/nouveau`, puis la page d'un lead outbound, puis celle d'un lead inbound.
Expected: sur la création, la card Signaux affiche « Après l'enregistrement du lead. », bouton désactivé. Le lead outbound a sa card Signaux avec « Nouveau signal » ; un post engageant daté au jour y apparaît, sans badge de décote ; le lead inbound sans signal n'a pas de card Signaux. Passer le lead outbound en « Ne plus contacter » sans cocher l'effacement : dans Leads > Tous, sa vue détail montre toujours le signal en lecture, dont le clic ouvre la vue détail du signal avec un bloc « Rattaché à » vers le lead ; sur un second lead outbound avec un signal, cocher l'effacement : son bloc Signaux disparaît. Puis `just stop`.

- [ ] **Step 4 : Politique**

Ouvrir `/fr/confidentialite` et `/en/confidentialite`.
Expected: la puce prospection cite les signaux publics d'activité professionnelle.
