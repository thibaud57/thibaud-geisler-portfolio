# Contacts et relations : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à une personne le rôle `Contact` (réseau durable, clé `personId`), ses Server Actions et l'écran Contacts (liste, page de création et de modification en cards, détail avec bloc Pipeline symétrique, suppression), où choisir « Depuis un lead » un lead sans rôle Contact remplit le formulaire depuis lui, en lecture.

**Architecture:** `Contact` ne porte plus que le rôle (`07`, motif `Lead`) : identité, coordonnées, entreprise, localité et opposition vivent sur `Person`. Les actions vérifient l'identité avant d'écrire une nouvelle personne, ou posent le rôle sur une personne existante après avoir revérifié côté serveur qu'elle n'est ni opposée ni déjà pourvue de ce rôle ; `deleteContact` et `deleteLead` (`07`, complété ici) ne suppriment la personne que si elle ne porte plus aucun rôle. Le formulaire est une page en cards sur le motif de `LeadForm` (`08`) ; les dialogues RGPD `OptOutPersonDialog` et `ErasePersonExchangesDialog` (`08`) servent tels quels, leur prop `person` élargie à la forme structurelle commune aux deux rôles.

**Tech Stack:** Prisma 7, PostgreSQL 18, Zod 4, Next.js 16 (Server Actions, App Router), React 19, shadcn/ui `radix-nova`, Pages CMS Editor (ADR-024), Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/13-contacts-design.md`

## Global Constraints

- **Prérequis** : plans `07` (`Person`, `Lead`, `personFields`, `linkedin.ts`, `job-roles.ts`, `persons.ts`, `PersonLockedError`, `optOutPerson`, `erasePersonExchanges`), `08` (`LeadForm`, `PERSON_SECTION_TITLES`, `OptOutPersonDialog`, `ErasePersonExchangesDialog`, `DetailDialog` à `onEdit` facultatif, `findCompanyOptions`, `details-templates.ts`), `09` (`ProspectingAction.personId`, `respondedAt`, `occurredAt`, `status`), `10` (`src/lib/person-retention.ts`) implémentés.
- **Page ou modale** (arbitrages « Page ou modale d'édition » et « Élément rattaché à une fiche » de DESIGN.md) : le contact se crée sur `/admin/contacts/nouveau` et se modifie sur `/admin/contacts/<id>`, `<id>` étant l'id de la personne.
- **Depuis un lead** : à la création seulement, `createContact` reçoit un `personId` facultatif. Fourni, l'action pose le rôle Contact sur cette personne sans écrire ses champs ; les champs de personne envoyés dans le formulaire sont validés mais ignorés : ils doivent donc rester ceux du lead choisi (le formulaire les affiche en lecture, jamais vides). Le champ `Lead` du formulaire ne propose que des leads (`findLeadsWithoutContactRole()`), pas n'importe quelle personne.
- **Enums, valeurs exactes** : `ContactType` `COLLEGUE`, `CLIENT`, `PARTENAIRE`, `MENTOR`, `CONTACT_TECH`, `COMMERCIAL` ; `ContactStatus` `ACTIF`, `INACTIF`, `A_RECONTACTER` (défaut `ACTIF`).
- **Messages** : « Ce contact existe déjà : <nom> » (`contact_exists`, sur `email`/`linkedinUrl` pour un doublon d'identité, sur `personId` pour une personne qui a déjà le rôle), « Cette personne s'est opposée à la prospection le JJ/MM/AAAA » (`contact_opted_out`, fuseau `Europe/Paris`), `contact_opted_out_locked`, `company_not_found`, `person_not_found`, `unknown_error`.
- **Opposition** : plus d'`optOutContact` propre au contact ; `optOutPerson` et `erasePersonExchanges` (`07`) s'appliquent à la personne, quel que soit son rôle.
- **Suppression symétrique** : `deleteContact(personId)` retire le rôle Contact et supprime la personne seulement si elle ne porte pas le rôle Lead ; `deleteLead` (`07`), complété par ce plan, retire le rôle Lead et supprime la personne seulement si elle ne porte pas le rôle Contact.
- **Dernière interaction** : dérivée, jamais saisie ; la plus tardive entre le `respondedAt` le plus récent et l'`occurredAt` le plus récent d'une action de la personne hors statut À faire.
- **Chemin revalidé** : `/admin/contacts`, variante `layout` ; `optOutPerson` et `erasePersonExchanges` (`07`) revalident en plus ce chemin, une personne opposée pouvant porter le rôle Contact.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Modifier un contact sans changer son email** ne doit pas le déclarer doublon de lui-même. Couvert par « ignores the contact being edited when checking duplicates » (Task 2).
- **Personne déjà pourvue du rôle entre l'affichage du picker et l'envoi** : `createContact` revérifie côté serveur. Couvert par « refuses to attach the contact role to a person who already has it » (Task 2).
- **Suppression avec l'autre rôle présent** : `deleteContact` et `deleteLead` gardent la personne. Couvert par « keeps the person when it still has the lead role » (Task 2) et « keeps the person when it still has the contact role » (Task 2, `leads.test.ts`).
- **Dialogues RGPD partagés** : `OptOutPersonDialog` et `ErasePersonExchangesDialog` acceptent un `AdminContact` sans modification de leur JSX, seul leur type `person` change. Vérifié au typecheck de la Task 4.
- **Bloc symétrique** : la vue détail du lead montre le rôle Contact quand il existe, réciproquement pour celle du contact, chacun menant à l'autre fiche (`?detail=`) par le même id. Vérifié à la Task 8, Step 2.

---

### Task 1 : Modèle, migration et libellés

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_contacts/migration.sql`
- Create: `src/lib/contacts.ts`

**Interfaces:**
- Consumes: modèle `Person` (`07`)
- Produces: modèle `Contact`, enums `ContactType`, `ContactStatus` ; `CONTACT_TYPE_LABELS`, `CONTACT_STATUS_LABELS`, `CONTACT_TYPE_ICONS`, `CONTACT_STATUS_ICONS`, `CONTACT_FIELD_LABELS`, `CONTACT_SECTION_TITLES` (`@/lib/contacts`)

- [ ] **Step 1 : Enums et modèle**

Dans `prisma/schema.prisma`, après l'enum `ContactStatus` existant s'il y en a un d'un autre domaine, sinon après l'enum `LeadChannel` :

```prisma
enum ContactType {
  COLLEGUE
  CLIENT
  PARTENAIRE
  MENTOR
  CONTACT_TECH
  COMMERCIAL

  @@schema("freelance")
}

enum ContactStatus {
  ACTIF
  INACTIF
  A_RECONTACTER

  @@schema("freelance")
}
```

Après le modèle `Lead` :

```prisma
// Le rôle « réseau durable ». Promouvoir un lead = ajouter ce rôle à sa personne, sans rien copier.
model Contact {
  personId String @id
  person   Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  types    ContactType[] @default([])
  status   ContactStatus @default(ACTIF)

  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@schema("freelance")
}
```

Dans le modèle `Person`, après `lead Lead?`, ajouter `contact Contact?`.

- [ ] **Step 2 : Migration**

Run: `pnpm prisma migrate dev --name contacts`, puis `just db-test`
Expected: migration créée et appliquée en dev et en test ; elle crée les deux types d'enum, la table `"freelance"."Contact"` et la clé étrangère `Contact_personId_fkey` en `ON DELETE CASCADE`. Aucune modification à la main.

- [ ] **Step 3 : Libellés**

Créer `src/lib/contacts.ts` :

```ts
import { Briefcase, Building2, Code, GraduationCap, Handshake, Moon, Users, Bell, CircleCheck } from "lucide-react"

import type { ContactStatus, ContactType } from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  COLLEGUE: "Collègue",
  CLIENT: "Client",
  PARTENAIRE: "Partenaire",
  MENTOR: "Mentor",
  CONTACT_TECH: "Contact tech",
  COMMERCIAL: "Commercial",
}

export const CONTACT_TYPE_ICONS: Record<ContactType, IconComponent | null> = {
  COLLEGUE: Users,
  CLIENT: Building2,
  PARTENAIRE: Handshake,
  MENTOR: GraduationCap,
  CONTACT_TECH: Code,
  COMMERCIAL: Briefcase,
}

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
  A_RECONTACTER: "À recontacter",
}

export const CONTACT_STATUS_ICONS: Record<ContactStatus, IconComponent | null> = {
  ACTIF: CircleCheck,
  INACTIF: Moon,
  A_RECONTACTER: Bell,
}

// Uniquement les champs du rôle : ceux de la personne vivent dans PERSON_FIELD_LABELS (`@/lib/persons`).
export const CONTACT_FIELD_LABELS = {
  types: "Type",
  status: "Statut",
  lastInteractionAt: "Dernière interaction",
  reviewAt: "À conserver jusqu'au",
} as const

export const CONTACT_SECTION_TITLES = {
  relation: "Relation",
  pipeline: "Pipeline",
} as const
```

- [ ] **Step 4 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 2 : Validation et Server Actions

**Files:**
- Create: `src/lib/schemas/contact.ts`
- Create: `src/server/actions/contacts.types.ts`
- Create: `src/server/actions/contacts.ts`
- Test: `src/server/actions/contacts.test.ts`
- Modify: `src/server/actions/leads.ts`
- Modify: `src/server/actions/leads.test.ts`
- Modify: `src/server/actions/persons.ts`

**Interfaces:**
- Consumes: `personFields`, `NONE_VALUE`, `optionalTextField` (`07`, `@/lib/schemas/person`) ; `PersonLockedError` (`07`, `./persons`) ; `saveEntity`, `deleteEntity` (`./shared`) ; `createActionLogger`, `isPrismaError`, `stringField`, `stringValues`, `violatedConstraint` (`@/lib/server-utils`)
- Produces: `contactSchema`, `ContactInput`, `CONTACT_TYPES`, `CONTACT_STATUSES` (`@/lib/schemas/contact`) ; `ContactFormState`, `ContactFormMessage`, `initialContactFormState` (`./contacts.types`) ; `createContact(prev, formData)`, `updateContact(personId, prev, formData)`, `deleteContact(personId)`, toutes `Promise<ContactFormState>` (`./contacts`)

