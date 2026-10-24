import { keysOf } from "@/lib/keys-of"

export const CONTENT_TYPE_MAP = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
} as const satisfies Record<string, string>

export type AssetExtension = keyof typeof CONTENT_TYPE_MAP

export const ALLOWED_EXTENSIONS = keysOf(CONTENT_TYPE_MAP)

export function isAllowedExtension(extension: string): extension is AssetExtension {
  return Object.hasOwn(CONTENT_TYPE_MAP, extension)
}

export const ASSET_EXTENSION_ERROR_MESSAGE = `Extension non autorisée (attendu : ${ALLOWED_EXTENSIONS.join(", ")})`
