import 'server-only'
import path from 'node:path'
import { z } from 'zod'

export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

const ALLOWED_EXTENSIONS = Object.keys(CONTENT_TYPE_MAP)
const FILENAME_PATTERN = new RegExp(
  `^[a-z0-9][a-z0-9._-]*\\.(${ALLOWED_EXTENSIONS.join('|')})$`,
  'i',
)

export const FilenameSchema = z
  .string()
  .regex(
    FILENAME_PATTERN,
    `Filename must match [a-z0-9][a-z0-9._-]* and end with one of: ${ALLOWED_EXTENSIONS.join(', ')}`,
  )

export type ValidateFilenameResult =
  | { ok: true; filename: string }
  | { ok: false; error: string }

export function validateFilename(raw: string): ValidateFilenameResult {
  const parsed = FilenameSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid filename' }
  }
  return { ok: true, filename: parsed.data }
}

export function resolveAssetPath(filename: string): string {
  const root = path.resolve(process.env.ASSETS_PATH ?? './assets')
  const candidate = path.resolve(root, filename)
  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    throw new Error(`Path traversal detected: "${filename}"`)
  }
  return candidate
}

export function getContentType(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase()
  return CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream'
}