- [ ] **Step 1 : Schéma**

Créer `src/lib/schemas/contact.ts` :

```ts
import { z } from "zod"

import { ContactStatus, ContactType } from "@/generated/prisma/browser"
import { optionalTextField, personFields } from "@/lib/schemas/person"

export const CONTACT_TYPES = Object.values(ContactType)
export const CONTACT_STATUSES = Object.values(ContactStatus)

export const contactSchema = z.object({
  ...personFields,
  // Facultatif : posé quand le rôle se pose sur une personne existante plutôt que d'en créer une ; `personFields` reste alors validé mais ignoré.
  personId: optionalTextField,
  types: z.array(z.enum(ContactType, { error: "Type inconnu" })),
  status: z.enum(ContactStatus, { error: "Statut inconnu" }),
})

export type ContactInput = z.infer<typeof contactSchema>
```

- [ ] **Step 2 : Types de l'état**

Créer `src/server/actions/contacts.types.ts` :

```ts
import type { FormActionState } from "@/lib/form-state"
import type { ContactInput } from "@/lib/schemas/contact"

export type ContactFormMessage =
  | "contact_exists"
  | "contact_opted_out"
  | "contact_opted_out_locked"
  | "company_not_found"
  | "person_not_found"
  | "unknown_error"
  | null

export type ContactFormState = FormActionState<ContactInput, ContactFormMessage>

export const initialContactFormState: ContactFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

- [ ] **Step 3 : Écrire les tests qui échouent**

Créer `src/server/actions/contacts.test.ts` :

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
    contact: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lead: {
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

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/person"

import { createContact, deleteContact, updateContact } from "./contacts"
import { initialContactFormState } from "./contacts.types"

const BASE_FIELDS = {
  personId: "",
  name: "Léa Moreau",
  jobRole: NONE_VALUE,
  zone: NONE_VALUE,
  companyId: NONE_VALUE,
  email: "",
  phone: "",
  linkedinUrl: "",
  metAt: "",
  notes: "",
  details: "",
  status: "ACTIF",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  data.append("types", "COLLEGUE")
  return data
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

// Forme constatée (Prisma 7 + @prisma/adapter-pg) : le nom de la contrainte vit sous `meta.driverAdapterError.cause.constraint.index`, clé unique comme clé étrangère.
function constraintError(code: string, index: string) {
  return { code, meta: { driverAdapterError: { cause: { constraint: { index } } } } }
}

beforeEach(() => {
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.person.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.person.create).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(prisma.person.update).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(prisma.contact.create).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.contact.update).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("createContact", () => {
  it("rejects a missing name", async () => {
    const state = await createContact(initialContactFormState, buildFormData({ name: "" }))

    expect(state.errors.name).toEqual(["Le nom est requis"])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("normalizes the LinkedIn profile link and lowercases the email", async () => {
    await createContact(
      initialContactFormState,
      buildFormData({
        email: " Lea.Moreau@Theodo.FR ",
        linkedinUrl: "fr.linkedin.com/in/Lea-Moreau/",
      }),
    )

    expect(prisma.person.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          email: "lea.moreau@theodo.fr",
          linkedinUrl: "https://www.linkedin.com/in/lea-moreau",
        }),
      }),
    )
    expect(prisma.contact.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ types: ["COLLEGUE"], personId: "p1" }) }),
    )
  })

  it("refuses a second contact with the same email or LinkedIn profile, naming it", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: "Léa Moreau",
      email: "lea@theodo.fr",
      optedOutAt: null,
    } as never)

    const state = await createContact(initialContactFormState, buildFormData({ email: "LEA@theodo.fr" }))

    expect(state.message).toBe("contact_exists")
    expect(state.errors.email).toEqual(["Ce contact existe déjà : Léa Moreau"])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("names the stop date when the person opposed", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: null,
      email: null,
      optedOutAt: new Date("2026-03-11T23:30:00Z"),
    } as never)

    const state = await createContact(
      initialContactFormState,
      buildFormData({ linkedinUrl: "https://www.linkedin.com/in/lea-moreau" }),
    )

    expect(state.message).toBe("contact_opted_out")
    expect(state.errors.linkedinUrl).toEqual([
      "Cette personne s'est opposée à la prospection le 12/03/2026",
    ])
  })

  it("creates the role on an existing person without writing its fields", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      name: "Anaïs Petit",
      optedOutAt: null,
      contact: null,
    } as never)

    const state = await createContact(initialContactFormState, buildFormData({ personId: "p9" }))

    expect(state.ok).toBe(true)
    expect(prisma.person.create).not.toHaveBeenCalled()
    expect(prisma.contact.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ personId: "p9", types: ["COLLEGUE"], status: "ACTIF" }) }),
    )
  })

  it("refuses to attach the contact role to a person who already has it", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      name: "Anaïs Petit",
      optedOutAt: null,
      contact: { personId: "p9" },
    } as never)

    const state = await createContact(initialContactFormState, buildFormData({ personId: "p9" }))

    expect(state.message).toBe("contact_exists")
    expect(state.errors.personId).toEqual(["Ce contact existe déjà : Anaïs Petit"])
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it("maps a missing company to its field", async () => {
    vi.mocked(prisma.person.create).mockRejectedValue(constraintError("P2003", "Person_companyId_fkey"))

    const state = await createContact(initialContactFormState, buildFormData({ companyId: "c-missing" }))

    expect(state.message).toBe("company_not_found")
    expect(state.errors.companyId).toBeDefined()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createContact(initialContactFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.person.findFirst).not.toHaveBeenCalled()
  })
})

describe("updateContact", () => {
  it("ignores the contact being edited when checking duplicates", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: null } as never)

    await updateContact("p1", initialContactFormState, buildFormData({ email: "lea@theodo.fr" }))

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      objectMatch({ where: objectMatch({ NOT: { id: "p1" } }) }),
    )
  })

  it("refuses to edit an opted-out contact", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: new Date() } as never)

    const state = await updateContact("p1", initialContactFormState, buildFormData())

    expect(state.message).toBe("contact_opted_out_locked")
    expect(prisma.person.update).not.toHaveBeenCalled()
    expect(prisma.contact.update).not.toHaveBeenCalled()
  })
})

describe("deleteContact", () => {
  it("removes the person along with the contact role when no lead role remains", async () => {
    await deleteContact("p1")

    expect(prisma.contact.delete).toHaveBeenCalledWith({ where: { personId: "p1" } })
    expect(prisma.person.delete).toHaveBeenCalledWith({ where: { id: "p1" } })
  })

  it("keeps the person when it still has the lead role", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({ personId: "p1" } as never)

    await deleteContact("p1")

    expect(prisma.contact.delete).toHaveBeenCalledWith({ where: { personId: "p1" } })
    expect(prisma.person.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/contacts.test.ts`
Expected: FAIL, module `./contacts` introuvable.

- [ ] **Step 5 : Écrire les actions**

Créer `src/server/actions/contacts.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { contactSchema, type ContactInput } from "@/lib/schemas/contact"
import {
  createActionLogger,
  isPrismaError,
  stringField,
  stringValues,
  violatedConstraint,
} from "@/lib/server-utils"

import { PersonLockedError } from "./persons"
import { deleteEntity, saveEntity } from "./shared"
import type { ContactFormMessage, ContactFormState } from "./contacts.types"

const CONTACTS_PATH = "/admin/contacts"

const OPT_OUT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
})

type ConflictField = "email" | "linkedinUrl" | "personId"

class ContactConflictError extends Error {
  readonly field: ConflictField
  readonly code: Extract<ContactFormMessage, "contact_exists" | "contact_opted_out" | "person_not_found">

  constructor(field: ConflictField, code: ContactConflictError["code"], message: string) {
    super(message)
    this.field = field
    this.code = code
  }
}

function collectValues(formData: FormData): ContactFormState["values"] {
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
    types: stringValues(formData, "types"),
    status: stringField(formData, "status"),
  }
}

// L'unicité en base arrête déjà le doublon : lire avant d'écrire sert seulement à nommer la personne et à détecter une opposition à la prospection.
async function assertNewIdentity(data: ContactInput, currentPersonId: string | null): Promise<void> {
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

  const field: ConflictField = data.email !== null && existing.email === data.email ? "email" : "linkedinUrl"
  if (existing.optedOutAt) {
    throw new ContactConflictError(
      field,
      "contact_opted_out",
      `Cette personne s'est opposée à la prospection le ${OPT_OUT_DATE.format(existing.optedOutAt)}`,
    )
  }
  throw new ContactConflictError(field, "contact_exists", `Ce contact existe déjà : ${existing.name ?? ""}`)
}

// Personne existante choisie dans le formulaire : ses champs ne s'écrivent pas, seul le rôle se pose, sur une personne non opposée qui n'a pas déjà ce rôle.
async function assertAttachable(personId: string): Promise<void> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { name: true, optedOutAt: true, contact: { select: { personId: true } } },
  })
  if (!person) {
    throw new ContactConflictError("personId", "person_not_found", "Cette personne n'existe plus, recharge la page")
  }
  if (person.optedOutAt) {
    throw new ContactConflictError(
      "personId",
      "contact_opted_out",
      `Cette personne s'est opposée à la prospection le ${OPT_OUT_DATE.format(person.optedOutAt)}`,
    )
  }
  if (person.contact) {
    throw new ContactConflictError("personId", "contact_exists", `Ce contact existe déjà : ${person.name ?? ""}`)
  }
}

function mapContactError(err: unknown, values: ContactFormState["values"]): ContactFormState | null {
  if (err instanceof ContactConflictError) {
    const errors: ContactFormState["errors"] = {}
    errors[err.field] = [err.message]
    return { ok: false, errors, message: err.code, values }
  }
  if (err instanceof PersonLockedError) {
    return { ok: false, errors: {}, message: "contact_opted_out_locked", values }
  }
  if (isPrismaError(err, "P2002")) {
    const constraint = violatedConstraint(err)
    const field: ConflictField = constraint.includes("email")
      ? "email"
      : constraint.includes("linkedinUrl")
        ? "linkedinUrl"
        : "personId"
    const errors: ContactFormState["errors"] = {}
    errors[field] = ["Ce contact existe déjà"]
    return { ok: false, errors, message: "contact_exists", values }
  }
  // Clé étrangère en `<Table>_<col>_fkey` : le nom dit quelle fiche a disparu.
  if (isPrismaError(err, "P2003")) {
    if (violatedConstraint(err).includes("personId")) {
      return {
        ok: false,
        errors: { personId: ["Cette personne n'existe plus, recharge la page"] },
        message: "person_not_found",
        values,
      }
    }
    return {
      ok: false,
      errors: { companyId: ["Cette entreprise n'existe plus, recharge la page"] },
      message: "company_not_found",
      values,
    }
  }
  return null
}

