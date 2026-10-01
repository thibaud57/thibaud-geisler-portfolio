# Logo récupéré depuis le site de l'entreprise : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un bouton de la card Logo lit la page du champ site web, retient la meilleure icône qu'elle déclare, la convertit en PNG, la range dans R2 et la montre en aperçu ; la fiche pointe vers elle une fois enregistrée.

**Architecture:** Un dossier `src/server/company-logo/` isole chaque responsabilité : garde d'adresses (pure), requête sortante gardée (`node:http`/`node:https` avec `lookup` vérifié), lecture des balises d'icône (pure), conversion `sharp`, enchaînement et rangement R2. Une Server Action l'expose au formulaire ; la card Logo, extraite de `CompanyForm`, place la clé rangée dans le champ caché `logoFilename` existant, sans toucher à l'action entreprise.

**Tech Stack:** Node 24 (`node:net` `BlockList`, `node:dns`, `node:http`, `node:https`, `node:crypto`), `sharp`, `@aws-sdk/client-s3`, Next.js 16 Server Actions, React 19 `useTransition`, Vitest 4.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/06-logo-depuis-site-web-design.md`

## Global Constraints

- **Prérequis** : plan `03` implémenté (`CompanyForm` à props `company: AdminCompanyDetail | null`, `legalEntities`, `logoAssets`), sa card Logo inchangée.
- **Sources, dans l'ordre** : `apple-touch-icon` et `apple-touch-icon-precomposed` (180 px par défaut sans `sizes`), puis `<link rel="icon">` et `shortcut icon` de la plus grande taille déclarée, un SVG comptant comme la plus grande. Icônes `.ico` ignorées, jamais `og:image`. Adresses relatives résolues contre `<base href>`, sinon contre l'adresse finale de la page. Adresse du champ lue telle quelle, sans traitement propre à Wayback.
- **Conversion** : entrées PNG, JPEG, WebP, GIF, SVG ; sortie PNG, 256 px au plus sur le grand côté, jamais agrandie ; SVG rendu à 256 px ; refus sous 32 px.
- **Garde réseau** : `http` et `https` sur leurs ports implicites seulement ; plages refusées du spec ; cinq redirections au plus, chacune revérifiée ; 10 secondes par requête ; `Accept-Encoding: identity` ; page tronquée à 1 Mo, image refusée au-delà de 1 Mo.
- **Rangement** : bucket admin, clé `freelance/crm/entreprises/<slug>/logo-<12 premiers hexadécimaux du SHA-256 du PNG>.png`, `ContentType: image/png`.
- **Messages** : `invalid_input`, `site_unreachable` (code HTTP ou null), `address_blocked`, `no_icon_found`, `icon_too_small` (taille), `unknown_error`.
- **`sharp`** : même version que celle déjà installée par Next (`0.35.4` au 2026-09-26, `pnpm ls sharp` pour la relire).
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/nextjs/assets.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/images-fonts.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`, `.claude/rules/typescript/conventions.md`.

## Review Focus

- **Candidat cassé avant un bon** : un `apple-touch-icon` en 404 ne doit pas faire échouer une fiche qui déclare aussi une bonne icône. Couvert par « falls back to the next candidate when one fails » (Task 5).
- **Redirection vers une adresse interne** : un site public qui redirige vers `192.168.1.1` est refusé avant toute connexion. Couvert par « re-checks the target of a redirect » (Task 2).
- **Nom qui résout vers une adresse privée** : refusé à la résolution, la connexion ne part jamais. Couvert par « refuses a host name that resolves to a private address » (Task 2).
- **Page lourde** : une page de plus de 1 Mo, en-tête en tête, se lit tronquée au lieu d'échouer. Couvert par « truncates a page past its size limit » (Task 2).
- **Slug saisi en majuscules** : le schéma de l'entreprise le met en minuscules à l'enregistrement, l'action fait de même pour que le logo tombe dans le bon dossier. Couvert par « lowercases the slug before storing » (Task 6).

---

### Task 1 : Garde d'adresses

**Files:**
- Create: `src/server/company-logo/address-guard.ts`
- Test: `src/server/company-logo/address-guard.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: `isBlockedAddress(address: string): boolean`, `checkOutboundUrl(target: string | URL): URL | null`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest"

import { checkOutboundUrl, isBlockedAddress } from "./address-guard"

describe("isBlockedAddress", () => {
  it.each(["0.0.0.0", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.5.4", "192.168.1.1"])(
    "blocks loopback, private, link-local, shared and unspecified IPv4 ranges (%s)",
    (address) => {
      const blocked = isBlockedAddress(address)

      expect(blocked).toBe(true)
    },
  )

  it.each(["::", "::1", "fd12:3456::1", "fe80::1"])(
    "blocks IPv6 loopback, unique local and link-local addresses (%s)",
    (address) => {
      const blocked = isBlockedAddress(address)

      expect(blocked).toBe(true)
    },
  )

  it.each(["::ffff:127.0.0.1", "::ffff:c0a8:101"])(
    "blocks a private IPv4 address embedded in an IPv6 address (%s)",
    (address) => {
      const blocked = isBlockedAddress(address)

      expect(blocked).toBe(true)
    },
  )

  it.each(["93.184.215.14", "2606:4700:4700::1111"])(
    "allows a public IPv4 and IPv6 address (%s)",
    (address) => {
      const blocked = isBlockedAddress(address)

      expect(blocked).toBe(false)
    },
  )
})

describe("checkOutboundUrl", () => {
  it.each([
    "ftp://acme.example/",
    "file:///etc/passwd",
    "http://acme.example:8080/",
    "https://acme.example:80/",
    "http://user:secret@acme.example/",
  ])("rejects a non-http scheme and a port other than 80 or 443 (%s)", (target) => {
    const url = checkOutboundUrl(target)

    expect(url).toBeNull()
  })

  it.each(["http://127.0.0.1/", "http://[::1]/", "http://2130706433/", "http://0x7f.1/"])(
    "rejects an internal IP literal, whatever its notation (%s)",
    (target) => {
      const url = checkOutboundUrl(target)

      expect(url).toBeNull()
    },
  )

  it("accepts a public https address", () => {
    const url = checkOutboundUrl("https://acme.example/fr/")

    expect(url?.href).toBe("https://acme.example/fr/")
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/company-logo/address-guard.test.ts`
Expected: FAIL, module `./address-guard` introuvable.

- [ ] **Step 3 : Écrire la garde**

