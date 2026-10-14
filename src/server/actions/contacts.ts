"use server"

import "server-only"

import type { LeadOrigin, Prisma } from "@/generated/prisma/client"
import { detailsAfterContactPromotion } from "@/lib/crm/details-templates"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { attachContactSchema, newContactSchema } from "@/lib/schemas/network-contact"
import {
  createActionLogger,
  isPrismaError,
  stringField,
  stringValues,
  violatedConstraint,
} from "@/lib/server-utils"
import { findAttachableLead, type AttachableLead } from "@/server/queries/persons"

import {
  assertNewIdentity,
  assertNotOptedOut,
  collectPersonValues,
  conflictErrors,
  deletePersonIfRoleless,
  optOutMessage,
  PersonConflictError,
  revalidatePersonLists,
  type ConflictField,
  type DuplicateWording,
} from "./_support/person-guards"
import { PersonLockedError } from "./persons.types"
import {
  deleteEntity,
  formStateHandlers,
  MISSING_COMPANY,
  MISSING_PERSON,
  missingRelationState,
  rowExists,
  saveEntity,
  type ActionEvents,
} from "./_support/shared"
import type { ContactFormMessage, ContactFormState } from "./contacts.types"

const CONFLICT_MESSAGES = {
  exists: "contact_exists",
  opted_out: "contact_opted_out",
  not_found: "person_not_found",
} as const satisfies Record<PersonConflictError["reason"], ContactFormMessage>

const CONTACT_WORDING: DuplicateWording = {
  role: "contact",
  own: "Ce contact existe déjà",
  other: "Cette personne est déjà un lead",
}

// Seule la création propose « Depuis un lead » : en édition, la personne est déjà choisie.
const CONTACT_CREATE_WORDING: DuplicateWording = {
  ...CONTACT_WORDING,
  otherHint: ", choisissez-la « Depuis un lead »",
}

function collectValues(formData: FormData): ContactFormState["values"] {
  return {
    personId: stringField(formData, "personId"),
    ...collectPersonValues(formData),
    types: stringValues(formData, "types"),
    status: stringField(formData, "status"),
  }
}

// Le verrou de ligne sérialise avec `optOutPerson`, dont l'UPDATE prend le même verrou : soit l'attache voit l'opposition, soit l'opposition passe après et son `contact.deleteMany` retire le rôle posé ici.
async function assertAttachable(
  tx: Prisma.TransactionClient,
  personId: string,
): Promise<{ details: string | null; origin: LeadOrigin }> {
  await tx.$queryRaw`SELECT 1 FROM "freelance"."Person" WHERE id = ${personId} FOR UPDATE`
  const person = await tx.person.findUnique({
    where: { id: personId },
    select: {
      name: true,
      details: true,
      optedOutAt: true,
      lead: { select: { origin: true } },
      contact: { select: { personId: true } },
    },
  })
  if (!person) {
    throw new PersonConflictError("personId", "not_found", MISSING_PERSON.text)
  }
  if (person.optedOutAt) {
    throw new PersonConflictError("personId", "opted_out", optOutMessage(person.optedOutAt))
  }
  if (!person.lead) {
    throw new PersonConflictError("personId", "not_found", "Cette personne n'est pas un lead")
  }
  if (person.contact) {
    throw new PersonConflictError(
      "personId",
      "exists",
      `${CONTACT_WORDING.own} : ${person.name ?? ""}`,
    )
  }
  return { details: person.details, origin: person.lead.origin }
}

function mapContactError(
  err: unknown,
  values: ContactFormState["values"],
): ContactFormState | null {
  if (err instanceof PersonConflictError) {
    return {
      ok: false,
      errors: conflictErrors(err),
      message: CONFLICT_MESSAGES[err.reason],
      values,
    }
  }
  if (err instanceof PersonLockedError) {
    return { ok: false, errors: {}, message: "contact_opted_out_locked", values }
  }
  if (isPrismaError(err, "P2002")) {
    const constraint = violatedConstraint(err)
    // `email` en repli : visible en création comme en édition, quand `personId` ne l'est que dans le sélecteur de lead.
    const field: ConflictField =
      constraint.includes("Contact_pkey") || constraint.includes("personId")
        ? "personId"
        : constraint.includes("linkedinUrl")
          ? "linkedinUrl"
          : "email"
    const errors: ContactFormState["errors"] = {}
    errors[field] = ["Cette personne existe déjà"]
    return { ok: false, errors, message: "contact_exists", values }
  }
  // Clé étrangère en `<Table>_<col>_fkey` : le nom dit quelle fiche a disparu.
  if (isPrismaError(err, "P2003")) {
    return violatedConstraint(err).includes("personId")
      ? missingRelationState("personId", MISSING_PERSON, values)
      : missingRelationState("companyId", MISSING_COMPANY, values)
  }
  return null
}

const contactExists = (personId: string) => rowExists(prisma.contact, { personId })

function contactHandlers(values: ContactFormState["values"], updatedId?: string) {
  return {
    successLogFields: (_data: object, contact: { personId: string }) => ({
      personId: contact.personId,
    }),
    invalidateCaches: revalidatePersonLists,
    mapError: (err: unknown) => mapContactError(err, values),
    ...formStateHandlers(values, {
      message: "contact_not_found",
      updatedId,
      exists: contactExists,
    }),
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
      persist: ({ personId, types, status }) =>
        prisma.$transaction(async (tx) => {
          const { details, origin } = await assertAttachable(tx, personId)
          const promoted = detailsAfterContactPromotion(details, origin)
          if (promoted !== (details ?? "")) {
            await tx.person.update({ where: { id: personId }, data: { details: promoted } })
          }
          return tx.contact.create({ data: { personId, types, status } })
        }),
      ...contactHandlers(values),
    })
  }

  return saveEntity({
    actionName: "createContact",
    events,
    schema: newContactSchema,
    input: values,
    persist: ({ types, status, ...person }) =>
      prisma.$transaction(async (tx) => {
        await assertNewIdentity(tx, person, null, CONTACT_CREATE_WORDING)
        const created = await tx.person.create({ data: person })
        return tx.contact.create({ data: { types, status, personId: created.id } })
      }),
    ...contactHandlers(values),
  })
}

export async function findLeadForContactAttach(personId: string): Promise<AttachableLead | null> {
  await getCurrentUser()

  return createActionLogger("findLeadForContactAttach", () => findAttachableLead(personId))
}

export async function updateContact(
  personId: string,
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await getCurrentUser()

  const values = collectValues(formData)

  return saveEntity({
    actionName: "updateContact",
    events: { success: "contact:updated", failure: "contact:update_failed" },
    schema: newContactSchema,
    input: values,
    persist: ({ types, status, ...person }) =>
      prisma.$transaction(async (tx) => {
        // Après le verrou d'opposition : une personne opposée entre le chargement et l'envoi doit recevoir le message de verrou, pas un doublon.
        await assertNotOptedOut(tx, personId)
        await assertNewIdentity(tx, person, personId, CONTACT_WORDING)
        await tx.person.update({ where: { id: personId }, data: person })
        return tx.contact.update({ where: { personId }, data: { types, status } })
      }),
    ...contactHandlers(values, personId),
  })
}

export async function deleteContact(personId: string): Promise<ContactFormState> {
  await getCurrentUser()

  return deleteEntity<ContactFormState>({
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
