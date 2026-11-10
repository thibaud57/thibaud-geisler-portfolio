import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { CounterSources } from "@/lib/crm/review-counters"
import type { PageQuery } from "@/server/queries/persons"

// Sans 'use cache', comme les autres lectures admin : l'administration relit la base juste après ses mutations.
export async function findAllWeeklyReviewsForAdmin() {
  return prisma.weeklyReview.findMany({ orderBy: { closingFriday: "desc" } })
}

export type AdminWeeklyReview = Awaited<ReturnType<typeof findAllWeeklyReviewsForAdmin>>[number]

export function findWeeklyReviewById(id: string) {
  return prisma.weeklyReview.findUnique({ where: { id } })
}

// Le vendredi suffit à la recherche des outils (libellé de semaine et date).
export function findWeeklyReviewSearchRows() {
  return prisma.weeklyReview.findMany({ select: { id: true, closingFriday: true } })
}

const weeklyReviewRowSelect = {
  id: true,
  closingFriday: true,
  connectionsSent: true,
  connectionsAccepted: true,
  messagesSent: true,
  conversationsEngaged: true,
  meetingsBooked: true,
  interviewsHeld: true,
  activeLeads: true,
  status: true,
  motivation: true,
  updatedAt: true,
} as const

export async function findWeeklyReviewsPage(
  page: PageQuery<Prisma.WeeklyReviewWhereInput, Prisma.WeeklyReviewOrderByWithRelationInput>,
) {
  const [rows, total] = await prisma.$transaction([
    prisma.weeklyReview.findMany({ ...page, select: weeklyReviewRowSelect }),
    prisma.weeklyReview.count({ where: page.where }),
  ])
  return { rows, total }
}

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
    // Opportunités apportées et entretiens vivent sur la personne, pas sur le rôle Lead. `leadDisplayStatus` ne lit que « une opportunité acceptée existe » et les entretiens planifiés.
    prisma.lead.findMany({
      where: { person: { optedOutAt: null } },
      select: {
        status: true,
        person: {
          select: {
            optedOutAt: true,
            referredOpportunities: {
              where: { status: "ACCEPTEE" },
              select: { status: true },
              take: 1,
            },
            interviews: {
              where: { status: "PLANIFIE" },
              select: { status: true, scheduledAt: true },
            },
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
