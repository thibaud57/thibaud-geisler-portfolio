import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

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
} as const

export type AdminOpportunity = Prisma.OpportunityGetPayload<{
  include: typeof adminOpportunityInclude
}>

export const opportunitySummarySelect = {
  id: true,
  title: true,
  status: true,
  dailyRate: true,
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
