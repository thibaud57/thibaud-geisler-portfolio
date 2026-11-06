import "server-only"
import { randomUUID } from "node:crypto"

import type { AuthInfo } from "@modelcontextprotocol/server"
import { z } from "zod"

import { env } from "@/env"
import { logger } from "@/lib/logger"
import type { McpDomain } from "@/lib/mcp-domains"
import { hashIp } from "@/lib/server-utils"

// Transmis par la route en `authInfo.extra` : createMcpHandler le passe tel quel à la factory et
// aux outils dans les deux ères, alors que `requestInfo` peut être une copie de la requête en legacy
const mcpRequestContextSchema = z.strictObject({ requestId: z.string(), ipHash: z.string() })

export type McpRequestContext = z.infer<typeof mcpRequestContextSchema>

export function createMcpRequestContext(ip: string): McpRequestContext {
  return { requestId: randomUUID(), ipHash: hashIp(ip, env.IP_HASH_SALT) }
}

export function createMcpLogger(context: McpRequestContext) {
  return logger.child({ action: "mcp", requestId: context.requestId, ip_hash: context.ipHash })
}

export type McpLogger = ReturnType<typeof createMcpLogger>

// Sans authInfo (callback onerror du handler), seul le domaine est connu. `parse` lève exprès :
// seule la route construit `extra`, un échec trahit un bug interne
export function mcpLoggerFor(domain: McpDomain, authInfo: AuthInfo | undefined): McpLogger {
  if (!authInfo) return logger.child({ action: "mcp", domain })
  const context = mcpRequestContextSchema.parse(authInfo.extra)
  return createMcpLogger(context).child({ domain, keyId: authInfo.clientId })
}
