# Données des opportunités : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le modèle `Opportunity` (apportée par un apporteur), sa validation, sa lecture admin et ses Server Actions de création, modification et suppression.

**Architecture:** Modèle Prisma `Opportunity` dans le schema `freelance`, relié à l'apporteur (`Person`, relation `"OpportunityReferrer"`, `SetNull`) et à deux entreprises, l'ESN et le client final (`Restrict`), avec les enums `ContractStatus` et `WorkMode` des projets. Un schéma Zod valide les champs et leurs règles croisées (client final distinct de l'ESN, jours sur site bornés par le rythme, démarrage au mois) ; les actions vérifient le type de l'ESN avant d'écrire et suivent le motif `saveEntity` / `deleteEntity`.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4, Next.js 16 Server Actions, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/14-opportunites-donnees-design.md`

## Global Constraints

- **Prérequis** : plans `02` (`Zone`, `CompanyType` avec `ESN_RECRUTEMENT`) et `07` (`Lead`, générique de `saveEntity` assoupli, `src/lib/schemas/person.ts` : `NONE_VALUE`, `notesField`, `optionalTextField`) implémentés.
- **Enum, valeurs exactes** : `OpportunityStatus` `PROPOSEE`, `EN_PROCESS`, `OFFRE_RECUE`, `EN_PAUSE`, `ACCEPTEE`, `REFUSEE`, `DECLINEE`, `ABANDONNEE` (défaut `PROPOSEE`) ; libellés Proposée, En process, Offre reçue, En pause, Acceptée, Refusée, Déclinée, Abandonnée.
- **Bornes** : TJM entier positif ; rythme 1 à 5 ; jours sur site 0 à 5 et jamais au-delà du rythme ; durée 1 à 60 mois ; titre 120 caractères, rôle 80, notes 200.
- **Messages** : « L'intitulé est requis », « Le client final ne peut pas être l'ESN », « Pas plus de jours sur site que de jours travaillés », « L'ESN doit être une entreprise de type ESN / Recrutement » (`intermediary_not_esn`), `company_not_found`, `referrer_not_found`, `unknown_error`.
- **Démarrage** : reçu en `AAAA-MM`, enregistré au premier du mois à minuit UTC (colonne date).
- **Liens** : apporteur (`Person`) `onDelete: SetNull`, relation `"OpportunityReferrer"` ; ESN et client final `onDelete: Restrict`.
- **Chemins revalidés** : `/admin/opportunites`, `/admin/leads`, `/admin/entreprises`, variante `layout`.
- **Glyphes** : 55 glyphes Lucide d'énumération CRM ajoutés au design system (décision maquette du 2026-10-02) ; ce plan pose ceux du statut d'opportunité, du contrat et du mode de travail, en table `<ENUM>_ICONS` à côté de leurs libellés, imports nommés depuis `lucide-react`.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Opportunité d'un client direct** : sans ESN, aucune vérification de type ni lecture d'entreprise. Couvert par « accepts a direct client opportunity without an intermediary » (Task 2).
- **Changer l'ESN d'une opportunité existante pour une entreprise qui n'en est pas une** : refusé comme à la création. Couvert par « refuses an intermediary that is not typed ESN / Recrutement », écrit sur `updateOpportunity` (Task 2).
- **Démarrage affiché dans un fuseau à l'ouest de Greenwich** : « avril 2026 » reste avril, jamais mars. Couvert par « shows the start month without shifting it to the previous month » (Task 1).
- **Apporteur** : le retrait du seul rôle Lead ne touche pas `referrerId` ; seule la suppression de la personne le vide (`SetNull`). Vérifié à la Task 3, Step 3.
- **Entreprise d'une opportunité supprimée depuis l'écran Entreprises** : refus affiché, l'entreprise reste. Vérifié à la Task 3, Step 3.

---

### Task 1 : Modèle, migration, libellés et glyphes

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_opportunities/migration.sql`
- Create: `src/lib/opportunities.ts`
- Test: `src/lib/opportunities.test.ts`
- Modify: `src/lib/projects.ts`

**Interfaces:**
- Consumes: `Zone`, `ContractStatus`, `WorkMode`, `Company`, `Person`, `IconComponent` (`@/lib/icons`)
- Produces: modèle `Opportunity`, enum `OpportunityStatus` ; `OPPORTUNITY_STATUS_LABELS`, `OPPORTUNITY_STATUS_ICONS`, `OPPORTUNITY_FIELD_LABELS`, `formatStartMonth(date: Date | null): string | null`, `toMonthValue(date: Date): string` ; `CONTRACT_STATUS_ICONS`, `WORK_MODE_ICONS`

- [ ] **Step 1 : Enum et modèle**

Dans `prisma/schema.prisma`, après l'enum `ContactStatus` :

```prisma
enum OpportunityStatus {
  PROPOSEE
  EN_PROCESS
  OFFRE_RECUE
  EN_PAUSE
  ACCEPTEE
  REFUSEE
  DECLINEE
  ABANDONNEE

  @@schema("freelance")
}
```

Après le modèle `Contact` :

```prisma
model Opportunity {
  id             String             @id @default(uuid(7))
  title          String
  role           String?
  status         OpportunityStatus  @default(PROPOSEE)
  dailyRate      Int?
  contract       ContractStatus?
  workMode       WorkMode?
  daysPerWeek    Int?
  onSiteDays     Int?
  zone           Zone?
  // Toujours le premier du mois : un démarrage se connaît au mois, un jour saisi serait inventé.
  startMonth     DateTime?          @db.Date
  durationMonths Int?
  notes          String?
  details        String?

  // Qui a apporté l'opportunité : un fait de l'opportunité, qui survit au retrait d'un rôle.
  // Supprimer la personne laisse l'opportunité et ses faits.
  referrerId     String?
  referrer       Person?  @relation("OpportunityReferrer", fields: [referrerId], references: [id], onDelete: SetNull)
  // Vide pour un client direct.
  intermediaryId String?
  intermediary   Company? @relation("OpportunityIntermediary", fields: [intermediaryId], references: [id], onDelete: Restrict)
  clientId       String?
  client         Company? @relation("OpportunityClient", fields: [clientId], references: [id], onDelete: Restrict)

  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@index([referrerId])
  @@index([intermediaryId])
  @@index([clientId])
  @@schema("freelance")
}
```

Dans `Company`, après `persons Person[]` :

```prisma
  opportunitiesAsIntermediary Opportunity[] @relation("OpportunityIntermediary")
  opportunitiesAsClient       Opportunity[] @relation("OpportunityClient")
```

Dans `Person` (`07`), après `prospectingActions ProspectingAction[]` : `referredOpportunities Opportunity[] @relation("OpportunityReferrer")`.

- [ ] **Step 2 : Migration**

Run: `pnpm prisma migrate dev --create-only --name opportunities`
Expected: un dossier de migration créé, non appliqué.

À la fin du fichier généré, ajouter la contrainte que Prisma ne sait pas écrire :

```sql
ALTER TABLE "freelance"."Opportunity" ADD CONSTRAINT "Opportunity_intermediary_client_check" CHECK ("intermediaryId" IS DISTINCT FROM "clientId");
```

Run: `pnpm prisma migrate dev`, puis `just db-test`
Expected: migration appliquée en dev et en test ; elle crée le type `OpportunityStatus`, la table `"freelance"."Opportunity"` (colonnes `contract` et `workMode` typées par les enums du schema `public`), trois index, trois clés étrangères (`Opportunity_referrerId_fkey` vers `Person.id` en `ON DELETE SET NULL`, `Opportunity_intermediaryId_fkey` et `Opportunity_clientId_fkey` en `ON DELETE RESTRICT`) et la contrainte `Opportunity_intermediary_client_check`.

- [ ] **Step 3 : Écrire le test du mois de démarrage**

`src/lib/opportunities.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { formatStartMonth, toMonthValue } from "./opportunities"

describe("formatStartMonth", () => {
  it("shows the start month without shifting it to the previous month", () => {
    const firstOfApril = new Date("2026-04-01T00:00:00.000Z")

    const label = formatStartMonth(firstOfApril)
    const value = toMonthValue(firstOfApril)

    expect(label).toBe("avril 2026")
    expect(value).toBe("2026-04")
  })
})
```

Run: `TZ=America/New_York pnpm vitest run --project unit src/lib/opportunities.test.ts`
Expected: FAIL, module `./opportunities` introuvable. (Le fuseau de New York place minuit UTC le 31 mars au soir : une lecture en heure locale afficherait mars.)

- [ ] **Step 4 : Libellés, glyphes et mois**

`src/lib/opportunities.ts` :

```ts
import { Archive, CircleCheck, CirclePause, CircleX, Clock, Hand, Inbox, Send } from "lucide-react"

import type { OpportunityStatus } from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  PROPOSEE: "Proposée",
  EN_PROCESS: "En process",
  OFFRE_RECUE: "Offre reçue",
  EN_PAUSE: "En pause",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Refusée",
  DECLINEE: "Déclinée",
  ABANDONNEE: "Abandonnée",
}

