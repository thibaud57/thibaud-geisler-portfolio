import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

// Champs minimaux pour déduire le numéro et l'entretien précédent d'une opportunité.
export const orderedInterviewSelect = {
  id: true,
  opportunityId: true,
  type: true,
  scheduledAt: true,
  createdAt: true,
} as const satisfies Prisma.InterviewSelect

const adminInterviewInclude = {
  opportunity: {
    select: {
      id: true,
      title: true,
      status: true,
      dailyRate: true,
      contract: true,
      workMode: true,
      zone: true,
      intermediary: { select: { id: true, name: true, logoFilename: true } },
      client: { select: { id: true, name: true, logoFilename: true } },
    },
  },
  correspondents: {
    select: {
      id: true,
      name: true,
      email: true,
      linkedinUrl: true,
      optedOutAt: true,
      lead: { select: { personId: true } },
      contact: { select: { personId: true } },
      company: { select: { logoFilename: true } },
    },
    orderBy: { name: "asc" },
  },
} as const

// Le numéro d'un entretien se déduit de tous ceux de son opportunité : la liste n'a pas à les porter sur chaque ligne.
const adminInterviewByIdInclude = {
  ...adminInterviewInclude,
  opportunity: {
    select: {
      ...adminInterviewInclude.opportunity.select,
      interviews: { select: orderedInterviewSelect },
    },
  },
} as const

export type AdminInterview = Prisma.InterviewGetPayload<{ include: typeof adminInterviewInclude }>

export type AdminInterviewWithSiblings = Prisma.InterviewGetPayload<{
  include: typeof adminInterviewByIdInclude
}>

// Sans 'use cache', comme les autres lectures admin : l'administration relit la base juste après ses mutations.
export async function findAllInterviewsForAdmin(): Promise<AdminInterview[]> {
  return prisma.interview.findMany({
    include: adminInterviewInclude,
    orderBy: { scheduledAt: "desc" },
  })
}

export async function findInterviewByIdForAdmin(
  id: string,
): Promise<AdminInterviewWithSiblings | null> {
  return prisma.interview.findUnique({ where: { id }, include: adminInterviewByIdInclude })
}
