import "server-only"

import { countClientProjects, isWorkedCompany, joinedEndClientNames } from "@/lib/crm/companies"
import { firstContactAtOf } from "@/lib/crm/company-first-contact"
import {
  type CompanyRelationDisplayStatus,
  type InteractionSources,
  lastInteractionAtOf,
  relationDisplayStatus,
} from "@/lib/crm/company-relation-status"
import { leadDisplayStatus, type LeadDisplayStatus } from "@/lib/crm/lead-display-status"
import { isInPipeline } from "@/lib/crm/lead-views"
import {
  isPlannedCall,
  plannedCallWhere,
  SENT_STATUS_WHERE,
} from "@/lib/crm/prospecting-action-status"
import { zonedDayStartOf } from "@/lib/date-time"
import { prisma } from "@/lib/prisma"
import type { Prisma, RelationStatus } from "@/generated/prisma/client"
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

const companyPersonSelect = {
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

const prospectingActionSelect = {
  channel: true,
  status: true,
  occurredAt: true,
  respondedAt: true,
} as const

// Les entretiens tenus de ses opportunités datent le premier contact et la dernière interaction.
const heldInterviewsSelect = {
  where: { status: "FAIT" },
  select: { status: true, scheduledAt: true },
} as const

const interactionOpportunitySelect = {
  status: true,
  startMonth: true,
  durationMonths: true,
  interviews: heldInterviewsSelect,
} as const

const companyOpportunitySelect = {
  ...opportunitySummarySelect,
  ...interactionOpportunitySelect,
} as const

const clientProjectSelect = {
  select: { project: { select: { type: true, startedAt: true, endedAt: true } } },
} as const

const interactionPersonSelect = {
  metAt: true,
  prospectingActions: { where: { status: SENT_STATUS_WHERE }, select: prospectingActionSelect },
} as const

// Tout ce que lit `lastInteractionAtOf`, chargé tel quel pour la fiche et la page de l'outil MCP.
const companyInteractionSelect = {
  clientMetas: clientProjectSelect,
  persons: { select: interactionPersonSelect },
  opportunitiesAsIntermediary: { select: interactionOpportunitySelect },
  opportunitiesAsClient: { select: interactionOpportunitySelect },
} satisfies Prisma.CompanySelect

// Les actions sorties d'À faire (premier contact) et les calls planifiés (RDV planifié) partagent une seule sélection, que `toAdminCompany` sépare en mémoire.
function companyListIncludeAt(now: Date) {
  return {
    ...adminCompanyInclude,
    ...companyCounts,
    opportunitiesAsIntermediary: {
      select: companyOpportunitySelect,
      orderBy: { updatedAt: "desc" },
    },
    opportunitiesAsClient: { select: companyOpportunitySelect, orderBy: { updatedAt: "desc" } },
    // Chargé seulement pour calculer `worked` et la dernière interaction dans `toAdminCompany`, jamais renvoyé.
    clientMetas: clientProjectSelect,
    // Toutes les personnes : le premier contact compte aussi celles sans lead. isProspect et `leads` filtrent sur lead dans toAdminCompany.
    persons: {
      select: {
        ...companyPersonSelect,
        prospectingActions: {
          select: prospectingActionSelect,
          where: { OR: [{ status: SENT_STATUS_WHERE }, plannedCallWhere(zonedDayStartOf(now))] },
        },
      },
      orderBy: personNameOrder,
    },
  } satisfies Prisma.CompanyInclude
}

type AdminCompanyRaw = Prisma.CompanyGetPayload<{
  include: ReturnType<typeof companyListIncludeAt>
}>

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
  lastInteractionAt: Date | null
  displayRelationStatus: CompanyRelationDisplayStatus
  endClients: string[]
}

type InteractionOpportunity = InteractionSources["opportunities"][number] & {
  interviews: InteractionSources["interviews"]
}

interface InteractionRows {
  persons: readonly { metAt: Date | null; prospectingActions: InteractionSources["actions"] }[]
  clientMetas: readonly { project: InteractionSources["projects"][number] }[]
  opportunitiesAsIntermediary: readonly InteractionOpportunity[]
  opportunitiesAsClient: readonly InteractionOpportunity[]
}

const toOpportunitySummary = ({
  durationMonths,
  interviews,
  ...summary
}: AdminCompanyRaw["opportunitiesAsClient"][number]) => summary

// Seul assemblage des sources de `lastInteractionAtOf` : la liste, la fiche et la page de l'outil MCP en partent.
function companyInteractionState(rows: InteractionRows, stored: RelationStatus, now: Date) {
  const opportunities = [...rows.opportunitiesAsIntermediary, ...rows.opportunitiesAsClient]
  const heldInterviews = opportunities.flatMap((opportunity) => opportunity.interviews)
  const lastInteractionAt = lastInteractionAtOf(
    {
      actions: rows.persons.flatMap((person) => person.prospectingActions),
      metAts: rows.persons.flatMap((person) => (person.metAt ? [person.metAt] : [])),
      interviews: heldInterviews,
      projects: rows.clientMetas.map((meta) => meta.project),
      opportunities,
    },
    now,
  )
  return {
    heldInterviews,
    lastInteractionAt,
    displayRelationStatus: relationDisplayStatus(stored, lastInteractionAt, now),
  }
}

