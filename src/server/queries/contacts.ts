import "server-only"

import type { ContactStatus, ContactType, Prisma } from "@/generated/prisma/client"
import type { PersonId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { companyRefSelect } from "@/server/queries/company-ref"
import { flattenPerson, type FlatPerson, personNameOrder } from "@/server/queries/persons"

const contactRecordInclude = {
  person: {
    include: { company: { select: companyRefSelect }, lead: { select: { personId: true } } },
  },
} as const

type ContactRow = Prisma.ContactGetPayload<{ include: typeof contactRecordInclude }>

// La personne aplatie sur son rôle Contact : liste et formulaire lisent une seule forme.
export type ContactRecord = FlatPerson & {
  id: string
  types: readonly ContactType[]
  status: ContactStatus
  hasLeadRole: boolean
}

export type AdminContact = ContactRecord

function toContactRecord(row: ContactRow): ContactRecord {
  return {
    id: row.personId,
    ...flattenPerson(row.person),
    types: row.types,
    status: row.status,
    hasLeadRole: row.person.lead !== null,
  }
}

// Sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export async function findAllContactsForAdmin(): Promise<AdminContact[]> {
  const rows = await prisma.contact.findMany({
    include: contactRecordInclude,
    orderBy: { person: personNameOrder },
  })
  return rows.map(toContactRecord)
}

export async function findContactByIdForAdmin(personId: PersonId): Promise<ContactRecord | null> {
  const row = await prisma.contact.findUnique({
    where: { personId },
    include: contactRecordInclude,
  })
  return row ? toContactRecord(row) : null
}
