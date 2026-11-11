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

export type TagPatch = Partial<TagWriteData>

export interface TagSummary {
  id: TagId
  slug: string
}

export type TagWriteResult = DomainResult<TagSummary, TagWriteError>

const SUMMARY_SELECT = { id: true, slug: true } as const

// Les projets affichent leurs tags : les deux entrées de cache tombent ensemble.
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
  edited?: { id: string; data: TagPatch },
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

export async function createTag(data: TagWriteData, position?: number): Promise<TagWriteResult> {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.tag.create({
        data: { ...data, displayOrder: await nextDisplayOrder(tx, data.kind) },
        select: SUMMARY_SELECT,
      })
      // Sans position, pas de renumérotation (cf. `writeUpdate`).
      if (position !== undefined) {
        const existingIds = await findCategoryIds(data.kind, tx.tag)
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
  patch: TagPatch,
  position: number | undefined,
): Promise<TagWriteResult> {
  const current = await prisma.tag.findUnique({ where: { id }, select: { kind: true, slug: true } })
  if (!current) return fail({ code: "not_found" })

  const kind = patch.kind ?? current.kind
  const moved = kind !== current.kind

  if (!moved && position === undefined) {
    // Pas de renumérotation : elle bumperait `updatedAt` de tous les tags de la catégorie.
    await prisma.tag.update({ where: { id }, data: patch })
  } else {
    await prisma.$transaction(async (tx) => {
      if (moved) {
        const oldIds = await findCategoryIds(current.kind, tx.tag)
        await Promise.all(renumberTags(tx.tag, removeId(oldIds, id)))
      }
      const existingIds = await findCategoryIds(kind, tx.tag)
      await Promise.all(
        renumberTags(tx.tag, placeInCategory(existingIds, id, position), { id, data: patch }),
      )
    })
  }
  return ok({ id, slug: patch.slug ?? current.slug })
}

export async function updateTag(
  id: TagId,
  patch: TagPatch,
  position?: number,
): Promise<TagWriteResult> {
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