```ts
import "server-only"
import { BlockList, isIP } from "node:net"

// Plages non routables sur Internet : réseau privé, la machine elle-même, métadonnées du VPS (169.254.169.254), partage opérateur, documentation, multicast, réservées.
const BLOCKED_IPV4: readonly (readonly [string, number])[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]

// NAT64 (64:ff9b::/96) et 6to4 (2002::/16) portent une IPv4 que BlockList ne déballe pas : refusés en bloc, aucun site ne s'y publie.
const BLOCKED_IPV6: readonly (readonly [string, number])[] = [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
]

const BLOCK_LIST = new BlockList()
for (const [network, prefix] of BLOCKED_IPV4) BLOCK_LIST.addSubnet(network, prefix, "ipv4")
for (const [network, prefix] of BLOCKED_IPV6) BLOCK_LIST.addSubnet(network, prefix, "ipv6")

// BlockList applique ses plages IPv4 à une IPv6 qui en porte une (::ffff:10.0.0.1) ; le test « embedded » le revérifie à chaque montée de Node.
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return true
  return BLOCK_LIST.check(address, family === 4 ? "ipv4" : "ipv6")
}

// `URL.port` est vide pour un port implicite (80/443) ; le parseur WHATWG ramène les écritures numériques (2130706433, 0x7f.1) à 127.0.0.1 avant ce contrôle.
export function checkOutboundUrl(target: string | URL): URL | null {
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return null
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  if (url.port !== "" || url.username !== "" || url.password !== "") return null

  const host = url.hostname.replace(/^\[(.*)\]$/, "$1")
  if (isIP(host) !== 0 && isBlockedAddress(host)) return null
  return url
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/company-logo/address-guard.test.ts`
Expected: PASS.

---

### Task 2 : Requête sortante gardée

**Files:**
- Create: `src/server/company-logo/safe-fetch.ts`
- Test: `src/server/company-logo/safe-fetch.test.ts`

**Interfaces:**
- Consumes: `checkOutboundUrl`, `isBlockedAddress` (Task 1)
- Produces: `safeFetch(target: string | URL, options: { maxBytes: number; truncate?: boolean }): Promise<{ url: URL; body: Buffer }>` ; `guardedLookup: LookupFunction` ; classes `BlockedAddressError`, `FetchFailedError` (champ `status: number | null`), `ResponseTooLargeError`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// @vitest-environment node
import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("node:dns", () => ({ lookup: vi.fn() }))
vi.mock("node:http", () => ({ default: { get: vi.fn() } }))
vi.mock("node:https", () => ({ default: { get: vi.fn() } }))

import { lookup, type LookupAddress } from "node:dns"
import http from "node:http"
import https from "node:https"

import {
  BlockedAddressError,
  FetchFailedError,
  guardedLookup,
  ResponseTooLargeError,
  safeFetch,
} from "./safe-fetch"

function fakeResponse(statusCode: number, headers: Record<string, string>, body?: Buffer) {
  return Object.assign(Readable.from(body ? [body] : []), { statusCode, headers })
}

function httpsRepliesWith(...responses: ReturnType<typeof fakeResponse>[]) {
  for (const response of responses) {
    vi.mocked(https.get).mockImplementationOnce(((
      _url: unknown,
      _options: unknown,
      callback: (res: unknown) => void,
    ) => {
      callback(response)
      return new EventEmitter()
    }) as never)
  }
}

describe("guardedLookup", () => {
  afterEach(() => vi.clearAllMocks())

  it("refuses a host name that resolves to a private address", () => {
    vi.mocked(lookup).mockImplementation(((
      _hostname: string,
      _options: unknown,
      callback: (err: null, addresses: LookupAddress[]) => void,
    ) => {
      callback(null, [{ address: "10.0.0.5", family: 4 }])
    }) as never)
    const callback = vi.fn()

    guardedLookup("intranet.acme.example", {}, callback)

    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(BlockedAddressError)
  })
})

