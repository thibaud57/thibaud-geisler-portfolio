import "server-only"
import path from "node:path"
import { GetObjectCommand, NoSuchKey, type S3Client } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"
import { z } from "zod"

import {
  ALLOWED_EXTENSIONS,
  ASSET_EXTENSION_ERROR_MESSAGE,
  CONTENT_TYPE_MAP,
} from "@/lib/asset-content-types"
import { logger } from "@/lib/logger"

export { CONTENT_TYPE_MAP }

const SEGMENT_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i
const MAX_SEGMENTS = 5

const SegmentSchema = z.string().regex(SEGMENT_PATTERN, "Segment invalide")

export const AssetPathSchema = z
  .array(SegmentSchema)
  .min(1)
  .max(MAX_SEGMENTS)
  .refine(
    (segments) => {
      const last = segments.at(-1) ?? ""
      const ext = path.extname(last).slice(1).toLowerCase()
      return ALLOWED_EXTENSIONS.includes(ext)
    },
    { message: ASSET_EXTENSION_ERROR_MESSAGE },
  )

export type ValidateAssetPathResult =
  { ok: true; segments: string[]; joined: string } | { ok: false; error: string }

export function validateAssetPath(raw: string[]): ValidateAssetPathResult {
  const parsed = AssetPathSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Chemin invalide" }
  }
  return { ok: true, segments: parsed.data, joined: parsed.data.join("/") }
}

export function getContentType(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase()
  return CONTENT_TYPE_MAP[ext] ?? "application/octet-stream"
}

interface ServeAssetOptions {
  client: S3Client
  bucket: string
  cacheControl?: string
  routeLabel: string
}

// Corps partagé par /api/assets et /admin/api/assets (validation, lecture R2, flux, 404 NoSuchKey).
// La garde d'auth et le choix du bucket restent dans chaque route : voir nextjs/assets.md.
export async function serveAsset(rawPath: string[], options: ServeAssetOptions): Promise<Response> {
  const log = logger.child({ route: options.routeLabel })

  const validation = validateAssetPath(rawPath)
  if (!validation.ok) {
    log.warn({ raw: rawPath, error: validation.error }, "assets: invalid path")
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const object = await options.client.send(
      new GetObjectCommand({ Bucket: options.bucket, Key: validation.joined }),
    )

    if (!object.Body) {
      log.debug({ path: validation.joined }, "assets: empty body")
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return new Response(object.Body.transformToWebStream(), {
      status: 200,
      headers: {
        "Content-Type": getContentType(validation.joined),
        ...(object.ContentLength !== undefined && {
          "Content-Length": String(object.ContentLength),
        }),
        ...(options.cacheControl !== undefined && { "Cache-Control": options.cacheControl }),
      },
    })
  } catch (err) {
    if (err instanceof NoSuchKey) {
      log.debug({ path: validation.joined }, "assets: not found")
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    log.error({ err, path: validation.joined }, "assets: unexpected error")
    throw err
  }
}
