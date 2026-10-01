# Données des leads : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer la personne et son rôle de lead : table, validation, lectures admin et Server Actions (créer, modifier, supprimer, opposition RGPD en deux temps), avec une personne unique par email et par profil LinkedIn.

**Architecture:** Deux modèles Prisma dans le schema `freelance` : `Person` (identité, coordonnées, entreprise, opposition) et `Lead` (pipeline, clé `personId`, `onDelete: Cascade` vers `Person`), avec cinq enums dont `JobRole` réutilisable. Deux champs texte sur `Person`, comme `Company` (`02`) : `notes` en ligne courte (200 caractères au plus) et `details` en markdown long. Un schéma Zod partagé (`personFields`) normalise email et lien LinkedIn et exige un nom ; `leadSchema` l'étend des champs du rôle et d'un `personId` facultatif. Les actions leads suivent le motif `saveEntity` / `deleteEntity` des entreprises, vérifient l'identité avant d'écrire pour nommer le doublon ou la personne opposée, créent la personne et le rôle dans une même transaction ou, `personId` fourni, posent seulement le rôle sur une personne existante sans le toucher ; les actions RGPD (`optOutPerson`, `erasePersonExchanges`) vivent à part, sur la personne.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4, Next.js 16 Server Actions, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/07-leads-donnees-design.md`

## Global Constraints

- **Prérequis** : `01` livré (registre RGPD, Traitement 7) ; `02` implémenté (enum `Zone` dans le schema `freelance`, `src/lib/zones.ts`).
- **Enums, valeurs exactes** : `LeadOrigin` `INBOUND`, `OUTBOUND` ; `LeadStatus` `NOUVEAU`, `SUSPECT`, `DISCUSSION`, `HORS_ICP`, `PERDU`, `STAND_BY` (ni `RDV_PLANIFIE` ni `DEAL`, déduits plus tard des entretiens et des missions) ; `LeadInterest` `HOT`, `WARM`, `COLD`, sans valeur « inconnu » ; `LeadChannel` `LINKEDIN`, `SITE_WEB`, `CANDIDATURE`, `PLATEFORME`, `REFERENCE`, `EVENEMENT`, `COLD_EMAIL`, `COLD_CALL`, `AUTRE` ; `JobRole` `CTO`, `TECH_LEAD`, `RECRUTEUR`, `DEVELOPPEUR`, `CEO`, `PRODUCT_OWNER`, `C_LEVEL`, `MANAGER`, `AUTRE`.
- **Défauts** : statut `NOUVEAU` ; `interest` facultatif, `LeadInterest?` sans défaut, vide si non renseigné (aucun enum du CRM ne porte de valeur sentinelle).
- **Lien LinkedIn** : forme unique `https://www.linkedin.com/in/<identifiant>`, identifiant en minuscules ; tout lien hors `/in/…` refusé avec « Lien de profil LinkedIn attendu (linkedin.com/in/…) ».
- **Nom obligatoire** : `personNameField` exige une chaîne non vide ; il n'est nul que sur une personne opposée, après `optOutPerson`.
- **Personne existante** : `createLead` reçoit un `personId` facultatif. Fourni, l'action pose le rôle Lead sur cette personne sans écrire ses champs ; les champs de personne envoyés dans le formulaire sont validés mais ignorés.
- **Messages** : « Ce lead existe déjà : <nom> » (`lead_exists`, sur le champ `email`/`linkedinUrl` pour un doublon d'identité, ou sur `personId` pour une personne qui a déjà le rôle), « Cette personne s'est opposée à la prospection le JJ/MM/AAAA » (`lead_opted_out`, date au fuseau `Europe/Paris`), `lead_opted_out_locked`, `company_not_found`, « Les notes tiennent sur une ligne (200 caractères au plus) », `unknown_error`.
- **Opposition** (`optOutPerson`, sur `Person`) : garde `email`, `linkedinUrl`, les rôles et leurs champs propres, inchangés ; vide `name`, `jobRole`, `zone`, `phone`, `metAt`, `notes`, `details`, `companyId` ; pose `optedOutAt`. Sans email ni LinkedIn, la personne est supprimée.
- **Effacement** (`erasePersonExchanges`, sur `Person`) : uniquement sur une personne opposée, pose `exchangesErasedAt` une seule fois ; à ce stade, rien à supprimer (actions, entretiens et signaux n'existent pas encore).
- **Chemin revalidé** : `/admin/leads`, variante `layout` (toutes les vues du `08`).
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/vitest/setup.md`, `.claude/rules/typescript/conventions.md`.

## Review Focus

- **Modifier un lead sans changer son email** ne doit pas le déclarer doublon de lui-même. Couvert par « ignores the lead being edited when checking duplicates » (Task 5).
- **Opposition répétée et date du stop autour de minuit** : un second « stop » garde la date du premier, point de départ des 3 ans ; un stop à 23 h 30 UTC le 11 mars tombe le 12 mars à Paris, date que le message doit donner. Couvert par « keeps the first opt-out date when a person opts out twice » (Task 4) et la date `2026-03-11T23:30:00Z` du test « refuses a person who opted out, giving the date » (Task 5).
- **Lien LinkedIn accentué** (`/in/Jérôme-Dupont`, `/in/j%C3%A9r%C3%B4me-dupont`) : même forme unique. Couvert par « normalizes the host, the case, a trailing slash and query parameters » (Task 1).
- **Suppression sans autre rôle** : `deleteLead` retire le rôle puis supprime la personne par deux écritures explicites, jamais via la seule cascade `Lead → Person` qui empêcherait de garder la personne le jour où un second rôle existera. Couvert par « removes the person along with the lead role » (Task 5).
- **Personne déjà attachée entre l'affichage du picker et l'envoi** : `createLead` revérifie côté serveur que la personne choisie n'a pas déjà le rôle Lead. Couvert par « refuses to attach the lead role to a person who already has it » (Task 5).

---

### Task 1 : Forme unique d'un lien LinkedIn

**Files:**
- Create: `src/lib/linkedin.ts`
- Test: `src/lib/linkedin.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: `normalizeLinkedinProfileUrl(value: string): string | null`, `LINKEDIN_PROFILE_ERROR: string`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
import { describe, expect, it } from "vitest"

import { normalizeLinkedinProfileUrl } from "./linkedin"

describe("normalizeLinkedinProfileUrl", () => {
  it.each([
    ["https://fr.linkedin.com/in/Claire-Morel/?originalSubdomain=fr#about", "https://www.linkedin.com/in/claire-morel"],
    ["http://linkedin.com/in/claire-morel", "https://www.linkedin.com/in/claire-morel"],
    ["https://www.linkedin.com/in/Jérôme-Dupont", "https://www.linkedin.com/in/j%C3%A9r%C3%B4me-dupont"],
    ["https://www.linkedin.com/in/j%C3%A9r%C3%B4me-dupont/", "https://www.linkedin.com/in/j%C3%A9r%C3%B4me-dupont"],
  ])("normalizes the host, the case, a trailing slash and query parameters (%s)", (value, expected) => {
    const normalized = normalizeLinkedinProfileUrl(value)

    expect(normalized).toBe(expected)
  })

  it.each(["linkedin.com/in/claire-morel", " www.linkedin.com/in/claire-morel/ "])(
    "accepts a profile URL typed without a scheme (%s)",
    (value) => {
      const normalized = normalizeLinkedinProfileUrl(value)

      expect(normalized).toBe("https://www.linkedin.com/in/claire-morel")
    },
  )

  it.each([
    "https://www.linkedin.com/company/acme",
    "https://evil-linkedin.com/in/claire-morel",
    "https://example.com/in/claire-morel",
    "pas une adresse",
  ])("rejects a company page and another site (%s)", (value) => {
    const normalized = normalizeLinkedinProfileUrl(value)

    expect(normalized).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/lib/linkedin.test.ts`
Expected: FAIL, module `./linkedin` introuvable.

- [ ] **Step 3 : Écrire la normalisation**

```ts
const PROFILE_PATH = /^\/in\/([^/]+)/
const SCHEME = /^https?:\/\//i

export const LINKEDIN_PROFILE_ERROR = "Lien de profil LinkedIn attendu (linkedin.com/in/…)"

// Une forme unique par profil (casse, sous-domaine de langue, barre finale, paramètres de suivi) : c'est elle que l'unicité en base compare.
export function normalizeLinkedinProfileUrl(value: string): string | null {
  const raw = value.trim()
  let url: URL
  try {
    url = new URL(SCHEME.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }

  if (url.hostname !== "linkedin.com" && !url.hostname.endsWith(".linkedin.com")) return null
  const handle = PROFILE_PATH.exec(url.pathname)?.[1]
  if (!handle) return null

  try {
    return `https://www.linkedin.com/in/${encodeURIComponent(decodeURIComponent(handle).toLowerCase())}`
  } catch {
    return null
  }
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/lib/linkedin.test.ts`
Expected: PASS.

---

### Task 2 : Modèles, migration et libellés

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_person_lead/migration.sql`
- Create: `src/lib/job-roles.ts`
- Create: `src/lib/leads.ts`

**Interfaces:**
- Consumes: enum `Zone` (plan `02`)
- Produces: modèles `Person`, `Lead`, enums `LeadOrigin`, `LeadStatus`, `LeadInterest`, `LeadChannel`, `JobRole` ; `JOB_ROLES`, `JOB_ROLE_LABELS` ; `LEAD_ORIGIN_LABELS`, `LEAD_STATUS_LABELS`, `LEAD_INTEREST_LABELS`, `LEAD_CHANNEL_LABELS`, `LEAD_FIELD_LABELS`

- [ ] **Step 1 : Enums**

Dans `prisma/schema.prisma`, après l'enum `Zone`, ajouter :

```prisma
enum LeadOrigin {
  INBOUND
  OUTBOUND

  @@schema("freelance")
}

// Statuts saisis seulement : Deal et RDV planifié se déduisent (mission acceptée, entretien planifié à venir).
enum LeadStatus {
  NOUVEAU
  SUSPECT
  DISCUSSION
  HORS_ICP
  PERDU
  STAND_BY

  @@schema("freelance")
}

// Vide quand on ne sait pas, comme partout ailleurs : pas de valeur « inconnu ».
enum LeadInterest {
  HOT
  WARM
  COLD

  @@schema("freelance")
}

enum LeadChannel {
  LINKEDIN
  SITE_WEB
  CANDIDATURE
  PLATEFORME
  REFERENCE
  EVENEMENT
  COLD_EMAIL
  COLD_CALL
  AUTRE

  @@schema("freelance")
}

// Partagé avec les contacts : un même poste se filtre de la même façon dans les deux listes.
enum JobRole {
  CTO
  TECH_LEAD
  RECRUTEUR
  DEVELOPPEUR
  CEO
  PRODUCT_OWNER
  C_LEVEL
  MANAGER
  AUTRE

  @@schema("freelance")
}
```

- [ ] **Step 2 : Modèles**

Après le modèle `Company`, ajouter :

```prisma
// Une personne, quels que soient ses rôles : prospect, relation durable, interlocuteur d'un entretien.
// C'est elle qui porte l'opposition et la durée de conservation.
model Person {
  id          String    @id @default(uuid(7))
  // Nul seulement pour une personne en opposition, vidée de tout sauf ce qui la reconnaît.
  name        String?
  jobRole     JobRole?
  zone        Zone?
  email       String?   @unique
  phone       String?
  linkedinUrl String?   @unique
  metAt       DateTime? @db.Date
  notes       String?
  details     String?
  // Art. 21 : la date du stop, posée une seule fois. Art. 17.1.c : la date de l'effacement des échanges.
  optedOutAt        DateTime? @db.Timestamptz
  exchangesErasedAt DateTime? @db.Timestamptz

  companyId String?
  company   Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)

  lead Lead?

  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@index([companyId])
  @@schema("freelance")
}

// Le rôle « prospect » d'une personne : ce qui décrit le pipeline, rien de ce qui la décrit elle.
model Lead {
  personId String @id
  person   Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  origin   LeadOrigin
  status   LeadStatus   @default(NOUVEAU)
  interest LeadInterest?
  channel  LeadChannel?
  score    Int?

  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@schema("freelance")
}
```

Dans le modèle `Company`, après `clientMetas ClientMeta[]`, ajouter :

```prisma
  persons     Person[]
```

- [ ] **Step 3 : Migration**

Run: `pnpm prisma migrate dev --name person_lead`, puis `just db-test`
Expected: migration créée et appliquée en dev et en test ; elle crée les cinq types d'enum, les tables `"freelance"."Person"` et `"freelance"."Lead"`, les index `Person_email_key`, `Person_linkedinUrl_key`, `Person_companyId_idx`, la clé étrangère `Person_companyId_fkey` en `ON DELETE SET NULL` et `Lead_personId_fkey` en `ON DELETE CASCADE`. Aucune modification à la main.

- [ ] **Step 4 : Libellés des postes**

Créer `src/lib/job-roles.ts` :

```ts
import { JobRole } from "@/generated/prisma/browser"

export const JOB_ROLES = Object.values(JobRole)

export const JOB_ROLE_LABELS: Record<JobRole, string> = {
  CTO: "CTO",
  TECH_LEAD: "Tech Lead",
  RECRUTEUR: "Recruteur",
  DEVELOPPEUR: "Développeur",
  CEO: "CEO",
  PRODUCT_OWNER: "Product Owner",
  C_LEVEL: "C-Level",
  MANAGER: "Manager",
  AUTRE: "Autre",
}
```

- [ ] **Step 5 : Libellés du rôle Lead**

Créer `src/lib/leads.ts` :

```ts
import type {
  LeadChannel,
  LeadInterest,
  LeadOrigin,
  LeadStatus,
} from "@/generated/prisma/client"

export const LEAD_ORIGIN_LABELS: Record<LeadOrigin, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NOUVEAU: "Nouveau",
  SUSPECT: "Suspect",
  DISCUSSION: "Discussion",
  HORS_ICP: "Hors ICP",
  PERDU: "Perdu",
  STAND_BY: "Stand-by",
}

export const LEAD_INTEREST_LABELS: Record<LeadInterest, string> = {
  HOT: "Hot",
  WARM: "Warm",
  COLD: "Cold",
}

export const LEAD_CHANNEL_LABELS: Record<LeadChannel, string> = {
  LINKEDIN: "LinkedIn",
  SITE_WEB: "Site web",
  CANDIDATURE: "Candidature",
  PLATEFORME: "Plateforme",
  REFERENCE: "Référence",
  EVENEMENT: "Évènement",
  COLD_EMAIL: "Cold Email",
  COLD_CALL: "Cold Call",
  AUTRE: "Autre",
}

// Uniquement les champs du rôle : ceux de la personne vivent dans PERSON_FIELD_LABELS (`@/lib/persons`).
export const LEAD_FIELD_LABELS = {
  origin: "Origine",
  status: "Statut",
  interest: "Intérêt",
  channel: "Canal",
  score: "Score",
} as const
```

- [ ] **Step 6 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 3 : Schémas de la personne et du lead

**Files:**
- Modify: `src/server/actions/shared.ts` (générique de `saveEntity`)
- Create: `src/lib/schemas/person.ts`
- Create: `src/lib/schemas/lead.ts`

**Interfaces:**
- Consumes: `normalizeLinkedinProfileUrl`, `LINKEDIN_PROFILE_ERROR` (Task 1) ; enums `JobRole`, `Zone`, `LeadOrigin`, `LeadStatus`, `LeadInterest`, `LeadChannel` (Task 2) ; `nullifyNoneValue` (`@/lib/schemas/none-value`)
- Produces: `personFields`, `NONE_VALUE = "aucun"`, `personNameField`, `emailField`, `linkedinUrlField`, `optionalTextField`, `notesField`, `optionalDateField` (`@/lib/schemas/person`) ; `leadSchema`, `LeadInput`, `LEAD_ORIGINS`, `LEAD_STATUSES`, `LEAD_INTERESTS`, `LEAD_CHANNELS` (`@/lib/schemas/lead`)

- [ ] **Step 1 : Assouplir `saveEntity`**

Ni les leads ni les personnes n'ont de slug. Dans `src/server/actions/shared.ts`, remplacer `TInput extends { slug: string }` par `TInput extends object` dans `SaveEntityConfig` et dans `saveEntity`, puis remplacer la ligne de log de succès par :

```ts
      log.info({
        event: config.events.success,
        slug: "slug" in result.data ? result.data.slug : undefined,
      })
```

Les entreprises, projets et tags continuent de journaliser leur slug.

- [ ] **Step 2 : Schéma de la personne**

Créer `src/lib/schemas/person.ts` :

```ts
import { z } from "zod"

import { JobRole, Zone } from "@/generated/prisma/browser"
import { LINKEDIN_PROFILE_ERROR, normalizeLinkedinProfileUrl } from "@/lib/linkedin"
import { nullifyNoneValue } from "@/lib/schemas/none-value"

export const NONE_VALUE = "aucun"

const emptyToNull = (value: unknown) => (value === "" ? null : value)

export const optionalTextField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))

// Ligne courte de marqueurs, même règle et même message que Company.notes.
export const notesField = z
  .string()
  .trim()
  .max(200, "Les notes tiennent sur une ligne (200 caractères au plus)")
  .transform((value) => (value === "" ? null : value))

export const optionalDateField = z.preprocess(emptyToNull, z.coerce.date({ error: "Date invalide" }).nullable())

// Obligatoire à la saisie : il n'est nul que sur une personne opposée, après `optOutPerson`.
export const personNameField = z
  .string()
  .trim()
  .min(1, "Le nom est requis")
  .max(120, "Le nom ne peut pas dépasser 120 caractères")

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    error: "Adresse email invalide",
  })
  .transform((value) => (value === "" ? null : value))

export const linkedinUrlField = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null
    const normalized = normalizeLinkedinProfileUrl(value)
    if (normalized === null) {
      ctx.addIssue({ code: "custom", message: LINKEDIN_PROFILE_ERROR })
      return z.NEVER
    }
    return normalized
  })

// Partagé par le lead, puis par le contact d'une personne : ce qui la décrit, jamais son rôle.
export const personFields = {
  name: personNameField,
  jobRole: z
    .union([z.enum(JobRole), z.literal(NONE_VALUE), z.literal("")], { error: "Poste inconnu" })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  zone: z
    .union([z.enum(Zone), z.literal(NONE_VALUE), z.literal("")], { error: "Localité inconnue" })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  email: emailField,
  phone: optionalTextField,
  linkedinUrl: linkedinUrlField,
  metAt: optionalDateField,
  notes: notesField,
  details: optionalTextField,
  companyId: z
    .string()
    .trim()
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
}
```

- [ ] **Step 3 : Schéma du lead**

Créer `src/lib/schemas/lead.ts` :

```ts
import { z } from "zod"

import { LeadChannel, LeadInterest, LeadOrigin, LeadStatus } from "@/generated/prisma/browser"
import { nullifyNoneValue } from "@/lib/schemas/none-value"
import { NONE_VALUE, optionalTextField, personFields } from "@/lib/schemas/person"

export const LEAD_ORIGINS = Object.values(LeadOrigin)
export const LEAD_STATUSES = Object.values(LeadStatus)
export const LEAD_INTERESTS = Object.values(LeadInterest)
export const LEAD_CHANNELS = Object.values(LeadChannel)

export const leadSchema = z.object({
  ...personFields,
  // Facultatif : posé quand le rôle se pose sur une personne existante plutôt que d'en créer une ; `personFields` reste alors validé mais ignoré.
  personId: optionalTextField,
  origin: z.enum(LeadOrigin, { error: "Choisissez une origine" }),
  status: z.enum(LeadStatus, { error: "Statut inconnu" }),
  interest: z
    .union([z.enum(LeadInterest), z.literal(NONE_VALUE), z.literal("")], { error: "Intérêt inconnu" })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  channel: z
    .union([z.enum(LeadChannel), z.literal(NONE_VALUE), z.literal("")], { error: "Canal inconnu" })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  score: z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 10), {
      error: "Le score est un entier de 0 à 10",
    })
    .transform((value) => (value === "" ? null : Number(value))),
})

export type LeadInput = z.infer<typeof leadSchema>
```

- [ ] **Step 4 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Personne : libellés et opposition RGPD

**Files:**
- Create: `src/lib/persons.ts`
- Create: `src/server/actions/persons.ts`
- Test: `src/server/actions/persons.test.ts`

**Interfaces:**
- Consumes: modèle `Person` (Task 2) ; `createActionLogger` (`@/lib/server-utils`)
- Produces: `PERSON_FIELD_LABELS`, `personDisplayName(person)`, `OPTED_OUT_CLEARED` (`@/lib/persons`) ; `PersonLockedError`, `PersonActionState`, `optOutPerson(id: string)`, `erasePersonExchanges(id: string)`, toutes deux `Promise<PersonActionState>` (`@/server/actions/persons`)

- [ ] **Step 1 : Libellés et helpers de la personne**

Créer `src/lib/persons.ts` :

```ts
import type { Prisma } from "@/generated/prisma/client"

export const PERSON_FIELD_LABELS = {
  name: "Nom",
  jobRole: "Poste",
  zone: "Localité",
  email: "Email",
  phone: "Téléphone",
  linkedinUrl: "LinkedIn",
  metAt: "Date de rencontre",
  notes: "Notes",
  details: "Détails",
  companyId: "Entreprise",
  optedOutAt: "Ne plus contacter depuis le",
  exchangesErasedAt: "Échanges effacés depuis le",
} as const

export function personDisplayName(person: {
  name: string | null
  email: string | null
  linkedinUrl: string | null
}): string {
  return person.name ?? person.email ?? person.linkedinUrl ?? ""
}

// Tout ce qui décrit la personne ; restent l'email et le LinkedIn qui la reconnaissent.
export const OPTED_OUT_CLEARED = {
  name: null,
  jobRole: null,
  zone: null,
  phone: null,
  metAt: null,
  notes: null,
  details: null,
  companyId: null,
} satisfies Prisma.PersonUncheckedUpdateInput
```

- [ ] **Step 2 : Écrire les tests qui échouent**

Créer `src/server/actions/persons.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    person: {
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { prisma } from "@/lib/prisma"

import { erasePersonExchanges, optOutPerson } from "./persons"

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

beforeEach(() => {
  vi.mocked(prisma.person.update).mockResolvedValue({ id: "p1" } as never)
})

describe("optOutPerson", () => {
  afterEach(() => vi.clearAllMocks())

  it("clears everything but email and LinkedIn when a person opts out", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: "claire@acme.com",
      linkedinUrl: null,
      optedOutAt: null,
    } as never)

    const state = await optOutPerson("p1")

    expect(state.ok).toBe(true)
    const data = vi.mocked(prisma.person.update).mock.calls[0]?.[0]?.data as Record<string, unknown>
    expect(data).toEqual(
      objectMatch({
        name: null,
        jobRole: null,
        zone: null,
        phone: null,
        metAt: null,
        notes: null,
        details: null,
        companyId: null,
        optedOutAt: expect.any(Date) as unknown,
      }),
    )
    expect(data).not.toHaveProperty("email")
    expect(data).not.toHaveProperty("linkedinUrl")
  })

  it("deletes a person that opts out without email nor LinkedIn", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: null,
      linkedinUrl: null,
      optedOutAt: null,
    } as never)

    await optOutPerson("p1")

    expect(prisma.person.delete).toHaveBeenCalledWith({ where: { id: "p1" } })
    expect(prisma.person.update).not.toHaveBeenCalled()
  })

  it("keeps the first opt-out date when a person opts out twice", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: "claire@acme.com",
      linkedinUrl: null,
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
    } as never)

    const state = await optOutPerson("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).not.toHaveBeenCalled()
    expect(prisma.person.delete).not.toHaveBeenCalled()
  })
})

describe("erasePersonExchanges", () => {
  afterEach(() => vi.clearAllMocks())

  it("erases the exchange trace only once", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
      exchangesErasedAt: null,
    } as never)

    const state = await erasePersonExchanges("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).toHaveBeenCalledWith(
      objectMatch({
        where: { id: "p1" },
        data: objectMatch({ exchangesErasedAt: expect.any(Date) as unknown }),
      }),
    )
  })

  it("refuses to erase exchanges of a person who never opted out", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: null,
      exchangesErasedAt: null,
    } as never)

    const state = await erasePersonExchanges("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/persons.test.ts`
Expected: FAIL, module `./persons` introuvable.

- [ ] **Step 4 : Écrire les actions RGPD**

Créer `src/server/actions/persons.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { OPTED_OUT_CLEARED } from "@/lib/persons"
import { prisma } from "@/lib/prisma"
import { createActionLogger } from "@/lib/server-utils"

const LEADS_PATH = "/admin/leads"

// Levée par updateLead sur une personne opposée : sa fiche ne se modifie plus.
export class PersonLockedError extends Error {}

export interface PersonActionState {
  ok: boolean
  message: "unknown_error" | null
}

export async function optOutPerson(id: string): Promise<PersonActionState> {
  await getCurrentUser()

  return createActionLogger("optOutPerson", async ({ log }) => {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const person = await tx.person.findUnique({
          where: { id },
          select: { email: true, linkedinUrl: true, optedOutAt: true },
        })
        if (!person) throw new Error(`Personne ${id} introuvable`)
        // Un second « stop » ne repousse pas la date du premier, point de départ des 3 ans.
        if (person.optedOutAt) return "already_opted_out"
        // Sans email ni LinkedIn, rien ne permettrait de reconnaître la personne : sa fiche n'a plus d'objet.
        if (!person.email && !person.linkedinUrl) {
          await tx.person.delete({ where: { id } })
          return "deleted"
        }
        await tx.person.update({
          where: { id },
          data: { ...OPTED_OUT_CLEARED, optedOutAt: new Date() },
        })
        return "opted_out"
      })
      revalidatePath(LEADS_PATH, "layout")
      log.info({ event: "person:opted_out", id, outcome })
      return { ok: true, message: null }
    } catch (err) {
      log.error({ err, event: "person:opt_out_failed", id })
      return { ok: false, message: "unknown_error" }
    }
  })
}

export async function erasePersonExchanges(id: string): Promise<PersonActionState> {
  await getCurrentUser()

  return createActionLogger("erasePersonExchanges", async ({ log }) => {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const person = await tx.person.findUnique({
          where: { id },
          select: { optedOutAt: true, exchangesErasedAt: true },
        })
        if (!person) throw new Error(`Personne ${id} introuvable`)
        if (!person.optedOutAt) return "not_opted_out"
        if (person.exchangesErasedAt) return "already_erased"

        // Rien à supprimer ici : actions, entretiens et signaux d'une personne rejoindront cette même transaction quand ces modèles existeront.
        await tx.person.update({ where: { id }, data: { exchangesErasedAt: new Date() } })
        return "erased"
      })
      revalidatePath(LEADS_PATH, "layout")
      log.info({ event: "person:exchanges_erased", id, outcome })
      return { ok: true, message: null }
    } catch (err) {
      log.error({ err, event: "person:erase_exchanges_failed", id })
      return { ok: false, message: "unknown_error" }
    }
  })
}
```

- [ ] **Step 5 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/persons.test.ts`
Expected: PASS.

---

### Task 5 : Server Actions du lead

**Files:**
- Create: `src/server/actions/leads.types.ts`
- Create: `src/server/actions/leads.ts`
- Test: `src/server/actions/leads.test.ts`

**Interfaces:**
- Consumes: `leadSchema`, `LeadInput` (Task 3) ; `PersonLockedError` (Task 4, `./persons`) ; `saveEntity`, `deleteEntity` (`./shared`) ; `createActionLogger`, `isPrismaError`, `stringField`, `violatedConstraint` (`@/lib/server-utils`)
- Produces: `LeadFormState`, `LeadFormMessage`, `initialLeadFormState` (`./leads.types`) ; `createLead(prev, formData)`, `updateLead(personId, prev, formData)`, `deleteLead(personId)`, toutes `Promise<LeadFormState>` (`./leads`)

- [ ] **Step 1 : Types de l'état**

Créer `src/server/actions/leads.types.ts` :

```ts
import type { FormActionState } from "@/lib/form-state"
import type { LeadInput } from "@/lib/schemas/lead"

export type LeadFormMessage =
  | "lead_exists"
  | "lead_opted_out"
  | "lead_opted_out_locked"
  | "company_not_found"
  | "unknown_error"
  | null

export type LeadFormState = FormActionState<LeadInput, LeadFormMessage>

export const initialLeadFormState: LeadFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

- [ ] **Step 2 : Écrire les tests qui échouent**

Créer `src/server/actions/leads.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    person: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    lead: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/person"

import { createLead, deleteLead, updateLead } from "./leads"
import { initialLeadFormState } from "./leads.types"

const BASE_FIELDS = {
  personId: "",
  name: "Claire Morel",
  jobRole: NONE_VALUE,
  zone: NONE_VALUE,
  companyId: NONE_VALUE,
  email: "",
  phone: "",
  linkedinUrl: "",
  metAt: "",
  notes: "",
  details: "",
  origin: "OUTBOUND",
  status: "NOUVEAU",
  interest: NONE_VALUE,
  channel: NONE_VALUE,
  score: "",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  return data
}

function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

// Forme constatée le 2026-09-19 (Prisma 7 + @prisma/adapter-pg) : l'index vit sous `meta.driverAdapterError.cause.constraint.index`.
function uniqueViolation(index: string) {
  return {
    code: "P2002",
    meta: { driverAdapterError: { cause: { constraint: { index } } } },
  }
}

// `vi.clearAllMocks` n'efface que les appels : remettre ces valeurs à chaque test évite qu'une réponse d'un test précédent fausse le suivant.
beforeEach(() => {
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.person.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.person.create).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(prisma.person.update).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(prisma.lead.create).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.lead.update).mockResolvedValue({ personId: "p1" } as never)
})

describe("createLead", () => {
  afterEach(() => vi.clearAllMocks())

  it("rejects a missing origin", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ origin: "" }))

    expect(state.errors.origin).toBeDefined()
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("rejects a missing name", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ name: "" }))

    expect(state.errors.name).toEqual(["Le nom est requis"])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("rejects a score outside 0 to 10", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ score: "11" }))

    expect(state.errors.score).toEqual(["Le score est un entier de 0 à 10"])
  })

  it("rejects notes longer than 200 characters", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ notes: "a".repeat(201) }))

    expect(state.errors.notes).toEqual(["Les notes tiennent sur une ligne (200 caractères au plus)"])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("lowercases the email and normalizes the LinkedIn URL before saving", async () => {
    await createLead(
      initialLeadFormState,
      buildFormData({
        email: " Claire.Morel@Acme.COM ",
        linkedinUrl: "fr.linkedin.com/in/Claire-Morel/",
      }),
    )

    expect(prisma.person.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          email: "claire.morel@acme.com",
          linkedinUrl: "https://www.linkedin.com/in/claire-morel",
        }),
      }),
    )
  })

  it('stores the "aucun" sentinel as null for interest, channel, job role and company', async () => {
    await createLead(initialLeadFormState, buildFormData())

    expect(prisma.person.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ jobRole: null, companyId: null }) }),
    )
    expect(prisma.lead.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ interest: null, channel: null }) }),
    )
  })

  it("refuses an email or LinkedIn already used by another person, naming it", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: "Claire Morel",
      email: "claire@acme.com",
      optedOutAt: null,
    } as never)

    const state = await createLead(initialLeadFormState, buildFormData({ email: "claire@acme.com" }))

    expect(state.message).toBe("lead_exists")
    expect(state.errors.email).toEqual(["Ce lead existe déjà : Claire Morel"])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("refuses a person who opted out, giving the date", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: null,
      email: null,
      optedOutAt: new Date("2026-03-11T23:30:00Z"),
    } as never)

    const state = await createLead(
      initialLeadFormState,
      buildFormData({ linkedinUrl: "https://www.linkedin.com/in/claire-morel" }),
    )

    expect(state.message).toBe("lead_opted_out")
    expect(state.errors.linkedinUrl).toEqual([
      "Cette personne s'est opposée à la prospection le 12/03/2026",
    ])
  })

  it("maps a concurrent uniqueness violation to the duplicate message", async () => {
    vi.mocked(prisma.person.create).mockRejectedValue(uniqueViolation("Person_linkedinUrl_key"))

    const state = await createLead(
      initialLeadFormState,
      buildFormData({ linkedinUrl: "https://www.linkedin.com/in/claire-morel" }),
    )

    expect(state.message).toBe("lead_exists")
    expect(state.errors.linkedinUrl).toEqual(["Ce lead existe déjà"])
  })

  it("maps a missing company to the company field", async () => {
    vi.mocked(prisma.person.create).mockRejectedValue({ code: "P2003" })

    const state = await createLead(initialLeadFormState, buildFormData({ companyId: "c-missing" }))

    expect(state.message).toBe("company_not_found")
    expect(state.errors.companyId).toBeDefined()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createLead(initialLeadFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.person.findFirst).not.toHaveBeenCalled()
  })

  it("attaches the lead role to an existing person instead of creating one", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      name: "Claire Morel",
      optedOutAt: null,
      lead: null,
    } as never)

    const state = await createLead(initialLeadFormState, buildFormData({ personId: "p1" }))

    expect(state.ok).toBe(true)
    expect(prisma.person.create).not.toHaveBeenCalled()
    expect(prisma.lead.create).toHaveBeenCalledWith(objectMatch({ data: objectMatch({ personId: "p1" }) }))
  })

  it("refuses to attach the lead role to a person who already has it", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      name: "Claire Morel",
      optedOutAt: null,
      lead: { personId: "p1" },
    } as never)

    const state = await createLead(initialLeadFormState, buildFormData({ personId: "p1" }))

    expect(state.message).toBe("lead_exists")
    expect(state.errors.personId).toEqual(["Ce lead existe déjà : Claire Morel"])
    expect(prisma.lead.create).not.toHaveBeenCalled()
  })
})

describe("updateLead", () => {
  afterEach(() => vi.clearAllMocks())

  it("ignores the lead being edited when checking duplicates", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: null } as never)

    await updateLead("p1", initialLeadFormState, buildFormData({ email: "claire@acme.com" }))

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      objectMatch({ where: objectMatch({ NOT: { id: "p1" } }) }),
    )
  })

  it("refuses to update an opted-out lead", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: new Date() } as never)

    const state = await updateLead("p1", initialLeadFormState, buildFormData())

    expect(state.message).toBe("lead_opted_out_locked")
    expect(prisma.person.update).not.toHaveBeenCalled()
    expect(prisma.lead.update).not.toHaveBeenCalled()
  })
})

describe("deleteLead", () => {
  afterEach(() => vi.clearAllMocks())

  it("removes the person along with the lead role", async () => {
    await deleteLead("p1")

    expect(prisma.lead.delete).toHaveBeenCalledWith({ where: { personId: "p1" } })
    expect(prisma.person.delete).toHaveBeenCalledWith({ where: { id: "p1" } })
  })
})
```

- [ ] **Step 3 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/leads.test.ts`
Expected: FAIL, module `./leads` introuvable.

- [ ] **Step 4 : Écrire les actions**

Créer `src/server/actions/leads.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { leadSchema, type LeadInput } from "@/lib/schemas/lead"
import { createActionLogger, isPrismaError, stringField, violatedConstraint } from "@/lib/server-utils"

import { PersonLockedError } from "./persons"
import { deleteEntity, saveEntity } from "./shared"
import type { LeadFormMessage, LeadFormState } from "./leads.types"

// Variante "layout" : couvre aussi les vues de l'écran des leads (chauds, à qualifier…), d'où une modale peut enregistrer.
const LEADS_PATH = "/admin/leads"

const OPT_OUT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
})

type IdentityField = "personId" | "email" | "linkedinUrl"

class LeadConflictError extends Error {
  readonly field: IdentityField
  readonly code: Extract<LeadFormMessage, "lead_exists" | "lead_opted_out">

  constructor(field: IdentityField, code: LeadConflictError["code"], message: string) {
    super(message)
    this.field = field
    this.code = code
  }
}

function collectValues(formData: FormData): LeadFormState["values"] {
  return {
    personId: stringField(formData, "personId"),
    name: stringField(formData, "name"),
    jobRole: stringField(formData, "jobRole"),
    zone: stringField(formData, "zone"),
    companyId: stringField(formData, "companyId"),
    email: stringField(formData, "email"),
    phone: stringField(formData, "phone"),
    linkedinUrl: stringField(formData, "linkedinUrl"),
    metAt: stringField(formData, "metAt"),
    notes: stringField(formData, "notes"),
    details: stringField(formData, "details"),
    origin: stringField(formData, "origin"),
    status: stringField(formData, "status"),
    interest: stringField(formData, "interest"),
    channel: stringField(formData, "channel"),
    score: stringField(formData, "score"),
  }
}

// L'unicité en base arrête déjà le doublon : lire avant d'écrire sert seulement à nommer la personne et à détecter une opposition à la prospection.
async function assertNewIdentity(data: LeadInput, currentPersonId: string | null): Promise<void> {
  const identities: Prisma.PersonWhereInput[] = [
    ...(data.email ? [{ email: data.email }] : []),
    ...(data.linkedinUrl ? [{ linkedinUrl: data.linkedinUrl }] : []),
  ]
  if (identities.length === 0) return

  const existing = await prisma.person.findFirst({
    where: { OR: identities, ...(currentPersonId ? { NOT: { id: currentPersonId } } : {}) },
    select: { name: true, email: true, optedOutAt: true },
  })
  if (!existing) return

  const field: IdentityField =
    data.email !== null && existing.email === data.email ? "email" : "linkedinUrl"
  if (existing.optedOutAt) {
    throw new LeadConflictError(
      field,
      "lead_opted_out",
      `Cette personne s'est opposée à la prospection le ${OPT_OUT_DATE.format(existing.optedOutAt)}`,
    )
  }
  throw new LeadConflictError(field, "lead_exists", `Ce lead existe déjà : ${existing.name ?? ""}`)
}

// Revérifie l'opposition et le rôle existant : la personne a pu changer entre l'affichage du picker et l'envoi.
async function assertLeadRoleAvailable(personId: string): Promise<void> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { name: true, optedOutAt: true, lead: { select: { personId: true } } },
  })
  if (!person) throw new Error(`Personne ${personId} introuvable`)
  if (person.optedOutAt) {
    throw new LeadConflictError(
      "personId",
      "lead_opted_out",
      `Cette personne s'est opposée à la prospection le ${OPT_OUT_DATE.format(person.optedOutAt)}`,
    )
  }
  if (person.lead) {
    throw new LeadConflictError("personId", "lead_exists", `Ce lead existe déjà : ${person.name ?? ""}`)
  }
}

function mapLeadError(err: unknown, values: LeadFormState["values"]): LeadFormState | null {
  if (err instanceof LeadConflictError) {
    const errors: LeadFormState["errors"] = {}
    errors[err.field] = [err.message]
    return { ok: false, errors, message: err.code, values }
  }
  if (err instanceof PersonLockedError) {
    return { ok: false, errors: {}, message: "lead_opted_out_locked", values }
  }
  if (isPrismaError(err, "P2002")) {
    const constraint = violatedConstraint(err)
    const field: IdentityField = constraint.includes("email")
      ? "email"
      : constraint.includes("linkedinUrl")
        ? "linkedinUrl"
        : "personId"
    const errors: LeadFormState["errors"] = {}
    errors[field] = ["Ce lead existe déjà"]
    return { ok: false, errors, message: "lead_exists", values }
  }
  if (isPrismaError(err, "P2003")) {
    return {
      ok: false,
      errors: { companyId: ["Cette entreprise n'existe plus, recharge la page"] },
      message: "company_not_found",
      values,
    }
  }
  return null
}

interface SaveLeadEvents {
  success: string
  failure: string
}

function saveLead(
  actionName: string,
  events: SaveLeadEvents,
  formData: FormData,
  persist: (data: LeadInput) => Promise<unknown>,
): Promise<LeadFormState> {
  const values = collectValues(formData)

  return saveEntity<LeadInput, LeadFormState, unknown>({
    actionName,
    events,
    schema: leadSchema,
    input: values,
    persist,
    invalidateCaches: () => {
      revalidatePath(LEADS_PATH, "layout")
    },
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapLeadError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

// Sépare les champs de la personne et du rôle, toujours écrits dans la même transaction ; `personId` est une directive de création, jamais une colonne persistée.
function splitLeadInput(data: LeadInput) {
  const { personId: _personId, origin, status, interest, channel, score, ...person } = data
  return { person, lead: { origin, status, interest, channel, score } }
}

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveLead(
    "createLead",
    { success: "lead:created", failure: "lead:create_failed" },
    formData,
    async (data) => {
      const { person, lead } = splitLeadInput(data)
      // Personne existante du picker : ses champs, en lecture seule côté client, ne sont jamais écrits, seul le rôle se pose.
      if (data.personId) {
        await assertLeadRoleAvailable(data.personId)
        return prisma.lead.create({ data: { ...lead, personId: data.personId } })
      }
      await assertNewIdentity(data, null)
      return prisma.$transaction(async (tx) => {
        const created = await tx.person.create({ data: person })
        return tx.lead.create({ data: { ...lead, personId: created.id } })
      })
    },
  )
}

export async function updateLead(
  personId: string,
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  await getCurrentUser()

  return saveLead(
    "updateLead",
    { success: "lead:updated", failure: "lead:update_failed" },
    formData,
    async (data) => {
      const current = await prisma.person.findUnique({
        where: { id: personId },
        select: { optedOutAt: true },
      })
      if (current?.optedOutAt) throw new PersonLockedError()
      await assertNewIdentity(data, personId)
      const { person, lead } = splitLeadInput(data)
      return prisma.$transaction(async (tx) => {
        await tx.person.update({ where: { id: personId }, data: person })
        return tx.lead.update({ where: { personId }, data: lead })
      })
    },
  )
}

export async function deleteLead(personId: string): Promise<LeadFormState> {
  await getCurrentUser()

  return deleteEntity<LeadFormState>({
    actionName: "deleteLead",
    events: { success: "lead:deleted", failure: "lead:delete_failed" },
    successLogFields: { personId },
    destroy: () =>
      prisma.$transaction(async (tx) => {
        await tx.lead.delete({ where: { personId } })
        // Aucun autre rôle ne retient la personne : à ce stade, celui qu'on retire est le seul possible.
        await tx.person.delete({ where: { id: personId } })
      }),
    invalidateCaches: () => {
      revalidatePath(LEADS_PATH, "layout")
    },
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
```

- [ ] **Step 5 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/leads.test.ts`
Expected: PASS.

---
### Task 6 : Lectures admin et qualité

**Files:**
- Create: `src/server/queries/leads.ts`
- Create: `src/server/queries/persons.ts`

**Interfaces:**
- Consumes: modèles `Person`, `Lead` (Task 2) ; `personDisplayName` (Task 4, `@/lib/persons`)
- Produces: `AdminLead` (la personne aplatie sur son rôle : `id` = `personId`, champs de la personne, `company: { id, name, logoFilename } | null`, champs du rôle, `hasContactRole: false`), `findAllLeadsForAdmin(): Promise<AdminLead[]>`, `findLeadByIdForAdmin(personId: string): Promise<AdminLead | null>` (`@/server/queries/leads`) ; `PersonOption = { id: string; name: string; company: { name: string } | null }`, `findPersonOptions(): Promise<PersonOption[]>`, `findPersonOptionsWithLeadRole(): Promise<PersonOption[]>` ; `PersonWithoutLeadRole` (tous les champs de la personne, `company: { id, name } | null`, `hasContactRole: false`), `findPersonsWithoutLeadRole(): Promise<PersonWithoutLeadRole[]>` (`@/server/queries/persons`)

- [ ] **Step 1 : Écrire les lectures des leads**

Créer `src/server/queries/leads.ts` :

```ts
import "server-only"

import type {
  JobRole,
  LeadChannel,
  LeadInterest,
  LeadOrigin,
  LeadStatus,
  Prisma,
  Zone,
} from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminLeadInclude = {
  person: {
    include: { company: { select: { id: true, name: true, logoFilename: true } } },
  },
} as const

type LeadWithPerson = Prisma.LeadGetPayload<{ include: typeof adminLeadInclude }>

export interface AdminLead {
  id: string
  name: string | null
  jobRole: JobRole | null
  zone: Zone | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  metAt: Date | null
  notes: string | null
  details: string | null
  optedOutAt: Date | null
  exchangesErasedAt: Date | null
  company: { id: string; name: string; logoFilename: string | null } | null
  origin: LeadOrigin
  status: LeadStatus
  interest: LeadInterest | null
  channel: LeadChannel | null
  score: number | null
  hasContactRole: boolean
}

// La personne aplatie sur son rôle Lead : liste et formulaire lisent une seule forme, jamais une relation imbriquée.
function toAdminLead(row: LeadWithPerson): AdminLead {
  return {
    id: row.personId,
    name: row.person.name,
    jobRole: row.person.jobRole,
    zone: row.person.zone,
    email: row.person.email,
    phone: row.person.phone,
    linkedinUrl: row.person.linkedinUrl,
    metAt: row.person.metAt,
    notes: row.person.notes,
    details: row.person.details,
    optedOutAt: row.person.optedOutAt,
    exchangesErasedAt: row.person.exchangesErasedAt,
    company: row.person.company,
    origin: row.origin,
    status: row.status,
    interest: row.interest,
    channel: row.channel,
    score: row.score,
    hasContactRole: false,
  }
}

// Sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export async function findAllLeadsForAdmin(): Promise<AdminLead[]> {
  const rows = await prisma.lead.findMany({
    include: adminLeadInclude,
    orderBy: { person: { name: { sort: "asc", nulls: "last" } } },
  })
  return rows.map(toAdminLead)
}

export async function findLeadByIdForAdmin(personId: string): Promise<AdminLead | null> {
  const row = await prisma.lead.findUnique({ where: { personId }, include: adminLeadInclude })
  return row ? toAdminLead(row) : null
}
```

`hasContactRole` reste `false` tant que le rôle Contact n'existe pas : le champ est déjà dans le type pour que `13` n'ait qu'à le calculer, jamais à l'ajouter.

- [ ] **Step 2 : Écrire les options de personnes**

Créer `src/server/queries/persons.ts` :

```ts
import "server-only"

import type { JobRole, Zone } from "@/generated/prisma/client"
import { personDisplayName } from "@/lib/persons"
import { prisma } from "@/lib/prisma"

export interface PersonOption {
  id: string
  name: string
  company: { name: string } | null
}

const personOptionSelect = {
  id: true,
  name: true,
  email: true,
  linkedinUrl: true,
  company: { select: { name: true } },
} as const

interface PersonOptionRow {
  id: string
  name: string | null
  email: string | null
  linkedinUrl: string | null
  company: { name: string } | null
}

function toPersonOption(row: PersonOptionRow): PersonOption {
  return { id: row.id, name: personDisplayName(row), company: row.company }
}

// Un correspondant, un apporteur ou un destinataire d'action ou de signal ne se choisit jamais parmi les personnes opposées.
export async function findPersonOptions(): Promise<PersonOption[]> {
  const rows = await prisma.person.findMany({
    where: { optedOutAt: null },
    select: personOptionSelect,
    orderBy: { name: { sort: "asc", nulls: "last" } },
  })
  return rows.map(toPersonOption)
}

export async function findPersonOptionsWithLeadRole(): Promise<PersonOption[]> {
  const rows = await prisma.person.findMany({
    where: { optedOutAt: null, lead: { isNot: null } },
    select: personOptionSelect,
    orderBy: { name: { sort: "asc", nulls: "last" } },
  })
  return rows.map(toPersonOption)
}

// Choisir une de ces personnes remplit le formulaire depuis elle, en lecture, sans rien copier avant l'enregistrement (symétrique de `PersonWithoutContactRole`).
export interface PersonWithoutLeadRole {
  id: string
  name: string | null
  jobRole: JobRole | null
  zone: Zone | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  metAt: Date | null
  notes: string | null
  details: string | null
  company: { id: string; name: string } | null
  hasContactRole: boolean
}

// Picker « Personne existante » : une personne non opposée qui n'a pas encore ce rôle, par exemple un contact rencontré en entretien qui devient aussi prospect.
export async function findPersonsWithoutLeadRole(): Promise<PersonWithoutLeadRole[]> {
  const rows = await prisma.person.findMany({
    where: { optedOutAt: null, lead: null },
    select: {
      id: true,
      name: true,
      jobRole: true,
      zone: true,
      email: true,
      phone: true,
      linkedinUrl: true,
      metAt: true,
      notes: true,
      details: true,
      company: { select: { id: true, name: true } },
    },
    orderBy: { name: { sort: "asc", nulls: "last" } },
  })
  // hasContactRole reste false tant que le rôle Contact n'existe pas : déjà dans le type, prêt à être recalculé plutôt qu'ajouté.
  return rows.map((row) => ({ ...row, hasContactRole: false }))
}
```

- [ ] **Step 3 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes, dont les tests des actions entreprises, projets et tags inchangés.

- [ ] **Step 4 : Contrôle en base**

Run: `just db-studio`
Expected: tables `Person` et `Lead` visibles dans le schema `freelance`, colonnes du spec, `Lead.status` à `NOUVEAU` par défaut et `Lead.interest` nullable sans défaut, `Lead.personId` égal à l'`id` de la personne. Fermer Studio.

- [ ] **Step 5 : Contrôle Sentry**

Lire `docs/ARCHITECTURE.md` § Observabilité et `src/lib/sentry-scrub.ts` : aujourd'hui seuls `beforeSend` (`scrubSentryEvent`) et `beforeSendLog` (`scrubSentryLog`) filtrent les événements Sentry, aucun hook n'existe pour les traces (`beforeSendTransaction`).

Run: `just dev`, puis déclencher une lecture de lead qui passe par `findAllLeadsForAdmin` ou `findLeadByIdForAdmin` (script ponctuel `pnpm tsx`, ou depuis Prisma Studio si une route les appelle déjà).
Expected : ouvrir le dashboard Sentry (organisation `tg-ws`), trouver la trace de la requête Prisma correspondante et constater qu'elle est paramétrée (`$1`, `$2`…) sans valeur d'email, de nom ou de lien LinkedIn en clair dans la description du span.

Si une valeur de personne apparaît en clair : ajouter un hook `beforeSendTransaction` dans `sentry.server.config.ts`, appelant une nouvelle fonction `scrubSentryTransaction` dans `src/lib/sentry-scrub.ts` qui réutilise la même logique de rédaction (`redactEmails`/`redactDeep`) sur les descriptions de span, avant de relancer ce contrôle.

Puis arrêter le serveur : `just stop`.