describe("safeFetch", () => {
  afterEach(() => vi.clearAllMocks())

  it("refuses an internal IP literal before any request", async () => {
    const result = safeFetch("http://127.0.0.1/", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(BlockedAddressError)
    expect(http.get).not.toHaveBeenCalled()
  })

  it("re-checks the target of a redirect", async () => {
    httpsRepliesWith(fakeResponse(302, { location: "http://192.168.1.1/admin" }))

    const result = safeFetch("https://acme.example/", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(BlockedAddressError)
    expect(http.get).not.toHaveBeenCalled()
  })

  it("truncates a page past its size limit", async () => {
    httpsRepliesWith(fakeResponse(200, {}, Buffer.alloc(2048, "a")))

    const page = await safeFetch("https://acme.example/", { maxBytes: 1024, truncate: true })

    expect(page.body.length).toBe(1024)
  })

  it("rejects an image past its size limit", async () => {
    httpsRepliesWith(fakeResponse(200, {}, Buffer.alloc(2048, "a")))

    const result = safeFetch("https://acme.example/logo.png", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(ResponseTooLargeError)
  })

  it("reports the status of a failed response", async () => {
    httpsRepliesWith(fakeResponse(404, {}))

    const result = safeFetch("https://acme.example/", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(FetchFailedError)
    await expect(result).rejects.toMatchObject({ status: 404 })
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/company-logo/safe-fetch.test.ts`
Expected: FAIL, module `./safe-fetch` introuvable.

- [ ] **Step 3 : Écrire la requête gardée**

```ts
import "server-only"
import { lookup as dnsLookup } from "node:dns"
import http, { type IncomingMessage, type RequestOptions } from "node:http"
import https from "node:https"
import type { LookupFunction } from "node:net"

import { checkOutboundUrl, isBlockedAddress } from "./address-guard"

const MAX_REDIRECTS = 5
// Internet Archive met souvent plusieurs secondes à servir une capture.
const TIMEOUT_MS = 10_000
const USER_AGENT = "Mozilla/5.0 (compatible; thibaud-geisler-portfolio logo fetcher)"

export class BlockedAddressError extends Error {}

export class FetchFailedError extends Error {
  readonly status: number | null

  constructor(status: number | null, options?: ErrorOptions) {
    super(status === null ? "Requête échouée" : `Réponse ${status}`, options)
    this.status = status
  }
}

export class ResponseTooLargeError extends Error {}

export interface FetchOptions {
  maxBytes: number
  // Une page se lit tronquée, ses balises d'icône étant dans l'en-tête ; une image tronquée ne sert à rien.
  truncate?: boolean
}

export interface FetchedResource {
  url: URL
  body: Buffer
}

type RawResponse = { kind: "redirect"; location: string } | { kind: "body"; body: Buffer }

// La connexion part sur l'adresse vérifiée ici, sans nouvelle résolution DNS qui pointerait ailleurs (rebinding) ; `all` répond à l'autoSelectFamily de Node (IPv4/IPv6 en parallèle).
export const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, "", 0)
      return
    }
    const first = addresses[0]
    if (!first || addresses.some(({ address }) => isBlockedAddress(address))) {
      callback(new BlockedAddressError(hostname), "", 0)
      return
    }
    if (options.all) {
      callback(null, addresses)
      return
    }
    callback(null, first.address, first.family)
  })
}

function request(url: URL, { maxBytes, truncate = false }: FetchOptions): Promise<RawResponse> {
  const options: RequestOptions = {
    lookup: guardedLookup,
    headers: { "user-agent": USER_AGENT, accept: "*/*", "accept-encoding": "identity" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }

  return new Promise((resolve, reject) => {
    const onResponse = (res: IncomingMessage): void => {
      const status = res.statusCode ?? 0
      const location = res.headers.location
      if (status >= 300 && status < 400 && location) {
        res.resume()
        resolve({ kind: "redirect", location })
        return
      }
      if (status < 200 || status >= 300) {
        res.resume()
        reject(new FetchFailedError(status))
        return
      }
      const encoding = res.headers["content-encoding"]
      if (encoding && encoding !== "identity") {
        res.resume()
        reject(new FetchFailedError(null))
        return
      }

      const chunks: Buffer[] = []
      let size = 0
      res.on("data", (chunk: Buffer) => {
        const room = maxBytes - size
        if (chunk.length <= room) {
          chunks.push(chunk)
          size += chunk.length
          return
        }
        res.destroy()
        if (truncate) {
          chunks.push(chunk.subarray(0, room))
          resolve({ kind: "body", body: Buffer.concat(chunks) })
        } else {
          reject(new ResponseTooLargeError())
        }
      })
      res.on("end", () => {
        resolve({ kind: "body", body: Buffer.concat(chunks) })
      })
      res.on("error", (err) => {
        reject(new FetchFailedError(null, { cause: err }))
      })
    }

    const req =
      url.protocol === "https:"
        ? https.get(url, options, onResponse)
        : http.get(url, options, onResponse)
    req.on("error", (err) => {
      reject(err instanceof BlockedAddressError ? err : new FetchFailedError(null, { cause: err }))
    })
  })
}

function nextTarget(location: string, current: URL): URL | null {
  try {
    return checkOutboundUrl(new URL(location, current))
  } catch {
    throw new FetchFailedError(null)
  }
}

export async function safeFetch(target: string | URL, options: FetchOptions): Promise<FetchedResource> {
  let url = checkOutboundUrl(target)
  for (let redirects = 0; ; redirects++) {
    if (!url) throw new BlockedAddressError(String(target))
    const response = await request(url, options)
    if (response.kind === "body") return { url, body: response.body }
    if (redirects === MAX_REDIRECTS) throw new FetchFailedError(null)
    url = nextTarget(response.location, url)
  }
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/company-logo/safe-fetch.test.ts`
Expected: PASS.

---

### Task 3 : Icônes déclarées par la page

**Files:**
- Create: `src/server/company-logo/icon-candidates.ts`
- Test: `src/server/company-logo/icon-candidates.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: `type IconSource = "apple-touch-icon" | "icon"` ; `interface IconCandidate { url: URL; source: IconSource; declaredSize: number }` ; `findIconCandidates(html: string, pageUrl: URL): IconCandidate[]`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest"

import { findIconCandidates } from "./icon-candidates"

const PAGE = new URL("https://www.acme.example/fr/accueil")

function pathsOf(head: string): string[] {
  return findIconCandidates(`<html><head>${head}</head><body></body></html>`, PAGE).map(
    (candidate) => candidate.url.pathname,
  )
}

describe("findIconCandidates", () => {
  it("ranks apple-touch-icon before any other icon", () => {
    const html = `<head>
      <link rel="icon" href="/icon-512.png" sizes="512x512">
      <link rel="apple-touch-icon" href="/apple.png">
    </head>`

    const candidates = findIconCandidates(html, PAGE)

    expect(candidates.map(({ source, url }) => [source, url.pathname])).toEqual([
      ["apple-touch-icon", "/apple.png"],
      ["icon", "/icon-512.png"],
    ])
  })

  it("orders icons by largest declared size, an svg first", () => {
    const paths = pathsOf(`
      <link rel="icon" href="/16.png" sizes="16x16">
      <link rel="icon" href="/logo.svg" type="image/svg+xml">
      <link rel="shortcut icon" href="/192.png" sizes="192x192">
      <link rel="icon" href="/multi.png" sizes="32x32 64x64">
    `)

    expect(paths).toEqual(["/logo.svg", "/192.png", "/multi.png", "/16.png"])
  })

  it("resolves relative hrefs against the base element, then the page URL", () => {
    const withBase = findIconCandidates(
      `<head><base href="https://cdn.acme.example/assets/"><link rel="icon" href="icon.png"></head>`,
      PAGE,
    )
    const withoutBase = findIconCandidates(`<head><link rel="icon" href="icon.png"></head>`, PAGE)

    expect(withBase[0]?.url.href).toBe("https://cdn.acme.example/assets/icon.png")
    expect(withoutBase[0]?.url.href).toBe("https://www.acme.example/fr/icon.png")
  })

  it("skips ico icons, og:image and non-icon links", () => {
    const paths = pathsOf(`
      <link rel="icon" href="/favicon.ico">
      <link rel="icon" type="image/x-icon" href="/favicon">
      <meta property="og:image" content="/share.png">
      <link rel="stylesheet" href="/app.css">
      <link rel="mask-icon" href="/pinned.svg">
      <link rel="icon" href="/ok.png">
    `)

    expect(paths).toEqual(["/ok.png"])
  })

  it("keeps a single candidate per address, as a wayback capture declares", () => {
    const icon =
      "https://web.archive.org/web/20230608045345im_/https://paysystem.eu/wp-content/uploads/2020/07/Paysystem-Favicon.png"
    const html = `<head>
      <link rel="icon" href="${icon}" sizes="32x32"/>
      <link rel="icon" href="${icon}" sizes="192x192"/>
      <link rel="apple-touch-icon" href="${icon}"/>
    </head>`

    const candidates = findIconCandidates(html, new URL("https://web.archive.org/web/20230608045345/https://paysystem.eu/"))

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.source).toBe("apple-touch-icon")
    expect(candidates[0]?.url.href).toBe(icon)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/company-logo/icon-candidates.test.ts`
Expected: FAIL, module `./icon-candidates` introuvable.

- [ ] **Step 3 : Écrire la lecture des balises**

```ts
export type IconSource = "apple-touch-icon" | "icon"

export interface IconCandidate {
  url: URL
  source: IconSource
  declaredSize: number
}

// Seules des balises vides servent (<link>, <base>) : pas besoin d'un analyseur HTML complet.
const HEAD_END = /<\/head\s*>/i
const LINK_TAG = /<link\b[^>]*>/gi
const BASE_TAG = /<base\b[^>]*>/i
const ATTRIBUTE = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g

const APPLE_TOUCH_RELS = new Set(["apple-touch-icon", "apple-touch-icon-precomposed"])
// Taille que Safari attend d'un apple-touch-icon déclaré sans `sizes`.
const APPLE_TOUCH_DEFAULT_SIZE = 180
const ICO_TYPES = new Set(["image/x-icon", "image/vnd.microsoft.icon"])

function readAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>()
  for (const match of tag.matchAll(ATTRIBUTE)) {
    const name = match[1]?.toLowerCase()
    if (!name || attributes.has(name)) continue
    const value = match[2] ?? match[3] ?? match[4] ?? ""
    attributes.set(name, value.replaceAll("&amp;", "&").trim())
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
  const headEnd = html.search(HEAD_END)
  const head = headEnd === -1 ? html : html.slice(0, headEnd)
  const baseTag = BASE_TAG.exec(head)?.[0]
  const baseHref = baseTag ? readAttributes(baseTag).get("href") : undefined
  const base = resolveHref(baseHref, pageUrl) ?? pageUrl

  const appleTouch: IconCandidate[] = []
  const icons: IconCandidate[] = []
  for (const [tag] of head.matchAll(LINK_TAG)) {
    const attributes = readAttributes(tag)
    const rels = (attributes.get("rel") ?? "").toLowerCase().split(/\s+/)
    const isAppleTouch = rels.some((rel) => APPLE_TOUCH_RELS.has(rel))
    if (!isAppleTouch && !rels.includes("icon")) continue

    const url = resolveHref(attributes.get("href"), base)
    if (!url) continue
    const type = attributes.get("type")?.toLowerCase()
    const path = url.pathname.toLowerCase()
    if ((type && ICO_TYPES.has(type)) || path.endsWith(".ico")) continue

    const isSvg = type === "image/svg+xml" || path.endsWith(".svg")
    const source: IconSource = isAppleTouch ? "apple-touch-icon" : "icon"
    const fallbackSize = isAppleTouch ? APPLE_TOUCH_DEFAULT_SIZE : 0
    const candidate = { url, source, declaredSize: declaredSize(attributes.get("sizes"), isSvg, fallbackSize) }
    if (isAppleTouch) appleTouch.push(candidate)
    else icons.push(candidate)
  }

  const seen = new Set<string>()
  return [...appleTouch.sort(byDeclaredSizeDesc), ...icons.sort(byDeclaredSizeDesc)].filter(({ url }) => {
    if (seen.has(url.href)) return false
    seen.add(url.href)
    return true
  })
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/company-logo/icon-candidates.test.ts`
Expected: PASS.

---

### Task 4 : Conversion en PNG

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (`sharp` en dépendance directe)
- Modify: `docs/VERSIONS.md` (section `sharp`)
- Create: `src/server/company-logo/normalize-icon.ts`
- Test: `src/server/company-logo/normalize-icon.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: `normalizeIcon(input: Buffer): Promise<NormalizedIcon>` avec `interface NormalizedIcon { png: Buffer; width: number; height: number }` (dimensions d'origine, celles du rendu pour un SVG) ; `MIN_ICON_SIZE = 32`, `MAX_ICON_SIZE = 256` ; classes `IconTooSmallError` (champ `size: number`), `UnreadableIconError`

- [ ] **Step 1 : Ajouter `sharp`**

Run: `pnpm ls sharp --depth 10` pour relire la version tirée par Next, puis `pnpm add sharp@<cette version>` (`0.35.4` au 2026-09-26).
Expected: `sharp` dans `dependencies` de `package.json`, une seule version de `sharp` dans `pnpm-lock.yaml`. `pnpm-workspace.yaml` l'autorise déjà à compiler (`allowBuilds`).

- [ ] **Step 2 : Documenter la dépendance**

Charger le skill `versions-doc`, lire son template, puis ajouter à `docs/VERSIONS.md` :
- une ligne `sharp` dans le tableau récapitulatif des librairies applicatives ;
- une section `### 12. sharp` sous « Librairies applicatives » : version installée, rôle (conversion en PNG des logos récupérés depuis le site d'une entreprise, ADR-023), compatibilité (même version que la dépendance optionnelle de Next 16.3.3, `^0.35.3`, une seule copie installée ; image Docker alpine : `libc6-compat` déjà posé par le `Dockerfile`), point de vigilance (garder la version alignée sur celle de Next à chaque montée de Next).

- [ ] **Step 3 : Écrire les tests qui échouent**

```ts
// @vitest-environment node
import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { IconTooSmallError, normalizeIcon, UnreadableIconError } from "./normalize-icon"

function pngOf(width: number, height = width): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 18, g: 52, b: 86, alpha: 1 } },
  })
    .png()
    .toBuffer()
}

async function sizeOf(png: Buffer): Promise<{ width?: number; height?: number }> {
  const { width, height } = await sharp(png).metadata()
  return { width, height }
}

describe("normalizeIcon", () => {
  it("rejects an icon smaller than 32 px", async () => {
    const icon = await pngOf(16)

    const result = normalizeIcon(icon)

    await expect(result).rejects.toBeInstanceOf(IconTooSmallError)
    await expect(result).rejects.toMatchObject({ size: 16 })
  })

  it("never enlarges a 48 px icon", async () => {
    const icon = await pngOf(48)

    const normalized = await normalizeIcon(icon)

    expect(await sizeOf(normalized.png)).toEqual({ width: 48, height: 48 })
  })

  it("scales a large icon down to 256 px", async () => {
    const icon = await pngOf(512, 256)

    const normalized = await normalizeIcon(icon)

    expect(await sizeOf(normalized.png)).toEqual({ width: 256, height: 128 })
    expect([normalized.width, normalized.height]).toEqual([512, 256])
  })

  it("renders an svg icon at 256 px", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="#123456"/></svg>',
    )

    const normalized = await normalizeIcon(svg)

    expect(await sizeOf(normalized.png)).toEqual({ width: 256, height: 256 })
  })

  it("rejects a file that is not an image", async () => {
    const html = Buffer.from("<html><body>Not found</body></html>")

    const result = normalizeIcon(html)

    await expect(result).rejects.toBeInstanceOf(UnreadableIconError)
  })
})
```

- [ ] **Step 4 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/company-logo/normalize-icon.test.ts`
Expected: FAIL, module `./normalize-icon` introuvable.

- [ ] **Step 5 : Écrire la conversion**

```ts
import "server-only"
import sharp from "sharp"

export const MIN_ICON_SIZE = 32
export const MAX_ICON_SIZE = 256
// Garde-fou contre une image aux dimensions démesurées, très au-delà de toute icône.
const MAX_INPUT_PIXELS = 4096 * 4096
const ACCEPTED_FORMATS = new Set(["png", "jpeg", "webp", "gif", "svg"])
const SVG_BASE_DENSITY = 72

export class IconTooSmallError extends Error {
  readonly size: number

  constructor(size: number) {
    super(`Icône de ${size} px`)
    this.size = size
  }
}

export class UnreadableIconError extends Error {}

export interface NormalizedIcon {
  png: Buffer
  width: number
  height: number
}

function toPng(image: sharp.Sharp): Promise<Buffer> {
  return image
    .resize(MAX_ICON_SIZE, MAX_ICON_SIZE, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()
}

export async function normalizeIcon(input: Buffer): Promise<NormalizedIcon> {
  const metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .metadata()
    .catch(() => null)
  if (!metadata?.format || !ACCEPTED_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) {
    throw new UnreadableIconError()
  }
  const { format, width, height } = metadata

  if (format === "svg") {
    // sharp rend un SVG à sa taille intrinsèque (72 dpi) : sans ce recalcul, une icône déclarée à 24 px tomberait sous le seuil.
    const density = (SVG_BASE_DENSITY * MAX_ICON_SIZE) / Math.max(width, height)
    const png = await toPng(sharp(input, { density, limitInputPixels: MAX_INPUT_PIXELS }))
    const rendered = await sharp(png).metadata()
    return { png, width: rendered.width ?? MAX_ICON_SIZE, height: rendered.height ?? MAX_ICON_SIZE }
  }

  const largest = Math.max(width, height)
  if (largest < MIN_ICON_SIZE) throw new IconTooSmallError(largest)
  return { png: await toPng(sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })), width, height }
}
```

- [ ] **Step 6 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/company-logo/normalize-icon.test.ts`
Expected: PASS.

---

### Task 5 : Enchaînement et rangement dans R2

**Files:**
- Create: `src/server/company-logo/fetch-company-logo.ts`
- Test: `src/server/company-logo/fetch-company-logo.test.ts`

**Interfaces:**
- Consumes: `safeFetch`, `BlockedAddressError`, `FetchFailedError`, `ResponseTooLargeError` (Task 2) ; `findIconCandidates`, `IconSource` (Task 3) ; `normalizeIcon`, `IconTooSmallError`, `UnreadableIconError`, `NormalizedIcon` (Task 4) ; `adminR2`, `R2_ADMIN_BUCKET` (`@/lib/r2`) ; `buildAssetKey`, `COMPANY_LOGO_FOLDER` (`@/lib/asset-keys`) ; `validateAssetPath` (`@/server/config/assets`)
- Produces: `fetchCompanyIcon(websiteUrl: string): Promise<{ icon: NormalizedIcon; source: IconSource }>` ; `storeCompanyLogo(slug: string, png: Buffer): Promise<string>` ; `retrieveCompanyLogo(websiteUrl: string, slug: string): Promise<CompanyLogo>` avec `interface CompanyLogo { key: string; width: number; height: number; source: IconSource }` ; classe `NoIconFoundError`. `retrieveCompanyLogo` est la fonction que réutilise le sub-project `20`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/r2", () => ({ adminR2: { send: vi.fn() }, R2_ADMIN_BUCKET: "test-admin-bucket" }))
vi.mock("./safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./safe-fetch")>()),
  safeFetch: vi.fn(),
}))
vi.mock("./normalize-icon", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./normalize-icon")>()),
  normalizeIcon: vi.fn(),
}))

import { adminR2 } from "@/lib/r2"

import { fetchCompanyIcon, storeCompanyLogo } from "./fetch-company-logo"
import { IconTooSmallError, normalizeIcon } from "./normalize-icon"
import { BlockedAddressError, FetchFailedError, safeFetch } from "./safe-fetch"

const SITE = "https://acme.example/"

function page(head: string) {
  return { url: new URL(SITE), body: Buffer.from(`<html><head>${head}</head></html>`) }
}

function image(path: string) {
  return { url: new URL(path, SITE), body: Buffer.from(path) }
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

describe("fetchCompanyIcon", () => {
  afterEach(() => vi.clearAllMocks())

  it("falls back to the next candidate when one fails", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(
        page('<link rel="apple-touch-icon" href="/apple.png"><link rel="icon" href="/icon.png" sizes="64x64">'),
      )
      .mockRejectedValueOnce(new FetchFailedError(404))
      .mockResolvedValueOnce(image("/icon.png"))
    vi.mocked(normalizeIcon).mockResolvedValue({ png: Buffer.from("png"), width: 64, height: 64 })

    const result = await fetchCompanyIcon(SITE)

    expect(result.source).toBe("icon")
    expect(normalizeIcon).toHaveBeenCalledTimes(1)
  })

  it("reports the largest too small size when no candidate is large enough", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockResolvedValueOnce(image("/a.png"))
      .mockResolvedValueOnce(image("/b.png"))
    vi.mocked(normalizeIcon)
      .mockRejectedValueOnce(new IconTooSmallError(16))
      .mockRejectedValueOnce(new IconTooSmallError(24))

    const result = fetchCompanyIcon(SITE)

    await expect(result).rejects.toBeInstanceOf(IconTooSmallError)
    await expect(result).rejects.toMatchObject({ size: 24 })
  })

  it("stops at a blocked address", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockRejectedValueOnce(new BlockedAddressError("intranet"))

    const result = fetchCompanyIcon(SITE)

    await expect(result).rejects.toBeInstanceOf(BlockedAddressError)
    expect(safeFetch).toHaveBeenCalledTimes(2)
  })
})

describe("storeCompanyLogo", () => {
  afterEach(() => vi.clearAllMocks())

  it("stores the icon under the company folder with a content-derived name", async () => {
    const png = Buffer.from("same-png")

    const first = await storeCompanyLogo("acme", png)
    const second = await storeCompanyLogo("acme", png)

    expect(first).toMatch(/^freelance\/crm\/entreprises\/acme\/logo-[0-9a-f]{12}\.png$/)
    expect(second).toBe(first)
    expect(adminR2.send).toHaveBeenCalledWith(
      objectMatch({
        input: objectMatch({ Bucket: "test-admin-bucket", Key: first, ContentType: "image/png" }),
      }),
    )
  })
})
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/company-logo/fetch-company-logo.test.ts`
Expected: FAIL, module `./fetch-company-logo` introuvable.

- [ ] **Step 3 : Écrire l'enchaînement**

```ts
import "server-only"
import { createHash } from "node:crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"

import { buildAssetKey, COMPANY_LOGO_FOLDER } from "@/lib/asset-keys"
import { adminR2, R2_ADMIN_BUCKET } from "@/lib/r2"
import { validateAssetPath } from "@/server/config/assets"

import { findIconCandidates, type IconSource } from "./icon-candidates"
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

// Un candidat injoignable, trop lourd ou illisible laisse sa chance au suivant ; une adresse refusée arrête tout (icône interne, mauvaise foi présumée).
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
): Promise<{ icon: NormalizedIcon; source: IconSource }> {
  const page = await safeFetch(websiteUrl, { maxBytes: PAGE_MAX_BYTES, truncate: true })
  const candidates = findIconCandidates(page.body.toString("utf8"), page.url)

  let largestTooSmall = 0
  for (const candidate of candidates) {
    try {
      const image = await safeFetch(candidate.url, { maxBytes: ICON_MAX_BYTES })
      return { icon: await normalizeIcon(image.body), source: candidate.source }
    } catch (err) {
      if (err instanceof IconTooSmallError) largestTooSmall = Math.max(largestTooSmall, err.size)
      else if (!SKIPPABLE_ERRORS.some((type) => err instanceof type)) throw err
    }
  }

  if (largestTooSmall > 0) throw new IconTooSmallError(largestTooSmall)
  throw new NoIconFoundError()
}

// Nom tiré du contenu : le logo en place n'est jamais écrasé avant l'enregistrement, et une nouvelle adresse contourne le cache de next/image.
export async function storeCompanyLogo(slug: string, png: Buffer): Promise<string> {
  const hash = createHash("sha256").update(png).digest("hex").slice(0, HASH_LENGTH)
  const key = buildAssetKey({ folder: COMPANY_LOGO_FOLDER, slug, filename: `logo-${hash}.png` })

  const validation = validateAssetPath(key.split("/"))
  if (!validation.ok) throw new Error(validation.error)

  await adminR2.send(
    new PutObjectCommand({ Bucket: R2_ADMIN_BUCKET, Key: key, Body: png, ContentType: "image/png" }),
  )
  return key
}

export async function retrieveCompanyLogo(websiteUrl: string, slug: string): Promise<CompanyLogo> {
  const { icon, source } = await fetchCompanyIcon(websiteUrl)
  const key = await storeCompanyLogo(slug, icon.png)
  return { key, width: icon.width, height: icon.height, source }
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/company-logo/fetch-company-logo.test.ts`
Expected: PASS.

---

### Task 6 : Server Action

**Files:**
- Modify: `src/lib/schemas/company.ts` (règle du champ site web exportée)
- Create: `src/server/actions/company-logo.types.ts`
- Create: `src/server/actions/company-logo.ts`
- Test: `src/server/actions/company-logo.test.ts`

**Interfaces:**
- Consumes: `retrieveCompanyLogo`, `CompanyLogo`, `NoIconFoundError` (Task 5) ; `IconTooSmallError` (Task 4) ; `BlockedAddressError`, `FetchFailedError` (Task 2) ; `SLUG_PATTERN` (`@/lib/schemas/slug`) ; `createActionLogger` (`@/lib/server-utils`)
- Produces: `isValidWebsiteUrl(value: string): boolean` (`@/lib/schemas/company`) ; `fetchCompanyLogo(websiteUrl: string, slug: string): Promise<CompanyLogoResult>` ; types `CompanyLogoResult`, `CompanyLogoFailure`

- [ ] **Step 1 : Exporter la règle du champ site web**

Dans `src/lib/schemas/company.ts`, juste après `const WEBSITE_URL_SCHEMA = z.url({ protocol: /^https?$/ })`, ajouter :

```ts
export function isValidWebsiteUrl(value: string): boolean {
  return WEBSITE_URL_SCHEMA.safeParse(value).success
}
```

- [ ] **Step 2 : Types du résultat**

Créer `src/server/actions/company-logo.types.ts` :

```ts
import type { CompanyLogo } from "@/server/company-logo/fetch-company-logo"

export type CompanyLogoFailure =
  | { ok: false; message: "invalid_input" | "address_blocked" | "no_icon_found" | "unknown_error" }
  | { ok: false; message: "site_unreachable"; status: number | null }
  | { ok: false; message: "icon_too_small"; size: number }

export type CompanyLogoResult = ({ ok: true } & CompanyLogo) | CompanyLogoFailure
```

- [ ] **Step 3 : Écrire les tests qui échouent**

```ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/r2", () => ({ adminR2: { send: vi.fn() }, R2_ADMIN_BUCKET: "test-admin-bucket" }))
vi.mock("@/server/company-logo/fetch-company-logo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/company-logo/fetch-company-logo")>()),
  retrieveCompanyLogo: vi.fn(),
}))

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { NoIconFoundError, retrieveCompanyLogo } from "@/server/company-logo/fetch-company-logo"
import { IconTooSmallError } from "@/server/company-logo/normalize-icon"
import { BlockedAddressError, FetchFailedError } from "@/server/company-logo/safe-fetch"

