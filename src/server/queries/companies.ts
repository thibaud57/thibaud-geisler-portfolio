import "server-only"

import { isActiveLead } from "@/lib/lead-views"
import { prisma } from "@/lib/prisma"
import type { LeadStatus, Prisma } from "@/generated/prisma/client"

const legalEntityInclude = { legalEntity: { include: { address: true, publisher: true } } } as const

const adminCompanyInclude = legalEntityInclude

const companyLeadPersonSelect = {
  id: true,
  name: true,
  jobRole: true,
  email: true,
  linkedinUrl: true,
  optedOutAt: true,
  lead: { select: { status: true } },
} as const

type AdminCompanyRaw = Prisma.CompanyGetPayload<{
  include: typeof adminCompanyInclude & {
    _count: { select: { clientMetas: true } }
    clientMetas: { select: { project: { select: { type: true } } } }
    persons: { select: typeof companyLeadPersonSelect }
  }
}>

type AdminCompanyLead = Omit<AdminCompanyRaw["persons"][number], "lead" | "optedOutAt"> & {
  status: LeadStatus
}

export type AdminCompany = Omit<AdminCompanyRaw, "clientMetas" | "persons"> & {
  worked: boolean
  isProspect: boolean
  leads: AdminCompanyLead[]
}

// Seul point de calcul de worked et isProspect : une règle recalculée ailleurs finirait par diverger de celle-ci.
function toAdminCompany({ clientMetas, persons, ...company }: AdminCompanyRaw): AdminCompany {
  // Un projet personnel crée aussi un ClientMeta (src/server/actions/projects.ts) : seul un projet CLIENT compte comme travaillée.
  const worked = clientMetas.some((meta) => meta.project.type === "CLIENT")
  const isProspect =
    !worked &&
    persons.some(
      (person) =>
        person.lead !== null &&
        isActiveLead({ status: person.lead.status, optedOutAt: person.optedOutAt }),
    )
  const leads = persons.flatMap(({ id, name, jobRole, email, linkedinUrl, lead }) =>
    lead ? [{ id, name, jobRole, email, linkedinUrl, status: lead.status }] : [],
  )
  return { ...company, worked, isProspect, leads }
}

// Sans 'use cache', comme les tags : l'administration doit lire la base juste après ses propres
// mutations, là où la requête publique servirait un instantané antérieur.
export async function findAllCompaniesForAdmin(): Promise<AdminCompany[]> {
  const companies = await prisma.company.findMany({
    include: {
      ...adminCompanyInclude,
      _count: { select: { clientMetas: true } },
      // Chargé seulement pour calculer `worked` dans `toAdminCompany`, jamais renvoyé.
      clientMetas: { select: { project: { select: { type: true } } } },
      // Les mêmes lignes donnent isProspect (statut et opposition) et la liste `leads`.
      persons: {
        where: { lead: { isNot: null } },
        select: companyLeadPersonSelect,
        orderBy: { name: { sort: "asc", nulls: "last" } },
      },
    },
    orderBy: { name: "asc" },
  })

  return companies.map(toAdminCompany)
}

export async function findCompanyByIdForAdmin(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: legalEntityInclude,
  })
}

export type AdminCompanyDetail = NonNullable<Awaited<ReturnType<typeof findCompanyByIdForAdmin>>>

export async function findCompanyOptions() {
  return prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export type CompanyOption = Awaited<ReturnType<typeof findCompanyOptions>>[number]
