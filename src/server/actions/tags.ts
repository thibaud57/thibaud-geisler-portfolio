"use server"

import "server-only"
import { revalidatePath, updateTag as updateCacheTag } from "next/cache"
import { z } from "zod"

import type { Prisma, TagKind } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { computeIdsAtPosition, removeId, sameIdSet } from "@/lib/reorder"
import { tagReorderSchema, tagSchema, type TagInput } from "@/lib/schemas/tag"
import { createActionLogger } from "@/lib/server-utils"

import { type TagDeleteState, type TagFormState, type TagReorderState } from "./tags.types"

function isPrismaError(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === code
}

function invalidateTagCaches(): void {
  updateCacheTag("tags")
  updateCacheTag("projects")
  revalidatePath("/admin/tags")
}

async function findCategoryIds(kind: TagKind): Promise<string[]> {
  const tags = await prisma.tag.findMany({
    where: { kind },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  })
  return tags.map((tag) => tag.id)
}

// Réécrit la catégorie en entier, et pas seulement les tags décalés : la suite continue 1..n tient
// même si la base contenait un trou avant l'appel. Le tag édité reçoit ses champs avec sa position.
function renumberTags(
  tagClient: Prisma.TransactionClient["tag"],
  orderedIds: readonly string[],
  edited?: { id: string; data: TagInput },
) {
  return orderedIds.map((id, index) =>
    tagClient.update({
      where: { id },
      data:
        id === edited?.id
          ? { ...edited.data, displayOrder: index + 1 }
          : { displayOrder: index + 1 },
    }),
  )
}

async function createTagWithReorder(data: TagInput) {
  const existingIds = await findCategoryIds(data.kind)

  return prisma.$transaction(async (tx) => {
    const created = await tx.tag.create({ data })
    await Promise.all(
      renumberTags(tx.tag, computeIdsAtPosition(existingIds, created.id, data.displayOrder)),
    )
    return created
  })
}

async function updateTagWithReorder(id: string, data: TagInput) {
  const current = await prisma.tag.findUniqueOrThrow({ where: { id }, select: { kind: true } })
  const edited = { id, data }

  if (current.kind === data.kind) {
    const existingIds = await findCategoryIds(data.kind)
    return prisma.$transaction(
      renumberTags(prisma.tag, computeIdsAtPosition(existingIds, id, data.displayOrder), edited),
    )
  }

  const [oldIds, newExistingIds] = await Promise.all([
    findCategoryIds(current.kind),
    findCategoryIds(data.kind),
  ])

  return prisma.$transaction([
    ...renumberTags(prisma.tag, removeId(oldIds, id)),
    ...renumberTags(
      prisma.tag,
      computeIdsAtPosition(newExistingIds, id, data.displayOrder),
      edited,
    ),
  ])
}

// Transaction interactive (et non un tableau) : si la suppression échoue (P2003), tx.tag.update
// n'est jamais atteint, ce que l'appelant peut observer sans dépendre du rollback réel de la DB.
async function deleteTagWithReorder(id: string) {
  return prisma.$transaction(async (tx) => {
    const deleted = await tx.tag.delete({ where: { id } })
    const remaining = await tx.tag.findMany({
      where: { kind: deleted.kind },
      orderBy: { displayOrder: "asc" },
      select: { id: true },
    })
    const remainingIds = removeId(
      remaining.map((tag) => tag.id),
      id,
    )

    await Promise.all(renumberTags(tx.tag, remainingIds))

    return deleted
  })
}

interface SaveTagEvents {
  success: string
  failure: string
}

async function saveTag(
  actionName: string,
  events: SaveTagEvents,
  formData: FormData,
  persist: (data: TagInput) => Promise<unknown>,
): Promise<TagFormState> {
  const { log } = await createActionLogger(actionName)

  const result = tagSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return { ok: false, errors: z.flattenError(result.error).fieldErrors, message: null }
  }

  try {
    await persist(result.data)
    // Après l'écriture réussie seulement : une invalidation précédant un échec purgerait le cache sans raison.
    invalidateTagCaches()
    log.info({ event: events.success, slug: result.data.slug })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    if (isPrismaError(err, "P2002")) {
      return {
        ok: false,
        errors: { slug: ["Ce slug est déjà utilisé."] },
        message: "slug_taken",
      }
    }
    log.error({ err, event: events.failure })
    return { ok: false, errors: {}, message: "unknown_error" }
  }
}

export async function createTag(
  _prevState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  // Défense en profondeur dans chaque action exportée, jamais dans saveTag : le layout protège les
  // pages, pas les actions. Placé dans un try, unauthorized() serait avalé et masqué en unknown_error.
  await getCurrentUser()

  return saveTag(
    "createTag",
    { success: "tag:created", failure: "tag:create_failed" },
    formData,
    (data) => createTagWithReorder(data),
  )
}

export async function updateTag(
  id: string,
  _prevState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  await getCurrentUser()

  return saveTag(
    "updateTag",
    { success: "tag:updated", failure: "tag:update_failed" },
    formData,
    (data) => updateTagWithReorder(id, data),
  )
}

export async function deleteTag(id: string): Promise<TagDeleteState> {
  await getCurrentUser()

  const { log } = await createActionLogger("deleteTag")

  try {
    await deleteTagWithReorder(id)
    invalidateTagCaches()
    log.info({ event: "tag:deleted", id })
    return { ok: true, message: null }
  } catch (err) {
    if (isPrismaError(err, "P2003")) {
      return { ok: false, message: "tag_in_use" }
    }
    log.error({ err, event: "tag:delete_failed" })
    return { ok: false, message: "unknown_error" }
  }
}

export async function reorderTags(kind: TagKind, orderedIds: string[]): Promise<TagReorderState> {
  await getCurrentUser()

  const { log } = await createActionLogger("reorderTags")

  const result = tagReorderSchema.safeParse({ kind, orderedIds })
  if (!result.success) {
    return { ok: false, message: "invalid_order" }
  }

  try {
    const existing = await prisma.tag.findMany({
      where: { kind: result.data.kind },
      select: { id: true },
    })

    // Une création ou une suppression survenue entre l'affichage de la liste et le dépôt du glisser-déposer
    // rend l'ordre reçu périmé : réécrire un sous-ensemble laisserait des displayOrder en doublon ou troués
    // dans la catégorie.
    const existingIds = existing.map((tag) => tag.id)
    if (!sameIdSet(existingIds, result.data.orderedIds)) {
      return { ok: false, message: "stale_order" }
    }

    await prisma.$transaction(renumberTags(prisma.tag, result.data.orderedIds))

    invalidateTagCaches()
    log.info({
      event: "tag:reordered",
      kind: result.data.kind,
      count: result.data.orderedIds.length,
    })
    return { ok: true, message: null }
  } catch (err) {
    log.error({ err, event: "tag:reorder_failed" })
    return { ok: false, message: "unknown_error" }
  }
}
