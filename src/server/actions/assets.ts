"use server"

import "server-only"
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { adminR2, r2, R2_ADMIN_BUCKET, R2_BUCKET } from "@/lib/r2"
import {
  assetUploadSchema,
  buildAssetKey,
  isAdminAssetKey,
  isHardcodedAssetKey,
  MAX_ASSET_BYTES,
} from "@/lib/schemas/asset"
import { createActionLogger } from "@/lib/server-utils"
import { getContentType, validateAssetPath } from "@/server/config/assets"

import { type AssetFormState } from "./assets.types"

function resolveBucket(key: string): { client: typeof r2; bucket: string } {
  return isAdminAssetKey(key)
    ? { client: adminR2, bucket: R2_ADMIN_BUCKET }
    : { client: r2, bucket: R2_BUCKET }
}

export async function uploadAsset(
  _prevState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger("uploadAsset")

  const result = assetUploadSchema.safeParse({
    folder: formData.get("folder") ?? "",
    slug: formData.get("slug") ?? "",
    filename: formData.get("filename") ?? "",
  })
  if (!result.success) {
    return {
      ok: false,
      errors: z.flattenError(result.error).fieldErrors,
      message: null,
    }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: {}, message: "file_empty" }
  }
  if (file.size > MAX_ASSET_BYTES) {
    return { ok: false, errors: {}, message: "file_too_large" }
  }

  const key = buildAssetKey(result.data)

  // La clé doit franchir la même validation que la lecture : écrire un objet
  // que la route refuserait de servir le rendrait inaccessible tout en occupant de l'espace.
  const validation = validateAssetPath(key.split("/"))
  if (!validation.ok) {
    return { ok: false, errors: { filename: [validation.error] }, message: null }
  }

  // Un type vide est toléré : certains navigateurs ne le renseignent pas. Un type
  // renseigné mais incohérent avec l'extension trahit un fichier renommé.
  const expectedType = getContentType(key)
  if (file.type && file.type !== expectedType) {
    return { ok: false, errors: {}, message: "file_type_mismatch" }
  }

  const { client, bucket } = resolveBucket(key)

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: expectedType,
      }),
    )
    revalidatePath("/admin/assets")
    log.info({ event: "asset:uploaded", key, size: file.size })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    log.error({ err, event: "asset:upload_failed", key })
    return { ok: false, errors: {}, message: "unknown_error" }
  }
}

export async function deleteAsset(key: string): Promise<AssetFormState> {
  await getCurrentUser()

  // Une Server Action exportée reste un endpoint HTTP : ce refus doit précéder toute
  // consultation de la base et tout appel R2, pas seulement le bouton qui l'invoque.
  if (isHardcodedAssetKey(key)) {
    return { ok: false, errors: {}, message: "asset_hardcoded" }
  }

  const { log } = await createActionLogger("deleteAsset")

  const [projects, companies] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { coverFilename: key },
          { caseStudyMarkdownFr: { contains: key } },
          { caseStudyMarkdownEn: { contains: key } },
        ],
      },
      select: { slug: true },
    }),
    prisma.company.findMany({ where: { logoFilename: key }, select: { slug: true } }),
  ])

  const usedBy = [...projects.map((p) => p.slug), ...companies.map((c) => c.slug)]
  if (usedBy.length > 0) {
    return { ok: false, errors: {}, message: "asset_in_use", usedBy }
  }

  const { client, bucket } = resolveBucket(key)

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    revalidatePath("/admin/assets")
    log.info({ event: "asset:deleted", key })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    log.error({ err, event: "asset:delete_failed", key })
    return { ok: false, errors: {}, message: "unknown_error" }
  }
}
