import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { orderedInterviewSelect } from "@/server/queries/interviews"

const adminOpportunityInclude = {
  referrer: {
    select: {
      id: true,
      name: true,
      email: true,
      linkedinUrl: true,
      optedOutAt: true,
      lead: { select: { personId: true } },
      contact: { select: { personId: true } },
    },
  },
  intermediary: { select: { id: true, name: true, logoFilename: true } },
  client: { select: { id: true, name: true, logoFilename: true } },
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