import { fetchCompanyLogo } from "./company-logo"

const LOGO = {
  key: "freelance/crm/entreprises/acme/logo-0123456789ab.png",
  width: 180,
  height: 180,
  source: "apple-touch-icon" as const,
}

describe("fetchCompanyLogo", () => {
  afterEach(() => vi.clearAllMocks())

  it("rejects a call without a session before any network access", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = fetchCompanyLogo("https://acme.example/", "acme")

    await expect(result).rejects.toThrow()
    expect(retrieveCompanyLogo).not.toHaveBeenCalled()
  })

  it.each([
    ["javascript:alert(1)", "acme"],
    ["https://acme.example/", "acme corp"],
  ])("rejects an invalid website URL or slug without fetching (%s, %s)", async (websiteUrl, slug) => {
    const result = await fetchCompanyLogo(websiteUrl, slug)

    expect(result).toEqual({ ok: false, message: "invalid_input" })
    expect(retrieveCompanyLogo).not.toHaveBeenCalled()
  })

  it("lowercases the slug before storing", async () => {
    vi.mocked(retrieveCompanyLogo).mockResolvedValue(LOGO)

    await fetchCompanyLogo(" https://acme.example/ ", " ACME ")

    expect(retrieveCompanyLogo).toHaveBeenCalledWith("https://acme.example/", "acme")
  })

  it("returns the stored key, size and source", async () => {
    vi.mocked(retrieveCompanyLogo).mockResolvedValue(LOGO)

    const result = await fetchCompanyLogo("https://acme.example/", "acme")

    expect(result).toEqual({ ok: true, ...LOGO })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/assets")
  })

  it.each([
    { label: "a blocked address", error: new BlockedAddressError("intranet"), expected: { ok: false, message: "address_blocked" } },
    { label: "an unreachable site", error: new FetchFailedError(403), expected: { ok: false, message: "site_unreachable", status: 403 } },
    { label: "a missing icon", error: new NoIconFoundError(), expected: { ok: false, message: "no_icon_found" } },
    { label: "a too small icon", error: new IconTooSmallError(16), expected: { ok: false, message: "icon_too_small", size: 16 } },
  ])("maps $label to its message", async ({ error, expected }) => {
    vi.mocked(retrieveCompanyLogo).mockRejectedValue(error)

    const result = await fetchCompanyLogo("https://acme.example/", "acme")

    expect(result).toEqual(expected)
  })
})
```

- [ ] **Step 4 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/company-logo.test.ts`
Expected: FAIL, module `./company-logo` introuvable.

