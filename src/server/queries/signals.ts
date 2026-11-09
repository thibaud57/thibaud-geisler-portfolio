import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { leadNameSelect, type PageQuery } from "@/server/queries/persons"

export const signalsInclude = {
  select: {
    id: true,
    type: true,
    occurredOn: true,
    content: true,
    sourceUrl: true,
  },
  orderBy: [{ occurredOn: "desc" }, { id: "asc" }],
} satisfies Prisma.SignalFindManyArgs

const companyNameSelect = { select: { id: true, name: true } } as const

const signalTargetSelect = { company: companyNameSelect, person: leadNameSelect } as const

export type SignalTargets = Prisma.SignalGetPayload<{ select: typeof signalTargetSelect }>

// Lecture sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export function findSignalById(id: string) {
  return prisma.signal.findUnique({
    where: { id },
    select: {
      ...signalsInclude.select,
      createdAt: true,
      updatedAt: true,
      ...signalTargetSelect,
    },
  })
}

// Lecture légère pour la recherche des outils : le contenu et la fiche visée suffisent.
export function findSignalSearchRows() {
  return prisma.signal.findMany({
    select: { id: true, type: true, occurredOn: true, content: true, ...signalTargetSelect },
  })
}

export async function findSignalsPage(
  page: PageQuery<Prisma.SignalWhereInput, Prisma.SignalOrderByWithRelationInput>,
) {
  const [rows, total] = await prisma.$transaction([
    prisma.signal.findMany({
      ...page,
      select: { ...signalsInclude.select, updatedAt: true, ...signalTargetSelect },
    }),
    prisma.signal.count({ where: page.where }),
  ])
  return { rows, total }
}
