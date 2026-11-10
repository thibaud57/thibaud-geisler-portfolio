import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import { createMcpHandler, type McpHttpHandler } from "@modelcontextprotocol/server"
import { afterEach, beforeEach } from "vitest"

import type { McpDomain } from "@/lib/mcp-domains"
import { buildServer } from "@/server/mcp/server"

const authInfo = {
  token: "tgp_test",
  clientId: "key-1",
  scopes: ["read", "write"],
  extra: { requestId: "req-1", ipHash: "abcd1234" },
}

export type ToolResult = Awaited<ReturnType<Client["callTool"]>>

export function textOf(result: ToolResult): string {
  const [block] = result.content
  return block?.type === "text" ? block.text : ""
}

export function jsonOf(result: ToolResult): unknown {
  return JSON.parse(textOf(result))
}

// Client connecté au vrai handler du domaine, sans serveur ni port, avec l'authInfo que la route pose après la clé.
export function setupMcpSession(domain: McpDomain) {
  let handler: McpHttpHandler
  let client: Client

  beforeEach(async () => {
    // Un handler par test : handler.close() est définitif
    handler = createMcpHandler(() => buildServer(domain))
    client = new Client(
      { name: "test", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } },
    )
    await client.connect(
      new StreamableHTTPClientTransport(new URL("http://test.invalid/mcp"), {
        fetch: (url, init) => handler.fetch(new Request(url, init), { authInfo }),
      }),
    )
  })

  afterEach(async () => {
    await client.close()
    await handler.close()
  })

  return {
    client: () => client,
    call: (name: string, args: Record<string, unknown>) =>
      client.callTool({ name, arguments: args }),
  }
}
