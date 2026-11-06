import "server-only"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { revalidateTag } from "next/cache"
import { z } from "zod"

import {
  CompanySector,
  CompanySize,
  CompanyType,
  RelationStatus,
  Zone,
} from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { COMPANY_LOGO_FOLDER, isCompanyLogoKey } from "@/lib/asset-keys"
import { COMPANY_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import { personDisplayName } from "@/lib/crm/persons"
import { sortZones } from "@/lib/crm/zones"
import { companyIdSchema } from "@/lib/ids"
import {
  COMPANY_NAME_MAX_LENGTH,
  COMPANY_SLUG_MAX_LENGTH,
  websiteUrlSchema,
} from "@/lib/schemas/company"
import { NOTES_MAX_LENGTH } from "@/lib/schemas/fields"
import { SLUG_PATTERN } from "@/lib/schemas/slug"
import { revalidatePersonLists } from "@/server/actions/_support/person-guards"
import {
  COMPANY_CACHE_TAGS,
  createCompany,
  updateCompany,
  type CompanyLogoError,
  type CompanyPatch,
  type CompanySummary,
  type CompanyWriteError,
} from "@/server/crm/companies"
import type { DomainResult } from "@/server/crm/result"
import {
  findCompaniesPage,
  findCompanyNames,
  findCompanyWithLinks,
} from "@/server/queries/companies"

import { defineCrmEntity, type CrmWriteContext } from "../entity-definition"
import { guardTool, toolError, toolJson } from "../results"

const entityField = z.literal("company").describe('Type of CRM record: always "company" here.')

// Les `.describe()` arrivent au modèle. `null` efface un champ facultatif, un champ absent d'un patch reste inchangé.
const fieldShape = {
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(COMPANY_SLUG_MAX_LENGTH)
    .regex(
      SLUG_PATTERN,
      'The slug may only hold lowercase letters, digits and hyphens (e.g. "acme-corp").',
    )
    .describe(
      `Unique URL identifier, at most ${COMPANY_SLUG_MAX_LENGTH} characters: lowercase letters, digits and single hyphens (e.g. "acme-corp"). Trimmed and lowercased like in the admin.`,
    ),
  name: z
    .string()
    .trim()
    .min(1)
    .max(COMPANY_NAME_MAX_LENGTH)
    .describe(`Display name, at most ${COMPANY_NAME_MAX_LENGTH} characters.`),
  sectors: z.array(z.enum(CompanySector)).describe("Business sectors of the company."),
  size: z
    .enum(CompanySize)
    .nullable()
    .describe("Legal size category (TPE, PME, ETI, GROUPE). null clears it."),
  websiteUrl: websiteUrlSchema
    .nullable()
    .describe("Website, an http or https URL. null clears it."),
  logoFilename: z
    .string()
    .trim()
    .refine(isCompanyLogoKey, `The logo key must start with "${COMPANY_LOGO_FOLDER}/".`)
    .nullable()
    .describe(
      `Storage key of the logo, under "${COMPANY_LOGO_FOLDER}/". Call crm_fetch_company_logo to fetch it from the website instead of writing it. null clears it.`,
    ),
  types: z
    .array(z.enum(CompanyType))
    .min(1, "Give at least one type.")
    .describe("Relationship types (e.g. CLIENT_FINAL, ESN_RECRUTEMENT). At least one."),
  relationStatus: z
    .enum(RelationStatus)
    .describe("Status of the relationship: ACTIVE, DORMANTE or ARCHIVEE."),
  zones: z
    .array(z.enum(Zone))
    // overwrite plutôt que transform : le schéma reste représentable en JSON Schema et idempotent
    .overwrite((zones) => sortZones(zones))
    .describe("Geographic zones of the company."),
  notes: z
    .string()
    .trim()
    .min(1, "Pass null to clear the notes.")
    .max(NOTES_MAX_LENGTH)
    .nullable()
    .describe(`One-line markers, at most ${NOTES_MAX_LENGTH} characters. null clears them.`),
  details: z
    .string()
    .trim()
    .min(1, "Pass null to clear the details.")
    .nullable()
    .describe(
      'Whole Details text in markdown, sections introduced by "# " headings. To change one section only, use detailsSection instead. null clears it.',
    ),
} as const

const createDataSchema = z
  .strictObject({
    slug: fieldShape.slug,
    name: fieldShape.name,
    sectors: fieldShape.sectors.default([]),
    size: fieldShape.size.default(null),
    websiteUrl: fieldShape.websiteUrl.default(null),
    logoFilename: fieldShape.logoFilename.default(null),
    types: fieldShape.types.optional(),
    relationStatus: fieldShape.relationStatus.optional(),
    zones: fieldShape.zones.optional(),
    notes: fieldShape.notes.optional(),
    details: fieldShape.details
      .optional()
      .describe(
        "Whole Details text in markdown. Omit it to get the standard section template (À propos, Chiffres clés, ...). null creates the company without Details.",
      ),
  })
  .describe("Fields of the company to create. Only slug and name are required.")

const updateFieldsSchema = z
  .strictObject(fieldShape)
  .partial()
  .describe("Fields to change. A field left out stays unchanged, null clears an optional field.")

const detailsSectionSchema = z
  .strictObject({
    heading: z
      .string()
      .trim()
      .min(1)
      .describe(
        'Title of the existing section to fill, without the "#" (e.g. "Chiffres clés"). Case, accents and the leading emoji are ignored.',
      ),
    content: z
      .string()
      // replaceDetailsSection insère le contenu tel quel : un titre dedans scinderait la section
      .refine((content) => !/^# /m.test(content), {
        error:
          'content must be the section body only, without its heading: remove the line starting with "# ". The heading is given by detailsSection.heading.',
      })
      .describe(
        "New body of the section in markdown, without its heading line. Replaces the previous body.",
      ),
  })
  .describe(
    "Replace the body of one section of the Details, the other sections stay untouched. Do not combine with fields.details.",
  )

