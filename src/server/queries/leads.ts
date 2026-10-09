import "server-only"

import type {
  ContactStatus,
  ContactType,
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
    include: {
      company: { select: { id: true, name: true, logoFilename: true } },
      contact: { select: { types: true, status: true } },
      prospectingActions: {
        where: { respondedAt: { not: null } },
        orderBy: { respondedAt: "desc" },
        take: 1,
        select: { respondedAt: true },
      },
      _count: { select: { prospectingActions: true } },
    },
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
  // Traitement 7 (registre) : point de départ des 3 ans de conservation, avec la date de création du rôle.
  lastReplyAt: Date | null
  company: { id: string; name: string; logoFilename: string | null } | null
  origin: LeadOrigin
  status: LeadStatus
  interest: LeadInterest | null
  channel: LeadChannel | null
  score: number | null
  createdAt: Date
  actionsCount: number
  contactRole: { types: ContactType[]; status: ContactStatus } | null
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
    lastReplyAt: row.person.prospectingActions[0]?.respondedAt ?? null,
    company: row.person.company,
    origin: row.origin,
    status: row.status,
    interest: row.interest,
    channel: row.channel,
    score: row.score,
    createdAt: row.createdAt,
    actionsCount: row.person._count.prospectingActions,
    contactRole: row.person.contact,
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

// Leads d'une entreprise : une fiche en opposition a perdu son entreprise, elle n'y apparaît plus. Relation lue imbriquée exprès, cette liste ne sert qu'à construire des liens ; `AdminLead` reste la seule forme aplatie.
export async function findLeadsOfCompany(companyId: string) {
  return prisma.lead.findMany({
    where: { person: { companyId } },
    select: {
      personId: true,
      person: { select: { name: true, email: true, linkedinUrl: true, jobRole: true } },
    },
    orderBy: { person: { name: { sort: "asc", nulls: "last" } } },
  })
}
