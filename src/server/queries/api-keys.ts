import "server-only"
import { z } from "zod"

import { isMcpDomain, type McpDomain } from "@/lib/mcp-domains"
import { prisma } from "@/lib/prisma"

export interface AdminApiKey {
  id: string
  name: string | null
  start: string | null
  domains: readonly McpDomain[]
  createdAt: Date
  lastRequest: Date | null
  expiresAt: Date | null
}

const StoredPermissions = z
  .string()
  .transform((text, ctx): unknown => {
    try {
      return JSON.parse(text)
    } catch {
      ctx.addIssue({ code: "custom", message: "permissions is not valid JSON" })
      return z.NEVER
    }
  })
  .pipe(z.record(z.string(), z.array(z.string())))

export async function findApiKeysForAdmin(): Promise<AdminApiKey[]> {
  // `select` sans `key` : le hash ne quitte jamais la base
  const rows = await prisma.apikey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      start: true,
      permissions: true,
      createdAt: true,
      lastRequest: true,
      expiresAt: true,
    },
  })

  return rows.map(({ permissions, ...row }) => ({
    ...row,
    domains:
      permissions === null
        ? []
        : Object.keys(StoredPermissions.parse(permissions)).filter(isMcpDomain),
  }))
}