// Seul point de calcul de worked, isProspect, endClients, firstContactAt, lastInteractionAt et du statut affiché : une règle recalculée ailleurs finirait par diverger de celle-ci.
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
        isInPipeline(
          {
            status: person.lead.status,
            opportunities: person.referredOpportunities,
            interviews: person.interviews,
            optedOutAt: person.optedOutAt,
            plannedCalls: person.prospectingActions.filter((action) =>
              isPlannedCall(action.channel, action.status),
            ),
          },
          now,
        ),
    )
  const { heldInterviews, ...interaction } = companyInteractionState(
    {
      persons,
      clientMetas,
      opportunitiesAsIntermediary: company.opportunitiesAsIntermediary,
      opportunitiesAsClient: company.opportunitiesAsClient,
    },
    company.relationStatus,
    now,
  )
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
      prospectingActions,
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
                  plannedCalls: prospectingActions.filter((action) =>
                    isPlannedCall(action.channel, action.status),
                  ),
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
    ...interaction,
    endClients: joinedEndClientNames(company),
  }
}

// Sans 'use cache', comme les tags : l'administration doit lire la base juste après ses propres
// mutations, là où la requête publique servirait un instantané antérieur.
export async function findAllCompaniesForAdmin(): Promise<AdminCompany[]> {
  const now = new Date()
  const companies = await prisma.company.findMany({
    include: companyListIncludeAt(now),
    orderBy: { name: "asc" },
  })

  return companies.map((company) => toAdminCompany(company, now))
}

export async function findCompanyByIdForAdmin(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: adminCompanyInclude,
  })
}

// Fiche pour les outils des agents : les personnes y sont réduites à ce qui les nomme et à leurs rôles. Les sources de la dernière interaction sont lues dans la même requête, `findCompanyWithLinks` les retire du résultat.
const toolCompanyInclude = {
  ...adminCompanyInclude,
  opportunitiesAsIntermediary: { select: companyOpportunitySelect, orderBy: { updatedAt: "desc" } },
  opportunitiesAsClient: { select: companyOpportunitySelect, orderBy: { updatedAt: "desc" } },
  clientMetas: clientProjectSelect,
  persons: {
    select: {
      id: true,
      name: true,
      email: true,
      linkedinUrl: true,
      lead: { select: { personId: true } },
      contact: { select: { personId: true } },
      ...interactionPersonSelect,
    },
    orderBy: personNameOrder,
  },
} as const

export async function findCompanyWithLinks(id: string, now: Date) {
  const row = await prisma.company.findUnique({ where: { id }, include: toolCompanyInclude })
  if (!row) return null
  const { clientMetas, persons, opportunitiesAsIntermediary, opportunitiesAsClient, ...company } =
    row
  const { displayRelationStatus, lastInteractionAt } = companyInteractionState(
    { clientMetas, persons, opportunitiesAsIntermediary, opportunitiesAsClient },
    company.relationStatus,
    now,
  )
  return {
    ...company,
    opportunitiesAsIntermediary: opportunitiesAsIntermediary.map(toOpportunitySummary),
    opportunitiesAsClient: opportunitiesAsClient.map(toOpportunitySummary),
    persons: persons.map(({ metAt, prospectingActions, ...person }) => person),
    lastInteractionAt,
    displayRelationStatus,
  }
}

export async function findCompanyNames() {
  return prisma.company.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  })
}

const companyRowSelect = {
  id: true,
  name: true,
  slug: true,
  relationStatus: true,
  types: true,
  zones: true,
  updatedAt: true,
} as const

const COMPANY_PAGE_COMPARATORS = {
  name: (a, b) => a.name.localeCompare(b.name, "fr"),
  createdAt: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  updatedAt: (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime(),
} satisfies Record<
  string,
  (a: { name: string; createdAt: Date; updatedAt: Date }, b: typeof a) => number
>

interface CompaniesPageQuery {
  where: Prisma.CompanyWhereInput
  relationStatus?: CompanyRelationDisplayStatus
  sort: keyof typeof COMPANY_PAGE_COMPARATORS
  order: Prisma.SortOrder
  offset: number
  limit: number
}

// Le statut affiché se déduit des sources : filtre, tri et pagination se font en mémoire (quelques centaines de fiches), `total` compté après le filtre.
export async function findCompaniesPage(
  { where, relationStatus, sort, order, offset, limit }: CompaniesPageQuery,
  now: Date,
) {
  const companies = await prisma.company.findMany({
    where,
    select: { ...companyRowSelect, createdAt: true, ...companyInteractionSelect },
  })
  const direction = order === "asc" ? 1 : -1
  const matching = companies
    .map(({ clientMetas, persons, opportunitiesAsIntermediary, opportunitiesAsClient, ...row }) => {
      const interaction = companyInteractionState(
        { clientMetas, persons, opportunitiesAsIntermediary, opportunitiesAsClient },
        row.relationStatus,
        now,
      )
      return {
        ...row,
        relationStatus: interaction.displayRelationStatus,
        lastInteractionAt: interaction.lastInteractionAt,
      }
    })
    .filter((row) => relationStatus === undefined || row.relationStatus === relationStatus)
    .toSorted(
      (a, b) => direction * COMPANY_PAGE_COMPARATORS[sort](a, b) || a.id.localeCompare(b.id),
    )
  return {
    rows: matching.slice(offset, offset + limit).map(({ createdAt, ...row }) => row),
    total: matching.length,
  }
}

export type AdminCompanyDetail = NonNullable<Awaited<ReturnType<typeof findCompanyByIdForAdmin>>>

export async function findCompanyOptions() {
  return prisma.company.findMany({
    select: { id: true, name: true, types: true },
    orderBy: { name: "asc" },
  })
}

export type CompanyOption = Awaited<ReturnType<typeof findCompanyOptions>>[number]
