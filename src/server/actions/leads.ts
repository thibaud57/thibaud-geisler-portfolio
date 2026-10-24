"use server"

import "server-only"

import type { FieldErrors } from "@/lib/form-state"
import { getCurrentUser } from "@/lib/get-current-user"
import { personIdSchema } from "@/lib/ids"
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
} from "./_support/person-guards"
import { PersonLockedError } from "./persons.types"
import {
  deleteEntity,
  formStateHandlers,
  MISSING_COMPANY,
  missingRelationState,
  rowExists,
  saveEntity,
  type ActionEvents,
} from "./_support/shared"
import type { LeadFormMessage, LeadDeleteState, LeadFormState } from "./leads.types"

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
    const field: IdentityField = constraint?.includes("email") ? "email" : "linkedinUrl"
    const errors: FieldErrors<keyof LeadInput> = { [field]: ["Cette personne existe déjà"] }
    return { ok: false, errors, message: "lead_exists", values }
  }
  if (isPrismaError(err, "P2003")) {
    return missingRelationState("companyId", MISSING_COMPANY, values)
  }
  return null
}

const leadExists = (personId: string) => rowExists(prisma.lead, { personId })

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
    mapError: (err) => mapLeadError(err, values),
    ...formStateHandlers(values, {
      message: "lead_not_found",
      updatedId: updatedPersonId,
      exists: leadExists,
    }),
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
  rawPersonId: string,
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  await getCurrentUser()

  const parsedId = personIdSchema.safeParse(rawPersonId)
  if (!parsedId.success) {
    return { ok: false, errors: {}, message: "lead_not_found", values: collectValues(formData) }
  }
  const personId = parsedId.data

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

export async function deleteLead(rawPersonId: string): Promise<LeadDeleteState> {
  await getCurrentUser()

  const parsedId = personIdSchema.safeParse(rawPersonId)
  // Un id invalide ne désigne aucune fiche : même réponse idempotente qu'une fiche déjà supprimée.
  if (!parsedId.success) return { ok: true, errors: {}, message: null }
  const personId = parsedId.data

  return deleteEntity<LeadDeleteState>({
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
