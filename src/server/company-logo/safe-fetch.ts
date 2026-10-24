import "server-only"
import { lookup as dnsLookup } from "node:dns"
import http, { type IncomingMessage, type RequestOptions } from "node:http"
import https from "node:https"
import { isIP, type LookupFunction } from "node:net"

import { logger } from "@/lib/logger"

import { isBlockedAddress } from "./address-guard"

const MAX_REDIRECTS = 5
// Internet Archive met souvent plusieurs secondes à servir une capture.
const TIMEOUT_MS = 10_000
const USER_AGENT = "Mozilla/5.0 (compatible; thibaud-geisler-portfolio logo fetcher)"

export class BlockedAddressError extends Error {}

export type FetchFailure =
  | { ok: false; message: "address_blocked" }
  | { ok: false; message: "site_unreachable"; status: number | null }
  | { ok: false; message: "response_too_large" }
  | { ok: false; message: "site_too_slow" }

type PageFetchFailure = Exclude<FetchFailure, { message: "response_too_large" }>

export interface FetchOptions {
  maxBytes: number
  // Une page se lit tronquée, ses balises d'icône étant dans l'en-tête ; une image tronquée ne sert à rien.
  truncate?: boolean
  // Échéance de toute la récupération : le timeout par requête repart à zéro à chaque redirection et ne borne rien au-delà.
  deadline?: AbortSignal
}

export interface FetchedResource {
  url: URL
  body: Buffer
}

export type FetchOutcome = { ok: true; resource: FetchedResource } | FetchFailure

type RawResponse = { kind: "redirect"; location: string } | { kind: "body"; body: Buffer }

const unreachable = (status: number | null): FetchFailure => ({
  ok: false,
  message: "site_unreachable",
  status,
})

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

// Une requête coupée par l'échéance n'est pas un site injoignable : la boucle des icônes doit s'arrêter, pas passer à la suivante.
function requestFailure(err: unknown, deadline: AbortSignal | undefined): FetchFailure {
  if (err instanceof BlockedAddressError) return { ok: false, message: "address_blocked" }
  logger.warn({ err, event: "company_logo:fetch_failed" })
  return deadline?.aborted ? { ok: false, message: "site_too_slow" } : unreachable(null)
}

function request(
  url: URL,
  { maxBytes, truncate = false, deadline }: FetchOptions,
): Promise<RawResponse | FetchFailure> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const options: RequestOptions = {
    lookup: guardedLookup,
    headers: { "user-agent": USER_AGENT, accept: "*/*", "accept-encoding": "identity" },
    signal: deadline ? AbortSignal.any([timeout, deadline]) : timeout,
  }

  return new Promise((resolve) => {
    let settled = false
    const settle = (value: RawResponse | FetchFailure): void => {
      settled = true
      resolve(value)
    }
    const onResponse = (res: IncomingMessage): void => {
      const fail = (status: number | null): void => {
        res.resume()
        settle(unreachable(status))
      }
      const status = res.statusCode ?? 0
      const location = res.headers.location
      if (status >= 300 && status < 400 && location) {
        res.resume()
        settle({ kind: "redirect", location })
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
          settle({ kind: "body", body: Buffer.concat(chunks) })
        } else {
          settle({ ok: false, message: "response_too_large" })
        }
      })
      res.on("end", () => {
        settle({ kind: "body", body: Buffer.concat(chunks) })
      })
      res.on("error", (err) => {
        // Une erreur tardive après destroy() suit un résultat déjà rendu : rien à signaler.
        if (settled) return
        settle(requestFailure(err, deadline))
      })
      // Un abandon peut détruire le corps sans émettre `error` : la requête resterait pendante et l'échéance ne bornerait plus rien.
      res.on("close", () => {
        if (settled || res.complete) return
        settle(requestFailure(new Error("Réponse interrompue"), deadline))
      })
    }

    const req =
      url.protocol === "https:"
        ? https.get(url, options, onResponse)
        : http.get(url, options, onResponse)
    req.on("error", (err) => {
      resolve(requestFailure(err, deadline))
    })
  })
}

// Seule une IP interne se dit « refusée » : un schéma, un port ou des identifiants hors norme décrivent un site que l'on ne sait pas joindre.
// `URL.port` est vide pour un port implicite (80/443) ; le parseur WHATWG ramène les écritures numériques (2130706433, 0x7f.1) à 127.0.0.1 avant ce contrôle.
function outboundTarget(target: string | URL, base?: URL): { ok: true; url: URL } | FetchFailure {
  let url: URL
  try {
    url = new URL(target, base)
  } catch (err) {
    logger.warn({ err, event: "company_logo:target_invalid" })
    return unreachable(null)
  }
  // L'IP interne se contrôle d'abord : `http://127.0.0.1:3000` doit dire « refusée », pas « injoignable » à cause de son port.
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1")
  if (isIP(host) !== 0 && isBlockedAddress(host)) return { ok: false, message: "address_blocked" }

  if (url.protocol !== "http:" && url.protocol !== "https:") return unreachable(null)
  if (url.port !== "" || url.username !== "" || url.password !== "") return unreachable(null)
  return { ok: true, url }
}

// Tronquer rend `response_too_large` impossible : la surcharge l'exprime pour que l'appelant de page n'ait pas de cas mort.
export function safeFetch(
  target: URL,
  options: { maxBytes: number; truncate: true; deadline?: AbortSignal },
): Promise<{ ok: true; resource: FetchedResource } | PageFetchFailure>
export function safeFetch(target: URL, options: FetchOptions): Promise<FetchOutcome>
export async function safeFetch(target: URL, options: FetchOptions): Promise<FetchOutcome> {
  let next = outboundTarget(target)
  for (let redirects = 0; ; redirects++) {
    if (!next.ok) return next
    if (options.deadline?.aborted) return { ok: false, message: "site_too_slow" }
    const response = await request(next.url, options)
    if ("ok" in response) return response
    if (response.kind === "body") {
      return { ok: true, resource: { url: next.url, body: response.body } }
    }
    if (redirects === MAX_REDIRECTS) return unreachable(null)
    next = outboundTarget(response.location, next.url)
  }
}
