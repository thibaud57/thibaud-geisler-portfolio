import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { companyRefSelect } from "@/server/queries/company-ref"
import { personRefSelect } from "@/server/queries/persons"

const adminProspectingActionInclude = {
  person: {
    select: { ...personRefSelect, company: { select: companyRefSelect } },
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

const actionTimelineSelect = {
  id: true,
  personId: true,
  title: true,
  channel: true,
  status: true,
  occurredAt: true,
  createdAt: true,
} as const

export type ActionTimelineRow = Prisma.ProspectingActionGetPayload<{
  select: typeof actionTimelineSelect
}>

// Sans le message ni la personne : la liste des leads n'en montre que le type, le statut et la date, sans embarquer le texte de chaque échange.
export async function findActionTimelinesForAdmin(): Promise<ActionTimelineRow[]> {
  return prisma.prospectingAction.findMany({
    where: { person: { lead: { isNot: null } } },
    select: actionTimelineSelect,
  })
}

export async function findProspectingActionsOfPerson(
  personId: string,
): Promise<AdminProspectingAction[]> {
  return prisma.prospectingAction.findMany({
    where: { personId },
    include: adminProspectingActionInclude,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  })
}
