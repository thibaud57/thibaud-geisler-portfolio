export type IconSource = "apple-touch-icon" | "icon"

export interface IconCandidate {
  url: URL
  source: IconSource
  declaredSize: number
}

// Document entier (borné à 1 Mo par safeFetch) : des icônes suivent des centaines de Ko de styles ou arrivent en fin de body.
// Longueur de balise bornée : un scan `[^>]*` est quadratique sur une entrée hostile.
const LINK_TAG = /<link\b[^>]{0,4096}>/gi
const BASE_TAG = /<base\b[^>]{0,4096}>/i
const ATTRIBUTE = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
const ENTITY = /&amp;|&#(\d+);|&#x([0-9a-f]+);/gi

const APPLE_TOUCH_RELS = new Set(["apple-touch-icon", "apple-touch-icon-precomposed"])
// Taille que Safari attend d'un apple-touch-icon déclaré sans `sizes`.
const APPLE_TOUCH_DEFAULT_SIZE = 180

function decodeEntities(value: string): string {
  return value.replace(ENTITY, (entity, decimal: string | undefined, hex: string | undefined) =>
    decimal || hex
      ? String.fromCodePoint(Number.parseInt(decimal ?? hex ?? "", decimal ? 10 : 16))
      : "&",
  )
}

function readAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>()
  for (const match of tag.matchAll(ATTRIBUTE)) {
    const name = match[1]?.toLowerCase()
    if (!name || attributes.has(name)) continue
    const value = match[2] ?? match[3] ?? match[4] ?? ""
    attributes.set(name, decodeEntities(value).trim())
  }
  return attributes
}

function resolveHref(href: string | undefined, base: URL): URL | null {
  if (!href) return null
  try {
    const url = new URL(href, base)
    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

function declaredSize(sizes: string | undefined, isSvg: boolean, fallback: number): number {
  if (isSvg || sizes?.toLowerCase() === "any") return Number.POSITIVE_INFINITY
  const values = (sizes ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((size) => Number.parseInt(size.split("x")[0] ?? "", 10))
    .filter((value) => Number.isFinite(value))
  return values.length > 0 ? Math.max(...values) : fallback
}

// Comparaison explicite : Infinity - Infinity vaut NaN et casserait un tri par soustraction.
function byDeclaredSizeDesc(a: IconCandidate, b: IconCandidate): number {
  if (a.declaredSize === b.declaredSize) return 0
  return a.declaredSize > b.declaredSize ? -1 : 1
}

export function findIconCandidates(html: string, pageUrl: URL): IconCandidate[] {
  const baseTag = BASE_TAG.exec(html)?.[0]
  const baseHref = baseTag ? readAttributes(baseTag).get("href") : undefined
  const base = resolveHref(baseHref, pageUrl) ?? pageUrl

  const appleTouch: IconCandidate[] = []
  const icons: IconCandidate[] = []
  for (const [tag] of html.matchAll(LINK_TAG)) {
    const attributes = readAttributes(tag)
    const rels = (attributes.get("rel") ?? "").toLowerCase().split(/\s+/)
    const isAppleTouch = rels.some((rel) => APPLE_TOUCH_RELS.has(rel))
    if (!isAppleTouch && !rels.includes("icon")) continue

    const url = resolveHref(attributes.get("href"), base)
    if (!url) continue
    const type = attributes.get("type")?.toLowerCase()
    const isSvg = type === "image/svg+xml" || url.pathname.toLowerCase().endsWith(".svg")
    const source: IconSource = isAppleTouch ? "apple-touch-icon" : "icon"
    const fallbackSize = isAppleTouch ? APPLE_TOUCH_DEFAULT_SIZE : 0
    const candidate = {
      url,
      source,
      declaredSize: declaredSize(attributes.get("sizes"), isSvg, fallbackSize),
    }
    if (isAppleTouch) appleTouch.push(candidate)
    else icons.push(candidate)
  }

  const seen = new Set<string>()
  return [...appleTouch.sort(byDeclaredSizeDesc), ...icons.sort(byDeclaredSizeDesc)].filter(
    ({ url }) => {
      if (seen.has(url.href)) return false
      seen.add(url.href)
      return true
    },
  )
}
