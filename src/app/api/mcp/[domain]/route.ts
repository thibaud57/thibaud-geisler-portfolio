import { createMcpHandler, type McpHttpHandler } from "@modelcontextprotocol/server"
import type { NextRequest } from "next/server"

import type { McpDomain } from "@/lib/mcp-domains"
import { extractClientIp } from "@/lib/server-utils"
import { authenticate } from "@/server/mcp/authenticate"
import { mcpLoggerFor } from "@/server/mcp/logger"
import { buildServer } from "@/server/mcp/server"

// Un handler par domaine, créé une fois : chaque construction crée un bus et un routeur d'événements.
// Sans `responseMode` : 'json' émet un console.warn à chaque construction (SDK 2.4.0)
function createDomainHandler(domain: McpDomain): McpHttpHandler {
  return createMcpHandler(
    (ctx) => {
      mcpLoggerFor(domain, ctx.authInfo).info({ event: "mcp:request", era: ctx.era })
      return buildServer(domain)
    },
    {
      onerror: (err) => {
        mcpLoggerFor(domain, undefined).error({ err, event: "mcp:handler_error" })
      },
    },
  )
}

const handlers = { crm: createDomainHandler("crm") } satisfies Record<McpDomain, McpHttpHandler>

// Le matcher de src/proxy.ts exclut /api : la route porte seule son authentification
export async function POST(request: NextRequest, { params }: RouteContext<"/api/mcp/[domain]">) {
  const { domain } = await params
  const ip = extractClientIp(request.headers.get("x-forwarded-for"))
  const outcome = await authenticate(request, domain, ip)
  if (!outcome.ok) return outcome.response
  return handlers[outcome.domain].fetch(request, { authInfo: outcome.authInfo })
}

const methodNotAllowed = () => new Response(null, { status: 405, headers: { Allow: "POST" } })

export const GET = methodNotAllowed
export const DELETE = methodNotAllowed
