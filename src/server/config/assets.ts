import 'server-only'
import path from 'node:path'
import { z } from 'zod'

export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
}

const ALLOWED_EXTENSIONS = Object.keys(CONTENT_TYPE_MAP)
const SEGMENT_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i
const MAX_SEGMENTS = 5

const SegmentSchema = z.string().regex(SEGMENT_PATTERN, 'Segment invalide')

export const AssetPathSchema = z
  .array(SegmentSchema)
  .min(1)
  .max(MAX_SEGMENTS)
  .refine(
    (segments) => {
      const last = segments.at(-1) ?? ''
      const ext = path.extname(last).slice(1).toLowerCase()
      return ALLOWED_EXTENSIONS.includes(ext)
    },
    { message: `Extension non autorisée (attendu : ${ALLOWED_EXTENSIONS.join(', ')})` },
  )

export type ValidateAssetPathResult =
  | { ok: true; segments: string[]; joined: string }
  | { ok: false; error: string }

export function validateAssetPath(raw: string[]): ValidateAssetPathResult {
  const parsed = AssetPathSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Chemin invalide' }
  }
  return { ok: true, segments: parsed.data, joined: parsed.data.join('/') }
}

export function resolveAssetPath(joined: string): string {
  const root = path.resolve(process.env.ASSETS_PATH ?? './assets')
  const candidate = path.resolve(root, joined)
  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    throw new Error(`Path traversal detected: "${joined}"`)
  }
  return candidate
}

export function getContentType(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase()
  return CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream'
}
