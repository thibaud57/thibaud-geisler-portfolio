import type { Company, ProjectType } from "@/generated/prisma/client"
import { OPTED_OUT_CLEARED } from "@/lib/persons"
import { prisma } from "@/lib/prisma"
import type { CompanyInput } from "@/lib/schemas/company"
import { retrieveCompanyLogo } from "@/server/company-logo/fetch-company-logo"

import type { Issue, Prepared } from "./import-file"

type CompanyCrmFields = Pick<
  Company,
  "types" | "zones" | "relationStatus" | "notes" | "details"
> & {
  clientMetas: { project: { type: ProjectType } }[]
}

// Valeurs laissées par la migration du 02 (colonnes par défaut, plus son rattrapage qui type Client final toute
// entreprise citée par un projet client et Ma société celle du propriétaire) : tant qu'elles y sont, rien n'a été saisi
function hasDefaultCrmFields(company: CompanyCrmFields): boolean {
  const citedByClientProject = company.clientMetas.some((meta) => meta.project.type === "CLIENT")
  const backfilledTypes =
    company.types.length === 1 &&
    (company.types[0] === "MA_SOCIETE" ||
      (company.types[0] === "CLIENT_FINAL" && citedByClientProject))
  return (
    (company.types.length === 0 || backfilledTypes) &&
    company.zones.length === 0 &&
    company.relationStatus === "ACTIVE" &&
    company.notes === null &&
    company.details === null
  )
}

// Les entreprises en sont exclues : celles du portfolio sont mises à jour, pas créées
export async function countCrmRows() {
  return {
    persons: await prisma.person.count(),
    leads: await prisma.lead.count(),
    contacts: await prisma.contact.count(),
    prospectingActions: await prisma.prospectingAction.count(),
    opportunities: await prisma.opportunity.count(),
    interviews: await prisma.interview.count(),
    signals: await prisma.signal.count(),
    weeklyReviews: await prisma.weeklyReview.count(),
  }
}

export async function checkDatabase(p: Prepared): Promise<Issue[]> {
  const issues: Issue[] = []
  if (Object.values(await countCrmRows()).some((count) => count > 0)) {
    issues.push({
      list: "base",
      key: "tables CRM",
      message:
        "déjà des lignes : restaurer le point d'avant reprise (just db-reset puis just db-restore)",
    })
  }

  for (const { record, data } of p.companies) {
    const existing = await prisma.company.findUnique({
      where: { slug: record.existingSlug ?? data.slug },
      select: {
        types: true,
        zones: true,
        relationStatus: true,
        notes: true,
        details: true,
        clientMetas: { select: { project: { select: { type: true } } } },
      },
    })
    if (record.existingSlug === null) {
      if (existing) {
        issues.push({
          list: "companies",
          key: record.key,
          message: `slug ${data.slug} déjà pris en base : renseigner existingSlug ou changer de slug`,
        })
      }
    } else if (!existing) {
      issues.push({
        list: "companies",
        key: record.key,
        message: `entreprise du portfolio introuvable : ${record.existingSlug}`,
      })
    } else if (!hasDefaultCrmFields(existing)) {
      issues.push({
        list: "companies",
        key: record.key,
        message: "champs CRM déjà saisis en base : à trancher au relevé avant de les remplacer",
      })
    }
  }
  return issues
}

function idOf(ids: ReadonlyMap<string, string>, key: string): string {
  const id = ids.get(key)
  if (id === undefined) throw new Error(`Clé sans fiche écrite : ${key}`)
  return id
}

function optionalIdOf(ids: ReadonlyMap<string, string>, key: string | null): string | null {
  return key === null ? null : idOf(ids, key)
}

function crmFields(data: CompanyInput) {
  return {
    types: data.types,
    relationStatus: data.relationStatus,
    zones: data.zones,
    notes: data.notes,
    details: data.details,
  }
}

type PortfolioCompany = Pick<Company, "id" | "sectors" | "size" | "websiteUrl" | "logoFilename">

// Les champs publics alimentent le site publié : Notion n'en remplit que les vides
function portfolioMerge(existing: PortfolioCompany, data: CompanyInput) {
  return {
    sectors: existing.sectors.length > 0 ? existing.sectors : data.sectors,
    size: existing.size ?? data.size,
    websiteUrl: existing.websiteUrl ?? data.websiteUrl,
    logoFilename: existing.logoFilename ?? data.logoFilename,
    ...crmFields(data),
  }
}

