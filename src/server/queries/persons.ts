import "server-only"

import type { Person, Prisma } from "@/generated/prisma/client"
import { personDisplayName } from "@/lib/crm/persons"
import type { PersonId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import type { CompanyRef } from "@/server/queries/company-ref"

export const personNameOrder = { name: { sort: "asc", nulls: "last" } } as const

export type FlatPerson = Pick<
  Person,
  "name" | "jobRole" | "zone" | "email" | "phone" | "linkedinUrl" | "metAt" | "notes" | "details"
> & { company: CompanyRef | null }

export function flattenPerson(person: FlatPerson): FlatPerson {
  return {
    name: person.name,
    jobRole: person.jobRole,
    zone: person.zone,
    email: person.email,
    phone: person.phone,
    linkedinUrl: person.linkedinUrl,
    metAt: person.metAt,
    notes: person.notes,
    details: person.details,
    company: person.company,
  }
}

export const personRefSelect = {
  id: true,
  name: true,
  email: true,
  linkedinUrl: true,
  optedOutAt: true,
  lead: { select: { personId: true } },
  contact: { select: { personId: true } },
} as const

export interface PersonOption {
  id: string
  name: string
  company: { name: string } | null
}

const personOptionSelect = {
  id: true,
  name: true,
  email: true,
  linkedinUrl: true,
  company: { select: { name: true } },
} as const

type PersonOptionRow = Prisma.PersonGetPayload<{ select: typeof personOptionSelect }>

function toPersonOption(row: PersonOptionRow): PersonOption {
  return { id: row.id, name: personDisplayName(row), company: row.company }
}

// Un correspondant, un apporteur ou un destinataire d'action ou de signal ne se choisit jamais parmi les personnes opposées.
async function findSelectablePersons(where: Prisma.PersonWhereInput = {}): Promise<PersonOption[]> {
  const rows = await prisma.person.findMany({
    where: { ...where, optedOutAt: null },
    select: personOptionSelect,
    orderBy: personNameOrder,
  })
  return rows.map(toPersonOption)
}

export function findPersonOptions(): Promise<PersonOption[]> {
  return findSelectablePersons()
}

export function findPersonOptionsWithLeadRole(): Promise<PersonOption[]> {
  return findSelectablePersons({ lead: { isNot: null } })
}

// Limité au rôle Lead : « Depuis un lead » promeut un lead en contact, pas n'importe quelle personne.
const attachableLeadWhere = {
  optedOutAt: null,
  contact: { is: null },
  lead: { isNot: null },
} satisfies Prisma.PersonWhereInput

export function findLeadsWithoutContactRole(): Promise<PersonOption[]> {
  return findSelectablePersons(attachableLeadWhere)
}

const attachableLeadSelect = {
  id: true,
  name: true,
  jobRole: true,
  zone: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  metAt: true,
  notes: true,
  details: true,
  company: { select: { name: true } },
} as const

export type AttachableLead = Prisma.PersonGetPayload<{ select: typeof attachableLeadSelect }>

export function findAttachableLead(personId: PersonId): Promise<AttachableLead | null> {
  return prisma.person.findFirst({
    where: { id: personId, ...attachableLeadWhere },
    select: attachableLeadSelect,
  })
}
