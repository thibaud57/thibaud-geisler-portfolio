"use server"

import "server-only"

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { leadSchema, type LeadInput } from "@/lib/schemas/lead"
import { isPrismaError, stringField, violatedConstraint } from "@/lib/server-utils"

import {
  assertNewIdentity,
  assertNotOptedOut,
  assertOptOutOver,
  collectPersonValues,
  conflictErrors,
  deletePersonIfRoleless,
  PersonConflictError,
  revalidatePersonLists,
  type DuplicateWording,
  type IdentityField,
} from "./person-guards"
import { PersonLockedError } from "./persons.types"
import { deleteEntity, saveEntity, type ActionEvents } from "./shared"
import type { LeadFormMessage, LeadFormState } from "./leads.types"

const CONFLICT_MESSAGES = {
  exists: "lead_exists",
  opted_out: "lead_opted_out",
  not_found: "lead_not_found",
} as const satisfies Record<PersonConflictError["reason"], LeadFormMessage>

const LEAD_WORDING: DuplicateWording = {
  role: "lead",
  own: "Ce lead existe déjà",
  other: "Cette personne est déjà un contact",
}

function collectValues(formData: FormData): LeadFormState["values"] {
  return {
    ...collectPersonValues(formData),
    origin: stringField(formData, "origin"),
    status: stringField(formData, "status"),
    interest: stringField(formData, "interest"),
    channel: stringField(formData, "channel"),
    score: stringField(formData, "score"),
  }
}

function mapLeadError(err: unknown, values: LeadFormState["values"]): LeadFormState | null {
  if (err instanceof PersonConflictError) {
    return {
      ok: false,
      errors: conflictErrors(err),
      message: CONFLICT_MESSAGES[err.reason],
      values,
    }
  }
  if (err instanceof PersonLockedError) {
    return { ok: false, errors: {}, message: "lead_opted_out_locked", values }
  }
  if (isPrismaError(err, "P2002")) {
    const constraint = violatedConstraint(err)
    const field: IdentityField = constraint.includes("email") ? "email" : "linkedinUrl"
    const errors: LeadFormState["errors"] = {}
    errors[field] = ["Cette personne existe déjà"]
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

const leadExists = (personId: string) =>
  prisma.lead.count({ where: { personId } }).then((count) => count > 0)

function saveLead(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: LeadInput) => Promise<{ personId: string }>,
  updatedPersonId?: string,
): Promise<LeadFormState> {
  const values = collectValues(formData)

  return saveEntity<LeadInput, LeadFormState, { personId: string }>({
    actionName,
    events,
    schema: leadSchema,
    input: values,
    persist,
    successLogFields: (_data, lead) => ({ personId: lead.personId }),
    invalidateCaches: revalidatePersonLists,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    notFound:
      updatedPersonId === undefined
        ? undefined
        : {
            exists: () => leadExists(updatedPersonId),
            state: () => ({ ok: false, errors: {}, message: "lead_not_found", values }),
          },
    mapError: (err) => mapLeadError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
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
      const { person, lead } = splitLeadInput(data)
      return prisma.$transaction(async (tx) => {
        await assertNewIdentity(tx, data, null, LEAD_WORDING)
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
      const { person, lead } = splitLeadInput(data)
      return prisma.$transaction(async (tx) => {
        // Après le verrou d'opposition : une personne opposée entre le chargement et l'envoi doit recevoir le message de verrou, pas un doublon.
        await assertNotOptedOut(tx, personId)
        await assertNewIdentity(tx, data, personId, LEAD_WORDING)
        await tx.person.update({ where: { id: personId }, data: person })
        return tx.lead.update({ where: { personId }, data: lead })
      })
    },
    personId,
  )
}

export async function deleteLead(personId: string): Promise<LeadFormState> {
  await getCurrentUser()

  return deleteEntity<LeadFormState>({
    actionName: "deleteLead",
    events: { success: "lead:deleted", failure: "lead:delete_failed" },
    successLogFields: { personId },
    exists: () => leadExists(personId),
    destroy: () =>
      prisma.$transaction(async (tx) => {
        await assertOptOutOver(tx, personId)
        await tx.lead.delete({ where: { personId } })
        await tx.signal.deleteMany({ where: { personId } })
        await deletePersonIfRoleless(tx, personId)
      }),
    invalidateCaches: revalidatePersonLists,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => {
      if (err instanceof PersonLockedError) {
        return { ok: false, errors: {}, message: "lead_opted_out_locked" }
      }
      return null
    },
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
