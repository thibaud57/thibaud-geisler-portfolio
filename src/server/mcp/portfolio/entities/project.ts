import "server-only"
import { z } from "zod"

import {
  ContractStatus,
  ProjectFormat,
  ProjectStatus,
  ProjectType,
  WorkMode,
} from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { isProjectAssetKey } from "@/lib/asset-keys"
import { companyIdSchema, projectIdSchema, tagIdSchema } from "@/lib/ids"
import { PROJECT_SLUG_MAX_LENGTH, PROJECT_TITLE_MAX_LENGTH } from "@/lib/schemas/project"
import { SLUG_PATTERN } from "@/lib/schemas/slug"
import { dateColumnDay, withDays } from "@/server/mcp/day-fields"
import { defineEntity } from "@/server/mcp/entity-definition"
import { idOrderBy, pageQueryShape, type SortOrder } from "@/server/mcp/query-page"
import {
  byId,
  notFoundMessage,
  revalidateTagMax,
  writeRecord,
  writeTexts,
} from "@/server/mcp/results"
import { updateSchemaWithoutDetailsOf } from "@/server/mcp/update-input"
import {
  createProject,
  invalidateProjectCaches,
  updateProject,
  type ProjectWriteError,
} from "@/server/portfolio/projects"
import {
  findProjectForTool,
  findProjectSearchRows,
  findProjectsPage,
} from "@/server/queries/projects"

const entityField = z
  .literal("project")
  .describe('Type of portfolio record: always "project" here.')

const SLUG_FIXED =
  "The slug of a project is fixed at creation: it is the address of its public page. Leave slug out of fields; to change it, ask the owner to do it in the admin."

const projectDay = (text: string) =>
  dateColumnDay({ example: "2026-03-01" }).nullable().describe(`${text} null clears it.`)

const url = (text: string) =>
  z
    .url({ protocol: /^https?$/, error: "Expected an http or https URL." })
    .nullable()
    .describe(`${text} null clears it.`)

const caseStudy = (language: string) =>
  z
    .string()
    .min(1, "Pass null to clear the case study.")
    .nullable()
    .describe(
      `Case study in markdown, ${language}. Independent of the other language. null clears it.`,
    )

const title = (language: string) =>
  z
    .string()
    .trim()
    .min(1)
    .max(PROJECT_TITLE_MAX_LENGTH)
    .describe(`${language} title, at most ${PROJECT_TITLE_MAX_LENGTH} characters.`)

const description = (language: string) =>
  z.string().trim().min(1).describe(`${language} description, plain text.`)

// Les `.describe()` arrivent au modèle.
const fieldShape = {
  titleFr: title("French"),
  titleEn: title("English"),
  descriptionFr: description("French"),
  descriptionEn: description("English"),
  type: z.enum(ProjectType).describe("CLIENT for a client project, PERSONAL for a personal one."),
  status: z
    .enum(ProjectStatus)
    .describe(
      "DRAFT (offline), PUBLISHED (public) or ARCHIVED (offline). Defaults to DRAFT at creation.",
    ),
  formats: z
    .array(z.enum(ProjectFormat))
    .min(1)
    .describe(`At least one format among ${Object.values(ProjectFormat).join(", ")}.`),
  startedAt: projectDay("Start day, YYYY-MM-DD."),
  endedAt: projectDay(
    "End day, YYYY-MM-DD, not before startedAt (the stored one when only endedAt is sent).",
  ),
  githubUrl: url("GitHub URL, http or https."),
  demoUrl: url("URL of the demo, http or https."),
  coverFilename: z
    .string()
    .trim()
    .refine(isProjectAssetKey, {
      error:
        'coverFilename must be the key of an asset already uploaded in a project folder: it starts with "projets/client/" or "projets/personal/".',
    })
    .nullable()
    .describe(
      'Key of the cover image, starting with "projets/client/" or "projets/personal/". Uploading is done in the admin. null clears it.',
    ),
  caseStudyMarkdownFr: caseStudy("French"),
  caseStudyMarkdownEn: caseStudy("English"),
  tagIds: z
    .array(tagIdSchema)
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "A tag cannot be attached twice: remove the duplicate from tagIds.",
    })
    .describe(
      "Ids of the tags, in display order (get them from portfolio_search). On update, sending it replaces the whole list and leaving it out keeps the current tags.",
    ),
  companyId: companyIdSchema.describe(
    "Id of the client company (get it from crm_search with the entity company). A personal project belongs to the company of type MA_SOCIETE.",
  ),
  workMode: z.enum(WorkMode).describe("PRESENTIEL, HYBRIDE or REMOTE."),
  contractStatus: z
    .enum(ContractStatus)
    .nullable()
    .describe("Contract of the mission: FREELANCE, CDI, STAGE or ALTERNANCE. null clears it."),
  teamSize: z
    .number()
    .int()
    .min(1)
    .nullable()
    .describe("Number of people on the team, at least 1. null clears it."),
  deliverablesCount: z
    .number()
    .int()
    .min(0)
    .describe("Number of deliverables, 0 or more. Defaults to 1 at creation."),
}