interface SaveContactEvents {
  success: string
  failure: string
}

function saveContact(
  actionName: string,
  events: SaveContactEvents,
  formData: FormData,
  persist: (data: ContactInput) => Promise<unknown>,
): Promise<ContactFormState> {
  const values = collectValues(formData)

  return saveEntity<ContactInput, ContactFormState, unknown>({
    actionName,
    events,
    schema: contactSchema,
    input: values,
    persist,
    invalidateCaches: () => {
      revalidatePath(CONTACTS_PATH, "layout")
    },
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapContactError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

// Sépare les champs de la personne de ceux du rôle ; `personId` ne fait partie ni de l'un ni de l'autre.
function splitContactInput(data: ContactInput) {
  const { personId: _personId, types, status, ...person } = data
  return { person, contact: { types, status } }
}

export async function createContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveContact(
    "createContact",
    { success: "contact:created", failure: "contact:create_failed" },
    formData,
    async (data) => {
      if (data.personId) {
        await assertAttachable(data.personId)
        const { types, status } = data
        return prisma.contact.create({ data: { types, status, personId: data.personId } })
      }
      await assertNewIdentity(data, null)
      const { person, contact } = splitContactInput(data)
      return prisma.$transaction(async (tx) => {
        const created = await tx.person.create({ data: person })
        return tx.contact.create({ data: { ...contact, personId: created.id } })
      })
    },
  )
}

export async function updateContact(
  personId: string,
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await getCurrentUser()

  return saveContact(
    "updateContact",
    { success: "contact:updated", failure: "contact:update_failed" },
    formData,
    async (data) => {
      const current = await prisma.person.findUnique({
        where: { id: personId },
        select: { optedOutAt: true },
      })
      if (current?.optedOutAt) throw new PersonLockedError()
      await assertNewIdentity(data, personId)
      const { person, contact } = splitContactInput(data)
      return prisma.$transaction(async (tx) => {
        await tx.person.update({ where: { id: personId }, data: person })
        return tx.contact.update({ where: { personId }, data: contact })
      })
    },
  )
}

export async function deleteContact(personId: string): Promise<ContactFormState> {
  await getCurrentUser()

  return deleteEntity<ContactFormState>({
    actionName: "deleteContact",
    events: { success: "contact:deleted", failure: "contact:delete_failed" },
    successLogFields: { personId },
    destroy: () =>
      prisma.$transaction(async (tx) => {
        await tx.contact.delete({ where: { personId } })
        // La personne garde son rôle Lead s'il existe : seule celle qui n'a plus aucun rôle disparaît.
        const remainingLead = await tx.lead.findUnique({ where: { personId }, select: { personId: true } })
        if (!remainingLead) {
          await tx.person.delete({ where: { id: personId } })
        }
      }),
    invalidateCaches: () => {
      revalidatePath(CONTACTS_PATH, "layout")
    },
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
```

- [ ] **Step 6 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/contacts.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 7 : Point d'extension du `07`, test de `deleteLead`**

Dans `src/server/actions/leads.test.ts`, dans le mock de `@/lib/prisma`, ajouter `contact: { findUnique: vi.fn() }` à côté de `lead`. Dans le `beforeEach`, ajouter `vi.mocked(prisma.contact.findUnique).mockResolvedValue(null)`. Dans `describe("deleteLead", ...)`, ajouter :

```ts
  it("keeps the person when it still has the contact role", async () => {
    vi.mocked(prisma.contact.findUnique).mockResolvedValue({ personId: "p1" } as never)

    await deleteLead("p1")

    expect(prisma.lead.delete).toHaveBeenCalledWith({ where: { personId: "p1" } })
    expect(prisma.person.delete).not.toHaveBeenCalled()
  })
```

Run: `pnpm vitest run --project unit src/server/actions/leads.test.ts`
Expected: FAIL sur le nouveau test seul : `deleteLead` supprime encore la personne sans condition tant que le Step 8 ne l'a pas modifié, `prisma.person.delete` est donc appelé malgré le mock.

- [ ] **Step 8 : Modifier `deleteLead`**

Dans `src/server/actions/leads.ts`, dans `deleteLead`, remplacer :

```ts
    destroy: () =>
      prisma.$transaction(async (tx) => {
        await tx.lead.delete({ where: { personId } })
        // Aucun autre rôle ne retient la personne : à ce stade, celui qu'on retire est le seul possible.
        await tx.person.delete({ where: { id: personId } })
      }),
```

par :

```ts
    destroy: () =>
      prisma.$transaction(async (tx) => {
        await tx.lead.delete({ where: { personId } })
        // La personne garde son rôle Contact s'il existe : seule celle qui n'a plus aucun rôle disparaît.
        const remainingContact = await tx.contact.findUnique({
          where: { personId },
          select: { personId: true },
        })
        if (!remainingContact) {
          await tx.person.delete({ where: { id: personId } })
        }
      }),
```

- [ ] **Step 9 : Lancer les tests des leads**

Run: `pnpm vitest run --project unit src/server/actions/leads.test.ts`
Expected: PASS, `removes the person along with the lead role` (mock `contact.findUnique` à `null`) et `keeps the person when it still has the contact role` passent toutes deux.

- [ ] **Step 10 : `persons.ts` revalide aussi les contacts**

Dans `src/server/actions/persons.ts`, remplacer :

```ts
const LEADS_PATH = "/admin/leads"
```

par :

```ts
const LEADS_PATH = "/admin/leads"
// Une personne opposée peut porter le rôle Contact : sa liste doit se rafraîchir au même titre.
const CONTACTS_PATH = "/admin/contacts"
```

puis, dans `optOutPerson` et `erasePersonExchanges`, après chaque `revalidatePath(LEADS_PATH, "layout")`, ajouter `revalidatePath(CONTACTS_PATH, "layout")`.

- [ ] **Step 11 : Vérifier**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 3 : Lectures admin, gabarit et largeurs

**Files:**
- Create: `src/server/queries/contacts.ts`
- Modify: `src/server/queries/leads.ts`
- Modify: `src/server/queries/persons.ts`
- Modify: `src/lib/leads.ts`
- Modify: `src/lib/details-templates.ts`
- Test: `src/lib/details-templates.test.ts`
- Modify: `src/lib/admin-table-widths.ts`

**Interfaces:**
- Consumes: modèle `Contact` (Task 1) ; `personDisplayName` (`07`, `@/lib/persons`)
- Produces: `AdminContact`, `findAllContactsForAdmin(): Promise<AdminContact[]>`, `findContactByIdForAdmin(personId: string): Promise<AdminContact | null>` (`@/server/queries/contacts`) ; `AdminLead.hasContactRole` calculé et `AdminLead.contactRole` (`@/server/queries/leads`) ; `LeadWithoutContactRole`, `findLeadsWithoutContactRole()` (`@/server/queries/persons`) ; `LEAD_SECTION_TITLES.network` (`@/lib/leads`) ; `CONTACT_DETAILS_TEMPLATE` (`@/lib/details-templates`) ; `CONTACT_COLUMN_WIDTHS`, `ContactColumnKey`, `CONTACT_DEFAULT_VISIBLE_COLUMNS`, `contactSkeletonWidths()` (`@/lib/admin-table-widths`)

- [ ] **Step 1 : Lectures des contacts**

Créer `src/server/queries/contacts.ts` :

```ts
import "server-only"

import type {
  ContactStatus,
  ContactType,
  JobRole,
  LeadInterest,
  LeadStatus,
  Prisma,
  Zone,
} from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminContactInclude = {
  person: {
    include: {
      company: { select: { id: true, name: true, logoFilename: true } },
      lead: { select: { status: true, interest: true } },
      prospectingActions: {
        where: { status: { not: "A_FAIRE" } },
        select: { respondedAt: true, occurredAt: true },
      },
    },
  },
} as const

type ContactWithPerson = Prisma.ContactGetPayload<{ include: typeof adminContactInclude }>

export interface AdminContact {
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
  createdAt: Date
  company: { id: string; name: string; logoFilename: string | null } | null
  types: ContactType[]
  status: ContactStatus
  hasLeadRole: boolean
  leadRole: { status: LeadStatus; interest: LeadInterest | null } | null
  lastInteractionAt: Date | null
}

// Hors À faire seulement : une action encore à faire n'a pas eu lieu. Réponse et envoi comptent à égalité, la plus tardive des deux datant le dernier échange connu.
function latestInteractionOf(
  actions: readonly { respondedAt: Date | null; occurredAt: Date }[],
): Date | null {
  const dates = actions.flatMap((action) =>
    [action.respondedAt, action.occurredAt].filter((date): date is Date => date !== null),
  )
  return dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null
}

// La personne aplatie sur son rôle Contact : la liste et le formulaire lisent une seule forme.
function toAdminContact(row: ContactWithPerson): AdminContact {
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
    // Création du rôle, pas de la personne : promouvoir un lead ancien en contact ne doit pas faire expirer aussitôt sa revue.
    createdAt: row.createdAt,
    company: row.person.company,
    types: row.types,
    status: row.status,
    hasLeadRole: row.person.lead !== null,
    leadRole: row.person.lead,
    lastInteractionAt: latestInteractionOf(row.person.prospectingActions),
  }
}

// Sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export async function findAllContactsForAdmin(): Promise<AdminContact[]> {
  const rows = await prisma.contact.findMany({
    include: adminContactInclude,
    orderBy: { person: { name: { sort: "asc", nulls: "last" } } },
  })
  return rows.map(toAdminContact)
}

export async function findContactByIdForAdmin(personId: string): Promise<AdminContact | null> {
  const row = await prisma.contact.findUnique({ where: { personId }, include: adminContactInclude })
  return row ? toAdminContact(row) : null
}
```

- [ ] **Step 2 : `hasContactRole` et le bloc Réseau du lead**

Dans `src/server/queries/leads.ts`, ajouter `ContactStatus`, `ContactType` à l'import depuis `@/generated/prisma/client`, puis remplacer :

```ts
const adminLeadInclude = {
  person: {
    include: { company: { select: { id: true, name: true, logoFilename: true } } },
  },
} as const
```

par :

```ts
const adminLeadInclude = {
  person: {
    include: {
      company: { select: { id: true, name: true, logoFilename: true } },
      contact: { select: { types: true, status: true } },
    },
  },
} as const
```

Dans `AdminLead`, remplacer `hasContactRole: boolean` par :

```ts
  hasContactRole: boolean
  contactRole: { types: ContactType[]; status: ContactStatus } | null
```

Dans `toAdminLead`, remplacer `hasContactRole: false,` par :

```ts
    hasContactRole: row.person.contact !== null,
    contactRole: row.person.contact,
```

- [ ] **Step 3 : Titre du bloc Réseau**

À la fin de `LEAD_SECTION_TITLES` dans `src/lib/leads.ts`, ajouter `network: "Réseau",` après `pipeline: "Pipeline",`.

- [ ] **Step 4 : Leads sans rôle Contact**

Dans `src/server/queries/persons.ts` (`JobRole` et `Zone` déjà importés par `07`), à la fin du fichier :

```ts
export interface LeadWithoutContactRole {
  id: string
  name: string | null
  jobRole: JobRole | null
  zone: Zone | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  notes: string | null
  details: string | null
  company: { id: string; name: string } | null
}

// Pour le formulaire contact, choix « Depuis un lead » : choisir un de ces leads remplit ses champs en lecture, sans jamais rien copier avant l'enregistrement. Scopé au rôle Lead (`lead: { isNot: null }`) : promouvoir un lead, pas n'importe quelle personne.
export async function findLeadsWithoutContactRole(): Promise<LeadWithoutContactRole[]> {
  return prisma.person.findMany({
    where: { optedOutAt: null, contact: { is: null }, lead: { isNot: null } },
    select: {
      id: true,
      name: true,
      jobRole: true,
      zone: true,
      email: true,
      phone: true,
      linkedinUrl: true,
      notes: true,
      details: true,
      company: { select: { id: true, name: true } },
    },
    orderBy: { name: { sort: "asc", nulls: "last" } },
  })
}
```

- [ ] **Step 5 : Écrire le test du gabarit**

Ajouter à `src/lib/details-templates.test.ts` (import de `CONTACT_DETAILS_TEMPLATE` depuis `./details-templates`) :

```ts
describe("CONTACT_DETAILS_TEMPLATE", () => {
  it("gives the contact template its five sections", () => {
    const headings = CONTACT_DETAILS_TEMPLATE.split("\n").filter((line) => line.startsWith("# "))

    expect(headings).toEqual([
      "# 💼 Profil",
      "# 🤝 Relation",
      "# 📅 Historique",
      "# 🔗 Liens",
      "# 📝 Notes libres",
    ])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: FAIL, `CONTACT_DETAILS_TEMPLATE` absent.

- [ ] **Step 6 : Gabarit**

À la fin de `src/lib/details-templates.ts` :

```ts
// Titres de la fiche Notion ; poste, entreprise et types restent des champs, pas du texte.
export const CONTACT_DETAILS_TEMPLATE = `# 💼 Profil

# 🤝 Relation

- **Rencontre** :

# 📅 Historique

- **JJ/MM/AAAA** :

# 🔗 Liens

# 📝 Notes libres
`
```

Run: `pnpm vitest run --project unit src/lib/details-templates.test.ts`
Expected: PASS.

- [ ] **Step 7 : Largeurs**

À la fin de `src/lib/admin-table-widths.ts` :

```ts
export const CONTACT_COLUMN_WIDTHS = {
  // Une colonne triable tient son en-tête sur une ligne : libellé, icône de tri et marges du bouton dictent sa largeur.
  name: 200,
  types: 190,
  company: 180,
  status: 130,
  lastInteractionAt: 170,
  zone: 140,
  email: 200,
  phone: 140,
  linkedinUrl: 170,
  reviewAt: 130,
  notes: 220,
  actions: 88,
} as const

export type ContactColumnKey = keyof typeof CONTACT_COLUMN_WIDTHS

// Colonnes affichées de la maquette (CT_COLS) ; Téléphone et « À conserver jusqu'au » masquables.
export const CONTACT_DEFAULT_VISIBLE_COLUMNS: readonly ContactColumnKey[] = [
  "types",
  "company",
  "status",
  "lastInteractionAt",
  "zone",
  "email",
  "linkedinUrl",
  "notes",
]

export function contactSkeletonWidths(): readonly number[] {
  const keys: readonly ContactColumnKey[] = ["name", ...CONTACT_DEFAULT_VISIBLE_COLUMNS, "actions"]
  return keys.map((key) => CONTACT_COLUMN_WIDTHS[key])
}
```

- [ ] **Step 8 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 4 : Formulaire du contact

**Files:**
- Create: `src/components/features/admin/ReadOnlyField.tsx`
- Create: `src/components/features/admin/contacts/ContactForm.tsx`
- Create: `src/app/admin/(protected)/contacts/nouveau/page.tsx` et `loading.tsx`
- Create: `src/app/admin/(protected)/contacts/[id]/page.tsx` et `loading.tsx`

**Interfaces:**
- Consumes: Tasks 1 à 3 ; `personDisplayName`, `PERSON_FIELD_LABELS`, `PERSON_SECTION_TITLES` (`07`/`08`, `@/lib/persons`) ; `optOutPerson` (`07`, via `OptOutPersonDialog`) ; `OptOutTarget`, `OptOutPersonDialog`, `SelectField` (`08`) ; `Editor` (`03`) ; `ComboboxPopover`, `Checkbox`, `FormField`, `Card`, `AdminBreadcrumb`, `StackedSkeleton`, `RadioGroup` ; `findCompanyOptions` (`08`) ; `findLeadsWithoutContactRole` (Task 3)
- Produces: `ReadOnlyField` (`@/components/features/admin/ReadOnlyField`, créé ici, repris tel quel du `08`) ; `ContactForm({ contact, companyOptions, leadOptions }: { contact: AdminContact | null; companyOptions: readonly CompanyOption[]; leadOptions: readonly LeadWithoutContactRole[] })` ; routes `/admin/contacts/nouveau` et `/admin/contacts/<id>`

`AdminLead` et `AdminContact` portent chacun un sur-ensemble d'`OptOutTarget` (`08`) : `OptOutPersonDialog` et `ErasePersonExchangesDialog` s'utilisent ici tels quels, sans rien y changer.

- [ ] **Step 1 : Champ en lecture, partagé avec un futur formulaire « depuis un lead »**

Le `08` ne pose plus de choix « Personne existante » sur `LeadForm`, ce champ n'y est donc plus consommé : `ContactForm` en devient le premier et seul consommateur, qui le crée.

`src/components/features/admin/ReadOnlyField.tsx` (le lead choisi se lit, jamais ne s'édite : la valeur réelle voyage par un champ caché) :

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

- [ ] **Step 2 : Formulaire en cards**

`src/components/features/admin/contacts/ContactForm.tsx`, sur le motif de `LeadForm` (`08`), `SelectField` importé du même endroit partagé :

```tsx
"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { OptOutPersonDialog } from "@/components/features/admin/persons/OptOutPersonDialog"
import { ReadOnlyField } from "@/components/features/admin/ReadOnlyField"
import { SelectField } from "@/components/features/admin/SelectField"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import {
  CONTACT_FIELD_LABELS,
  CONTACT_SECTION_TITLES,
  CONTACT_STATUS_ICONS,
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_ICONS,
  CONTACT_TYPE_LABELS,
} from "@/lib/contacts"
import { CONTACT_DETAILS_TEMPLATE } from "@/lib/details-templates"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/persons"
import { toIsoDate } from "@/lib/projects"
import { CONTACT_STATUSES, CONTACT_TYPES } from "@/lib/schemas/contact"
import { NONE_VALUE } from "@/lib/schemas/person"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import { createContact, updateContact } from "@/server/actions/contacts"
import { initialContactFormState } from "@/server/actions/contacts.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminContact } from "@/server/queries/contacts"
import type { LeadWithoutContactRole } from "@/server/queries/persons"

const CONTACTS_PATH = "/admin/contacts"

interface Props {
  contact: AdminContact | null
  companyOptions: readonly CompanyOption[]
  leadOptions: readonly LeadWithoutContactRole[]
}

export function ContactForm({ contact, companyOptions, leadOptions }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = contact ? updateContact.bind(null, contact.id) : createContact
  const [state, formAction, pending] = useActionState(action, initialContactFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  const [mode, setMode] = useState<"new" | "fromLead">("new")
  const [selectedLeadId, setSelectedLeadId] = useState(NONE_VALUE)
  const [leadOpen, setLeadOpen] = useState(false)
  const selectedLead = leadOptions.find((lead) => lead.id === selectedLeadId) ?? null
  const readOnly = mode === "fromLead" && selectedLead !== null
  const source = selectedLead ?? contact

  const [companyId, setCompanyId] = useState(contact?.company?.id ?? NONE_VALUE)
  const [companyOpen, setCompanyOpen] = useState(false)
  // Hors maquette pour un contact : gardé caché pour satisfaire `personFields` sans écraser la date de rencontre d'un lead promu.
  const [metAt] = useState<Date | undefined>(contact?.metAt ?? undefined)
  const [details, setDetails] = useState(contact ? (contact.details ?? "") : CONTACT_DETAILS_TEMPLATE)
  const [editorKey, setEditorKey] = useState(0)
  const [types, setTypes] = useState<string[]>(contact?.types ?? [])

  function toggleType(type: string, checked: boolean) {
    setTypes((current) =>
      checked ? [...current, type] : current.filter((value) => value !== type),
    )
  }

  const selectedCompany = companyOptions.find((company) => company.id === companyId) ?? null

  useEffect(() => {
    if (state.ok === true) {
      toast.success(contact ? "Contact mis à jour" : "Contact créé")
      router.push(CONTACTS_PATH)
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    } else if (state.ok === false && state.message === "contact_opted_out_locked") {
      toast.error("Cette personne s'est opposée à la prospection : sa fiche ne se modifie plus")
    }
  }, [state, contact, router])

  function handleModeChange(next: string) {
    setMode(next as "new" | "fromLead")
    if (next === "new") setSelectedLeadId(NONE_VALUE)
  }

  function handleLeadSelect(lead: LeadWithoutContactRole) {
    setSelectedLeadId(lead.id)
    setLeadOpen(false)
    setCompanyId(lead.company?.id ?? NONE_VALUE)
    setDetails(lead.details ?? "")
    setEditorKey((key) => key + 1)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {contact ? personDisplayName(contact) : "Nouveau contact"}
        </h1>
        <div className="flex flex-wrap gap-2">
          {contact ? (
            <OptOutPersonDialog
              person={contact}
              onDone={() => {
                router.push(CONTACTS_PATH)
              }}
            />
          ) : null}
          <Button type="button" variant="ghost" asChild>
            <Link href={CONTACTS_PATH}>Annuler</Link>
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
                  : "Le reste de sa fiche vient du lead choisi, rien n'est recopié."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!contact ? (
                <>
                  <RadioGroup value={mode} onValueChange={handleModeChange} className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id={`${formId}-mode-new`} value="new" />
                      <Label htmlFor={`${formId}-mode-new`}>Nouveau contact</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id={`${formId}-mode-fromLead`} value="fromLead" />
                      <Label htmlFor={`${formId}-mode-fromLead`}>Depuis un lead</Label>
                    </div>
                  </RadioGroup>
                  {mode === "fromLead" ? (
                    <FormField id={`${formId}-leadId`} label="Lead" errors={state.errors.personId}>
                      <ComboboxPopover
                        id={`${formId}-leadId`}
                        open={leadOpen}
                        onOpenChange={setLeadOpen}
                        triggerContent={
                          selectedLead ? (
                            <span className="truncate">{personDisplayName(selectedLead)}</span>
                          ) : (
                            <span className="text-muted-foreground">Choisir un lead</span>
                          )
                        }
                        ariaInvalid={!!state.errors.personId?.length}
                        ariaDescribedby={`${formId}-leadId-error`}
                        searchPlaceholder="Chercher un lead"
                        emptyMessage="Aucun lead ne correspond."
                      >
                        <CommandGroup>
                          {leadOptions.map((lead) => (
                            <CommandItem
                              key={lead.id}
                              value={lead.id}
                              keywords={[personDisplayName(lead)]}
                              data-checked={selectedLeadId === lead.id}
                              onSelect={() => handleLeadSelect(lead)}
                            >
                              <span className="truncate">{personDisplayName(lead)}</span>
                              {lead.company ? (
                                <span className="truncate text-muted-foreground">{lead.company.name}</span>
                              ) : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </ComboboxPopover>
                    </FormField>
                  ) : null}
                </>
              ) : null}

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
                    placeholder="Léa Moreau"
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
          <input type="hidden" name="personId" value={mode === "fromLead" ? selectedLeadId : NONE_VALUE} />
          <input type="hidden" name="metAt" value={metAt ? toIsoDate(metAt) : ""} />

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
              <CardTitle id={`${formId}-details-title`}>{PERSON_SECTION_TITLES.details}</CardTitle>
              {readOnly ? null : (
                <CardDescription>
                  Raccourcis : « # » un titre, « - » une liste, « / » le menu des blocs.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {readOnly ? (
                <>
                  <div
                    aria-labelledby={`${formId}-details-title`}
                    className="rounded-md border border-input bg-muted p-3"
                  >
                    <MarkdownContent markdown={source?.details ?? ""} variant="admin" />
                  </div>
                  <input type="hidden" name="details" value={source?.details ?? ""} />
                </>
              ) : (
                <>
                  <Editor
                    key={editorKey}
                    id={`${formId}-details`}
                    aria-labelledby={`${formId}-details-title`}
                    format="markdown"
                    enableImages={false}
                    value={details}
                    onChange={setDetails}
                    aria-invalid={!!state.errors.details?.length}
                    aria-describedby={`${formId}-details-error`}
                  />
                  <div id={`${formId}-details-error`} aria-live="polite">
                    {state.errors.details?.[0] ? (
                      <p className="text-sm text-destructive">{state.errors.details[0]}</p>
                    ) : null}
                  </div>
                  <input type="hidden" name="details" value={details} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <Card>
            <CardHeader>
              <CardTitle>{CONTACT_SECTION_TITLES.relation}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <SelectField
                id={`${formId}-status`}
                name="status"
                label={CONTACT_FIELD_LABELS.status}
                options={CONTACT_STATUSES}
                labels={CONTACT_STATUS_LABELS}
                icons={CONTACT_STATUS_ICONS}
                defaultValue={contact?.status ?? "ACTIF"}
                errors={state.errors.status}
              />

              <div className="flex flex-col gap-2">
                <span id={`${formId}-types-label`} className="text-sm font-medium">
                  {CONTACT_FIELD_LABELS.types}
                </span>
                <div
                  role="group"
                  aria-labelledby={`${formId}-types-label`}
                  aria-describedby={`${formId}-types-error`}
                  className="grid grid-cols-2 gap-x-3 gap-y-2"
                >
                  {CONTACT_TYPES.map((type) => {
                    const Icon = CONTACT_TYPE_ICONS[type]
                    return (
                      <label
                        key={type}
                        className="-mx-2 flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <Checkbox
                          checked={types.includes(type)}
                          onCheckedChange={(checked) => {
                            toggleType(type, checked === true)
                          }}
                          aria-invalid={!!state.errors.types?.length}
                        />
                        {Icon ? <Icon aria-hidden /> : null}
                        {CONTACT_TYPE_LABELS[type]}
                      </label>
                    )
                  })}
                </div>
                {types.map((type) => (
                  <input key={type} type="hidden" name="types" value={type} />
                ))}
                <div id={`${formId}-types-error`} aria-live="polite">
                  {state.errors.types?.[0] ? (
                    <p className="text-sm text-destructive">{state.errors.types[0]}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-notes-title`}>{PERSON_SECTION_TITLES.notes}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {readOnly ? (
                <>
                  <p
                    aria-labelledby={`${formId}-notes-title`}
                    className="flex h-9 items-center truncate rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
                  >
                    {source?.notes ?? ""}
                  </p>
                  <input type="hidden" name="notes" value={source?.notes ?? ""} />
                </>
              ) : (
                <>
                  <Input
                    id={`${formId}-notes`}
                    name="notes"
                    aria-labelledby={`${formId}-notes-title`}
                    maxLength={200}
                    defaultValue={source?.notes ?? ""}
                    placeholder="Ancien collègue | Scala"
                    aria-invalid={!!state.errors.notes?.length}
                    aria-describedby={`${formId}-notes-error ${formId}-notes-help`}
                  />
                  <div id={`${formId}-notes-error`} aria-live="polite">
                    {state.errors.notes?.[0] ? (
                      <p className="text-sm text-destructive">{state.errors.notes[0]}</p>
                    ) : null}
                  </div>
                  <p id={`${formId}-notes-help`} className="text-xs text-muted-foreground">
                    Une ligne de marqueurs, séparés par |
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
```

Cards Détails et Notes : le `CardTitle` porte l'`id` et sert de libellé par `aria-labelledby`, pour ne pas répéter son titre (même motif que `LeadForm`, `08`). La card Identité garde `ReadOnlyField` (son propre `FormField` interne) pour Nom, Poste, Entreprise et Localité : son titre de card diffère du libellé de chaque champ, la répétition ne s'y pose pas. Grille Identité : Nom + Poste, Entreprise + Localité, la même que `LeadForm`.

- [ ] **Step 2 : Pages de création et de modification**

`src/app/admin/(protected)/contacts/nouveau/page.tsx` :

```tsx
import { Suspense } from "react"

import { ContactForm } from "@/components/features/admin/contacts/ContactForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findLeadsWithoutContactRole } from "@/server/queries/persons"

const CONTACT_PAGE_SKELETON = ["h-[24px]", "h-[280px]", "h-[200px]", "h-[320px]"]

async function NewContactSection() {
  const [companyOptions, leadOptions] = await Promise.all([
    findCompanyOptions(),
    findLeadsWithoutContactRole(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb items={[{ label: "Contacts", href: "/admin/contacts" }, { label: "Nouveau contact" }]} />
      <ContactForm contact={null} companyOptions={companyOptions} leadOptions={leadOptions} />
    </div>
  )
}

export default async function NewContactPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={CONTACT_PAGE_SKELETON} />}>
        <NewContactSection />
      </Suspense>
    </div>
  )
}
```

`src/app/admin/(protected)/contacts/[id]/page.tsx` :

```tsx
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { ContactForm } from "@/components/features/admin/contacts/ContactForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { personDisplayName } from "@/lib/persons"
import { findCompanyOptions } from "@/server/queries/companies"
import { findContactByIdForAdmin } from "@/server/queries/contacts"

const CONTACT_PAGE_SKELETON = ["h-[24px]", "h-[280px]", "h-[200px]", "h-[320px]"]

async function EditContactSection({ id }: { id: string }) {
  const [contact, companyOptions] = await Promise.all([findContactByIdForAdmin(id), findCompanyOptions()])
  if (!contact) notFound()
  // Une fiche en opposition ne se modifie plus : sa trace se lit dans la liste.
  if (contact.optedOutAt) redirect("/admin/contacts")

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Contacts", href: "/admin/contacts" }, { label: personDisplayName(contact) }]}
      />
      <ContactForm contact={contact} companyOptions={companyOptions} leadOptions={[]} />
    </div>
  )
}

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={CONTACT_PAGE_SKELETON} />}>
        <EditContactSection id={id} />
      </Suspense>
    </div>
  )
}
```

(`leadOptions={[]}` en modification : le choix « Depuis un lead » ne s'affiche qu'à la création, `ContactForm` n'en a pas besoin pour éditer une fiche existante.)

Les dossiers `nouveau/` et `[id]/` reçoivent chacun un `loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 3 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur. Si l'éditeur installé au `03` n'accepte pas `id` ou `aria-*`, reprendre l'extension de ses props décrite au plan `03` (Task 3, Step 1).

---

### Task 5 : Liste, blocs symétriques et suppression

**Files:**
- Modify: `src/lib/person-retention.ts`
- Modify: `src/lib/person-retention.test.ts`
- Create: `src/components/features/admin/contacts/DeleteContactDialog.tsx`
- Create: `src/components/features/admin/contacts/ContactsTable.tsx`
- Modify: `src/components/features/admin/leads/LeadsTable.tsx`

**Interfaces:**
- Consumes: Tasks 1 à 4 ; `deleteContact` (Task 2) ; `retentionEndOf` (`10`, `@/lib/person-retention`) ; `DataTable`, `DetailDialog`, `EnumBadge`, `ExternalUrl`, `TruncateTooltip`, `CompanyLogoTile`, `BadgeList`, `MarkdownContent`, `RowActionButton`, `ConfirmDeleteDialog`, `ErasePersonExchangesDialog` (`08`) ; `LEAD_STATUS_ICONS`, `LEAD_INTEREST_ICONS` (`08`, `@/lib/leads`)
- Produces: `CONTACT_REVIEW_YEARS` (`@/lib/person-retention`) ; `ContactsTable({ contacts, initialDetailId }: { contacts: readonly AdminContact[]; initialDetailId?: string })`

- [ ] **Step 1 : Rappel métier des contacts**

Dans `src/lib/person-retention.ts`, à la suite de `RETENTION_YEARS` :

```ts
// Rappel métier pour reprendre contact avec le réseau, distinct du délai légal des prospects (`RETENTION_YEARS`) : une personne du réseau n'est soumise à aucune obligation de purge.
export const CONTACT_REVIEW_YEARS = 3
```

Dans `src/lib/person-retention.test.ts`, importer `CONTACT_REVIEW_YEARS` à côté de `retentionEndOf` et ajouter :

```ts
it("keeps the legal three years after opting out, whatever the review length", () => {
  const end = retentionEndOf(
    { createdAt: new Date(2020, 0, 1), lastReplyAt: null, optedOutAt: new Date(2023, 8, 15) },
    CONTACT_REVIEW_YEARS,
  )

  expect(end).toEqual(new Date(2026, 8, 15))
})
```

Run: `pnpm vitest run --project unit src/lib/person-retention.test.ts`
Expected: PASS.

- [ ] **Step 2 : Suppression**

`src/components/features/admin/contacts/DeleteContactDialog.tsx` :

```tsx
"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { personDisplayName } from "@/lib/persons"
import { deleteContact } from "@/server/actions/contacts"
import type { AdminContact } from "@/server/queries/contacts"

interface Props {
  contact: AdminContact
}

export function DeleteContactDialog({ contact }: Props) {
  const name = personDisplayName(contact)

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
        contact.optedOutAt
          ? "La trace de son opposition disparaît : plus rien n'empêchera de recontacter cette personne."
          : "La fiche relation est retirée. Si cette personne n'est pas aussi un lead, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur."
      }
      successMessage="Contact supprimé"
      onDelete={async () => {
        const result = await deleteContact(contact.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
```

- [ ] **Step 3 : Table et vue détail**

`src/components/features/admin/contacts/ContactsTable.tsx` :

```tsx
"use client"

import { useMemo, useState } from "react"
import { Pencil, User } from "lucide-react"
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
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteContactDialog } from "@/components/features/admin/contacts/DeleteContactDialog"
import { ErasePersonExchangesDialog } from "@/components/features/admin/persons/ErasePersonExchangesDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import {
  CONTACT_COLUMN_WIDTHS,
  CONTACT_DEFAULT_VISIBLE_COLUMNS,
  type ContactColumnKey,
} from "@/lib/admin-table-widths"
import {
  CONTACT_FIELD_LABELS,
  CONTACT_SECTION_TITLES,
  CONTACT_STATUS_ICONS,
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_ICONS,
  CONTACT_TYPE_LABELS,
} from "@/lib/contacts"
import { JOB_ROLE_LABELS } from "@/lib/job-roles"
import {
  LEAD_INTEREST_ICONS,
  LEAD_INTEREST_LABELS,
  LEAD_STATUS_ICONS,
  LEAD_STATUS_LABELS,
} from "@/lib/leads"
import { CONTACT_REVIEW_YEARS, retentionEndOf } from "@/lib/person-retention"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/persons"
import { formatShortDate } from "@/lib/projects"
import { CONTACT_STATUSES, CONTACT_TYPES } from "@/lib/schemas/contact"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminContact } from "@/server/queries/contacts"

const OPTED_OUT_LABEL = "Ne plus contacter"

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
}

function typeLabels(contact: AdminContact): string[] {
  return contact.types.map((type) => CONTACT_TYPE_LABELS[type])
}

// Glyphe par libellé plutôt que par valeur : BadgeList (04) ne connaît que les libellés déjà résolus.
const TYPE_ICONS_BY_LABEL = Object.fromEntries(
  CONTACT_TYPES.map((type) => [CONTACT_TYPE_LABELS[type], CONTACT_TYPE_ICONS[type]]),
)

function statusBadge(contact: AdminContact) {
  return contact.optedOutAt ? (
    <Badge variant="outline">{OPTED_OUT_LABEL}</Badge>
  ) : (
    <EnumBadge label={CONTACT_STATUS_LABELS[contact.status]} icon={CONTACT_STATUS_ICONS[contact.status]} />
  )
}

function companyCell(contact: AdminContact) {
  if (!contact.company) return null
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompanyLogoTile logoFilename={contact.company.logoFilename} size="sm" />
      <TruncateTooltip className="min-w-0">{contact.company.name}</TruncateTooltip>
    </span>
  )
}

// `retentionEndOf` prend la même forme pour un lead et un contact : `lastReplyAt` reçoit ici la dernière interaction dérivée, faute d'un concept de « réponse » propre au réseau durable ; `createdAt` est celui du rôle Contact, pas de la personne.
function retentionInput(contact: AdminContact) {
  return { createdAt: contact.createdAt, lastReplyAt: contact.lastInteractionAt, optedOutAt: contact.optedOutAt }
}

function hideable(
  key: Exclude<ContactColumnKey, "name" | "actions">,
): Pick<Column<AdminContact>, "hideable" | "defaultVisible"> {
  return { hideable: true, defaultVisible: CONTACT_DEFAULT_VISIBLE_COLUMNS.includes(key) }
}

const DATA_COLUMNS: readonly Column<AdminContact>[] = [
  {
    key: "name",
    header: PERSON_FIELD_LABELS.name,
    width: CONTACT_COLUMN_WIDTHS.name,
    sortValue: (contact) => personDisplayName(contact),
    searchValue: (contact) =>
      [personDisplayName(contact), contact.company?.name ?? "", contact.email ?? ""].join(" "),
    cell: (contact) => (
      <TruncateTooltip className="block w-full font-medium">{personDisplayName(contact)}</TruncateTooltip>
    ),
  },
  {
    key: "types",
    header: CONTACT_FIELD_LABELS.types,
    width: CONTACT_COLUMN_WIDTHS.types,
    ...hideable("types"),
    cell: (contact) => <BadgeList labels={typeLabels(contact)} noun="types" icons={TYPE_ICONS_BY_LABEL} />,
  },
  {
    key: "company",
    header: PERSON_FIELD_LABELS.companyId,
    width: CONTACT_COLUMN_WIDTHS.company,
    ...hideable("company"),
    sortValue: (contact) => contact.company?.name ?? "",
    cell: companyCell,
  },
  {
    key: "status",
    header: CONTACT_FIELD_LABELS.status,
    width: CONTACT_COLUMN_WIDTHS.status,
    ...hideable("status"),
    cell: statusBadge,
  },
  {
    key: "lastInteractionAt",
    header: CONTACT_FIELD_LABELS.lastInteractionAt,
    width: CONTACT_COLUMN_WIDTHS.lastInteractionAt,
    className: "tabular-nums text-muted-foreground",
    ...hideable("lastInteractionAt"),
    sortValue: (contact) => contact.lastInteractionAt?.getTime() ?? 0,
    cell: (contact) => formatShortDate(contact.lastInteractionAt),
  },
  {
    key: "zone",
    header: PERSON_FIELD_LABELS.zone,
    width: CONTACT_COLUMN_WIDTHS.zone,
    ...hideable("zone"),
    cell: (contact) => (contact.zone ? <Badge variant="secondary">{ZONE_LABELS[contact.zone]}</Badge> : null),
  },
  {
    key: "email",
    header: PERSON_FIELD_LABELS.email,
    width: CONTACT_COLUMN_WIDTHS.email,
    ...hideable("email"),
    cell: (contact) => <TruncatedCell value={contact.email} />,
  },
  {
    key: "phone",
    header: PERSON_FIELD_LABELS.phone,
    width: CONTACT_COLUMN_WIDTHS.phone,
    className: "tabular-nums",
    ...hideable("phone"),
    cell: (contact) => <TruncatedCell value={contact.phone} />,
  },
  {
    key: "linkedinUrl",
    header: PERSON_FIELD_LABELS.linkedinUrl,
    width: CONTACT_COLUMN_WIDTHS.linkedinUrl,
    ...hideable("linkedinUrl"),
    cell: (contact) =>
      contact.linkedinUrl ? (
        <TruncateTooltip className="block w-full">
          <ExternalUrl url={contact.linkedinUrl} />
        </TruncateTooltip>
      ) : null,
  },
  {
    key: "reviewAt",
    header: CONTACT_FIELD_LABELS.reviewAt,
    width: CONTACT_COLUMN_WIDTHS.reviewAt,
    className: "tabular-nums text-muted-foreground",
    ...hideable("reviewAt"),
    sortValue: (contact) => retentionEndOf(retentionInput(contact), CONTACT_REVIEW_YEARS).getTime(),
    cell: (contact) => formatShortDate(retentionEndOf(retentionInput(contact), CONTACT_REVIEW_YEARS)),
  },
  {
    key: "notes",
    header: PERSON_FIELD_LABELS.notes,
    width: CONTACT_COLUMN_WIDTHS.notes,
    className: "text-muted-foreground",
    ...hideable("notes"),
    cell: (contact) => <TruncatedCell value={contact.notes} />,
  },
]

// Arbitrage « bloc sans donnée » : un bloc dont aucun champ n'est renseigné disparaît.
function keepFilled(section: DetailSection): DetailSection[] {
  return section.rows.some((row) => row.value !== null && row.value !== undefined) ? [section] : []
}

function buildContactDetail(contact: AdminContact, onEdit: (() => void) | undefined): DetailContent {
  if (contact.optedOutAt) {
    return {
      title: personDisplayName(contact),
      status: (
        <Badge variant="outline" meta>
          {OPTED_OUT_LABEL}
        </Badge>
      ),
      sections: [
        {
          title: PERSON_SECTION_TITLES.optOut,
          rows: [
            { label: PERSON_FIELD_LABELS.email, value: contact.email },
            {
              label: PERSON_FIELD_LABELS.linkedinUrl,
              value: contact.linkedinUrl ? (
                <ExternalUrl url={contact.linkedinUrl} className="wrap-anywhere" />
              ) : null,
            },
            { label: PERSON_FIELD_LABELS.optedOutAt, value: formatShortDate(contact.optedOutAt) },
            {
              label: PERSON_FIELD_LABELS.exchangesErasedAt,
              value: contact.exchangesErasedAt ? formatShortDate(contact.exchangesErasedAt) : null,
            },
          ],
        },
      ],
    }
  }

  return {
    title: personDisplayName(contact),
    ...(contact.jobRole ? { subtitle: JOB_ROLE_LABELS[contact.jobRole] } : {}),
    status: (
      <Badge variant="outline" meta>
        {CONTACT_STATUS_LABELS[contact.status]}
      </Badge>
    ),
    // Ordre du formulaire (Task 4) : Identité, Coordonnées, Détails, Relation, Notes, puis Pipeline (symétrique du Réseau du lead).
    sections: [
      ...keepFilled({
        title: PERSON_SECTION_TITLES.person,
        rows: [
          {
            label: PERSON_FIELD_LABELS.companyId,
            value: contact.company ? (
              <Link href={`/admin/entreprises?detail=${contact.company.id}`} className="underline-offset-4 hover:underline">
                {contact.company.name}
              </Link>
            ) : null,
          },
          { label: PERSON_FIELD_LABELS.zone, value: contact.zone ? <Badge variant="secondary">{ZONE_LABELS[contact.zone]}</Badge> : null },
        ],
      }),
      ...keepFilled({
        title: PERSON_SECTION_TITLES.contact,
        rows: [
          { label: PERSON_FIELD_LABELS.email, value: contact.email },
          { label: PERSON_FIELD_LABELS.phone, value: contact.phone },
          {
            label: PERSON_FIELD_LABELS.linkedinUrl,
            value: contact.linkedinUrl ? (
              <ExternalUrl url={contact.linkedinUrl} className="wrap-anywhere" />
            ) : null,
            fullWidth: true,
          },
        ],
      }),
      ...(contact.details
        ? [
            {
              title: PERSON_SECTION_TITLES.details,
              rows: [
                {
                  value: <MarkdownContent markdown={contact.details} variant="admin" />,
                  fullWidth: true,
                },
              ],
            },
          ]
        : []),
      {
        title: CONTACT_SECTION_TITLES.relation,
        rows: [
          {
            label: CONTACT_FIELD_LABELS.types,
            value:
              contact.types.length > 0 ? (
                <BadgeList labels={typeLabels(contact)} noun="types" max={Infinity} icons={TYPE_ICONS_BY_LABEL} />
              ) : null,
            fullWidth: true,
          },
          { label: CONTACT_FIELD_LABELS.lastInteractionAt, value: formatShortDate(contact.lastInteractionAt) },
          {
            label: CONTACT_FIELD_LABELS.reviewAt,
            value: formatShortDate(retentionEndOf(retentionInput(contact), CONTACT_REVIEW_YEARS)),
          },
        ],
      },
      ...(contact.notes
        ? [{ title: PERSON_SECTION_TITLES.notes, rows: [{ value: contact.notes, fullWidth: true }] }]
        : []),
      // Symétrique du bloc Réseau du lead, complété ici : le rôle Lead de la même personne, lu en un clic.
      ...(contact.hasLeadRole && contact.leadRole
        ? [
            {
              title: CONTACT_SECTION_TITLES.pipeline,
              rows: [
                {
                  fullWidth: true,
                  value: (
                    <Link
                      href={`/admin/leads/tous?detail=${contact.id}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <EnumBadge
                        label={LEAD_STATUS_LABELS[contact.leadRole.status]}
                        icon={LEAD_STATUS_ICONS[contact.leadRole.status]}
                      />
                      {contact.leadRole.interest ? (
                        <EnumBadge
                          label={LEAD_INTEREST_LABELS[contact.leadRole.interest]}
                          icon={LEAD_INTEREST_ICONS[contact.leadRole.interest]}
                        />
                      ) : null}
                    </Link>
                  ),
                },
              ],
            },
          ]
        : []),
    ],
    ...(onEdit ? { onEdit } : {}),
  }
}

