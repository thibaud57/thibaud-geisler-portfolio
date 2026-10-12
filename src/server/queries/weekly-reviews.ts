import "server-only"

import { prisma } from "@/lib/prisma"
import type { CounterSources } from "@/lib/crm/review-counters"

// Sans 'use cache', comme les autres lectures admin : l'administration relit la base juste après ses mutations.
export async function findAllWeeklyReviewsForAdmin() {
  return prisma.weeklyReview.findMany({ orderBy: { closingFriday: "desc" } })
}

export type AdminWeeklyReview = Awaited<ReturnType<typeof findAllWeeklyReviewsForAdmin>>[number]

export async function findWeekCounterSources(bounds: {
  start: Date
  end: Date
}): Promise<CounterSources> {
  const inWeek = { gte: bounds.start, lt: bounds.end }
  const [actions, interviews, leads] = await Promise.all([
    prisma.prospectingAction.findMany({
      where: { OR: [{ occurredAt: inWeek }, { respondedAt: inWeek }] },
      select: { channel: true, status: true, occurredAt: true, respondedAt: true },
    }),
    prisma.interview.findMany({
      where: { scheduledAt: inWeek },
      select: { status: true, scheduledAt: true },
    }),
    // Opportunités apportées et entretiens vivent sur la personne, pas sur le rôle Lead.
    prisma.lead.findMany({
      where: { person: { optedOutAt: null } },
      select: {
        status: true,
        person: {
          select: {
            optedOutAt: true,
            referredOpportunities: { select: { status: true } },
            interviews: { select: { status: true, scheduledAt: true } },
          },
        },
      },
    }),
  ])
  return {
    actions,
    interviews,
    leads: leads.map(({ person, ...lead }) => ({
      ...lead,
      opportunities: person.referredOpportunities,
      interviews: person.interviews,
      optedOutAt: person.optedOutAt,
    })),
  }
}