export async function writeAll(p: Prepared): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const companyIds = new Map<string, string>()
      for (const { record, data } of p.companies) {
        if (record.existingSlug === null) {
          const { id } = await tx.company.create({
            data: {
              slug: data.slug,
              name: data.name,
              sectors: data.sectors,
              size: data.size,
              websiteUrl: data.websiteUrl,
              logoFilename: data.logoFilename,
              ...crmFields(data),
              createdAt: record.createdAt,
            },
            select: { id: true },
          })
          companyIds.set(record.key, id)
          continue
        }
        const existing = await tx.company.findUniqueOrThrow({
          where: { slug: record.existingSlug },
          select: { id: true, sectors: true, size: true, websiteUrl: true, logoFilename: true },
        })
        await tx.company.update({
          where: { id: existing.id },
          data: portfolioMerge(existing, data),
        })
        companyIds.set(record.key, existing.id)
      }

      // Un rôle référence l'id de la personne (Lead.personId/Contact.personId sont aussi leur clé primaire) : une seule map suffit pour rôles, opportunités, entretiens et signaux.
      const personIds = new Map<string, string>()
      for (const { record, data } of p.persons) {
        const { id } = await tx.person.create({
          data: {
            ...data,
            companyId: optionalIdOf(companyIds, record.companyKey),
            createdAt: record.createdAt,
            exchangesErasedAt: record.exchangesErasedAt,
            ...(record.optedOutAt === null
              ? {}
              : { ...OPTED_OUT_CLEARED, optedOutAt: record.optedOutAt }),
          },
          select: { id: true },
        })
        personIds.set(record.key, id)
      }

      for (const { record, data } of p.leads) {
        await tx.lead.create({
          data: {
            ...data,
            personId: idOf(personIds, record.personKey),
            createdAt: record.createdAt,
          },
        })
      }

      for (const { record, data } of p.contacts) {
        await tx.contact.create({
          data: {
            ...data,
            personId: idOf(personIds, record.personKey),
            createdAt: record.createdAt,
          },
        })
      }

      // La cohérence statut / date de réponse est déjà imposée par la simulation : rien à recalculer, sinon une date serait inventée
      for (const { record, data } of p.prospectingActions) {
        await tx.prospectingAction.create({
          data: {
            ...data,
            personId: idOf(personIds, record.personKey),
            createdAt: record.createdAt,
          },
        })
      }

      const opportunityIds = new Map<string, string>()
      for (const { record, data } of p.opportunities) {
        const { id } = await tx.opportunity.create({
          data: {
            ...data,
            referrerId: optionalIdOf(personIds, record.referrerKey),
            intermediaryId: optionalIdOf(companyIds, record.intermediaryKey),
            clientId: optionalIdOf(companyIds, record.clientKey),
            createdAt: record.createdAt,
          },
          select: { id: true },
        })
        opportunityIds.set(record.key, id)
      }

      for (const { record, data } of p.interviews) {
        const { correspondentIds, newCorrespondents, opportunityId, ...fields } = data
        await tx.interview.create({
          data: {
            ...fields,
            opportunityId: idOf(opportunityIds, record.opportunityKey),
            correspondents: { connect: correspondentIds.map((k) => ({ id: idOf(personIds, k) })) },
            createdAt: record.createdAt,
          },
        })
      }

      for (const { record, data } of p.signals) {
        await tx.signal.create({
          data: {
            ...data,
            companyId: optionalIdOf(companyIds, record.companyKey),
            personId: optionalIdOf(personIds, record.personKey),
            createdAt: record.createdAt,
          },
        })
      }

      for (const { record, data } of p.weeklyReviews) {
        await tx.weeklyReview.create({ data: { ...data, createdAt: record.createdAt } })
      }
    },
    // Des centaines d'écritures en série : le délai par défaut de 5 s ne suffit pas
    { timeout: 300_000 },
  )
}

export interface LogoFailure {
  slug: string
  reason: string
}

// Hors transaction : un site lent ou sans icône ne doit pas annuler la reprise
export async function fetchMissingLogos(p: Prepared): Promise<LogoFailure[]> {
  const slugs = p.companies.map(({ record, data }) => record.existingSlug ?? data.slug)
  const companies = await prisma.company.findMany({
    where: { slug: { in: slugs }, logoFilename: null, websiteUrl: { not: null } },
    select: { id: true, slug: true, websiteUrl: true },
  })
  const failures: LogoFailure[] = []
  for (const company of companies) {
    // Le filtre `not: null` ne resserre pas le type Prisma du champ
    if (company.websiteUrl === null) continue
    try {
      const logo = await retrieveCompanyLogo(company.websiteUrl, company.slug)
      await prisma.company.update({ where: { id: company.id }, data: { logoFilename: logo.key } })
    } catch (err) {
      failures.push({
        slug: company.slug,
        reason: err instanceof Error ? err.message || err.constructor.name : String(err),
      })
    }
  }
  return failures
}