const createDataSchema = z
  .strictObject({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(PROJECT_SLUG_MAX_LENGTH)
      .regex(
        SLUG_PATTERN,
        'The slug may only hold lowercase letters, digits and hyphens (e.g. "crm-freelance").',
      )
      .describe(
        `Unique URL identifier of the public page, at most ${PROJECT_SLUG_MAX_LENGTH} characters: lowercase letters, digits and single hyphens (e.g. "crm-freelance"). Fixed once created.`,
      ),
    ...fieldShape,
    status: fieldShape.status.default("DRAFT"),
    // prefault plutôt que default : Zod retire le `default` du JSON Schema d'entrée d'un schéma qui contient un codec.
    startedAt: fieldShape.startedAt.prefault(null),
    endedAt: fieldShape.endedAt.prefault(null),
    githubUrl: fieldShape.githubUrl.default(null),
    demoUrl: fieldShape.demoUrl.default(null),
    coverFilename: fieldShape.coverFilename.default(null),
    caseStudyMarkdownFr: fieldShape.caseStudyMarkdownFr.default(null),
    caseStudyMarkdownEn: fieldShape.caseStudyMarkdownEn.default(null),
    tagIds: fieldShape.tagIds.default([]),
    contractStatus: fieldShape.contractStatus.default(null),
    teamSize: fieldShape.teamSize.default(null),
    deliverablesCount: fieldShape.deliverablesCount.default(1),
  })
  .describe(
    "Fields of the project to create. Required: slug, titleFr, titleEn, descriptionFr, descriptionEn, type, formats, companyId and workMode.",
  )

// Un message dédié plutôt que le « unrecognized key » de Zod : l'agent y lit pourquoi le slug est refusé.
const updateFieldsSchema = z
  .strictObject(fieldShape, {
    error: (issue) =>
      issue.code === "unrecognized_keys" && issue.keys.includes("slug") ? SLUG_FIXED : undefined,
  })
  .partial()
  .describe(
    "Fields to change. A field left out stays unchanged, null clears an optional field. tagIds replaces the whole list in the order sent. The slug cannot change.",
  )

const projectFilterSchema = z
  .strictObject({
    status: z.enum(ProjectStatus).optional().describe("Only this status."),
    type: z.enum(ProjectType).optional().describe("Only this type."),
    companyId: companyIdSchema.optional().describe("Only the projects of this client company."),
    tagId: tagIdSchema.optional().describe("Only the projects that carry this tag."),
  })
  .describe("Filters, combined with AND.")

const querySchema = z.strictObject({
  entity: entityField,
  filters: projectFilterSchema.optional(),
  ...pageQueryShape,
})

const createSchema = z.strictObject({ entity: entityField, data: createDataSchema })

const updateSchema = updateSchemaWithoutDetailsOf(
  entityField,
  projectIdSchema.describe("Id of the project to update. Get it from portfolio_search first."),
  updateFieldsSchema,
)

function toWhere(filters: z.output<typeof querySchema>["filters"]): Prisma.ProjectWhereInput {
  return {
    status: filters?.status,
    type: filters?.type,
    clientMeta: filters?.companyId ? { companyId: filters.companyId } : undefined,
    tags: filters?.tagId ? { some: { tagId: filters.tagId } } : undefined,
  }
}

// L'ordre de l'admin : « name » range par ordre d'affichage.
const nameOrder = (order: SortOrder): Prisma.ProjectOrderByWithRelationInput[] => [
  { displayOrder: order },
]

