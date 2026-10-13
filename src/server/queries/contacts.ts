import "server-only"

import type { ContactStatus, ContactType, JobRole, Prisma, Zone } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const companySelect = { select: { id: true, name: true, logoFilename: true } } as const

const contactRecordInclude = {
  person: { include: { company: companySelect, lead: { select: { personId: true } } } },
} as const

type ContactRow = Prisma.ContactGetPayload<{ include: typeof contactRecordInclude }>

// La personne aplatie sur son rôle Contact : liste et formulaire lisent une seule forme.
export interface ContactRecord {
  id: string
  name: string | null
  jobRole: JobRole | null
  zone: Zone | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  metAt: Date | null
  notes: string | null
  details: string | null
  company: { id: string; name: string; logoFilename: string | null } | null
  types: ContactType[]
  status: ContactStatus
  hasLeadRole: boolean
}

export type AdminContact = ContactRecord

function toContactRecord(row: ContactRow): ContactRecord {
  return {
    id: row.personId,
    name: row.person.name,
    jobRole: row.person.jobRole,
    zone: row.person.zone,
    email: row.person.email,
    phone: row.person.phone,
    linkedinUrl: row.person.linkedinUrl,
    metAt: row.person.metAt,
    notes: row.person.notes,
    details: row.person.details,
    company: row.person.company,
    types: row.types,
    status: row.status,
    hasLeadRole: row.person.lead !== null,
  }
}

// Sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export async function findAllContactsForAdmin(): Promise<AdminContact[]> {
  const rows = await prisma.contact.findMany({
    include: contactRecordInclude,
    orderBy: { person: { name: { sort: "asc", nulls: "last" } } },
  })
  return rows.map(toContactRecord)
}

export async function findContactByIdForAdmin(personId: string): Promise<ContactRecord | null> {
  const row = await prisma.contact.findUnique({
    where: { personId },
    include: contactRecordInclude,
  })
  return row ? toContactRecord(row) : null
}
