import { isOneOf } from "@/lib/is-one-of"

// Sans server-only : le formulaire de création de clé l'importe côté client
export const MCP_DOMAINS = ["crm", "portfolio"] as const

export type McpDomain = (typeof MCP_DOMAINS)[number]

export const MCP_DOMAIN_LABELS: Record<McpDomain, string> = {
  crm: "CRM",
  portfolio: "Portfolio",
}

export const MCP_DOMAIN_OPTIONS = MCP_DOMAINS.map((value) => ({
  value,
  label: MCP_DOMAIN_LABELS[value],
}))

export function isMcpDomain(value: string): value is McpDomain {
  return isOneOf(MCP_DOMAINS, value)
}
