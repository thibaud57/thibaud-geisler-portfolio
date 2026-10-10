import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminOpportunityInclude = {
  referrer: {
    select: { id: true, name: true, email: true, linkedinUrl: true, optedOutAt: true },
  },
  intermediary: { select: { id: true, name: true, logoFilename: true } },
  client: { select: { id: true, name: true, logoFilename: true } },
} as const

export type AdminOpportunity = Prisma.OpportunityGetPayload<{
  include: typeof adminOpportunityInclude
}>

// Sans 'use cache', comme les autres lectures admin : l'admin relit la base juste après ses mutations.
export async function findAllOpportunitiesForAdmin(): Promise<AdminOpportunity[]> {
  return prisma.opportunity.findMany({
    include: adminOpportunityInclude,
    orderBy: { updatedAt: "desc" },
  })
}
