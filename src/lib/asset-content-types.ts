export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
}

export const ALLOWED_EXTENSIONS = Object.keys(CONTENT_TYPE_MAP)

export const ASSET_EXTENSION_ERROR_MESSAGE = `Extension non autorisée (attendu : ${ALLOWED_EXTENSIONS.join(", ")})`
