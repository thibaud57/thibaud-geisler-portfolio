import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import type { PersonId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { companyRefSelect } from "@/server/queries/company-ref"
import { leadNameSelect, type PageQuery, personRefSelect } from "@/server/queries/persons"

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
  personId: PersonId,
): Promise<AdminProspectingAction[]> {
  return prisma.prospectingAction.findMany({
    where: { personId },
    include: adminProspectingActionInclude,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  })
}

export async function findProspectingActionByIdForAdmin(
  id: string,
): Promise<AdminProspectingAction | null> {
  return prisma.prospectingAction.findUnique({
    where: { id },
    include: adminProspectingActionInclude,
  })
}

// Lecture légère pour la recherche des outils : le titre et le nom du lead suffisent.
export async function findProspectingActionSearchRows() {
  return prisma.prospectingAction.findMany({
    select: { id: true, title: true, status: true, occurredAt: true, person: leadNameSelect },
  })
}

const prospectingActionRowSelect = {
  id: true,
  title: true,
  channel: true,
  status: true,
  occurredAt: true,
  respondedAt: true,
  updatedAt: true,
  person: leadNameSelect,
} as const

export async function findProspectingActionsPage(
  page: PageQuery<
    Prisma.ProspectingActionWhereInput,
    Prisma.ProspectingActionOrderByWithRelationInput
  >,
) {
  const [rows, total] = await prisma.$transaction([
    prisma.prospectingAction.findMany({ ...page, select: prospectingActionRowSelect }),
    prisma.prospectingAction.count({ where: page.where }),
  ])
  return { rows, total }
}
