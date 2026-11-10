import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import type { PersonId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { isRowGone } from "@/lib/server-utils"

import {
  resolveDetailsSection,
  type DetailsSection,
  type DetailsSectionError,
} from "./details-section"
import {
  assertNewIdentity,
  assertNotOptedOut,
  PersonConflictError,
  PersonLockedError,
  type ConflictField,
  type PersonConflict,
} from "./person-guards"
import { fail, ok, type DomainResult } from "./result"

export type PersonFieldsError =
  | { code: "person_conflict"; conflict: PersonConflict }
  | { code: "identity_taken"; field: ConflictField }
  | { code: "person_locked" }
  | { code: "company_not_found" }
  | { code: "not_found" }

export type PersonWriteError = PersonFieldsError | DetailsSectionError

// Les gardes lèvent dans la transaction pour l'annuler : l'erreur redevient une valeur à sa sortie.
export function guardFailure(
  err: unknown,
): Extract<PersonFieldsError, { code: "person_conflict" | "person_locked" }> | null {
  if (err instanceof PersonConflictError) return { code: "person_conflict", conflict: err.conflict }
  if (err instanceof PersonLockedError) return { code: "person_locked" }
  return null
}

async function resolvePersonDetails(
  tx: Prisma.TransactionClient,
  personId: PersonId,
  section: DetailsSection,
): Promise<DomainResult<string, PersonWriteError>> {
  const person = await tx.person.findUnique({ where: { id: personId }, select: { details: true } })
  if (!person) return fail({ code: "not_found" })

  return resolveDetailsSection(person.details, section)
}

// Sous-ensemble de la personne qu'un rôle écrit : l'identité sert à la garde de doublon, le reste part tel quel.
type PersonUpdateFields = Prisma.PersonUncheckedUpdateInput & {
  email?: string | null
  linkedinUrl?: string | null
}

// `updateRole` s'exécute dans la même transaction, après la personne.
export async function updatePersonFields(
  tx: Prisma.TransactionClient,
  personId: PersonId,
  person: PersonUpdateFields,
  detailsSection: DetailsSection | undefined,
  updateRole: () => Promise<unknown>,
): Promise<DomainResult<{ personId: string }, PersonWriteError>> {
  // Après le verrou d'opposition : une personne opposée entre le chargement et l'envoi doit recevoir le verrou, pas un doublon.
  await assertNotOptedOut(tx, personId)
  await assertNewIdentity(tx, person, personId)
  const section = detailsSection ? await resolvePersonDetails(tx, personId, detailsSection) : null
  if (section && !section.ok) return section

  await tx.person.update({
    where: { id: personId },
    data: section ? { ...person, details: section.value } : person,
  })
  await updateRole()
  return ok({ personId })
}

// `failureOf` reconnaît les échecs du rôle (unicité, clé étrangère) : tout autre remonte. `roleExists` n'est donné qu'à une mise à jour.
export async function writePersonRecord<E extends { code: string } = never>(
  work: (tx: Prisma.TransactionClient) => Promise<DomainResult<{ personId: string }, E>>,
  failureOf: (err: unknown) => PersonFieldsError | null,
  roleExists?: () => Promise<boolean>,
): Promise<DomainResult<{ personId: string }, E | PersonFieldsError>> {
  try {
    return await prisma.$transaction(work)
  } catch (err) {
    const failure = failureOf(err)
    if (failure) return fail(failure)
    if (roleExists && (await isRowGone(err, roleExists))) {
      return fail({ code: "not_found" })
    }
    throw err
  }
}