export const OPPORTUNITY_STATUS_ICONS: Record<OpportunityStatus, IconComponent | null> = {
  PROPOSEE: Send,
  EN_PROCESS: Clock,
  OFFRE_RECUE: Inbox,
  EN_PAUSE: CirclePause,
  ACCEPTEE: CircleCheck,
  REFUSEE: CircleX,
  DECLINEE: Hand,
  ABANDONNEE: Archive,
}

export const OPPORTUNITY_FIELD_LABELS = {
  title: "Intitulé",
  role: "Rôle",
  status: "Statut",
  referrerId: "Apporteur",
  intermediaryId: "ESN",
  clientId: "Client final",
  dailyRate: "TJM",
  contract: "Contrat",
  workMode: "Mode de travail",
  daysPerWeek: "Rythme",
  onSiteDays: "Jours sur site",
  zone: "Localité",
  startMonth: "Démarrage",
  durationMonths: "Durée (mois)",
  notes: "Notes",
  details: "Détails",
} as const

// Relu en UTC : un fuseau à l'ouest de Greenwich reculerait sinon l'affichage au mois précédent.
const START_MONTH = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export function formatStartMonth(date: Date | null): string | null {
  return date ? START_MONTH.format(date) : null
}

export function toMonthValue(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}
```

- [ ] **Step 5 : Glyphes du contrat et du mode de travail**

Dans `src/lib/projects.ts`, à côté de `CONTRACT_STATUS_LABELS` et `WORK_MODE_LABELS` (import `Briefcase, Building, FilePenLine, GraduationCap, Repeat, Shuffle, Wifi` ajouté à l'en-tête, import de type `IconComponent` depuis `@/lib/icons`) :

```ts
export const CONTRACT_STATUS_ICONS: Record<ContractStatus, IconComponent | null> = {
  FREELANCE: Briefcase,
  CDI: FilePenLine,
  STAGE: GraduationCap,
  ALTERNANCE: Repeat,
}

