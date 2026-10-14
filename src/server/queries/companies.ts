import "server-only"

import { countClientProjects, isWorkedCompany, joinedEndClientNames } from "@/lib/crm/companies"
import { firstContactAtOf } from "@/lib/crm/company-first-contact"
import { leadDisplayStatus, type LeadDisplayStatus } from "@/lib/crm/lead-display-status"
import { isActiveLead } from "@/lib/crm/lead-views"
import { SENT_STATUS_WHERE } from "@/lib/crm/prospecting-action-status"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { opportunitySummarySelect } from "@/server/queries/opportunities"
import { personNameOrder } from "@/server/queries/persons"
import { signalsInclude } from "@/server/queries/signals"

const legalEntityInclude = { legalEntity: { include: { address: true, publisher: true } } } as const

const adminCompanyInclude = {
  ...legalEntityInclude,
  opportunitiesAsIntermediary: { select: opportunitySummarySelect, orderBy: { updatedAt: "desc" } },
  opportunitiesAsClient: { select: opportunitySummarySelect, orderBy: { updatedAt: "desc" } },
  signals: signalsInclude,
} as const

const companyCounts = {
  _count: {
    select: { clientMetas: true, opportunitiesAsIntermediary: true, opportunitiesAsClient: true },
  },
} as const

const companyLeadPersonSelect = {
  id: true,
  name: true,
  jobRole: true,
  email: true,
  linkedinUrl: true,
  metAt: true,
  optedOutAt: true,
  lead: { select: { status: true, createdAt: true } },
  referredOpportunities: { select: { status: true } },
  interviews: { select: { status: true, scheduledAt: true } },
} as const

const companyPersonSelect = {
  ...companyLeadPersonSelect,
  prospectingActions: {
    where: { status: SENT_STATUS_WHERE },
    orderBy: { occurredAt: "asc" },
    take: 1,
    select: { status: true, occurredAt: true },
  },
} as const

// Le plus ancien entretien tenu de chaque opportunité suffit au premier contact.
const companyOpportunitySelect = {
  ...opportunitySummarySelect,
  interviews: {
    where: { status: "FAIT" },
    orderBy: { scheduledAt: "asc" },
    take: 1,
    select: { status: true, scheduledAt: true },
  },
} as const

const companyListInclude = {
  ...adminCompanyInclude,
  ...companyCounts,
  opportunitiesAsIntermediary: { select: companyOpportunitySelect, orderBy: { updatedAt: "desc" } },
  opportunitiesAsClient: { select: companyOpportunitySelect, orderBy: { updatedAt: "desc" } },
  // Chargé seulement pour calculer `worked` dans `toAdminCompany`, jamais renvoyé.
  clientMetas: { select: { project: { select: { type: true } } } },
  // Toutes les personnes : le premier contact compte aussi celles sans lead. isProspect et `leads` filtrent sur lead dans toAdminCompany.
  persons: {
    select: companyPersonSelect,
    orderBy: personNameOrder,
  },
} as const

type AdminCompanyRaw = Prisma.CompanyGetPayload<{ include: typeof companyListInclude }>

type AdminCompanyLead = Omit<
  AdminCompanyRaw["persons"][number],
  "lead" | "optedOutAt" | "prospectingActions" | "referredOpportunities" | "interviews"
> & {
  status: LeadDisplayStatus | null
  createdAt: Date
}

export type AdminCompany = Omit<AdminCompanyRaw, "clientMetas" | "persons"> & {
  worked: boolean
  clientProjectCount: number
  isProspect: boolean
  leads: AdminCompanyLead[]
  firstContactAt: Date | null
  endClients: string[]
}

// Seul point de calcul de worked, isProspect, endClients et firstContactAt : une règle recalculée ailleurs finirait par diverger de celle-ci.
function toAdminCompany(
  { clientMetas, persons, ...company }: AdminCompanyRaw,
  now: Date,
): AdminCompany {
  const clientProjectCount = countClientProjects(clientMetas)
  const worked = isWorkedCompany({ ...company, clientProjectCount })
  const isProspect =
    !worked &&
    persons.some(
      (person) =>
        person.lead !== null &&
        isActiveLead(
          {
            status: person.lead.status,
            opportunities: person.referredOpportunities,
            interviews: person.interviews,
            optedOutAt: person.optedOutAt,
          },
          now,
        ),
    )
  const heldInterviews = [
    ...company.opportunitiesAsClient,
    ...company.opportunitiesAsIntermediary,
  ].flatMap((opportunity) => opportunity.interviews)
  const leads = persons.flatMap(
    ({
      id,
      name,
      jobRole,
      email,
      linkedinUrl,
      metAt,
      optedOutAt,
      lead,
      referredOpportunities,
      interviews,
    }) =>
      lead
        ? [
            {
              id,
              name,
              jobRole,
              email,
              linkedinUrl,
              metAt,
              status: leadDisplayStatus(
                {
                  status: lead.status,
                  opportunities: referredOpportunities,
                  interviews,
                  optedOutAt,
                },
                now,
              ),
              createdAt: lead.createdAt,
            },
          ]
        : [],
  )
  return {
    ...company,
    worked,
    clientProjectCount,
    isProspect,
    leads,
    firstContactAt: firstContactAtOf(persons, heldInterviews),
    endClients: joinedEndClientNames(company),
  }
}

// Sans 'use cache', comme les tags : l'administration doit lire la base juste après ses propres
// mutations, là où la requête publique servirait un instantané antérieur.
export async function findAllCompaniesForAdmin(): Promise<AdminCompany[]> {
  const companies = await prisma.company.findMany({
    include: companyListInclude,
    orderBy: { name: "asc" },
  })

  const now = new Date()
  return companies.map((company) => toAdminCompany(company, now))
}

export async function findCompanyByIdForAdmin(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: adminCompanyInclude,
  })
}

export type AdminCompanyDetail = NonNullable<Awaited<ReturnType<typeof findCompanyByIdForAdmin>>>

export async function findCompanyOptions() {
  return prisma.company.findMany({
    select: { id: true, name: true, types: true },
    orderBy: { name: "asc" },
  })
}

export type CompanyOption = Awaited<ReturnType<typeof findCompanyOptions>>[number]
