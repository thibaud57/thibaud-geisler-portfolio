import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminProspectingActionInclude = {
  person: {
    select: {
      id: true,
      name: true,
      email: true,
      linkedinUrl: true,
      optedOutAt: true,
      company: { select: { id: true, name: true, logoFilename: true } },
    },
  },
} as const

export type AdminProspectingAction = Prisma.ProspectingActionGetPayload<{
  include: typeof adminProspectingActionInclude
}>

// Sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export async function findAllProspectingActionsForAdmin(): Promise<AdminProspectingAction[]> {
  return prisma.prospectingAction.findMany({
    include: adminProspectingActionInclude,
    orderBy: { occurredAt: "desc" },
  })
}
