import "server-only"
import { McpServer } from "@modelcontextprotocol/server"

import type { McpDomain } from "@/lib/mcp-domains"
import { CRM_ENTITY_NAMES } from "@/server/mcp/crm/registry"
import { registerCrmTools } from "@/server/mcp/crm/tools"

const DOMAINS: Record<
  McpDomain,
  { instructions: string; registerTools: (server: McpServer) => void }
> = {
  crm: {
    // Tirée du registre : écrite à la main, elle ne citait que les entreprises après l'ajout des autres entités
    instructions: `Freelance CRM of this app, entities: ${CRM_ENTITY_NAMES.join(", ")}. Use these tools when the user asks about a CRM record.`,
    registerTools: registerCrmTools,
  },
}

// Une instance neuve par requête : la factory de createMcpHandler l'exige
export function buildServer(domain: McpDomain): McpServer {
  const { instructions, registerTools } = DOMAINS[domain]
  const server = new McpServer({ name: `portfolio-${domain}`, version: "1.0.0" }, { instructions })
  registerTools(server)
  return server
}
