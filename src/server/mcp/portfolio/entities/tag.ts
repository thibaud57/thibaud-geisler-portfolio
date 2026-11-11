import "server-only"
import { z } from "zod"

import { TagKind } from "@/generated/prisma/browser"
import type { Tag } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { TAG_ICON_KEYS } from "@/lib/icons"
import { tagIdSchema } from "@/lib/ids"
import { SLUG_PATTERN } from "@/lib/schemas/slug"
import { TAG_NAME_MAX_LENGTH, TAG_SLUG_MAX_LENGTH } from "@/lib/schemas/tag"
import { KIND_ORDER } from "@/lib/tags"
import { defineEntity } from "@/server/mcp/entity-definition"
import { pageQueryShape, type SortKey, type SortOrder } from "@/server/mcp/query-page"
import {
  byId,
  notFoundMessage,
  revalidateTagMax,
  writeRecord,
  writeTexts,
} from "@/server/mcp/results"
import { updateSchemaWithoutDetailsOf } from "@/server/mcp/update-input"
import {
  createTag,
  invalidateTagCaches,
  updateTag,
  type TagWriteError,
} from "@/server/portfolio/tags"
import { findTagForTool, findTagSearchRows, findTagsForTool } from "@/server/queries/tags"

const entityField = z.literal("tag").describe('Type of portfolio record: always "tag" here.')

const SLUG_FIXED =
  "The slug of a tag is fixed at creation: the public site reads some slugs directly. Leave slug out of fields; to change it, create a new tag and move the projects to it in the admin."

const name = (language: string) =>
  z
    .string()
    .trim()
    .min(1)
    .max(TAG_NAME_MAX_LENGTH)
    .describe(`${language} display name, at most ${TAG_NAME_MAX_LENGTH} characters.`)

// Les `.describe()` arrivent au modèle.
const fieldShape = {
  nameFr: name("French"),
  nameEn: name("English"),
  kind: z
    .enum(TagKind)
    .describe("Category of the tag: EXPERTISE, AI, LANGUAGE, FRAMEWORK, DATABASE or INFRA."),
  icon: z
    .enum(TAG_ICON_KEYS, {
      error: ({ input }) =>
        input === ""
          ? "icon cannot be an empty string: send null to clear the icon."
          : "icon is not in the registry: use one of the keys listed in the schema of icon, or null for no icon.",
    })
    .nullable()
    .describe("Icon key from the registry listed here. null means no icon (and clears it)."),
} as const

const createDataSchema = z
  .strictObject({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(TAG_SLUG_MAX_LENGTH)
      .regex(
        SLUG_PATTERN,
        'The slug may only hold lowercase letters, digits and hyphens (e.g. "next-js").',
      )
      .describe(
        `Unique URL identifier, at most ${TAG_SLUG_MAX_LENGTH} characters: lowercase letters, digits and single hyphens (e.g. "next-js"). Trimmed and lowercased like in the admin. Fixed once created.`,
      ),
    nameFr: fieldShape.nameFr,
    nameEn: fieldShape.nameEn,
    kind: fieldShape.kind,
    icon: fieldShape.icon.default(null),
  })
  .describe("Fields of the tag to create. Required: slug, nameFr, nameEn and kind.")

// Un message dédié plutôt que le « unrecognized key » de Zod : l'agent y lit pourquoi le slug est refusé.
const updateFieldsSchema = z
  .strictObject(fieldShape, {
    error: (issue) =>
      issue.code === "unrecognized_keys" && issue.keys.includes("slug") ? SLUG_FIXED : undefined,
  })
  .partial()
  .describe(
    "Fields to change: nameFr, nameEn, kind, icon. A field left out stays unchanged, null clears the icon. A new kind puts the tag last in that category. The slug cannot change.",
  )

const tagFilterSchema = z
  .strictObject({
    kind: z.enum(TagKind).optional().describe("Only this category."),
  })
  .describe("Filters.")

const querySchema = z.strictObject({
  entity: entityField,
  filters: tagFilterSchema.optional(),
  ...pageQueryShape,
})

