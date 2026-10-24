import "server-only"
import decodeIco from "decode-ico"
import sharp, { type Sharp } from "sharp"

import { logger } from "@/lib/logger"

const MIN_ICON_SIZE = 32
const MAX_ICON_SIZE = 256
// Garde-fou contre une image aux dimensions démesurées, très au-delà de toute icône.
const INPUT_OPTIONS = { limitInputPixels: 4096 * 4096 }
const ACCEPTED_FORMATS = new Set(["png", "jpeg", "webp", "gif", "svg"])
const SVG_BASE_DENSITY = 72

export interface NormalizedIcon {
  png: Buffer
  width: number
  height: number
}

export type IconFailure =
  { ok: false; message: "icon_too_small"; size: number } | { ok: false; message: "icon_unreadable" }

export type NormalizeOutcome = { ok: true; icon: NormalizedIcon } | IconFailure

const UNREADABLE: IconFailure = { ok: false, message: "icon_unreadable" }

function toPng(image: Sharp) {
  return image
    .resize(MAX_ICON_SIZE, MAX_ICON_SIZE, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })
}

const isIco = (buffer: Buffer) => buffer.length > 6 && buffer.readUInt32LE(0) === 0x00010000

// sharp ne lit pas l'ICO : sa plus grande image, PNG ou DIB, passe en PNG.
async function largestIcoImage(ico: Buffer): Promise<Buffer | null> {
  const images = decodeIco(ico).sort((a, b) => b.width * b.height - a.width * a.height)
  const largest = images[0]
  if (!largest) return null
  if (largest.type === "png") return Buffer.from(largest.data)
  const raw = { width: largest.width, height: largest.height, channels: 4 as const }
  return sharp(Buffer.from(largest.data), { ...INPUT_OPTIONS, raw })
    .png()
    .toBuffer()
}

export async function normalizeIcon(icon: Buffer): Promise<NormalizeOutcome> {
  // sharp et decode-ico lèvent une Error générique sur des octets corrompus : rien ne permet de la distinguer d'un échec attendu.
  try {
    const input = isIco(icon) ? await largestIcoImage(icon) : icon
    if (!input) return UNREADABLE
    const metadata = await sharp(input, INPUT_OPTIONS).metadata()
    if (!ACCEPTED_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) {
      return UNREADABLE
    }
    const { format, width, height } = metadata

    if (format === "svg") {
      // sharp rend un SVG à sa taille intrinsèque (72 dpi) : sans ce recalcul, une icône déclarée à 24 px tomberait sous le seuil.
      // Plancher à 1 : sharp refuse une densité inférieure, ce que provoque un SVG de plus de 18432 px.
      const density = Math.max(1, (SVG_BASE_DENSITY * MAX_ICON_SIZE) / Math.max(width, height))
      const { data, info } = await toPng(sharp(input, { ...INPUT_OPTIONS, density }))
      return { ok: true, icon: { png: data, width: info.width, height: info.height } }
    }

    const largest = Math.max(width, height)
    if (largest < MIN_ICON_SIZE) return { ok: false, message: "icon_too_small", size: largest }
    const { data } = await toPng(sharp(input, INPUT_OPTIONS))
    return { ok: true, icon: { png: data, width, height } }
  } catch (err) {
    logger.warn({ err, event: "company_logo:icon_unreadable" })
    return UNREADABLE
  }
}
