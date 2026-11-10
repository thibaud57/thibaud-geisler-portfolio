import "server-only"

import { revalidatePath } from "next/cache"

import type { Prisma, TagKind } from "@/generated/prisma/client"
import { ADMIN_TAGS_PATH } from "@/lib/admin/routes"
import { tagIdSchema, type TagId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { computeIdsAtPosition, removeId, renumberEntities } from "@/lib/reorder"
import type { TagInput } from "@/lib/schemas/tag"
import { isRowGone, isSlugTaken, rowExists } from "@/lib/server-utils"
import { fail, ok, type DomainResult } from "@/server/result"

export type TagWriteData = Omit<TagInput, "displayOrder">

export type TagWriteError = { code: "slug_taken" } | { code: "not_found" }

export interface TagSummary {
  id: TagId
  slug: string
}

const SUMMARY_SELECT = { id: true, slug: true } as const

// Tags lus par le site public : chaque adaptateur les invalide avec sa primitive (updateTag en action, revalidateTag en outil MCP).
export function invalidateTagCaches(invalidate: (tag: string) => void): void {
  invalidate("tags")
  invalidate("projects")
  revalidatePath(ADMIN_TAGS_PATH)
}

export async function findCategoryIds(
  kind: TagKind,
  tagClient: Prisma.TransactionClient["tag"] = prisma.tag,
): Promise<string[]> {
  const tags = await tagClient.findMany({
    where: { kind },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  })
  return tags.map((tag) => tag.id)
}

export function renumberTags(
  tagClient: Prisma.TransactionClient["tag"],
  orderedIds: readonly string[],
  edited?: { id: string; data: Partial<TagWriteData> },
) {
  return renumberEntities(
    (id, data) => tagClient.update({ where: { id }, data }),
    orderedIds,
    edited,
  )
}

function placeInCategory(ids: readonly string[], id: string, position: number | undefined) {
  return position === undefined
    ? [...removeId(ids, id), id]
    : computeIdsAtPosition(ids, id, position)
}

// Le max plutôt que le compte : une catégorie avec un trou donnerait un ordre déjà pris.
async function nextDisplayOrder(tx: Prisma.TransactionClient, kind: TagKind): Promise<number> {
  const { _max } = await tx.tag.aggregate({ where: { kind }, _max: { displayOrder: true } })
  return (_max.displayOrder ?? 0) + 1
}

function toSummary(row: { id: string; slug: string }): TagSummary {
  return { id: tagIdSchema.parse(row.id), slug: row.slug }
}

export async function createTag(
  data: TagWriteData,
  position?: number,
): Promise<DomainResult<TagSummary, TagWriteError>> {
  try {
    const existingIds = await findCategoryIds(data.kind)

    const created = await prisma.$transaction(async (tx) => {
      // Sans position, un seul write : renuméroter la catégorie bumperait `updatedAt` de tous ses tags.
      const row = await tx.tag.create({
        data:
          position === undefined
            ? { ...data, displayOrder: await nextDisplayOrder(tx, data.kind) }
            : data,
        select: SUMMARY_SELECT,
      })
      if (position !== undefined) {
        await Promise.all(renumberTags(tx.tag, computeIdsAtPosition(existingIds, row.id, position)))
      }
      return row
    })
    return ok(toSummary(created))
  } catch (err) {
    if (isSlugTaken(err)) return fail({ code: "slug_taken" })
    throw err
  }
}

async function writeUpdate(
  id: TagId,
  patch: Partial<TagWriteData>,
  position: number | undefined,
): Promise<DomainResult<TagSummary, TagWriteError>> {
  const current = await prisma.tag.findUnique({ where: { id }, select: { kind: true, slug: true } })
  if (!current) return fail({ code: "not_found" })

  const edited = { id, data: patch }
  const kind = patch.kind ?? current.kind

  if (kind === current.kind) {
    if (position === undefined) {
      // Un seul write : renuméroter la catégorie bumperait `updatedAt` de tous ses tags.
      await prisma.tag.update({ where: { id }, data: patch })
    } else {
      const existingIds = await findCategoryIds(kind)
      await prisma.$transaction(
        renumberTags(prisma.tag, computeIdsAtPosition(existingIds, id, position), edited),
      )
    }
  } else {
    const [oldIds, newExistingIds] = await Promise.all([
      findCategoryIds(current.kind),
      findCategoryIds(kind),
    ])
    await prisma.$transaction([
      ...renumberTags(prisma.tag, removeId(oldIds, id)),
      ...renumberTags(prisma.tag, placeInCategory(newExistingIds, id, position), edited),
    ])
  }
  return ok({ id, slug: patch.slug ?? current.slug })
}

export async function updateTag(
  id: TagId,
  patch: Partial<TagWriteData>,
  position?: number,
): Promise<DomainResult<TagSummary, TagWriteError>> {
  try {
    return await writeUpdate(id, patch, position)
  } catch (err) {
    if (isSlugTaken(err)) return fail({ code: "slug_taken" })
    if (await isRowGone(err, () => rowExists(prisma.tag, { id }))) {
      return fail({ code: "not_found" })
    }
    throw err
  }
}
