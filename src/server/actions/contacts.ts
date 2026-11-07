"use server"

import "server-only"

import { getCurrentUser } from "@/lib/get-current-user"
import { personIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import {
  attachContactSchema,
  newContactSchema,
  type ContactFormFields,
} from "@/lib/schemas/network-contact"
import { createActionLogger, stringField, stringValues } from "@/lib/server-utils"
import {
  attachContact as attachContactRecord,
  createContact as createContactRecord,
  updateContact as updateContactRecord,
} from "@/server/crm/contacts"
import { deletePersonIfRoleless, revalidatePersonLists } from "@/server/crm/person-guards"
import type { PersonFieldsError } from "@/server/crm/person-write"
import { findAttachableLead, type AttachableLead } from "@/server/queries/persons"

import {
  collectPersonValues,
  CONTACT_CREATE_WORDING,
  CONTACT_WORDING,
  mapPersonFieldsError,
  type DuplicateWording,
  type PersonFailureMessages,
} from "./_support/person-form"
import {
  deleteEntity,
  formStateHandlers,
  rowExists,
  saveEntity,
  type ActionEvents,
  type DomainFailure,
} from "./_support/shared"
import type { ContactFormMessage, ContactDeleteState, ContactFormState } from "./contacts.types"

const MESSAGES = {
  conflict: {
    exists: "contact_exists",
    opted_out: "contact_opted_out",
    person_missing: "person_not_found",
    not_a_lead: "person_not_found",
    no_lead_role: "person_not_found",
  },
  locked: "contact_opted_out_locked",
  notFound: "contact_not_found",
} as const satisfies PersonFailureMessages<ContactFormMessage>

function collectValues(formData: FormData): ContactFormState["values"] {
  return {
    personId: stringField(formData, "personId"),
    ...collectPersonValues(formData),
    types: stringValues(formData, "types"),
    status: stringField(formData, "status"),
  }
}

const contactExists = (personId: string) => rowExists(prisma.contact, { personId })

function contactHandlers(values: ContactFormState["values"], wording: DuplicateWording) {
  return {
    successLogFields: (_data: object, contact: { personId: string }) => ({
      personId: contact.personId,
    }),
    invalidateCaches: revalidatePersonLists,
    onDomainError: (error: PersonFieldsError): DomainFailure<ContactFormState> =>
      mapPersonFieldsError<ContactFormFields, ContactFormMessage>(error, values, MESSAGES, wording),
    ...formStateHandlers(values),
  }
}

export async function createContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  const values = collectValues(formData)
  const events: ActionEvents = { success: "contact:created", failure: "contact:create_failed" }

  if (stringField(formData, "personId").trim() !== "") {
    return saveEntity({
      actionName: "createContact",
      events,
      schema: attachContactSchema,
      input: values,
      persist: ({ personId, types, status }) => attachContactRecord(personId, { types, status }),
      ...contactHandlers(values, CONTACT_CREATE_WORDING),
    })
  }

  return saveEntity({
    actionName: "createContact",
    events,
    schema: newContactSchema,
    input: values,
    persist: createContactRecord,
    ...contactHandlers(values, CONTACT_CREATE_WORDING),
  })
}

export async function findLeadForContactAttach(personId: string): Promise<AttachableLead | null> {
  await getCurrentUser()

  const parsedId = personIdSchema.safeParse(personId)
  if (!parsedId.success) return null

  return createActionLogger("findLeadForContactAttach", () => findAttachableLead(parsedId.data))
}

export async function updateContact(
  rawPersonId: string,
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await getCurrentUser()

  const values = collectValues(formData)
  const parsedId = personIdSchema.safeParse(rawPersonId)
  if (!parsedId.success) {
    return { ok: false, errors: {}, message: "contact_not_found", values }
  }
  const personId = parsedId.data

  return saveEntity({
    actionName: "updateContact",
    events: { success: "contact:updated", failure: "contact:update_failed" },
    schema: newContactSchema,
    input: values,
    persist: (data) => updateContactRecord(personId, data),
    ...contactHandlers(values, CONTACT_WORDING),
  })
}

export async function deleteContact(rawPersonId: string): Promise<ContactDeleteState> {
  await getCurrentUser()

  const parsedId = personIdSchema.safeParse(rawPersonId)
  // Un id invalide ne désigne aucune fiche : même réponse idempotente qu'une fiche déjà supprimée.
  if (!parsedId.success) return { ok: true, errors: {}, message: null }
  const personId = parsedId.data

  return deleteEntity<ContactDeleteState>({
    actionName: "deleteContact",
    events: { success: "contact:deleted", failure: "contact:delete_failed" },
    successLogFields: { personId },
    exists: () => contactExists(personId),
    destroy: () =>
      prisma.$transaction(async (tx) => {
        await tx.contact.delete({ where: { personId } })
        await deletePersonIfRoleless(tx, personId)
      }),
    invalidateCaches: revalidatePersonLists,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
