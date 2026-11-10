import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { interviewPlaces } from "@/lib/crm/interviews"
import { prisma } from "@/lib/prisma"
import { companyRefSelect } from "@/server/queries/company-ref"
import { type PageQuery, personRefSelect } from "@/server/queries/persons"

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
      intermediary: { select: companyRefSelect },
      client: { select: companyRefSelect },
    },
  },
  correspondents: {
    select: { ...personRefSelect, company: { select: { logoFilename: true } } },
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

// Lecture légère pour la recherche des outils : tous les entretiens, pour que le numéro se déduise de l'opportunité entière.
export async function findInterviewSearchRows() {
  return prisma.interview.findMany({
    select: { ...orderedInterviewSelect, opportunity: { select: { title: true } } },
  })
}

const interviewRowSelect = {
  ...orderedInterviewSelect,
  side: true,
  status: true,
  outcome: true,
  score: true,
  updatedAt: true,
  opportunity: { select: { title: true } },
} as const

// Le numéro se calcule sur tous les entretiens des opportunités de la page, avant filtre et pagination : « Entretien 2 » reste « Entretien 2 » dans une liste filtrée.
export async function findInterviewsPage(
  page: PageQuery<Prisma.InterviewWhereInput, Prisma.InterviewOrderByWithRelationInput>,
) {
  const [rows, total] = await prisma.$transaction([
    prisma.interview.findMany({ ...page, select: interviewRowSelect }),
    prisma.interview.count({ where: page.where }),
  ])
  const siblings = await prisma.interview.findMany({
    where: { opportunityId: { in: [...new Set(rows.map((row) => row.opportunityId))] } },
    select: orderedInterviewSelect,
  })
  const places = interviewPlaces(siblings)
  return {
    rows: rows.map((row) => ({ ...row, number: places.get(row.id)?.number ?? null })),
    total,
  }
}