- [ ] **Step 5 : Écrire l'action**

Créer `src/server/actions/company-logo.ts` :

```ts
"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { isValidWebsiteUrl } from "@/lib/schemas/company"
import { SLUG_PATTERN } from "@/lib/schemas/slug"
import { createActionLogger } from "@/lib/server-utils"
import { NoIconFoundError, retrieveCompanyLogo } from "@/server/company-logo/fetch-company-logo"
import { IconTooSmallError } from "@/server/company-logo/normalize-icon"
import { BlockedAddressError, FetchFailedError } from "@/server/company-logo/safe-fetch"

import type { CompanyLogoFailure, CompanyLogoResult } from "./company-logo.types"

function toFailure(err: unknown): CompanyLogoFailure | null {
  if (err instanceof BlockedAddressError) return { ok: false, message: "address_blocked" }
  if (err instanceof FetchFailedError) return { ok: false, message: "site_unreachable", status: err.status }
  if (err instanceof NoIconFoundError) return { ok: false, message: "no_icon_found" }
  if (err instanceof IconTooSmallError) return { ok: false, message: "icon_too_small", size: err.size }
  return null
}

export async function fetchCompanyLogo(websiteUrl: string, slug: string): Promise<CompanyLogoResult> {
  await getCurrentUser()

  return createActionLogger("fetchCompanyLogo", async ({ log }) => {
    // Le formulaire met le slug en minuscules à l'enregistrement : le logo doit tomber dans ce dossier-là.
    const url = websiteUrl.trim()
    const normalizedSlug = slug.trim().toLowerCase()
    if (!isValidWebsiteUrl(url) || !SLUG_PATTERN.test(normalizedSlug)) {
      return { ok: false, message: "invalid_input" }
    }

    const host = new URL(url).host
    try {
      const logo = await retrieveCompanyLogo(url, normalizedSlug)
      revalidatePath("/admin/assets")
      log.info({ event: "company_logo:fetched", host, source: logo.source, width: logo.width, height: logo.height })
      return { ok: true, ...logo }
    } catch (err) {
      const failure = toFailure(err)
      if (failure) {
        log.warn({ event: "company_logo:not_fetched", host, reason: failure.message })
        return failure
      }
      log.error({ err, event: "company_logo:fetch_failed", host })
      return { ok: false, message: "unknown_error" }
    }
  })
}
```

