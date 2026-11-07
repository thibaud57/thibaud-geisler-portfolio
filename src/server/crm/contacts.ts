import "server-only"

import type { LeadOrigin, Prisma } from "@/generated/prisma/client"
import { detailsAfterContactPromotion } from "@/lib/crm/details-templates"
import type { PersonId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import type { AttachContactInput, NewContactInput } from "@/lib/schemas/network-contact"
import { isPrismaError, violatedConstraint } from "@/lib/server-utils"

import {
  assertNewIdentity,
  lockPerson,
  PersonConflictError,
  type ConflictField,
} from "./person-guards"
import {
  guardFailure,
  updatePersonFields,
  writePersonRecord,
  type DetailsSection,
  type PersonFieldsError,
  type PersonWriteError,
} from "./person-write"
import { ok, type DomainResult } from "./result"

export type ContactWriteData = NewContactInput

// Un champ absent reste inchangé.
export type ContactPatch = Partial<ContactWriteData> & { detailsSection?: DetailsSection }

type ContactFieldsPatch = Partial<ContactWriteData> & { detailsSection?: undefined }

type ContactWriteResult<E extends { code: string }> = Promise<DomainResult<{ personId: string }, E>>

const contactExists = async (personId: PersonId): Promise<boolean> =>
  (await prisma.contact.count({ where: { personId } })) > 0

function writeFailure(err: unknown): PersonFieldsError | null {
  const guard = guardFailure(err)
  if (guard) return guard
  if (isPrismaError(err, "P2002")) {
    const constraint = violatedConstraint(err)
    // `email` en repli : visible en création comme en édition, quand `personId` ne l'est que dans le sélecteur de lead.
    const field: ConflictField =
      constraint?.includes("Contact_pkey") || constraint?.includes("personId")
        ? "personId"
        : constraint?.includes("linkedinUrl")
          ? "linkedinUrl"
          : "email"
    return { code: "identity_taken", field }
  }
  // Clé étrangère en `<Table>_<col>_fkey` : le nom dit quelle fiche a disparu.
  if (isPrismaError(err, "P2003")) {
    return violatedConstraint(err)?.includes("personId")
      ? { code: "person_conflict", conflict: { reason: "person_missing", field: "personId" } }
      : { code: "company_not_found" }
  }
  return null
}

export function createContact(data: ContactWriteData): ContactWriteResult<PersonFieldsError> {
  const { types, status, ...person } = data

  return writePersonRecord(async (tx) => {
    await assertNewIdentity(tx, person, null)
    const created = await tx.person.create({ data: person })
    await tx.contact.create({ data: { types, status, personId: created.id } })
    return ok({ personId: created.id })
  }, writeFailure)
}

async function assertAttachable(
  tx: Prisma.TransactionClient,
  personId: PersonId,
): Promise<{ details: string | null; origin: LeadOrigin }> {
  await lockPerson(tx, personId)
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
  if (!person) throw new PersonConflictError({ reason: "person_missing", field: "personId" })
  if (person.optedOutAt) {
    throw new PersonConflictError({
      reason: "opted_out",
      field: "personId",
      optedOutAt: person.optedOutAt,
    })
  }
  if (!person.lead) throw new PersonConflictError({ reason: "not_a_lead", field: "personId" })
  if (person.contact) {
    throw new PersonConflictError({
      reason: "exists",
      field: "personId",
      personName: person.name,
      roles: { lead: true, contact: true },
    })
  }
  return { details: person.details, origin: person.lead.origin }
}

export function attachContact(
  leadId: PersonId,
  data: Pick<AttachContactInput, "types" | "status">,
): ContactWriteResult<PersonFieldsError> {
  return writePersonRecord(async (tx) => {
    const { details, origin } = await assertAttachable(tx, leadId)
    const promoted = detailsAfterContactPromotion(details, origin)
    if (promoted !== (details ?? "")) {
      await tx.person.update({ where: { id: leadId }, data: { details: promoted } })
    }
    await tx.contact.create({
      data: { personId: leadId, types: data.types, status: data.status },
    })
    return ok({ personId: leadId })
  }, writeFailure)
}

export function updateContact(
  personId: PersonId,
  patch: ContactFieldsPatch,
): ContactWriteResult<PersonFieldsError>
export function updateContact(
  personId: PersonId,
  patch: ContactPatch,
): ContactWriteResult<PersonWriteError>
export function updateContact(
  personId: PersonId,
  patch: ContactPatch,
): ContactWriteResult<PersonWriteError> {
  const { types, status, detailsSection, ...person } = patch

  return writePersonRecord(
    (tx) =>
      updatePersonFields(tx, personId, person, detailsSection, () =>
        tx.contact.update({ where: { personId }, data: { types, status } }),
      ),
    writeFailure,
    () => contactExists(personId),
  )
}