export const WORK_MODE_ICONS: Record<WorkMode, IconComponent | null> = {
  REMOTE: Wifi,
  HYBRIDE: Shuffle,
  PRESENTIEL: Building,
}
```

- [ ] **Step 6 : Lancer le test**

Run: `TZ=America/New_York pnpm vitest run --project unit src/lib/opportunities.test.ts`
Expected: PASS.

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 2 : Validation et Server Actions

**Files:**
- Create: `src/lib/schemas/opportunity.ts`
- Create: `src/server/actions/opportunities.types.ts`
- Create: `src/server/actions/opportunities.ts`
- Test: `src/server/actions/opportunities.test.ts`

**Interfaces:**
- Consumes: modèle et enum (Task 1) ; `NONE_VALUE`, `notesField`, `optionalTextField` (`07`) ; `nullifyNoneValue` ; `saveEntity`, `deleteEntity` (`./shared`) ; `isPrismaError`, `stringField`, `violatedConstraint`
- Produces: `opportunitySchema`, `OpportunityInput`, `OPPORTUNITY_STATUSES` ; `OpportunityFormState`, `OpportunityFormMessage`, `initialOpportunityFormState` ; `createOpportunity(prev, formData)`, `updateOpportunity(id, prev, formData)`, `deleteOpportunity(id)`, toutes `Promise<OpportunityFormState>`

- [ ] **Step 1 : Schéma**

`src/lib/schemas/opportunity.ts` :

```ts
import { z } from "zod"

