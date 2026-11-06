import "server-only"
import { type AuthInfo, originValidationResponse } from "@modelcontextprotocol/server"

import { env } from "@/env"
import { auth } from "@/lib/auth"
import { isMcpDomain, type McpDomain } from "@/lib/mcp-domains"
import { rateLimiter } from "@/lib/rate-limiter"
import { createMcpLogger, createMcpRequestContext, type McpLogger } from "@/server/mcp/logger"

export type McpAuthOutcome =
  { ok: true; domain: McpDomain; authInfo: AuthInfo } | { ok: false; response: Response }

type RejectionReason = "origin" | "unknown_domain" | "no_key" | "invalid_key" | "forbidden"

const IP_RATE_LIMIT = { max: 120, windowMs: 60_000 }
const ALLOWED_ORIGIN_HOSTNAMES = [new URL(env.NEXT_PUBLIC_SITE_URL).hostname]
const BEARER_PATTERN = /^bearer\s+(\S+)$/i

const unauthorized = () =>
  new Response(null, { status: 401, headers: { "WWW-Authenticate": "Bearer" } })

function reject(log: McpLogger, reason: RejectionReason, response: Response): McpAuthOutcome {
  log.warn({ event: "mcp:rejected", reason })
  return { ok: false, response }
}

function rateLimited(log: McpLogger, limit: "ip" | "key", headers?: HeadersInit): McpAuthOutcome {
  log.warn({ event: "rate_limit:exceeded", limit })
  return { ok: false, response: new Response(null, { status: 429, headers }) }
}

// Ordre fixé par le spec : le rate limit par IP précède toute lecture en base, le domaine précède la clé
export async function authenticate(
  request: Request,
  domain: string,
  ip: string,
): Promise<McpAuthOutcome> {
  const context = createMcpRequestContext(ip)
  const log = createMcpLogger(context)

  const originRejection = originValidationResponse(request, ALLOWED_ORIGIN_HOSTNAMES)
  if (originRejection) return reject(log, "origin", originRejection)

  const { allowed, retryAfterSeconds } = rateLimiter.check(`mcp:${ip}`, IP_RATE_LIMIT)
  if (!allowed) return rateLimited(log, "ip", { "Retry-After": String(retryAfterSeconds) })

  if (!isMcpDomain(domain)) {
    return reject(log, "unknown_domain", new Response(null, { status: 404 }))
  }
  const domainLog = log.child({ domain })

  const token = BEARER_PATTERN.exec(request.headers.get("authorization") ?? "")?.[1]
  if (!token) return reject(domainLog, "no_key", unauthorized())

  // Sans `permissions` : passées au plugin, des permissions insuffisantes reviendraient en KEY_NOT_FOUND, indiscernable d'une clé inconnue
  const result = await auth.api.verifyApiKey({ body: { key: token } })
  if (result.error?.code === "RATE_LIMITED") return rateLimited(domainLog, "key")
  if (!result.valid || !result.key) return reject(domainLog, "invalid_key", unauthorized())

  const scopes = result.key.permissions?.[domain] ?? []
  if (scopes.length === 0) {
    return reject(domainLog, "forbidden", new Response(null, { status: 403 }))
  }

  return {
    ok: true,
    domain,
    authInfo: { token, clientId: result.key.id, scopes, extra: context },
  }
}
