import "server-only"
import sharp, { type Sharp } from "sharp"

const MIN_ICON_SIZE = 32
const MAX_ICON_SIZE = 256
// Garde-fou contre une image aux dimensions démesurées, très au-delà de toute icône.
const INPUT_OPTIONS = { limitInputPixels: 4096 * 4096 }
const ACCEPTED_FORMATS = new Set(["png", "jpeg", "webp", "gif", "svg"])
const SVG_BASE_DENSITY = 72

export class IconTooSmallError extends Error {
  readonly size: number

  constructor(size: number) {
    super(`Icône de ${size} px`)
    this.size = size
  }
}

export class UnreadableIconError extends Error {
  constructor(options?: ErrorOptions) {
    super("Icône illisible", options)
  }
}

export interface NormalizedIcon {
  png: Buffer
  width: number
  height: number
}

function toPng(image: Sharp) {
  return image
    .resize(MAX_ICON_SIZE, MAX_ICON_SIZE, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })
}

export async function normalizeIcon(input: Buffer): Promise<NormalizedIcon> {
  const metadata = await sharp(input, INPUT_OPTIONS)
    .metadata()
    .catch(() => null)
  if (
    !metadata?.format ||
    !ACCEPTED_FORMATS.has(metadata.format) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new UnreadableIconError()
  }
  const { format, width, height } = metadata

  try {
    if (format === "svg") {
      // sharp rend un SVG à sa taille intrinsèque (72 dpi) : sans ce recalcul, une icône déclarée à 24 px tomberait sous le seuil.
      // Plancher à 1 : sharp refuse une densité inférieure, ce que provoque un SVG de plus de 18432 px.
      const density = Math.max(1, (SVG_BASE_DENSITY * MAX_ICON_SIZE) / Math.max(width, height))
      const { data, info } = await toPng(sharp(input, { ...INPUT_OPTIONS, density }))
      return { png: data, width: info.width, height: info.height }
    }

    const largest = Math.max(width, height)
    if (largest < MIN_ICON_SIZE) throw new IconTooSmallError(largest)
    const { data } = await toPng(sharp(input, INPUT_OPTIONS))
    return { png: data, width, height }
  } catch (error) {
    if (error instanceof IconTooSmallError) throw error
    throw new UnreadableIconError({ cause: error })
  }
}