import { ContractStatus, OpportunityStatus, WorkMode, Zone } from "@/generated/prisma/browser"
import { nullifyNoneValue } from "@/lib/schemas/none-value"
import { NONE_VALUE, notesField, optionalTextField } from "@/lib/schemas/person"

export const OPPORTUNITY_STATUSES = Object.values(OpportunityStatus)

const optionalId = z
  .string()
  .trim()
  .transform((value) => nullifyNoneValue(value, NONE_VALUE))

function optionalInt(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max),
      { error: message },
    )
    .transform((value) => (value === "" ? null : Number(value)))
}

// Reçu en AAAA-MM, enregistré au premier du mois à minuit UTC : la colonne date garde ce jour-là.
const startMonthField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(value), {
    error: "Mois de démarrage invalide",
  })
  .transform((value) => (value === "" ? null : new Date(`${value}-01T00:00:00.000Z`)))

export const opportunitySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "L'intitulé est requis")
      .max(120, "L'intitulé ne peut pas dépasser 120 caractères"),
    role: z
      .string()
      .trim()
      .max(80, "Le rôle tient en 80 caractères")
      .transform((value) => (value === "" ? null : value)),
    status: z.enum(OpportunityStatus, { error: "Statut inconnu" }),
    referrerId: optionalId,
    intermediaryId: optionalId,
    clientId: optionalId,
    dailyRate: z
      .string()
      .trim()
      .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0), {
        error: "Le TJM est un entier positif",
      })
      .transform((value) => (value === "" ? null : Number(value))),
    contract: z
      .union([z.enum(ContractStatus), z.literal(NONE_VALUE), z.literal("")], {
        error: "Contrat inconnu",
      })
      .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
    workMode: z
      .union([z.enum(WorkMode), z.literal(NONE_VALUE), z.literal("")], {
        error: "Mode de travail inconnu",
      })
      .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
    daysPerWeek: optionalInt(1, 5, "Entre 1 et 5 jours par semaine"),
    onSiteDays: optionalInt(0, 5, "Entre 0 et 5 jours sur site"),
    zone: z
      .union([z.enum(Zone), z.literal(NONE_VALUE), z.literal("")], { error: "Localité inconnue" })
      .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
    startMonth: startMonthField,
    durationMonths: optionalInt(1, 60, "Une durée de 1 à 60 mois"),
    notes: notesField,
    details: optionalTextField,
  })
  .superRefine((data, ctx) => {
    if (data.clientId !== null && data.clientId === data.intermediaryId) {
      ctx.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "Le client final ne peut pas être l'ESN",
      })
    }
    if (data.onSiteDays !== null && data.daysPerWeek !== null && data.onSiteDays > data.daysPerWeek) {
      ctx.addIssue({
        code: "custom",
        path: ["onSiteDays"],
        message: "Pas plus de jours sur site que de jours travaillés",
      })
    }
  })

export type OpportunityInput = z.infer<typeof opportunitySchema>
```

- [ ] **Step 2 : Types de l'état**

`src/server/actions/opportunities.types.ts` :

```ts
import type { FormActionState } from "@/lib/form-state"
import type { OpportunityInput } from "@/lib/schemas/opportunity"

export type OpportunityFormMessage =
  | "intermediary_not_esn"
  | "company_not_found"
  | "referrer_not_found"
  | "unknown_error"
  | null

export type OpportunityFormState = FormActionState<OpportunityInput, OpportunityFormMessage>

export const initialOpportunityFormState: OpportunityFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

- [ ] **Step 3 : Écrire les tests qui échouent**

