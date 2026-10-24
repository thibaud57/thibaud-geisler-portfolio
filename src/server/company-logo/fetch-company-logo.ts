import "server-only"
import { createHash } from "node:crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"

import { buildAssetKey, COMPANY_LOGO_FOLDER } from "@/lib/asset-keys"
import { adminR2, R2_ADMIN_BUCKET } from "@/lib/r2"
import { validateAssetPath } from "@/server/assets/serve-asset"

import { findIconCandidates, type IconCandidate, type IconSource } from "./icon-candidates"
import {
  IconTooSmallError,
  normalizeIcon,
  type NormalizedIcon,
  UnreadableIconError,
} from "./normalize-icon"
import { FetchFailedError, ResponseTooLargeError, safeFetch } from "./safe-fetch"

const PAGE_MAX_BYTES = 1024 * 1024
const ICON_MAX_BYTES = 1024 * 1024
const HASH_LENGTH = 12
// Une page peut déclarer des milliers d'icônes, chacune pouvant coûter jusqu'à 10 s de timeout.
const MAX_CANDIDATES = 8
// L'écran attend la réponse sans retour d'avancement : de quoi lire une page lente (capture d'archive) puis quelques icônes.
const DEADLINE_MS = 20_000

// Un candidat injoignable, trop lourd ou illisible laisse sa chance au suivant ; une adresse refusée arrête tout (cible interne : accès réseau refusé), l'échéance aussi.
const SKIPPABLE_ERRORS = [FetchFailedError, ResponseTooLargeError, UnreadableIconError]

export class NoIconFoundError extends Error {}

export interface CompanyLogo {
  key: string
  width: number
  height: number
  source: IconSource
}

export async function fetchCompanyIcon(
  websiteUrl: string,
  deadline: AbortSignal = AbortSignal.timeout(DEADLINE_MS),
): Promise<{ icon: NormalizedIcon; source: IconSource }> {
  const page = await safeFetch(websiteUrl, {
    maxBytes: PAGE_MAX_BYTES,
    truncate: true,
    deadline,
  })
  const declared = findIconCandidates(page.body.toString("utf8"), page.url)
  // Dernier recours (ADR-023)
  const candidates: IconCandidate[] =
    declared.length > 0
      ? declared
      : [{ url: new URL("/favicon.ico", page.url), source: "icon", declaredSize: 0 }]

  let largestTooSmall = 0
  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    try {
      const image = await safeFetch(candidate.url, { maxBytes: ICON_MAX_BYTES, deadline })
      return { icon: await normalizeIcon(image.body), source: candidate.source }
    } catch (err) {
      if (err instanceof IconTooSmallError) largestTooSmall = Math.max(largestTooSmall, err.size)
      else if (!SKIPPABLE_ERRORS.some((type) => err instanceof type)) throw err
    }
  }

  if (largestTooSmall > 0) throw new IconTooSmallError(largestTooSmall)
  throw new NoIconFoundError()
}

// Nom tiré du contenu : le logo en place n'est jamais écrasé avant l'enregistrement ; une nouvelle adresse contourne le cache de next/image.
export async function storeCompanyLogo(slug: string, png: Buffer): Promise<string> {
  const hash = createHash("sha256").update(png).digest("hex").slice(0, HASH_LENGTH)
  const key = buildAssetKey({ folder: COMPANY_LOGO_FOLDER, slug, filename: `logo-${hash}.png` })

  const validation = validateAssetPath(key.split("/"))
  if (!validation.ok) throw new Error(validation.error)

  await adminR2.send(
    new PutObjectCommand({
      Bucket: R2_ADMIN_BUCKET,
      Key: key,
      Body: png,
      ContentType: "image/png",
    }),
  )
  return key
}

export async function retrieveCompanyLogo(websiteUrl: string, slug: string): Promise<CompanyLogo> {
  const { icon, source } = await fetchCompanyIcon(websiteUrl)
  const key = await storeCompanyLogo(slug, icon.png)
  return { key, width: icon.width, height: icon.height, source }
}
