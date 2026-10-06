"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { ADMIN_LEADS_PATH } from "@/lib/admin-routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { leadSchema, type LeadInput } from "@/lib/schemas/lead"
import { isPrismaError, stringField, violatedConstraint } from "@/lib/server-utils"

import { PersonLockedError } from "./persons.types"
import { deleteEntity, saveEntity, type ActionEvents } from "./shared"
import type { LeadFormMessage, LeadFormState } from "./leads.types"

const OPT_OUT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
})

type IdentityField = "email" | "linkedinUrl"

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
    // L'opposition prime : elle doit être signalée même si une autre personne partage l'autre identifiant.
    orderBy: { optedOutAt: { sort: "desc", nulls: "last" } },
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
    const field: IdentityField = constraint.includes("email") ? "email" : "linkedinUrl"
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

function saveLead(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: LeadInput) => Promise<{ personId: string }>,
): Promise<LeadFormState> {
  const values = collectValues(formData)

  return saveEntity<LeadInput, LeadFormState, { personId: string }>({
    actionName,
    events,
    schema: leadSchema,
    input: values,
    persist,
    successLogFields: (_data, lead) => ({ personId: lead.personId }),
    // Variante "layout" : couvre aussi les vues de l'écran des leads (chauds, à qualifier…), d'où une modale peut enregistrer.
    invalidateCaches: () => {
      revalidatePath(ADMIN_LEADS_PATH, "layout")
    },
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapLeadError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

// Une personne opposée ne se modifie ni ne se supprime : sa fiche vidée est la seule trace qui empêche de la reprospecter.
async function assertNotOptedOut(tx: Prisma.TransactionClient, personId: string): Promise<void> {
  const person = await tx.person.findUnique({
    where: { id: personId },
    select: { optedOutAt: true },
  })
  if (person?.optedOutAt) throw new PersonLockedError()
}

function splitLeadInput(data: LeadInput) {
  const { origin, status, interest, channel, score, ...person } = data
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
      await assertNewIdentity(data, null)
      const { person, lead } = splitLeadInput(data)
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
      await assertNewIdentity(data, personId)
      const { person, lead } = splitLeadInput(data)
      return prisma.$transaction(async (tx) => {
        await assertNotOptedOut(tx, personId)
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
        await assertNotOptedOut(tx, personId)
        await tx.lead.delete({ where: { personId } })
        // Aucun autre rôle ne retient la personne : à ce stade, celui qu'on retire est le seul possible.
        await tx.person.delete({ where: { id: personId } })
      }),
    invalidateCaches: () => {
      revalidatePath(ADMIN_LEADS_PATH, "layout")
    },
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) =>
      err instanceof PersonLockedError
        ? { ok: false, errors: {}, message: "lead_opted_out_locked" }
        : null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
