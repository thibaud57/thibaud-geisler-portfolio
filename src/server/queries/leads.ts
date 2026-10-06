import "server-only"

import type {
  JobRole,
  LeadChannel,
  LeadInterest,
  LeadOrigin,
  LeadStatus,
  Prisma,
  Zone,
} from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminLeadInclude = {
  person: {
    include: { company: { select: { id: true, name: true, logoFilename: true } } },
  },
} as const

type LeadWithPerson = Prisma.LeadGetPayload<{ include: typeof adminLeadInclude }>

export interface AdminLead {
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
  optedOutAt: Date | null
  exchangesErasedAt: Date | null
  company: { id: string; name: string; logoFilename: string | null } | null
  origin: LeadOrigin
  status: LeadStatus
  interest: LeadInterest | null
  channel: LeadChannel | null
  score: number | null
  hasContactRole: boolean
}

// La personne aplatie sur son rôle Lead : liste et formulaire lisent une seule forme, jamais une relation imbriquée.
function toAdminLead(row: LeadWithPerson): AdminLead {
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
    optedOutAt: row.person.optedOutAt,
    exchangesErasedAt: row.person.exchangesErasedAt,
    company: row.person.company,
    origin: row.origin,
    status: row.status,
    interest: row.interest,
    channel: row.channel,
    score: row.score,
    hasContactRole: false,
  }
}

// Sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export async function findAllLeadsForAdmin(): Promise<AdminLead[]> {
  const rows = await prisma.lead.findMany({
    include: adminLeadInclude,
    orderBy: { person: { name: { sort: "asc", nulls: "last" } } },
  })
  return rows.map(toAdminLead)
}

export async function findLeadByIdForAdmin(personId: string): Promise<AdminLead | null> {
  const row = await prisma.lead.findUnique({ where: { personId }, include: adminLeadInclude })
  return row ? toAdminLead(row) : null
}