- [ ] **Step 6 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/company-logo.test.ts`
Expected: PASS.

---

### Task 7 : Card Logo et bouton

**Files:**
- Create: `src/components/features/admin/companies/CompanyLogoCard.tsx`
- Modify: `src/components/features/admin/companies/CompanyForm.tsx`

**Interfaces:**
- Consumes: `fetchCompanyLogo`, `CompanyLogoResult`, `CompanyLogoFailure` (Task 6) ; `AssetPicker`, `AssetImage`, `useImageFallback` existants
- Produces: `CompanyLogoCard({ logoFilename, onLogoFilenameChange, logoAssets, websiteUrl, slug, error })`

- [ ] **Step 1 : Créer `CompanyLogoCard`**

L'aperçu passe en `object-contain` sur fond neutre, règle d'aperçu que `docs/DESIGN.md` fixe pour `CompanyLogoTile` : une icône carrée en `object-cover` dans un cadre 16/9 serait rognée.

```tsx
"use client"

import { useState, useTransition } from "react"
import { Globe } from "lucide-react"

import { AssetImage } from "@/components/features/admin/assets/AssetImage"
import { AssetPicker } from "@/components/features/admin/assets/AssetPicker"
import { useImageFallback } from "@/components/features/projects/useImageFallback"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { COMPANY_SECTION_TITLES } from "@/lib/companies"
import { cn } from "@/lib/utils"
import { fetchCompanyLogo } from "@/server/actions/company-logo"
import type { CompanyLogoFailure } from "@/server/actions/company-logo.types"
import type { AssetEntry } from "@/server/queries/assets"

