import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import {
  ADMIN_COMPANIES_PATH,
  ADMIN_CONTACTS_PATH,
  ADMIN_INTERVIEWS_PATH,
  ADMIN_LEADS_PATH,
  ADMIN_OPPORTUNITIES_PATH,
  ADMIN_PROSPECTING_ACTIONS_PATH,
} from "@/lib/admin/routes"
import { isOptOutOver } from "@/lib/crm/person-retention"
import { formatShortInstantDate } from "@/lib/date-time"
import { stringField } from "@/lib/server-utils"

import { PersonLockedError } from "../persons.types"

export type IdentityField = "email" | "linkedinUrl"

export type ConflictField = IdentityField | "personId"

export type PersonRole = "lead" | "contact"

export function collectPersonValues(formData: FormData) {
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
  }
}

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

// Leads et contacts affichent le résumé du rôle de l'autre, les opportunités leur apporteur, les entretiens leurs correspondants, les entreprises leurs personnes et leur premier contact, les actions de prospection le nom, l'e-mail et l'entreprise de leur lead : toute écriture sur une personne rafraîchit ces listes.
export function revalidatePersonLists(): void {
  revalidatePath(ADMIN_PROSPECTING_ACTIONS_PATH, "layout")
  revalidatePath(ADMIN_LEADS_PATH, "layout")
  revalidatePath(ADMIN_CONTACTS_PATH, "layout")
  revalidatePath(ADMIN_OPPORTUNITIES_PATH, "layout")
  revalidatePath(ADMIN_INTERVIEWS_PATH, "layout")
  revalidatePath(ADMIN_COMPANIES_PATH, "layout")
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

// Le verrou de ligne attend le commit d'une opposition en cours (son UPDATE prend le même) : sans lui, la fiche vidée serait repeuplée par l'écriture qui suit la lecture.
async function findOptedOutAt(
  tx: Prisma.TransactionClient,
  personId: string,
): Promise<Date | null> {
  await tx.$queryRaw`SELECT 1 FROM "freelance"."Person" WHERE id = ${personId} FOR UPDATE`
  const person = await tx.person.findUnique({
    where: { id: personId },
    select: { optedOutAt: true },
  })
  return person?.optedOutAt ?? null
}

// Une personne opposée ne se modifie pas : sa fiche vidée est la seule trace qui empêche de la reprospecter.
export async function assertNotOptedOut(
  tx: Prisma.TransactionClient,
  personId: string,
): Promise<void> {
  if (await findOptedOutAt(tx, personId)) throw new PersonLockedError()
}

// La même trace ne se supprime qu'au terme de ses 3 ans : la perdre plus tôt rouvrirait la personne à la prospection.
export async function assertOptOutOver(
  tx: Prisma.TransactionClient,
  personId: string,
): Promise<void> {
  const optedOutAt = await findOptedOutAt(tx, personId)
  if (optedOutAt && !isOptOutOver(optedOutAt, new Date())) throw new PersonLockedError()
}

// Une action ne se crée, ne se réécrit ni ne se replanifie pour une personne opposée, qu'elle la vise ou qu'elle y soit déjà rattachée : sans ce second cas, un déplacement vers un autre lead contournerait la règle.
// FOR SHARE attend le commit d'une opposition en cours (son UPDATE verrouille la ligne) : sans lui, une action s'écrirait entre la lecture et l'écriture.
export async function assertProspectionAllowed(
  tx: Prisma.TransactionClient,
  target: { personId?: string; actionId?: string },
): Promise<void> {
  // Verrouille d'abord l'action : sans cela, un déplacement concurrent vers une autre personne passerait entre ce contrôle et l'écriture.
  if (target.actionId) {
    await tx.$queryRaw`SELECT id FROM "freelance"."ProspectingAction" WHERE id = ${target.actionId} FOR UPDATE`
  }
  const persons = await tx.$queryRaw<{ optedOutAt: Date | null }[]>`
    SELECT "optedOutAt" FROM "freelance"."Person"
    WHERE id = ${target.personId ?? null}
       OR id = (SELECT "personId" FROM "freelance"."ProspectingAction" WHERE id = ${target.actionId ?? null})
    FOR SHARE`
  const optedOutAt = persons.find((person) => person.optedOutAt)?.optedOutAt
  if (optedOutAt) throw new PersonConflictError("personId", "opted_out", optOutMessage(optedOutAt))
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
