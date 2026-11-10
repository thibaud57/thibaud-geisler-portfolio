import "server-only"
import { McpServer } from "@modelcontextprotocol/server"

import type { McpDomain } from "@/lib/mcp-domains"
import { crmDomain } from "@/server/mcp/crm/domain"
import { CRM_ENTITY_NAMES } from "@/server/mcp/crm/registry"
import { domainToolsOf } from "@/server/mcp/domain-tools"
import { portfolioDomain } from "@/server/mcp/portfolio/domain"
import { PORTFOLIO_ENTITY_NAMES } from "@/server/mcp/portfolio/registry"

const DOMAINS: Record<
  McpDomain,
  { instructions: string; registerTools: (server: McpServer) => void }
> = {
  crm: {
    // Tirée du registre : écrite à la main, elle ne citait que les entreprises après l'ajout des autres entités
    instructions: `Freelance CRM of this app, entities: ${CRM_ENTITY_NAMES.join(", ")}. Use these tools when the user asks about a CRM record.`,
    registerTools: domainToolsOf(crmDomain),
  },
  portfolio: {
    instructions: `Portfolio of this app, entities: ${PORTFOLIO_ENTITY_NAMES.join(", ")}. Use these tools when the user asks about a portfolio record.`,
    registerTools: domainToolsOf(portfolioDomain),
  },
}

// Une instance neuve par requête : la factory de createMcpHandler l'exige
export function buildServer(domain: McpDomain): McpServer {
  const { instructions, registerTools } = DOMAINS[domain]
  const server = new McpServer({ name: `portfolio-${domain}`, version: "1.0.0" }, { instructions })
  registerTools(server)
  return server
}