const baseFacets: readonly Facet<AdminContact>[] = [
  {
    key: "types",
    label: CONTACT_FIELD_LABELS.types,
    options: CONTACT_TYPES.map((type) => ({ value: type, label: CONTACT_TYPE_LABELS[type] })),
    value: (contact) => contact.types,
  },
  {
    key: "status",
    label: CONTACT_FIELD_LABELS.status,
    options: CONTACT_STATUSES.map((status) => ({ value: status, label: CONTACT_STATUS_LABELS[status] })),
    value: (contact) => contact.status,
  },
  {
    key: "zone",
    label: PERSON_FIELD_LABELS.zone,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (contact) => (contact.zone ? [contact.zone] : []),
  },
]

interface Props {
  contacts: readonly AdminContact[]
  initialDetailId?: string
}

export function ContactsTable({ contacts, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedContact, setSelectedContact] = useState<AdminContact | null>(null)
  // Instant figé au montage : le filtre d'échéance reste stable pendant la consultation.
  const [now] = useState(() => Date.now())

  const columns = useMemo<readonly Column<AdminContact>[]>(
    () => [
      ...DATA_COLUMNS,
      {
        key: "actions",
        header: "Actions",
        width: CONTACT_COLUMN_WIDTHS.actions,
        align: "right",
        cell: (contact) => (
          <span className="inline-flex gap-0">
            {contact.optedOutAt ? null : (
              <RowActionButton aria-label={`Modifier ${personDisplayName(contact)}`} asChild>
                <Link href={`/admin/contacts/${contact.id}`}>
                  <Pencil className="size-4" />
                </Link>
              </RowActionButton>
            )}
            {contact.optedOutAt && !contact.exchangesErasedAt ? (
              <ErasePersonExchangesDialog person={contact} />
            ) : null}
            <DeleteContactDialog contact={contact} />
          </span>
        ),
      },
    ],
    [],
  )

  const facets = useMemo<readonly Facet<AdminContact>[]>(
    () => [
      ...baseFacets,
      {
        key: "review",
        label: "Échéance",
        options: [{ value: "overdue", label: "Dépassée" }],
        value: (contact) =>
          retentionEndOf(retentionInput(contact), CONTACT_REVIEW_YEARS) < new Date(now) ? ["overdue"] : [],
      },
    ],
    [now],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedContact
        ? buildContactDetail(
            selectedContact,
            selectedContact.optedOutAt
              ? undefined
              : () => {
                  router.push(`/admin/contacts/${selectedContact.id}`)
                },
          )
        : null,
    [selectedContact, router],
  )

  return (
    <>
      <DataTable
        rows={contacts}
        columns={columns}
        getRowId={(contact) => contact.id}
        initialDetailId={initialDetailId}
        searchPlaceholder="Rechercher un nom ou une entreprise"
        noun="contact"
        onRowClick={setSelectedContact}
        rowLabel={personDisplayName}
        facets={facets}
        empty={{
          icon: User,
          title: "Aucun contact",
          description: "Aucun contact pour le moment. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null)
        }}
      />
    </>
  )
}
```

- [ ] **Step 4 : Bloc Réseau du lead**

Dans `src/components/features/admin/leads/LeadsTable.tsx`, ajouter `CONTACT_STATUS_ICONS`, `CONTACT_STATUS_LABELS`, `CONTACT_TYPE_ICONS`, `CONTACT_TYPE_LABELS` à un import depuis `@/lib/contacts`, `import { BadgeList } from "@/components/features/admin/BadgeList"` et `import { EnumBadge } from "@/components/features/admin/EnumBadge"` (déjà importé par `08`, inutile de le redemander), puis, dans `buildLeadDetail`, remplacer le bloc Réseau posé par le `08` (`...keepFilled({ title: LEAD_SECTION_TITLES.network, … })`, en dernière position du tableau `sections`, juste avant `...historySection(history, ranks),` du `10`) par :

```tsx
      // Symétrique du bloc Pipeline du contact : le rôle Contact de la même personne, lu en un clic.
      ...(lead.hasContactRole && lead.contactRole
        ? [
            {
              title: LEAD_SECTION_TITLES.network,
              rows: [
                {
                  fullWidth: true,
                  value: (
                    <Link
                      href={`/admin/contacts?detail=${lead.id}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <BadgeList
                        labels={lead.contactRole.types.map((type) => CONTACT_TYPE_LABELS[type])}
                        noun="types"
                        max={Infinity}
                        empty="Sans type"
                        icons={Object.fromEntries(
                          lead.contactRole.types.map((type) => [
                            CONTACT_TYPE_LABELS[type],
                            CONTACT_TYPE_ICONS[type],
                          ]),
                        )}
                      />
                      <EnumBadge
                        label={CONTACT_STATUS_LABELS[lead.contactRole.status]}
                        icon={CONTACT_STATUS_ICONS[lead.contactRole.status]}
                      />
                    </Link>
                  ),
                },
              ],
            },
          ]
        : []),
```

Sa position ne change pas : Réseau reste juste avant Historique (`10`), lui-même suivi d'Opportunités apportées (`15`), Entretiens (`17`) et Signaux (`19`). `LEAD_SECTION_TITLES` est déjà importé dans ce fichier (`08`) et porte `network` depuis la Task 3 : rien de plus à y changer.

- [ ] **Step 5 : Vérifier**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes, dont celles des leads et des personnes, mises à jour à la Task 2.

---

### Task 6 : Page, menu et qualité

**Files:**
- Create: `src/app/admin/(protected)/contacts/page.tsx`
- Create: `src/app/admin/(protected)/contacts/loading.tsx`
- Modify: `src/config/admin-nav-items.ts`

**Interfaces:**
- Consumes: `ContactsTable` (Task 5) ; route `/admin/contacts/nouveau` (Task 4) ; `findAllContactsForAdmin` (Task 3) ; `contactSkeletonWidths` (Task 3)
- Produces: rien de nouveau

- [ ] **Step 1 : Page**

`src/app/admin/(protected)/contacts/page.tsx` :

```tsx
import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { ContactsTable } from "@/components/features/admin/contacts/ContactsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { contactSkeletonWidths } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllContactsForAdmin } from "@/server/queries/contacts"

async function ContactsSection({ initialDetailId }: { initialDetailId?: string }) {
  const contacts = await findAllContactsForAdmin()
  return <ContactsTable contacts={contacts} initialDetailId={initialDetailId} />
}

interface Props {
  searchParams: Promise<{ detail?: string }>
}

export default async function AdminContactsPage({ searchParams }: Props) {
  await getCurrentUser()
  const { detail } = await searchParams

  return (
    <AdminPageShell
      title="Contacts & relations"
      subtitle="Réseau professionnel durable, indépendant du pipeline commercial. Une fiche peut aussi porter le rôle Lead."
      actions={
        <Button asChild>
          <Link href="/admin/contacts/nouveau">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau contact
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={contactSkeletonWidths()} />}>
        <ContactsSection initialDetailId={detail} />
      </Suspense>
    </AdminPageShell>
  )
}
```

`src/app/admin/(protected)/contacts/loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 2 : Menu**

Dans `src/config/admin-nav-items.ts`, remplacer :

```ts
      { label: "Contacts", icon: User },
```

par :

```ts
      { label: "Contacts", icon: User, href: "/admin/contacts" },
```

- [ ] **Step 3 : Qualité**

Run: `just typecheck`
Expected: aucune erreur (si le typage des `href` échoue, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes, dont celles des leads et des personnes, inchangées hors Task 2.

---

### Task 7 : `personDetailHref` et bascule de la vue détail d'une action

**Files:**
- Create: `src/lib/person-links.ts`
- Test: `src/lib/person-links.test.ts`
- Modify: `src/server/queries/prospecting-actions.ts`
- Modify: `src/components/features/admin/prospection/action-detail.tsx`

**Interfaces:**
- Consumes: rien
- Produces: `personDetailHref(person: { lead: { id: string } | null; contact: { id: string } | null }): string | null` (`@/lib/person-links`)

Arbitrage « Fiches rattachées » (2026-10-02) : une personne dont le rôle n'est pas fixé par le contexte (l'apporteur d'une opportunité, un correspondant d'entretien, la personne d'une action) mène à sa fiche lead si elle porte ce rôle, sinon à sa fiche contact, sinon n'est pas un lien. `13` est le premier plan où les deux rôles existent : la fonction vit ici ; les plans suivants (`15` pour l'apporteur, `17` pour les correspondants) l'importent plutôt que de recoder la règle.

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/person-links.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { personDetailHref } from "./person-links"

describe("personDetailHref", () => {
  it("resolves to the lead detail route when the person has the lead role", () => {
    const href = personDetailHref({ lead: { id: "p1" }, contact: null })

    expect(href).toBe("/admin/leads/tous?detail=p1")
  })

  it("resolves to the contact detail route when the person has only the contact role", () => {
    const href = personDetailHref({ lead: null, contact: { id: "p2" } })

    expect(href).toBe("/admin/contacts?detail=p2")
  })

  it("prefers the lead route when the person has both roles", () => {
    const href = personDetailHref({ lead: { id: "p3" }, contact: { id: "p3" } })

    expect(href).toBe("/admin/leads/tous?detail=p3")
  })

  it("returns null when the person has neither role", () => {
    const href = personDetailHref({ lead: null, contact: null })

    expect(href).toBeNull()
  })
})
```

Run: `pnpm vitest run --project unit src/lib/person-links.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 2 : Écrire la fonction**

`src/lib/person-links.ts` :

```ts
export interface PersonWithRoles {
  lead: { id: string } | null
  contact: { id: string } | null
}

// Lead prioritaire sur Contact quand une personne porte les deux : son pipeline commercial reste la vue la plus utile depuis un lien d'une autre fiche.
export function personDetailHref(person: PersonWithRoles): string | null {
  if (person.lead) return `/admin/leads/tous?detail=${person.lead.id}`
  if (person.contact) return `/admin/contacts?detail=${person.contact.id}`
  return null
}
```

Run: `pnpm vitest run --project unit src/lib/person-links.test.ts`
Expected: PASS.

- [ ] **Step 3 : La personne d'une action porte ses deux rôles possibles**

Dans `src/server/queries/prospecting-actions.ts` (`adminProspectingActionInclude` du `09`), étendre le `select` de `person` :

```ts
const adminProspectingActionInclude = {
  person: {
    select: {
      id: true,
      name: true,
      email: true,
      linkedinUrl: true,
      optedOutAt: true,
      company: { select: { id: true, name: true, logoFilename: true } },
      lead: { select: { id: true } },
      contact: { select: { id: true } },
    },
  },
} as const
```

- [ ] **Step 4 : Bascule de la vue détail d'une action**

Dans `src/components/features/admin/prospection/action-detail.tsx` (`11`, extrait du `10`), importer `personDetailHref` depuis `@/lib/person-links` et remplacer le lien de la personne, TODO compris :

```tsx
        {
          label: LABELS.personId,
          value: (() => {
            const href = personDetailHref(action.person)
            const name = personDisplayName(action.person)
            return href ? (
              <Link href={href} className="font-medium underline-offset-4 hover:underline">
                {name}
              </Link>
            ) : (
              <span className="font-medium">{name}</span>
            )
          })(),
        },
```

(la personne d'une action créée avant `07` porte toujours au moins le rôle Lead : `href` n'est concrètement `null` que pour une personne qui aurait perdu son seul rôle, cas limite déjà couvert par la condition.)

Run: `just typecheck`
Expected: aucune erreur.

---

### Task 8 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 7
- Produces: rien

- [ ] **Step 1 : Menu et création**

Run: `just dev`, se connecter, ouvrir Contacts.
Expected: « Contacts & relations » et son sous-titre ; « Nouveau contact » mène à `/admin/contacts/nouveau`, fil d'Ariane « Contacts › Nouveau contact », card Identité avec « Nouveau contact » coché par défaut, cards Identité, Coordonnées, Détails, Relation, Notes, Détails déjà rempli de Profil, Relation, Historique, Liens, Notes libres. Créer un contact Collègue et Mentor chez une entreprise, localité Luxembourg : retour sur la liste, où il apparaît ; sa vue détail montre, dans l'ordre, Identité, Coordonnées, Détails, Relation (Types en pleine largeur) et Notes mis en forme, « Modifier » mène à sa page.

Copier l'identifiant de ce contact et ouvrir `/admin/contacts?detail=<id>` dans un nouvel onglet.
Expected: sa vue détail s'ouvre directement au chargement, sans clic supplémentaire.

- [ ] **Step 2 : Depuis un lead et blocs symétriques**

Créer un lead sans rôle Contact. Ouvrir « Nouveau contact », choisir « Depuis un lead », le sélectionner dans le picker, cocher Mentor, enregistrer.
Expected: les cards Identité, Coordonnées et Détails affichent les valeurs du lead en lecture, non modifiables ; après enregistrement, la personne porte les deux rôles ; sa page lead montre un bloc Réseau (Mentor, Actif) menant à sa page contact ; sa page contact montre un bloc Pipeline (statut, intérêt du lead) menant à sa page lead ; ce lead n'est plus proposé dans le picker d'un nouveau contact.

- [ ] **Step 3 : Doublons**

Créer un contact « Nouveau contact » avec l'email d'un contact existant ; puis avec le lien LinkedIn d'un contact existant copié en `fr.linkedin.com/in/…/`.
Expected: « Ce contact existe déjà : <nom> » sous Email, puis sous LinkedIn, la page gardant la saisie.

- [ ] **Step 4 : Échéance**

Avec `just db-studio`, poser une action de prospection (statut différent de À faire, `occurredAt` ou `respondedAt`) d'un contact à plus de 3 ans, sans action plus récente ; afficher la colonne « À conserver jusqu'au » et filtrer sur « Échéance : Dépassée ».
Expected: ce contact seul ressort, avec une date passée.

- [ ] **Step 5 : Opposition partagée**

Passer un contact en « Ne plus contacter » depuis sa page.
Expected: il ne garde qu'email, LinkedIn et date, retour sur la liste, badge « Ne plus contacter », sans Modifier ; rouvrir `/admin/contacts/<id>` de ce contact renvoie à la liste ; « Effacer les échanges » apparaît sur sa ligne tant que non posé ; Supprimer prévient que la trace de l'opposition disparaîtra.

- [ ] **Step 6 : Suppressions symétriques**

Supprimer le contact de la personne aux deux rôles (Step 2).
Expected: le rôle Contact disparaît, la personne reste, son bloc Réseau disparaît de sa page lead. Puis supprimer ce lead : la personne, ayant perdu son seul rôle restant, disparaît à son tour.

- [ ] **Step 7 : `personDetailHref` depuis une action**

Créer une action de prospection pour la personne aux deux rôles (avant sa suppression de l'étape précédente, ou sur une autre personne aux deux rôles), ouvrir sa vue détail (Actions prospection ou Pipeline).
Expected: le lien de la personne mène à sa fiche lead (`/admin/leads/tous?detail=<id>`), le rôle Lead restant prioritaire sur le rôle Contact. Puis `just stop`.
