import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import { createMcpHandler, type McpHttpHandler } from "@modelcontextprotocol/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { prisma, resetDatabase } from "@/lib/prisma-test-setup"
import { buildServer } from "@/server/mcp/server"

const authInfo = {
  token: "tgp_test",
  clientId: "key-1",
  scopes: ["read", "write"],
  extra: { requestId: "req-1", ipHash: "abcd1234" },
}

let handler: McpHttpHandler
let client: Client

beforeEach(async () => {
  await resetDatabase()
  // Un handler par test : handler.close() est définitif
  handler = createMcpHandler(() => buildServer("crm"))
  client = new Client({ name: "test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } })
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

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const [block] = result.content
  return block?.type === "text" ? block.text : ""
}

describe("crm_fetch", () => {
  it("lists crm_fetch as a read-only tool", async () => {
    const { tools } = await client.listTools()

    expect(tools.find((t) => t.name === "crm_fetch")?.annotations?.readOnlyHint).toBe(true)
  })

  it("returns the company record as JSON text", async () => {
    const company = await prisma.company.create({ data: { slug: "acme", name: "Acme" } })

    const result = await client.callTool({
      name: "crm_fetch",
      arguments: { entity: "company", id: company.id },
    })

    expect(result.isError).toBeFalsy()
    expect(JSON.parse(textOf(result))).toMatchObject({ id: company.id, name: "Acme" })
  })

  it("flags an unknown company id with a message naming it", async () => {
    const result = await client.callTool({
      name: "crm_fetch",
      arguments: { entity: "company", id: "missing-id" },
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("missing-id")
  })
})
