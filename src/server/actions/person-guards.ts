import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { ADMIN_CONTACTS_PATH, ADMIN_LEADS_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import { formatShortInstantDate } from "@/lib/date-time"

import { PersonLockedError } from "./persons.types"

export type IdentityField = "email" | "linkedinUrl"

export type ConflictField = IdentityField | "personId"

export type PersonRole = "lead" | "contact"

interface IdentityConflict {
  field: IdentityField
  name: string | null
  optedOutAt: Date | null
  roles: Record<PersonRole, boolean>
}

export interface DuplicateWording {
  role: PersonRole
  own: string
  other: string
  otherHint?: string
}

// `reason` reste neutre : chaque action le traduit dans les codes de message de son propre formulaire.
export class PersonConflictError extends Error {
  readonly field: ConflictField
  readonly reason: "exists" | "opted_out" | "not_found"

  constructor(field: ConflictField, reason: PersonConflictError["reason"], message: string) {
    super(message)
    this.field = field
    this.reason = reason
  }
}

export function conflictErrors(err: PersonConflictError): Partial<Record<ConflictField, string[]>> {
  return { [err.field]: [err.message] }
}

function duplicateIdentityMessage(conflict: IdentityConflict, wording: DuplicateWording): string {
  const name = conflict.name ?? ""
  if (conflict.roles[wording.role]) return `${wording.own} : ${name}`
  const otherRole: PersonRole = wording.role === "lead" ? "contact" : "lead"
  if (conflict.roles[otherRole]) return `${wording.other} : ${name}${wording.otherHint ?? ""}`
  return `Cette personne existe déjà : ${name}`
}

export function optOutMessage(optedOutAt: Date): string {
  return `Cette personne s'est opposée à la prospection le ${formatShortInstantDate(optedOutAt)}`
}

// Leads et contacts affichent le résumé du rôle de l'autre, les opportunités leur apporteur : toute écriture sur une personne rafraîchit les trois.
export function revalidatePersonLists(): void {
  revalidatePath(ADMIN_LEADS_PATH, "layout")
  revalidatePath(ADMIN_CONTACTS_PATH, "layout")
  revalidatePath(ADMIN_OPPORTUNITIES_PATH, "layout")
}

// L'unicité en base arrête déjà le doublon : lire avant d'écrire sert seulement à nommer la personne et à détecter une opposition à la prospection.
async function findIdentityConflict(
  client: Prisma.TransactionClient,
  data: { email: string | null; linkedinUrl: string | null },
  currentPersonId: string | null,
): Promise<IdentityConflict | null> {
  const identities: Prisma.PersonWhereInput[] = [
    ...(data.email ? [{ email: data.email }] : []),
    ...(data.linkedinUrl ? [{ linkedinUrl: data.linkedinUrl }] : []),
  ]
  if (identities.length === 0) return null

  const existing = await client.person.findFirst({
    where: { OR: identities, ...(currentPersonId ? { NOT: { id: currentPersonId } } : {}) },
    select: {
      name: true,
      email: true,
      optedOutAt: true,
      lead: { select: { personId: true } },
      contact: { select: { personId: true } },
    },
    // L'opposition prime : elle doit être signalée même si une autre personne partage l'autre identifiant.
    orderBy: { optedOutAt: { sort: "desc", nulls: "last" } },
  })
  if (!existing) return null

  const field: IdentityField =
    data.email !== null && existing.email === data.email ? "email" : "linkedinUrl"
  return {
    field,
    name: existing.name,
    optedOutAt: existing.optedOutAt,
    roles: { lead: existing.lead !== null, contact: existing.contact !== null },
  }
}

export async function assertNewIdentity(
  client: Prisma.TransactionClient,
  data: { email: string | null; linkedinUrl: string | null },
  currentPersonId: string | null,
  wording: DuplicateWording,
): Promise<void> {
  const conflict = await findIdentityConflict(client, data, currentPersonId)
  if (!conflict) return

  if (conflict.optedOutAt) {
    throw new PersonConflictError(conflict.field, "opted_out", optOutMessage(conflict.optedOutAt))
  }
  throw new PersonConflictError(
    conflict.field,
    "exists",
    duplicateIdentityMessage(conflict, wording),
  )
}

// Une personne opposée ne se modifie ni ne se supprime : sa fiche vidée est la seule trace qui empêche de la reprospecter.
export async function assertNotOptedOut(
  tx: Prisma.TransactionClient,
  personId: string,
): Promise<void> {
  const person = await tx.person.findUnique({
    where: { id: personId },
    select: { optedOutAt: true },
  })
  if (person?.optedOutAt) throw new PersonLockedError()
}

// Une seule instruction conditionnelle : lire l'autre rôle puis supprimer laisserait une fenêtre où un rôle posé entre-temps ferait disparaître la personne avec lui.
export function deletePersonIfRoleless(
  tx: Prisma.TransactionClient,
  personId: string,
): Promise<Prisma.BatchPayload> {
  return tx.person.deleteMany({
    where: { id: personId, lead: { is: null }, contact: { is: null } },
  })
}
