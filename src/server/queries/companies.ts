import "server-only"

import { firstContactAtOf } from "@/lib/company-first-contact"
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

const companyPersonSelect = {
  ...companyLeadPersonSelect,
  prospectingActions: {
    where: { status: { not: "A_FAIRE" } },
    orderBy: { occurredAt: "asc" },
    take: 1,
    select: { status: true, occurredAt: true },
  },
} as const

type AdminCompanyRaw = Prisma.CompanyGetPayload<{
  include: typeof adminCompanyInclude & {
    _count: { select: { clientMetas: true } }
    clientMetas: { select: { project: { select: { type: true } } } }
    persons: { select: typeof companyPersonSelect }
  }
}>

type AdminCompanyLead = Omit<
  AdminCompanyRaw["persons"][number],
  "lead" | "optedOutAt" | "prospectingActions"
> & {
  status: LeadStatus
}

export type AdminCompany = Omit<AdminCompanyRaw, "clientMetas" | "persons"> & {
  worked: boolean
  isProspect: boolean
  leads: AdminCompanyLead[]
  firstContactAt: Date | null
}

// Seul point de calcul de worked, isProspect et firstContactAt : une règle recalculée ailleurs finirait par diverger de celle-ci.
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
  return { ...company, worked, isProspect, leads, firstContactAt: firstContactAtOf(persons) }
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
      // Toutes les personnes : le premier contact compte aussi celles sans lead. isProspect et `leads` filtrent sur lead dans toAdminCompany.
      persons: {
        select: companyPersonSelect,
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
