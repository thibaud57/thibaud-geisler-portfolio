"use server"

import "server-only"
import { updateTag as updateCacheTag } from "next/cache"

import type { TagKind } from "@/generated/prisma/client"
import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { tagIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { removeId, sameIdSet } from "@/lib/reorder"
import { tagReorderSchema, tagSchema, type TagInput } from "@/lib/schemas/tag"
import { createActionLogger, isPrismaError, rowExists } from "@/lib/server-utils"
import { fail, type DomainResult } from "@/server/result"
import {
  createTag as createTagRecord,
  findCategoryIds,
  invalidateTagCaches,
  renumberTags,
  updateTag as updateTagRecord,
  type TagSummary,
  type TagWriteError,
} from "@/server/portfolio/tags"

import {
  type ActionEvents,
  type DomainFailure,
  deleteEntity,
  formStateHandlers,
  saveEntity,
} from "./_support/shared"
import { type TagDeleteState, type TagFormState, type TagReorderState } from "./tags.types"

function updateTagCaches(): void {
  invalidateTagCaches(updateCacheTag)
}

// Transaction interactive (et non un tableau) : si la suppression échoue (P2003), tx.tag.update
// n'est jamais atteint, ce que l'appelant peut observer sans dépendre du rollback réel de la DB.
async function deleteTagWithReorder(id: string) {
  return prisma.$transaction(async (tx) => {
    const deleted = await tx.tag.delete({ where: { id } })
    const remainingIds = removeId(await findCategoryIds(deleted.kind, tx.tag), id)

    await Promise.all(renumberTags(tx.tag, remainingIds))

    return deleted
  })
}

const tagExists = (id: string) => rowExists(prisma.tag, { id })

function mapDomainError(error: TagWriteError): DomainFailure<TagFormState> {
  switch (error.code) {
    case "slug_taken":
      return {
        state: {
          ok: false,
          errors: { slug: ["Ce slug est déjà utilisé."] },
          message: "slug_taken",
        },
        invalidate: false,
      }
    case "not_found":
      return { state: { ok: false, errors: {}, message: "tag_not_found" }, invalidate: true }
    default:
      return assertNever(error)
  }
}

function saveTag(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: TagInput) => Promise<DomainResult<TagSummary, TagWriteError>>,
): Promise<TagFormState> {
  return saveEntity<TagInput, TagFormState, TagSummary, TagWriteError>({
    actionName,
    events,
    schema: tagSchema,
    input: Object.fromEntries(formData),
    persist,
    successLogFields: (data) => ({ slug: data.slug }),
    invalidateCaches: updateTagCaches,
    onDomainError: mapDomainError,
    ...formStateHandlers<TagInput>(undefined),
  })
}

export async function createTag(
  _prevState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  // Défense en profondeur dans chaque action exportée, jamais dans saveTag : le layout protège les
  // pages, pas les actions. Placé hors de l'instrumentation, unauthorized() serait avalé et masqué en unknown_error.
  await getCurrentUser()

  return saveTag(
    "createTag",
    { success: "tag:created", failure: "tag:create_failed" },
    formData,
    ({ displayOrder, ...fields }) => createTagRecord(fields, displayOrder),
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
    async ({ displayOrder, ...fields }) => {
      // Un id invalide ne désigne aucun tag : même réponse qu'un tag supprimé, sous l'instrumentation de l'action.
      const parsedId = tagIdSchema.safeParse(id)
      return parsedId.success
        ? updateTagRecord(parsedId.data, fields, displayOrder)
        : fail({ code: "not_found" })
    },
  )
}

export async function deleteTag(id: string): Promise<TagDeleteState> {
  await getCurrentUser()

  return deleteEntity<TagDeleteState>({
    actionName: "deleteTag",
    events: { success: "tag:deleted", failure: "tag:delete_failed" },
    successLogFields: { id },
    exists: () => tagExists(id),
    destroy: () => deleteTagWithReorder(id),
    invalidateCaches: updateTagCaches,
    onSuccess: () => ({ ok: true, message: null }),
    mapError: (err) => (isPrismaError(err, "P2003") ? { ok: false, message: "tag_in_use" } : null),
    onUnknownError: () => ({ ok: false, message: "unknown_error" }),
  })
}

export async function reorderTags(
  kind: TagKind,
  orderedIds: readonly string[],
): Promise<TagReorderState> {
  await getCurrentUser()

  return createActionLogger("reorderTags", async ({ log }) => {
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

      updateTagCaches()
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
  })
}
