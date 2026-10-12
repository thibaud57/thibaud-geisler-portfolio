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
      lead: { select: { personId: true } },
      contact: { select: { personId: true } },
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

// Sans le message ni la personne : la liste des leads n'en montre que le rang, le canal, le statut et la date, et ne doit pas embarquer le texte de chaque échange.
export async function findActionTimelinesForAdmin({
  role,
}: {
  role: "lead" | "contact"
}): Promise<ActionTimelineRow[]> {
  return prisma.prospectingAction.findMany({
    where: { person: { [role]: { isNot: null } } },
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
