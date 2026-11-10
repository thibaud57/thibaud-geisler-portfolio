import "server-only"

import type { PersonId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import type { LeadInput } from "@/lib/schemas/lead"
import { isPrismaError, rowExists, violatedConstraint } from "@/lib/server-utils"

import type { DetailsSection } from "./details-section"
import { assertNewIdentity, type IdentityField } from "./person-guards"
import {
  guardFailure,
  updatePersonFields,
  writePersonRecord,
  type PersonFieldsError,
  type PersonWriteError,
} from "./person-write"
import { ok, type DomainResult } from "./result"

// L'admin passe le score, l'outil jamais.
export type LeadWriteData = Omit<LeadInput, "score"> & { score?: LeadInput["score"] }

export type LeadPatch = Partial<LeadWriteData> & { detailsSection?: DetailsSection }

type LeadFieldsPatch = Partial<LeadWriteData> & { detailsSection?: undefined }

type LeadWriteResult<E extends { code: string }> = Promise<DomainResult<{ personId: string }, E>>

function writeFailure(err: unknown): PersonFieldsError | null {
  const guard = guardFailure(err)
  if (guard) return guard
  if (isPrismaError(err, "P2002")) {
    const field: IdentityField = violatedConstraint(err)?.includes("email")
      ? "email"
      : "linkedinUrl"
    return { code: "identity_taken", field }
  }
  if (isPrismaError(err, "P2003")) return { code: "company_not_found" }
  return null
}

export function createLead(data: LeadWriteData): LeadWriteResult<PersonFieldsError> {
  const { origin, status, interest, channel, score, ...person } = data

  return writePersonRecord(async (tx) => {
    await assertNewIdentity(tx, data, null)
    const created = await tx.person.create({ data: person })
    await tx.lead.create({
      data: { origin, status, interest, channel, score, personId: created.id },
    })
    return ok({ personId: created.id })
  }, writeFailure)
}

export function updateLead(
  personId: PersonId,
  patch: LeadFieldsPatch,
): LeadWriteResult<PersonFieldsError>
export function updateLead(personId: PersonId, patch: LeadPatch): LeadWriteResult<PersonWriteError>
export function updateLead(
  personId: PersonId,
  patch: LeadPatch,
): LeadWriteResult<PersonWriteError> {
  const { origin, status, interest, channel, score, detailsSection, ...person } = patch

  return writePersonRecord(
    (tx) =>
      updatePersonFields(tx, personId, person, detailsSection, () =>
        tx.lead.update({ where: { personId }, data: { origin, status, interest, channel, score } }),
      ),
    writeFailure,
    () => rowExists(prisma.lead, { personId }),
  )
}
