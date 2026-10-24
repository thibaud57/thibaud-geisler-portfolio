import "server-only"
import { createHash } from "node:crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"

import { assertNever } from "@/lib/assert-never"
import { buildAssetKey, COMPANY_LOGO_FOLDER } from "@/lib/asset-keys"
import { adminR2, R2_ADMIN_BUCKET } from "@/lib/r2"
import { validateAssetPath } from "@/server/assets/serve-asset"

import { findIconCandidates, type IconCandidate, type IconSource } from "./icon-candidates"
import { type IconFailure, normalizeIcon, type NormalizedIcon } from "./normalize-icon"
import { type FetchFailure, safeFetch } from "./safe-fetch"

const PAGE_MAX_BYTES = 1024 * 1024
const ICON_MAX_BYTES = 1024 * 1024
const HASH_LENGTH = 12
// Une page peut déclarer des milliers d'icônes, chacune pouvant coûter jusqu'à 10 s de timeout.
const MAX_CANDIDATES = 8
// L'écran attend la réponse sans retour d'avancement : de quoi lire une page lente (capture d'archive) puis quelques icônes.
const DEADLINE_MS = 20_000

export interface CompanyLogo {
  key: string
  width: number
  height: number
  source: IconSource
}

export type CompanyIconFailure =
  | Exclude<FetchFailure, { message: "response_too_large" }>
  | Extract<IconFailure, { message: "icon_too_small" }>
  | { ok: false; message: "no_icon_found" }

export type CompanyIconOutcome =
  { ok: true; icon: NormalizedIcon; source: IconSource } | CompanyIconFailure

export type CompanyLogoOutcome = ({ ok: true } & CompanyLogo) | CompanyIconFailure

type CandidateOutcome =
  { ok: true; icon: NormalizedIcon; source: IconSource } | FetchFailure | IconFailure

async function tryCandidate(
  candidate: IconCandidate,
  deadline: AbortSignal,
): Promise<CandidateOutcome> {
  const fetched = await safeFetch(candidate.url, { maxBytes: ICON_MAX_BYTES, deadline })
  if (!fetched.ok) return fetched
  const normalized = await normalizeIcon(fetched.resource.body)
  return normalized.ok ? { ok: true, icon: normalized.icon, source: candidate.source } : normalized
}

export async function fetchCompanyIcon(
  websiteUrl: URL,
  deadline: AbortSignal = AbortSignal.timeout(DEADLINE_MS),
): Promise<CompanyIconOutcome> {
  const page = await safeFetch(websiteUrl, {
    maxBytes: PAGE_MAX_BYTES,
    truncate: true,
    deadline,
  })
  if (!page.ok) return page
  const declared = findIconCandidates(page.resource.body.toString("utf8"), page.resource.url)
  // Dernier recours (ADR-023)
  const candidates: IconCandidate[] =
    declared.length > 0
      ? declared
      : [{ url: new URL("/favicon.ico", page.resource.url), source: "icon", declaredSize: 0 }]

  let largestTooSmall = 0
  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    const outcome = await tryCandidate(candidate, deadline)
    if (outcome.ok) return outcome
    switch (outcome.message) {
      // Une adresse refusée arrête tout (cible interne : accès réseau refusé), l'échéance aussi.
      case "address_blocked":
      case "site_too_slow":
        return outcome
      case "icon_too_small":
        largestTooSmall = Math.max(largestTooSmall, outcome.size)
        break
      // Un candidat injoignable, trop lourd ou illisible laisse sa chance au suivant.
      case "site_unreachable":
      case "response_too_large":
      case "icon_unreadable":
        break
      default:
        return assertNever(outcome)
    }
  }

  return largestTooSmall > 0
    ? { ok: false, message: "icon_too_small", size: largestTooSmall }
    : { ok: false, message: "no_icon_found" }
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

export async function retrieveCompanyLogo(
  websiteUrl: URL,
  slug: string,
): Promise<CompanyLogoOutcome> {
  const fetched = await fetchCompanyIcon(websiteUrl)
  if (!fetched.ok) return fetched
  const { icon, source } = fetched
  const key = await storeCompanyLogo(slug, icon.png)
  return { ok: true, key, width: icon.width, height: icon.height, source }
}