function failureText(failure: CompanyLogoFailure): string {
  switch (failure.message) {
    case "invalid_input":
      return "L'adresse du site ou le slug n'est pas valide."
    case "address_blocked":
      return "Adresse refusée : elle mène vers un réseau interne."
    case "site_unreachable":
      return failure.status === null ? "Site injoignable." : `Site injoignable (${failure.status}).`
    case "no_icon_found":
      return "Le site ne déclare aucune icône exploitable. Choisissez un logo déposé dans Assets."
    case "icon_too_small":
      return `Icône trop petite (${failure.size} px). Choisissez un logo déposé dans Assets.`
    case "unknown_error":
      return "Une erreur est survenue, réessayez."
  }
}

interface Props {
  logoFilename: string | null
  onLogoFilenameChange: (key: string | null) => void
  logoAssets: AssetEntry[]
  websiteUrl: string
  slug: string
  error: string | undefined
}

export function CompanyLogoCard({
  logoFilename,
  onLogoFilenameChange,
  logoAssets,
  websiteUrl,
  slug,
  error,
}: Props) {
  const { showImage, onError } = useImageFallback(logoFilename)
  const [fetching, startFetching] = useTransition()
  const [fetchedInfo, setFetchedInfo] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const canFetch = websiteUrl.trim() !== "" && slug.trim() !== "" && !fetching
  const hasImage = showImage && logoFilename !== null
  const errorMessage = fetchError ?? error

  function handlePick(key: string | null) {
    setFetchedInfo(null)
    setFetchError(null)
    onLogoFilenameChange(key)
  }

  function handleFetch() {
    setFetchError(null)
    startFetching(async () => {
      const result = await fetchCompanyLogo(websiteUrl, slug)
      if (result.ok) {
        setFetchedInfo(`${result.width} × ${result.height} px · ${result.source}`)
        onLogoFilenameChange(result.key)
      } else {
        setFetchedInfo(null)
        setFetchError(failureText(result))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COMPANY_SECTION_TITLES.logo}</CardTitle>
        <CardDescription>
          Choisi parmi les logos déposés dans l&apos;espace Assets, ou récupéré depuis le site web.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div
          className={cn(
            "relative aspect-video overflow-hidden rounded-lg border border-border",
            hasImage ? "bg-muted" : "bg-linear-to-br from-primary/20 to-accent/20",
          )}
        >
          {hasImage ? (
            <AssetImage
              assetKey={logoFilename}
              alt=""
              fill
              sizes="(min-width: 1024px) 35vw, 100vw"
              className="object-contain"
              onError={onError}
            />
          ) : null}
        </div>
        {fetchedInfo ? <p className="text-xs text-muted-foreground">{fetchedInfo}</p> : null}
        <div className="flex flex-wrap gap-2">
          <AssetPicker
            value={logoFilename}
            onChange={handlePick}
            assets={logoAssets}
            title="Choisir un logo"
            description="Une image du dossier entreprises. Le dépôt se fait depuis Assets."
            triggerLabel="Choisir un logo"
          />
          <Button type="button" variant="outline" size="sm" disabled={!canFetch} onClick={handleFetch}>
            <Globe aria-hidden data-icon="inline-start" />
            {fetching ? "Récupération…" : "Récupérer depuis le site"}
          </Button>
        </div>
        {errorMessage ? (
          <p className="text-sm text-destructive" aria-live="polite">
            {errorMessage}
          </p>
        ) : null}
        <input type="hidden" name="logoFilename" value={logoFilename ?? ""} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2 : Suivre le slug et le site web dans le formulaire**

Dans `src/components/features/admin/companies/CompanyForm.tsx` :

- retirer les imports devenus inutiles (`AssetImage`, `AssetPicker`, `useImageFallback`, et tout autre que TypeScript ou ESLint signale inutilisé) et la ligne `const { showImage: showLogo, onError: onLogoError } = useImageFallback(logoFilename)` ; importer `CompanyLogoCard` ;
- après l'état `logoFilename`, ajouter :

```tsx
  const [slug, setSlug] = useState(company?.slug ?? "")
  const [websiteUrl, setWebsiteUrl] = useState(company?.websiteUrl ?? "")
```

- sur l'`Input` `name="slug"`, ajouter `onChange={(event) => { setSlug(event.target.value) }}` ; sur l'`Input` `name="websiteUrl"`, ajouter `onChange={(event) => { setWebsiteUrl(event.target.value) }}`. Les deux gardent leur `defaultValue`.

- [ ] **Step 3 : Remplacer la card Logo**

Remplacer toute la card dont le titre est `COMPANY_SECTION_TITLES.logo` (aperçu, `AssetPicker`, erreur et champ caché `logoFilename` compris) par :

```tsx
          <CompanyLogoCard
            logoFilename={logoFilename}
            onLogoFilenameChange={setLogoFilename}
            logoAssets={logoAssets}
            websiteUrl={websiteUrl}
            slug={slug}
            error={state.errors.logoFilename?.[0]}
          />
```

- [ ] **Step 4 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

Run: `just build`
Expected: build réussi, `sharp` résolu côté serveur.

---

### Task 8 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 7
- Produces: rien

- [ ] **Step 1 : Bouton inactif**

Run: `just dev`, se connecter. Ouvrir « Nouvelle entreprise ».
Expected: « Récupérer depuis le site » désactivé ; toujours désactivé avec un site web mais sans slug ; actif avec les deux.

- [ ] **Step 2 : Site vivant**

Sur une fiche dont le site déclare un `apple-touch-icon` (le vérifier dans le code source de la page), cliquer « Récupérer depuis le site ».
Expected: l'icône s'affiche entière dans l'aperçu, « <largeur> × <hauteur> px · apple-touch-icon » dessous ; après « Enregistrer », la liste des entreprises montre ce logo.

- [ ] **Step 3 : Capture Wayback de PaySystem**

Sur la fiche de PaySystem, remplacer le site web par `https://web.archive.org/web/20230608000000/https://paysystem.eu/` et cliquer le bouton.
Expected: le logo PaySystem de l'époque s'affiche, source `apple-touch-icon` ; jamais la page de vente Sedo.

- [ ] **Step 4 : Refus et absences**

Tester successivement comme site web `http://127.0.0.1:3000`, `http://localhost/` et `https://example.com/`.
Expected: « Adresse refusée : elle mène vers un réseau interne. » pour les deux premiers, « Le site ne déclare aucune icône exploitable… » pour le troisième ; le logo en place ne change pas.

- [ ] **Step 5 : Récupération abandonnée**

Sur une fiche avec un logo, récupérer une autre icône puis cliquer « Annuler ».
Expected: la fiche rouverte garde son logo d'origine ; l'icône récupérée apparaît dans Assets, dossier `freelance/crm/entreprises/<slug>/`, supprimable. Puis `just stop`.