function projectWriteErrorMessage(error: ProjectWriteError): string {
  switch (error.code) {
    case "slug_taken":
      return "This slug is already used by another project. Call portfolio_search to find it, or choose another slug."
    case "company_not_found":
      return "No company has this companyId. Call crm_search with the entity company to find the right id, then call the tool again."
    case "tag_not_found":
      return "A tagId matches no tag. Call portfolio_search with the entity tag to find the right ids, then call the tool again."
    case "dates_out_of_order":
      return "endedAt cannot be before startedAt, the stored start included when only endedAt is sent. Send an endedAt on or after the start, or change startedAt too."
    case "not_found":
      return notFoundMessage("portfolio", "project")
    default:
      return assertNever(error)
  }
}

const CLIENT_COMPANY_PUBLIC =
  "serves the name, logo, website, sectors and size of its client company publicly"

// revalidateTag(tag, "max") d'un route handler : la page publique se régénère à la première visite qui suit l'écriture.
const PUBLIC_REFRESH =
  "the first public visit after a write may still show the previous version, the next ones show the new one"

const WRITES = writeTexts(
  { prefix: "portfolio", key: "project", noun: "project" },
  "Call portfolio_search with its slug to check whether it was created before retrying.",
)

// Même invalidation et même rendu à la création et à la modification.
const PROJECT_WRITE = {
  invalidate: () => {
    invalidateProjectCaches(revalidateTagMax)
  },
  logged: ({ id, slug }: { id: string; slug: string }) => ({ id, slug }),
  rendered: byId.rendered,
}

export const projectEntity = defineEntity({
  entity: "project",
  docs: {
    search: "the slug for a project (found by slug, French or English title)",
    fetch:
      "For a project: all its fields, its client company (id, name, logo) with the contract details, and its tags in display order; startedAt and endedAt are YYYY-MM-DD days.",
    queryRow:
      "a project: id, slug, French and English titles, status, type, client company name, display order, updated date",
    querySort: "Projects sort by display order, as in the admin.",
    create: `For a project, slug, titleFr, titleEn, descriptionFr, descriptionEn, type, formats, companyId and workMode are required; it is created as a DRAFT, last in the display order. A status PUBLISHED makes the project public (list, case study, sitemap), and ${CLIENT_COMPANY_PUBLIC}; ${PUBLIC_REFRESH}. A personal project belongs to the company of type MA_SOCIETE.`,
    update: `A project takes the fields of its creation except slug, which is fixed. A status PUBLISHED makes the project public and ${CLIENT_COMPANY_PUBLIC}, and each change to a PUBLISHED project goes public too; ${PUBLIC_REFRESH}. tagIds replaces the whole list in the order sent, and a field left out stays unchanged.`,
  },
  async search(query) {
    const needle = normalizeForSearch(query)
    const projects = await findProjectSearchRows()
    return projects
      .filter((project) => matchesSearch(needle, project.slug, project.titleFr, project.titleEn))
      .map((project) => ({
        entity: "project" as const,
        id: project.id,
        label: project.titleFr,
        hint: project.slug,
      }))
  },
  async fetch(id) {
    const project = await findProjectForTool(id)
    if (!project) return null

    const { tags, ...record } = project
    return { ...withDays(record, ["startedAt", "endedAt"]), tags: tags.map(({ tag }) => tag) }
  },
  querySchema,
  async query({ filters, sort, order, limit, offset }) {
    const { rows, total } = await findProjectsPage({
      where: toWhere(filters),
      orderBy: idOrderBy(sort, order, nameOrder),
      take: limit,
      skip: offset,
    })
    return {
      rows: rows.map(({ clientMeta, ...row }) => ({
        ...row,
        companyName: clientMeta?.company.name ?? null,
      })),
      total,
    }
  },
  createSchema,
  create: ({ data }, ctx) =>
    writeRecord({
      run: () => createProject(data),
      ctx,
      texts: WRITES.create,
      logContext: { slug: data.slug },
      errorMessage: projectWriteErrorMessage,
      ...PROJECT_WRITE,
    }),
  updateSchema,
  update: (input, ctx) =>
    writeRecord({
      run: () => updateProject(input.id, input.fields ?? {}),
      ctx,
      texts: WRITES.update,
      logContext: { id: input.id },
      errorMessage: projectWriteErrorMessage,
      ...PROJECT_WRITE,
    }),
})
