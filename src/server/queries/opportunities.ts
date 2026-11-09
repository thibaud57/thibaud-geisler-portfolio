import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { companyRefSelect } from "@/server/queries/company-ref"
import { orderedInterviewSelect } from "@/server/queries/interviews"
import { type PageQuery, personRefSelect } from "@/server/queries/persons"

const adminOpportunityInclude = {
  referrer: { select: { ...personRefSelect, company: { select: { logoFilename: true } } } },
  intermediary: { select: companyRefSelect },
  client: { select: companyRefSelect },
  interviews: {
    select: { ...orderedInterviewSelect, status: true },
    orderBy: { scheduledAt: "asc" },
  },
} as const

export type AdminOpportunity = Prisma.OpportunityGetPayload<{
  include: typeof adminOpportunityInclude
}>

export const opportunitySummarySelect = {
  id: true,
  title: true,
  status: true,
  dailyRate: true,
  startMonth: true,
  createdAt: true,
  client: { select: { id: true, name: true } },
} as const

export type OpportunitySummary = Prisma.OpportunityGetPayload<{
  select: typeof opportunitySummarySelect
}>

// Sans 'use cache', comme les autres lectures admin : l'admin relit la base juste après ses mutations.
export async function findAllOpportunitiesForAdmin(): Promise<AdminOpportunity[]> {
  return prisma.opportunity.findMany({
    include: adminOpportunityInclude,
    orderBy: { updatedAt: "desc" },
  })
}

export async function findOpportunityByIdForAdmin(id: string): Promise<AdminOpportunity | null> {
  return prisma.opportunity.findUnique({ where: { id }, include: adminOpportunityInclude })
}

export async function findOpportunityOptions() {
  return prisma.opportunity.findMany({
    where: { status: { notIn: ["REFUSEE", "DECLINEE", "ABANDONNEE"] } },
    select: {
      id: true,
      title: true,
      intermediary: { select: { name: true } },
      client: { select: { name: true } },
    },
    orderBy: { title: "asc" },
  })
}

export type OpportunityOption = Awaited<ReturnType<typeof findOpportunityOptions>>[number]

// Lecture légère pour la recherche des outils : titre et noms des deux entreprises suffisent.
export async function findOpportunitySearchRows() {
  return prisma.opportunity.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      intermediary: { select: { name: true } },
      client: { select: { name: true } },
    },
    orderBy: { title: "asc" },
  })
}

const opportunityRowSelect = {
  id: true,
  title: true,
  status: true,
  dailyRate: true,
  startMonth: true,
  updatedAt: true,
  client: { select: { id: true, name: true } },
  intermediary: { select: { id: true, name: true } },
} as const

export async function findOpportunitiesPage(
  page: PageQuery<Prisma.OpportunityWhereInput, Prisma.OpportunityOrderByWithRelationInput>,
) {
  const [rows, total] = await prisma.$transaction([
    prisma.opportunity.findMany({ ...page, select: opportunityRowSelect }),
    prisma.opportunity.count({ where: page.where }),
  ])
  return { rows, total }
}