`src/server/actions/opportunities.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    opportunity: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    company: { findUnique: vi.fn() },
  },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/person"

import { createOpportunity, updateOpportunity } from "./opportunities"
import { initialOpportunityFormState } from "./opportunities.types"

const BASE_FIELDS = {
  title: "Plateforme IA interne",
  role: "",
  status: "PROPOSEE",
  referrerId: NONE_VALUE,
  intermediaryId: NONE_VALUE,
  clientId: NONE_VALUE,
  dailyRate: "",
  contract: NONE_VALUE,
  workMode: NONE_VALUE,
  daysPerWeek: "",
  onSiteDays: "",
  startMonth: "",
  durationMonths: "",
  notes: "",
  details: "",
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

// Prisma 7 + @prisma/adapter-pg : le nom de la clé violée vit sous `meta.driverAdapterError.cause.constraint.index`.
function foreignKeyViolation(index: string) {
  return { code: "P2003", meta: { driverAdapterError: { cause: { constraint: { index } } } } }
}

// `vi.clearAllMocks` n'efface que les appels : les réponses sont remises à chaque test.
beforeEach(() => {
  vi.mocked(prisma.company.findUnique).mockResolvedValue({ types: ["ESN_RECRUTEMENT"] } as never)
  vi.mocked(prisma.opportunity.create).mockResolvedValue({ id: "o1" } as never)
  vi.mocked(prisma.opportunity.update).mockResolvedValue({ id: "o1" } as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("createOpportunity", () => {
  it("rejects a missing title", async () => {
    const state = await createOpportunity(initialOpportunityFormState, buildFormData({ title: "" }))

    expect(state.errors.title).toEqual(["L'intitulé est requis"])
    expect(prisma.opportunity.create).not.toHaveBeenCalled()
  })

  it("rejects a final client equal to the intermediary", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ intermediaryId: "c1", clientId: "c1" }),
    )

    expect(state.errors.clientId).toEqual(["Le client final ne peut pas être l'ESN"])
    expect(prisma.opportunity.create).not.toHaveBeenCalled()
  })

  it("rejects more on-site days than worked days", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ daysPerWeek: "3", onSiteDays: "4" }),
    )

    expect(state.errors.onSiteDays).toEqual(["Pas plus de jours sur site que de jours travaillés"])
    expect(prisma.opportunity.create).not.toHaveBeenCalled()
  })

  it("stores the start month as the first day of that month", async () => {
    await createOpportunity(
      initialOpportunityFormState,
      buildFormData({
        startMonth: "2026-04",
        dailyRate: "580",
        contract: "FREELANCE",
        workMode: "HYBRIDE",
        daysPerWeek: "4",
        onSiteDays: "2",
      }),
    )

    expect(prisma.opportunity.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          startMonth: new Date("2026-04-01T00:00:00.000Z"),
          dailyRate: 580,
          contract: "FREELANCE",
          workMode: "HYBRIDE",
          daysPerWeek: 4,
          onSiteDays: 2,
        }),
      }),
    )
  })

  it("accepts a direct client opportunity without an intermediary", async () => {
    const state = await createOpportunity(initialOpportunityFormState, buildFormData({ clientId: "c2" }))

    expect(state.ok).toBe(true)
    expect(prisma.company.findUnique).not.toHaveBeenCalled()
  })

  it.each([
    ["Opportunity_referrerId_fkey", "referrer_not_found", "referrerId"],
    ["Opportunity_clientId_fkey", "company_not_found", "clientId"],
  ] as const)("maps a missing referrer or company to its field (%s)", async (index, message, field) => {
    vi.mocked(prisma.opportunity.create).mockRejectedValue(foreignKeyViolation(index))

    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ referrerId: "r-missing", clientId: "c-missing" }),
    )

    expect(state.message).toBe(message)
    expect(state.errors[field]).toBeDefined()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createOpportunity(initialOpportunityFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.opportunity.create).not.toHaveBeenCalled()
  })
})

describe("updateOpportunity", () => {
  it("refuses an intermediary that is not typed ESN / Recrutement", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ types: ["CLIENT_FINAL"] } as never)

    const state = await updateOpportunity(
      "o1",
      initialOpportunityFormState,
      buildFormData({ intermediaryId: "c1" }),
    )

    expect(state.message).toBe("intermediary_not_esn")
    expect(state.errors.intermediaryId).toEqual([
      "L'ESN doit être une entreprise de type ESN / Recrutement",
    ])
    expect(prisma.opportunity.update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/opportunities.test.ts`
