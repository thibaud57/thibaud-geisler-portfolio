import "server-only"

import type {
  LeadChannel,
  LeadInterest,
  LeadOrigin,
  LeadStatus,
  Prisma,
} from "@/generated/prisma/client"
import type { CompanyId, PersonId } from "@/lib/ids"
import { lastContactAtOf } from "@/lib/crm/person-last-contact"
import {
  HELD_CALL_WHERE,
  isPlannedCall,
  plannedCallWhere,
} from "@/lib/crm/prospecting-action-status"
import { zonedDayStartOf } from "@/lib/date-time"
import { prisma } from "@/lib/prisma"
import type { SignalItem } from "@/lib/crm/signals"
import { companyRefSelect } from "@/server/queries/company-ref"
import { orderedInterviewSelect } from "@/server/queries/interviews"
import { type OpportunitySummary, opportunitySummarySelect } from "@/server/queries/opportunities"
import {
  flattenPerson,
  type FlatPerson,
  type PageQuery,
  personNameOrder,
  personRowSelect,
  toPersonRow,
} from "@/server/queries/persons"
import { signalsInclude } from "@/server/queries/signals"

const adminLeadInclude = {
  person: {
    include: {
      company: { select: companyRefSelect },
      referredOpportunities: {
        select: opportunitySummarySelect,
        orderBy: { updatedAt: "desc" },
      },
      contact: { select: { personId: true } },
      prospectingActions: {
        select: { channel: true, status: true, occurredAt: true, respondedAt: true },
      },
      interviews: {
        select: {
          id: true,
          type: true,
          status: true,
          outcome: true,
          scheduledAt: true,
          createdAt: true,
          opportunity: {
            select: {
              id: true,
              title: true,
              interviews: { select: orderedInterviewSelect },
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
      },
      signals: signalsInclude,
      _count: { select: { prospectingActions: true } },
    },
  },
} as const

type LeadWithPerson = Prisma.LeadGetPayload<{ include: typeof adminLeadInclude }>

// Une relation ne se sélectionne qu'une fois : les réponses, les calls tenus (dernier contact) et les calls planifiés (RDV planifié) partagent cette lecture, que `toAdminLead` trie en mémoire.
function adminLeadIncludeAt(now: Date) {
  const { person } = adminLeadInclude
  return {
    person: {
      include: {
        ...person.include,
        prospectingActions: {
          ...person.include.prospectingActions,
          where: {
            OR: [
              { respondedAt: { not: null } },
              HELD_CALL_WHERE,
              plannedCallWhere(zonedDayStartOf(now)),
            ],
          },
        },
      },
    },
  } satisfies Prisma.LeadInclude
}

export type AdminLead = FlatPerson & {
  id: string
  optedOutAt: Date | null
  exchangesErasedAt: Date | null
  plannedCalls: readonly { occurredAt: Date }[]
  // Traitement 7 (registre) : point de départ des 3 ans de conservation, avec la date de création du rôle.
  lastContactAt: Date | null
  origin: LeadOrigin
  status: LeadStatus
  interest: LeadInterest | null
  channel: LeadChannel | null
  score: number | null
  createdAt: Date
  actionsCount: number
  interviews: LeadWithPerson["person"]["interviews"]
  hasContactRole: boolean
  opportunities: readonly OpportunitySummary[]
  signals: readonly SignalItem[]
}

// La personne aplatie sur son rôle Lead : liste et formulaire lisent une seule forme, jamais une relation imbriquée.
function toAdminLead(row: LeadWithPerson, now: Date): AdminLead {
  const { prospectingActions, interviews } = row.person
  return {
    id: row.personId,
    ...flattenPerson(row.person),
    optedOutAt: row.person.optedOutAt,
    exchangesErasedAt: row.person.exchangesErasedAt,
    lastContactAt: lastContactAtOf(prospectingActions, interviews, now),
    plannedCalls: prospectingActions.filter((action) =>
      isPlannedCall(action.channel, action.status),
    ),
    origin: row.origin,
    status: row.status,
    interest: row.interest,
    channel: row.channel,
    score: row.score,
    createdAt: row.createdAt,
    actionsCount: row.person._count.prospectingActions,
    interviews,
    hasContactRole: row.person.contact !== null,
    opportunities: row.person.referredOpportunities,
    signals: row.person.signals,
  }
}

// Sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export async function findAllLeadsForAdmin(): Promise<AdminLead[]> {
  const now = new Date()
  const rows = await prisma.lead.findMany({
    include: adminLeadIncludeAt(now),
    orderBy: { person: personNameOrder },
  })
  return rows.map((row) => toAdminLead(row, now))
}

export async function findLeadByIdForAdmin(personId: PersonId): Promise<AdminLead | null> {
  const now = new Date()
  const row = await prisma.lead.findUnique({
    where: { personId },
    include: adminLeadIncludeAt(now),
  })
  return row ? toAdminLead(row, now) : null
}

// Lecture légère de la personne d'un lead, pour décider de la lecture complète.
export async function findLeadPerson(personId: PersonId) {
  const row = await prisma.lead.findUnique({
    where: { personId },
    select: { person: { select: { id: true, name: true, optedOutAt: true } } },
  })
  return row?.person ?? null
}

// Leads d'une entreprise : une fiche en opposition a perdu son entreprise, elle n'y apparaît plus. Relation lue imbriquée exprès, cette liste ne sert qu'à construire des liens ; `AdminLead` reste la seule forme aplatie.
export async function findLeadsOfCompany(companyId: CompanyId) {
  return prisma.lead.findMany({
    where: { person: { companyId } },
    select: {
      personId: true,
      createdAt: true,
      person: {
        select: { name: true, email: true, linkedinUrl: true, jobRole: true, metAt: true },
      },
    },
    orderBy: { person: personNameOrder },
  })
}

const leadRowSelect = {
  personId: true,
  status: true,
  updatedAt: true,
  person: { select: personRowSelect },
} as const

// Une personne opposée n'est jamais listée : la garde est ici, pas chez l'appelant.
export async function findLeadsPage(
  page: PageQuery<Prisma.LeadWhereInput, Prisma.LeadOrderByWithRelationInput>,
) {
  const where: Prisma.LeadWhereInput = { AND: [page.where, { person: { optedOutAt: null } }] }
  const [rows, total] = await prisma.$transaction([
    prisma.lead.findMany({ ...page, where, select: leadRowSelect }),
    prisma.lead.count({ where }),
  ])
  return {
    rows: rows.map((row) => ({
      ...toPersonRow(row),
      status: row.status,
      updatedAt: row.updatedAt,
    })),
    total,
  }
}
