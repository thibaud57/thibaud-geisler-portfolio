import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { personDisplayName } from "@/lib/persons"
import { prisma } from "@/lib/prisma"

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
    orderBy: { name: { sort: "asc", nulls: "last" } },
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
  notes: true,
  details: true,
  company: { select: { name: true } },
} as const

export type AttachableLead = Prisma.PersonGetPayload<{ select: typeof attachableLeadSelect }>

export function findAttachableLead(personId: string): Promise<AttachableLead | null> {
  return prisma.person.findFirst({
    where: { id: personId, ...attachableLeadWhere },
    select: attachableLeadSelect,
  })
}
