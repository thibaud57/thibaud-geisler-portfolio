"use server"

import "server-only"
import { revalidatePath, updateTag as updateCacheTag } from "next/cache"
import { z } from "zod"

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { tagSchema, type TagInput } from "@/lib/schemas/tag"
import { createActionLogger } from "@/lib/server-utils"

import { type TagFormState } from "./tags.types"

function isPrismaError(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === code
}

function stringField(formData: FormData, key: string, fallback = ""): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : fallback
}

function collectValues(formData: FormData): TagFormState["values"] {
  return {
    slug: stringField(formData, "slug"),
    nameFr: stringField(formData, "nameFr"),
    nameEn: stringField(formData, "nameEn"),
    kind: stringField(formData, "kind"),
    icon: stringField(formData, "icon"),
    displayOrder: stringField(formData, "displayOrder", "0"),
  }
}

function invalidateTagCaches(): void {
  updateCacheTag("tags")
  updateCacheTag("projects")
  revalidatePath("/admin/tags")
}

type TagWriteData = Omit<TagInput, "icon"> & { icon: string | null }

interface SaveTagEvents {
  success: string
  failure: string
}

async function saveTag(
  actionName: string,
  events: SaveTagEvents,
  formData: FormData,
  persist: (data: TagWriteData) => Promise<unknown>,
): Promise<TagFormState> {
  const { log } = await createActionLogger(actionName)
  const values = collectValues(formData)

  const result = tagSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return {
      ok: false,
      errors: z.flattenError(result.error).fieldErrors,
      message: null,
      values,
    }
  }

  try {
    await persist({
      ...result.data,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- check volontairement falsy : la chaîne vide du formulaire doit devenir null en base (le champ Prisma est optionnel), `??` ne convertirait pas ""
      icon: result.data.icon ? result.data.icon : null,
    })
    // Après l'écriture réussie seulement : une invalidation précédant un échec purgerait le cache sans raison.
    invalidateTagCaches()
    log.info({ event: events.success, slug: result.data.slug })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    if (isPrismaError(err, "P2002")) {
      return {
        ok: false,
        errors: { slug: ["Ce slug est déjà utilisé par un autre tag"] },
        message: "slug_taken",
        values,
      }
    }
    log.error({ err, event: events.failure })
    return { ok: false, errors: {}, message: "unknown_error", values }
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
    (data) => prisma.tag.create({ data }),
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
    (data) => prisma.tag.update({ where: { id }, data }),
  )
}

export async function deleteTag(id: string): Promise<TagFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger("deleteTag")

  try {
    await prisma.tag.delete({ where: { id } })
    invalidateTagCaches()
    log.info({ event: "tag:deleted", id })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    if (isPrismaError(err, "P2003")) {
      return {
        ok: false,
        errors: {},
        message: "tag_in_use",
      }
    }
    log.error({ err, event: "tag:delete_failed" })
    return { ok: false, errors: {}, message: "unknown_error" }
  }
}