const companyFilterSchema = z
  .strictObject({
    relationStatus: z.enum(RelationStatus).optional().describe("Only this relationship status."),
    types: z
      .array(z.enum(CompanyType))
      .min(1)
      .optional()
      .describe("Companies having at least one of these types."),
    zones: z
      .array(z.enum(Zone))
      .min(1)
      .optional()
      .describe("Companies having at least one of these zones."),
    sectors: z
      .array(z.enum(CompanySector))
      .min(1)
      .optional()
      .describe("Companies having at least one of these sectors."),
    size: z.enum(CompanySize).optional().describe("Only this size category."),
  })
  .describe("Filters, combined with AND. Each list matches any of its values.")

const COMPANY_SORTS = ["name", "createdAt", "updatedAt"] as const

const querySchema = z.strictObject({
  entity: entityField,
  filters: companyFilterSchema.optional(),
  sort: z.enum(COMPANY_SORTS).default("name").describe("Sort key. Defaults to name."),
  order: z.enum(["asc", "desc"]).default("asc").describe("Sort direction. Defaults to asc."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Page size, 1 to 100. Defaults to 20."),
  offset: z.number().int().min(0).default(0).describe("Number of rows to skip. Defaults to 0."),
})

const createSchema = z.strictObject({
  entity: entityField,
  data: createDataSchema,
})

const updateSchema = z
  .strictObject({
    entity: entityField,
    id: companyIdSchema.describe("Id of the company to update. Get it from crm_search first."),
    fields: updateFieldsSchema.optional(),
    detailsSection: detailsSectionSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fields === undefined && value.detailsSection === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Provide at least one of fields or detailsSection.",
      })
    }
    if (value.fields !== undefined && Object.keys(value.fields).length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["fields"],
        message: "fields is empty: name at least one field to change, or omit fields.",
      })
    }
    if (value.fields !== undefined && "details" in value.fields && value.detailsSection) {
      ctx.addIssue({
        code: "custom",
        path: ["fields", "details"],
        message:
          "fields.details and detailsSection both write the Details: send the whole text in fields.details, or one section in detailsSection, not both.",
      })
    }
  })

type UpdateInput = z.output<typeof updateSchema>

function toWhere(filters: z.output<typeof querySchema>["filters"]): Prisma.CompanyWhereInput {
  return {
    relationStatus: filters?.relationStatus,
    size: filters?.size,
    types: filters?.types ? { hasSome: filters.types } : undefined,
    zones: filters?.zones ? { hasSome: filters.zones } : undefined,
    sectors: filters?.sectors ? { hasSome: filters.sectors } : undefined,
  }
}

// Le superRefine du schéma a déjà refusé `details` avec une section : le type du patch d'une section l'exclut.
function withoutDetails({ details, ...rest }: NonNullable<UpdateInput["fields"]>) {
  return rest
}

function toPatch(input: UpdateInput): CompanyPatch {
  const fields = input.fields ?? {}
  return input.detailsSection
    ? { kind: "section", fields: withoutDetails(fields), detailsSection: input.detailsSection }
    : { kind: "fields", fields }
}

// Le slug reçu (déjà normalisé par le schéma) nomme la collision ; absent d'un patch, le message reste générique.
export function companyWriteErrorMessage(
  error: CompanyWriteError,
  context: { slug?: string } = {},
): string {
  switch (error.code) {
    case "slug_taken":
      return `${context.slug === undefined ? "This slug" : `The slug "${context.slug}"`} (trimmed and lowercased) is already used by another company. Choose another slug, or call crm_search to find the existing company.`
    case "siret_taken":
      return "This SIRET is already held by another legal entity."
    case "legal_entity_slug_taken":
      return "A legal entity already uses the slug of this company. Choose another slug."
    case "not_found":
      return "No company has this id. Call crm_search to find the right id, then call the tool again."
    case "no_details":
      return "This company has no Details text, so no section can be replaced. Write the whole text with fields.details instead."
    case "section_not_found":
      return `No section of the Details matches detailsSection.heading. Sections present: ${error.headings.join(", ")}. Use one of these titles.`
    default:
      return assertNever(error)
  }
}

