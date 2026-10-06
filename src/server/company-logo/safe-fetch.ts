import "server-only"
import { lookup as dnsLookup } from "node:dns"
import http, { type IncomingMessage, type RequestOptions } from "node:http"
import https from "node:https"
import { isIP, type LookupFunction } from "node:net"

import { isBlockedAddress } from "./address-guard"

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
      const fail = (status: number | null): void => {
        res.resume()
        reject(new FetchFailedError(status))
      }
      const status = res.statusCode ?? 0
      const location = res.headers.location
      if (status >= 300 && status < 400 && location) {
        res.resume()
        resolve({ kind: "redirect", location })
        return
      }
      if (status < 200 || status >= 300) {
        fail(status)
        return
      }
      const encoding = res.headers["content-encoding"]
      if (encoding && encoding !== "identity") {
        fail(null)
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

// Seule une IP interne se dit « refusée » : un schéma, un port ou des identifiants hors norme décrivent un site que l'on ne sait pas joindre.
// `URL.port` est vide pour un port implicite (80/443) ; le parseur WHATWG ramène les écritures numériques (2130706433, 0x7f.1) à 127.0.0.1 avant ce contrôle.
function outboundTarget(target: string | URL, base?: URL): URL {
  let url: URL
  try {
    url = new URL(target, base)
  } catch {
    throw new FetchFailedError(null)
  }
  // L'IP interne se contrôle d'abord : `http://127.0.0.1:3000` doit dire « refusée », pas « injoignable » à cause de son port.
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1")
  if (isIP(host) !== 0 && isBlockedAddress(host)) throw new BlockedAddressError(host)

  if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchFailedError(null)
  if (url.port !== "" || url.username !== "" || url.password !== "") {
    throw new FetchFailedError(null)
  }
  return url
}

export async function safeFetch(
  target: string | URL,
  options: FetchOptions,
): Promise<FetchedResource> {
  let url = outboundTarget(target)
  for (let redirects = 0; ; redirects++) {
    const response = await request(url, options)
    if (response.kind === "body") return { url, body: response.body }
    if (redirects === MAX_REDIRECTS) throw new FetchFailedError(null)
    url = outboundTarget(response.location, url)
  }
}
