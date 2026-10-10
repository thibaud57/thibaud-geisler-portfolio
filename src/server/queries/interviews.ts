import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const adminInterviewInclude = {
  opportunity: {
    select: {
      id: true,
      title: true,
      dailyRate: true,
      contract: true,
      workMode: true,
      zone: true,
      intermediary: { select: { id: true, name: true, logoFilename: true } },
      client: { select: { id: true, name: true, logoFilename: true } },
    },
  },
  correspondents: {
    select: { id: true, name: true, email: true, linkedinUrl: true, optedOutAt: true },
    orderBy: { name: "asc" },
  },
} as const

export type AdminInterview = Prisma.InterviewGetPayload<{ include: typeof adminInterviewInclude }>

// Sans 'use cache', comme les autres lectures admin : l'administration relit la base juste après ses mutations.
export async function findAllInterviewsForAdmin(): Promise<AdminInterview[]> {
  return prisma.interview.findMany({
    include: adminInterviewInclude,
    orderBy: { scheduledAt: "desc" },
  })
}
