import { isOneOf } from "@/lib/is-one-of"

// Sans server-only : le formulaire de création de clé l'importe côté client
export const MCP_DOMAINS = ["crm"] as const

export type McpDomain = (typeof MCP_DOMAINS)[number]

export const MCP_DOMAIN_LABELS: Record<McpDomain, string> = { crm: "CRM" }

export function isMcpDomain(value: string): value is McpDomain {
  return isOneOf(MCP_DOMAINS, value)
}