const WAYBACK_FIX =
  "set websiteUrl with crm_update to a capture of the site on the Wayback Machine (web.archive.org)"

export function companyLogoErrorMessage(error: CompanyLogoError): string {
  switch (error.code) {
    case "not_found":
      return "No company has this id. Call crm_search to find the right id, then call crm_fetch_company_logo again."
    case "no_website":
      return `This company has no websiteUrl, so there is no site to read a logo from. Fill websiteUrl with crm_update, or ${WAYBACK_FIX}, then call crm_fetch_company_logo again.`
    case "invalid_website":
      return "The websiteUrl of this company is not a usable http or https address. Correct it with crm_update, then call crm_fetch_company_logo again."
    case "site_unreachable":
      return `The website could not be reached. Check websiteUrl with crm_update, or ${WAYBACK_FIX}, then call crm_fetch_company_logo again.`
    case "site_too_slow":
      return `The website answered too slowly. Call crm_fetch_company_logo again later, or ${WAYBACK_FIX}.`
    case "address_blocked":
      return "The website address points to an internal or private network, which the logo fetch refuses. Set websiteUrl with crm_update to a public address, then call crm_fetch_company_logo again."
    case "icon_too_small":
      return `The icons declared by the website are too small to make a logo. Set websiteUrl with crm_update to a page that declares a larger icon, or ${WAYBACK_FIX}.`
    case "no_icon_found":
      return `No icon was found on the website. Set websiteUrl with crm_update to a page that declares an icon, or ${WAYBACK_FIX}.`
    default:
      return assertNever(error)
  }
}

export function refreshCompanyCaches(): void {
  for (const tag of COMPANY_CACHE_TAGS) revalidateTag(tag, "max")
  // Les listes de personnes, d'opportunités et d'entretiens affichent le nom et le logo de l'entreprise
  revalidatePersonLists()
}

interface CompanyWrite {
  events: { success: string; failure: string }
  failureMessage: string
}

// Un create n'a pas d'id à relire : le slug dit si l'entreprise existe déjà avant de réessayer.
const CREATE_WRITE: CompanyWrite = {
  events: { success: "company:created", failure: "company:create_failed" },
  failureMessage:
    "The company could not be saved because of an internal error. Call crm_search with its slug to check whether it was created before retrying.",
}

const UPDATE_WRITE: CompanyWrite = {
  events: { success: "company:updated", failure: "company:update_failed" },
  failureMessage:
    "The company could not be saved because of an internal error. Call crm_fetch to check its current state before retrying.",
}

function writeCompany(
  run: () => Promise<DomainResult<CompanySummary, CompanyWriteError>>,
  ctx: CrmWriteContext,
  { events, failureMessage }: CompanyWrite,
  slug: string | undefined,
  logContext: object,
): Promise<CallToolResult> {
  return guardTool(
    ctx.log,
    { event: events.failure, message: failureMessage, context: logContext },
    run,
    (result) => {
      if (!result.ok) return toolError(companyWriteErrorMessage(result.error, { slug }))

      refreshCompanyCaches()
      ctx.log.info({ event: events.success, id: result.value.id, slug: result.value.slug })
      return toolJson(result.value)
    },
  )
}

export const companyEntity = defineCrmEntity({
  entity: "company",
  async search(query) {
    const needle = normalizeForSearch(query)
    const companies = await findCompanyNames()
    return companies
      .filter(
        (company) =>
          normalizeForSearch(company.name).includes(needle) || company.slug.includes(needle),
      )
      .map((company) => ({
        entity: "company" as const,
        id: company.id,
        label: company.name,
        hint: company.slug,
      }))
  },
  async fetch(id) {
    const company = await findCompanyWithLinks(id)
    if (!company) return null

    const { persons, ...record } = company
    return {
      ...record,
      persons: persons.map((person) => ({
        id: person.id,
        name: personDisplayName(person),
        roles: [
          ...(person.lead ? ["lead" as const] : []),
          ...(person.contact ? ["contact" as const] : []),
        ],
      })),
    }
  },
  querySchema,
  query: ({ filters, sort, order, limit, offset }) =>
    findCompaniesPage({
      where: toWhere(filters),
      // L'id départage les ex æquo : sans lui, deux pages pourraient se recouper
      orderBy: [{ [sort]: order }, { id: "asc" }],
      take: limit,
      skip: offset,
    }),
  createSchema,
  create: ({ data }, ctx) =>
    writeCompany(
      () =>
        createCompany({
          ...data,
          details: data.details === undefined ? COMPANY_DETAILS_TEMPLATE : data.details,
        }),
      ctx,
      CREATE_WRITE,
      data.slug,
      { slug: data.slug },
    ),
  updateSchema,
  update: (input, ctx) =>
    writeCompany(
      () => updateCompany(input.id, toPatch(input)),
      ctx,
      UPDATE_WRITE,
      input.fields?.slug,
      { id: input.id },
    ),
})
