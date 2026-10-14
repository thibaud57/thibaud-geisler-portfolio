import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { companyRefSelect } from "@/server/queries/company-ref"
import { orderedInterviewSelect } from "@/server/queries/interviews"
import { personRefSelect } from "@/server/queries/persons"

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