Expected: FAIL, module `./opportunities` introuvable.

- [ ] **Step 5 : Écrire les actions**

`src/server/actions/opportunities.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { opportunitySchema, type OpportunityInput } from "@/lib/schemas/opportunity"
import { isPrismaError, stringField, violatedConstraint } from "@/lib/server-utils"

import { deleteEntity, saveEntity } from "./shared"
import type { OpportunityFormState } from "./opportunities.types"

// Les fiches lead et entreprise montrent leurs opportunités : leurs vues se rafraîchissent aussi.
function invalidateOpportunityCaches(): void {
  revalidatePath("/admin/opportunites", "layout")
  revalidatePath("/admin/leads", "layout")
  revalidatePath("/admin/entreprises", "layout")
}

class IntermediaryNotEsnError extends Error {}
class IntermediaryMissingError extends Error {}

function collectValues(formData: FormData): OpportunityFormState["values"] {
  return {
    title: stringField(formData, "title"),
    role: stringField(formData, "role"),
    status: stringField(formData, "status"),
    referrerId: stringField(formData, "referrerId"),
    intermediaryId: stringField(formData, "intermediaryId"),
    clientId: stringField(formData, "clientId"),
    dailyRate: stringField(formData, "dailyRate"),
    contract: stringField(formData, "contract"),
    workMode: stringField(formData, "workMode"),
    daysPerWeek: stringField(formData, "daysPerWeek"),
    onSiteDays: stringField(formData, "onSiteDays"),
    zone: stringField(formData, "zone"),
    startMonth: stringField(formData, "startMonth"),
    durationMonths: stringField(formData, "durationMonths"),
    notes: stringField(formData, "notes"),
    details: stringField(formData, "details"),
  }
}

// Le formulaire ne propose que des ESN : le serveur revérifie, le type ayant pu changer depuis l'affichage.
async function assertIntermediaryIsEsn(intermediaryId: string | null): Promise<void> {
  if (!intermediaryId) return
  const company = await prisma.company.findUnique({
    where: { id: intermediaryId },
    select: { types: true },
  })
  if (!company) throw new IntermediaryMissingError()
  if (!company.types.includes("ESN_RECRUTEMENT")) throw new IntermediaryNotEsnError()
}

function mapOpportunityError(
  err: unknown,
  values: OpportunityFormState["values"],
): OpportunityFormState | null {
  const errors: OpportunityFormState["errors"] = {}
  if (err instanceof IntermediaryNotEsnError) {
    errors.intermediaryId = ["L'ESN doit être une entreprise de type ESN / Recrutement"]
    return { ok: false, errors, message: "intermediary_not_esn", values }
  }
  if (err instanceof IntermediaryMissingError) {
    errors.intermediaryId = ["Cette entreprise n'existe plus, recharge la page"]
    return { ok: false, errors, message: "company_not_found", values }
  }
  // Clé étrangère en `<Table>_<col>_fkey` : le nom dit quelle fiche a disparu.
  if (isPrismaError(err, "P2003")) {
    const constraint = violatedConstraint(err)
    if (constraint.includes("referrerId")) {
      errors.referrerId = ["Cet apporteur n'existe plus, recharge la page"]
      return { ok: false, errors, message: "referrer_not_found", values }
    }
    errors[constraint.includes("intermediaryId") ? "intermediaryId" : "clientId"] = [
      "Cette entreprise n'existe plus, recharge la page",
    ]
    return { ok: false, errors, message: "company_not_found", values }
  }
  return null
}

interface SaveOpportunityEvents {
  success: string
  failure: string
}

function saveOpportunity(
  actionName: string,
  events: SaveOpportunityEvents,
  formData: FormData,
  persist: (data: OpportunityInput) => Promise<unknown>,
): Promise<OpportunityFormState> {
  const values = collectValues(formData)

  return saveEntity<OpportunityInput, OpportunityFormState, unknown>({
    actionName,
    events,
    schema: opportunitySchema,
    input: values,
    persist,
    invalidateCaches: invalidateOpportunityCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapOpportunityError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

export async function createOpportunity(
  _prevState: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveOpportunity(
    "createOpportunity",
    { success: "opportunity:created", failure: "opportunity:create_failed" },
    formData,
    async (data) => {
      await assertIntermediaryIsEsn(data.intermediaryId)
      return prisma.opportunity.create({ data })
    },
  )
}

export async function updateOpportunity(
  id: string,
  _prevState: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  await getCurrentUser()

  return saveOpportunity(
    "updateOpportunity",
    { success: "opportunity:updated", failure: "opportunity:update_failed" },
    formData,
    async (data) => {
      await assertIntermediaryIsEsn(data.intermediaryId)
      return prisma.opportunity.update({ where: { id }, data })
    },
  )
}

export async function deleteOpportunity(id: string): Promise<OpportunityFormState> {
  await getCurrentUser()

  return deleteEntity<OpportunityFormState>({
    actionName: "deleteOpportunity",
    events: { success: "opportunity:deleted", failure: "opportunity:delete_failed" },
    successLogFields: { id },
    destroy: () => prisma.opportunity.delete({ where: { id } }),
    invalidateCaches: invalidateOpportunityCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
```

