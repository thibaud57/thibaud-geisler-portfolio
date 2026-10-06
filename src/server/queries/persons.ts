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