const createSchema = z.strictObject({
  entity: entityField,
  data: createDataSchema,
})

const updateSchema = updateSchemaWithoutDetailsOf(
  entityField,
  tagIdSchema.describe("Id of the tag to update. Get it from portfolio_search first."),
  updateFieldsSchema,
)

type SortableTag = Pick<Tag, "id" | "kind" | "displayOrder" | "createdAt" | "updatedAt">

const comparators = {
  // Ordre de l'admin : catégories par `KIND_ORDER` (pas par l'enum Postgres), puis ordre d'affichage
  name: (a, b) =>
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.displayOrder - b.displayOrder,
  createdAt: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  updatedAt: (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime(),
} satisfies Record<SortKey, (a: SortableTag, b: SortableTag) => number>

// L'id départage les ex æquo : sans lui, deux pages pourraient se recouper.
function sortTags<T extends SortableTag>(tags: readonly T[], sort: SortKey, order: SortOrder): T[] {
  const direction = order === "asc" ? 1 : -1
  return tags.toSorted((a, b) => direction * comparators[sort](a, b) || a.id.localeCompare(b.id))
}

function tagWriteErrorMessage(error: TagWriteError): string {
  switch (error.code) {
    case "slug_taken":
      return "This slug is already used by another tag. Call portfolio_search to find it, or choose another slug."
    case "not_found":
      return notFoundMessage("portfolio", "tag")
    default:
      return assertNever(error)
  }
}

const WRITES = writeTexts(
  { prefix: "portfolio", key: "tag", noun: "tag" },
  "Call portfolio_search with its slug to check whether it was created before retrying.",
)

// Même invalidation et même rendu à la création et à la modification.
const TAG_WRITE = {
  invalidate: () => {
    invalidateTagCaches(revalidateTagMax)
  },
  logged: ({ id, slug }: { id: string; slug: string }) => ({ id, slug }),
  rendered: byId.rendered,
}

export const tagEntity = defineEntity({
  entity: "tag",
  docs: {
    search: "the slug for a tag",
    fetch:
      "For a tag: its icon and the projects that carry it (id, slug, French title, status), with their count.",
    queryRow: "a tag: id, slug, French and English names, category, icon, updated date",
    querySort:
      "Tags sort by category in the order of the admin (expertise, AI, language, framework, database, infrastructure), then by display order.",
    create:
      "For a tag, slug, nameFr, nameEn and kind are required, and the tag goes last in its category.",
    update:
      "A tag takes nameFr, nameEn, kind and icon: its slug is fixed at creation, and a new kind puts it last in that category.",
  },
  async search(query) {
    const needle = normalizeForSearch(query)
    const tags = await findTagSearchRows()
    return tags
      .filter((tag) => matchesSearch(needle, tag.slug, tag.nameFr, tag.nameEn))
      .map((tag) => ({
        entity: "tag" as const,
        id: tag.id,
        label: tag.nameFr,
        hint: tag.slug,
      }))
  },
  async fetch(id) {
    const tag = await findTagForTool(id)
    if (!tag) return null

    const { projects, ...record } = tag
    return {
      ...record,
      projectCount: projects.length,
      projects: projects.map(({ project }) => project),
    }
  },
  querySchema,
  async query({ filters, sort, order, limit, offset }) {
    const tags = await findTagsForTool({ kind: filters?.kind })
    const page = sortTags(tags, sort, order).slice(offset, offset + limit)
    return {
      rows: page.map(({ displayOrder, createdAt, ...row }) => row),
      total: tags.length,
    }
  },
  createSchema,
  create: ({ data }, ctx) =>
    writeRecord({
      run: () => createTag(data),
      ctx,
      texts: WRITES.create,
      logContext: { slug: data.slug },
      errorMessage: tagWriteErrorMessage,
      ...TAG_WRITE,
    }),
  updateSchema,
  update: (input, ctx) =>
    writeRecord({
      run: () => updateTag(input.id, input.fields ?? {}),
      ctx,
      texts: WRITES.update,
      logContext: { id: input.id },
      errorMessage: tagWriteErrorMessage,
      ...TAG_WRITE,
    }),
})