Si `saveEntity` refuse le schéma à cause du `superRefine` (type de schéma attendu plus étroit que `z.ZodType<OpportunityInput>`), élargir le type du paramètre `schema` de `SaveEntityConfig` à `z.ZodType<TInput>` dans `src/server/actions/shared.ts`, sans rien changer d'autre.

- [ ] **Step 6 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/opportunities.test.ts`
Expected: PASS (9 tests, le cas des clés étrangères comptant deux fois).

---

### Task 3 : Lecture, qualité et contrôle en base

**Files:**
- Create: `src/server/queries/opportunities.ts`

**Interfaces:**
- Consumes: modèle `Opportunity` (Task 1)
- Produces: `AdminOpportunity` (opportunité avec `referrer: { id, name, email, linkedinUrl, optedOutAt } | null`, `intermediary` et `client` : `{ id, name, logoFilename } | null`), `findAllOpportunitiesForAdmin(): Promise<AdminOpportunity[]>`

- [ ] **Step 1 : Lecture**

`src/server/queries/opportunities.ts` :

```ts
import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminOpportunityInclude = {
  referrer: {
    select: { id: true, name: true, email: true, linkedinUrl: true, optedOutAt: true },
  },
  intermediary: { select: { id: true, name: true, logoFilename: true } },
  client: { select: { id: true, name: true, logoFilename: true } },
} as const

export type AdminOpportunity = Prisma.OpportunityGetPayload<{ include: typeof adminOpportunityInclude }>

// Sans 'use cache', comme les autres lectures admin : l'admin relit la base juste après ses mutations.
export async function findAllOpportunitiesForAdmin(): Promise<AdminOpportunity[]> {
  return prisma.opportunity.findMany({ include: adminOpportunityInclude, orderBy: { updatedAt: "desc" } })
}
```

- [ ] **Step 2 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

- [ ] **Step 3 : Contrôle en base**

Run: `just db-studio`, puis, dans Studio : créer une personne au rôle Lead, une entreprise de type `ESN_RECRUTEMENT` et une entreprise cliente ; créer une opportunité reliée aux trois (statut par défaut, `zone` vide).
Expected: `status` à `PROPOSEE` par défaut.

Poser aussi le rôle Contact sur cette personne, puis supprimer sa seule ligne `Lead` dans Studio (la personne reste).
Expected: l'opportunité reste, `referrerId` inchangé, ESN et client final intacts : le retrait du rôle Lead ne touche pas l'apporteur.

Supprimer la personne elle-même dans Studio.
Expected: l'opportunité reste, `referrerId` vide (`SetNull`), ESN et client final intacts.

Run: `just dev`, se connecter, ouvrir Entreprises et supprimer l'entreprise cliente de l'opportunité.
Expected: la suppression est refusée (message de refus de `company_in_use`), l'entreprise reste. Supprimer l'opportunité dans Studio, puis les fiches de test ; `just stop`, fermer Studio.
