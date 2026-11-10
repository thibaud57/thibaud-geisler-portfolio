"use server"

import "server-only"

import { getCurrentUser } from "@/lib/get-current-user"
import { personIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { leadSchema, type LeadInput } from "@/lib/schemas/lead"
import { rowExists, stringField } from "@/lib/server-utils"
import { createLead as createLeadRecord, updateLead as updateLeadRecord } from "@/server/crm/leads"
import {
  assertOptOutOver,
  deletePersonIfRoleless,
  PersonLockedError,
  revalidatePersonLists,
} from "@/server/crm/person-guards"
import type { PersonFieldsError } from "@/server/crm/person-write"
import type { DomainResult } from "@/server/crm/result"

import {
  collectPersonValues,
  LEAD_WORDING,
  mapPersonFieldsError,
  type PersonFailureMessages,
} from "./_support/person-form"
import { deleteEntity, formStateHandlers, saveEntity, type ActionEvents } from "./_support/shared"
import type { LeadFormMessage, LeadDeleteState, LeadFormState } from "./leads.types"

const MESSAGES = {
  conflict: {
    exists: "lead_exists",
    opted_out: "lead_opted_out",
    person_missing: "lead_not_found",
    not_a_lead: "lead_not_found",
    no_lead_role: "lead_not_found",
  },
  locked: "lead_opted_out_locked",
  notFound: "lead_not_found",
} as const satisfies PersonFailureMessages<LeadFormMessage>

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

const leadExists = (personId: string) => rowExists(prisma.lead, { personId })

function saveLead(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: LeadInput) => Promise<DomainResult<{ personId: string }, PersonFieldsError>>,
): Promise<LeadFormState> {
  const values = collectValues(formData)

  return saveEntity<LeadInput, LeadFormState, { personId: string }, PersonFieldsError>({
    actionName,
    events,
    schema: leadSchema,
    input: values,
    persist,
    successLogFields: (_data, lead) => ({ personId: lead.personId }),
    invalidateCaches: revalidatePersonLists,
    onDomainError: (error) =>
      mapPersonFieldsError<LeadInput, LeadFormMessage>(error, values, MESSAGES, LEAD_WORDING),
    ...formStateHandlers(values),
  })
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
    createLeadRecord,
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
    (data) => updateLeadRecord(personId, data),
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
