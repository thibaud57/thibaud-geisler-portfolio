import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"

const { childLog } = vi.hoisted(() => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() }
  // Même espion à chaque niveau : mcpLoggerFor enchaîne .child({ domain, keyId }) sur le logger de la requête
  log.child.mockReturnValue(log)
  return { childLog: log }
})
vi.mock("@/lib/logger", () => ({ logger: { child: vi.fn(() => childLog) } }))

import { env } from "@/env"
import { auth } from "@/lib/auth"
import { prisma, resetDatabase, SEED_USER_ID, seedUser } from "@/lib/prisma-test-setup"
import { rateLimiter } from "@/lib/rate-limiter"

import { DELETE, GET, POST } from "./route"

const initializeBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0.0" },
  },
})
const mcpHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
}

beforeEach(async () => {
  await resetDatabase()
  rateLimiter.reset()
  await seedUser()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function createKey(extra: Record<string, unknown> = {}) {
  const created = await auth.api.createApiKey({
    body: { userId: SEED_USER_ID, name: "Test", permissions: { crm: ["read", "write"] }, ...extra },
  })
  return { id: created.id, key: created.key }
}

function postMcp({
  domain = "crm",
  method = "POST",
  headers = {},
  body = initializeBody,
}: {
  domain?: string
  method?: "POST" | "GET" | "DELETE"
  headers?: Record<string, string>
  body?: string
} = {}) {
  const request = new NextRequest(`http://localhost:3000/api/mcp/${domain}`, {
    method,
    headers: { ...mcpHeaders, ...headers },
    ...(method === "POST" ? { body } : {}),
  })
  const routes = {
    POST: () => POST(request, { params: Promise.resolve({ domain }) }),
    GET,
    DELETE,
  }
  return routes[method]()
}

describe("POST /api/mcp/[domain]", () => {
  it("rejects a request without Authorization with 401 and WWW-Authenticate, without verifying a key", async () => {
    const verify = vi.spyOn(auth.api, "verifyApiKey")

    const res = await postMcp()

    expect(res.status).toBe(401)
    expect(res.headers.get("WWW-Authenticate")).toBe("Bearer")
    expect(verify).not.toHaveBeenCalled()
  })

  it.each([
    ["a non-Bearer scheme", "Basic dXNlcjpwYXNz"],
    ["an unknown key", "Bearer tgp_unknown"],
  ])("rejects %s with 401", async (_label, authorization) => {
    const res = await postMcp({ headers: { Authorization: authorization } })

    expect(res.status).toBe(401)
  })

  it("accepts a lowercase bearer scheme", async () => {
    const { key } = await createKey()

    const res = await postMcp({ headers: { Authorization: `bearer ${key}` } })

    expect(res.status).toBe(200)
  })

  it("rejects an expired key with 401", async () => {
    const { id, key } = await createKey()
    await prisma.apikey.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } })

    const res = await postMcp({ headers: { Authorization: `Bearer ${key}` } })

    expect(res.status).toBe(401)
  })

  it.each([
    ["without the crm domain", { permissions: { compta: ["read"] } }],
    ["created without permissions", { permissions: undefined }],
  ])("rejects a key %s with 403", async (_label, extra) => {
    const { key } = await createKey(extra)

    const res = await postMcp({ headers: { Authorization: `Bearer ${key}` } })

    expect(res.status).toBe(403)
  })

  it.each(["compta", "CRM"])("answers 404 for the domain %s", async (domain) => {
    const { key } = await createKey()

    const res = await postMcp({ domain, headers: { Authorization: `Bearer ${key}` } })

    expect(res.status).toBe(404)
  })

  it("rejects a foreign Origin with 403", async () => {
    const { key } = await createKey()

    const res = await postMcp({
      headers: { Authorization: `Bearer ${key}`, Origin: "https://evil.example.com" },
    })

    expect(res.status).toBe(403)
  })

  it.each([[{ Origin: new URL(env.NEXT_PUBLIC_SITE_URL).origin }], [{}]])(
    "serves the request with headers %o",
    async (extra) => {
      const { key } = await createKey()

      const res = await postMcp({ headers: { Authorization: `Bearer ${key}`, ...extra } })

      expect(res.status).toBe(200)
    },
  )

  it("answers 429 with Retry-After when the IP limiter refuses, without verifying the key", async () => {
    const { key } = await createKey()
    vi.spyOn(rateLimiter, "check").mockReturnValue({ allowed: false, retryAfterSeconds: 42 })
    const verify = vi.spyOn(auth.api, "verifyApiKey")

    const res = await postMcp({ headers: { Authorization: `Bearer ${key}` } })

    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("42")
    expect(verify).not.toHaveBeenCalled()
    expect(childLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "rate_limit:exceeded", limit: "ip" }),
    )
  })

  it("answers 429 with Retry-After when the key exceeds its own rate limit", async () => {
    const { key } = await createKey({ rateLimitMax: 1 })
    const headers = { Authorization: `Bearer ${key}` }
    await postMcp({ headers })

    const res = await postMcp({ headers })

    expect(res.status).toBe(429)
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0)
  })

  it("never answers 5xx on an invalid JSON body with a valid key", async () => {
    const { key } = await createKey()

    const res = await postMcp({ headers: { Authorization: `Bearer ${key}` }, body: "{not json" })

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it("logs mcp:request with the key id and era, never the key value", async () => {
    const { id, key } = await createKey()

    await postMcp({ headers: { Authorization: `Bearer ${key}` } })

    expect(childLog.child).toHaveBeenCalledWith({ domain: "crm", keyId: id })
    expect(childLog.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "mcp:request",
        era: expect.stringMatching(/^(legacy|modern)$/) as unknown,
      }),
    )
    const logged = JSON.stringify(
      [childLog.info, childLog.warn, childLog.error].map((fn) => fn.mock.calls),
    )
    expect(logged).not.toContain(key)
  })

  it.each([
    ["crm", "crm_fetch"],
    ["portfolio", "portfolio_fetch"],
  ])("serves %s tools/list to a key that carries the domain", async (domain, tool) => {
    const { key } = await createKey({ permissions: { [domain]: ["read", "write"] } })
    const client = new Client(
      { name: "test", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } },
    )
    onTestFinished(() => client.close())
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://localhost:3000/api/mcp/${domain}`), {
        requestInit: { headers: { Authorization: `Bearer ${key}` } },
        fetch: (url, init) =>
          POST(new NextRequest(new Request(url, init)), {
            params: Promise.resolve({ domain }),
          }),
      }),
    )

    const { tools } = await client.listTools()

    expect(tools.map((t) => t.name)).toContain(tool)
  })

  it.each([
    ["portfolio", { crm: ["read", "write"] }],
    ["crm", { portfolio: ["read", "write"] }],
  ])(
    "answers 403 on /api/mcp/%s to a key limited to the other domain",
    async (domain, permissions) => {
      const { key } = await createKey({ permissions })

      const res = await postMcp({ domain, headers: { Authorization: `Bearer ${key}` } })

      expect(res.status).toBe(403)
    },
  )
})

describe("GET and DELETE /api/mcp/[domain]", () => {
  it.each(["GET", "DELETE"] as const)("answers 405 with Allow: POST on %s", async (method) => {
    const res = await postMcp({ method })

    expect(res.status).toBe(405)
    expect(res.headers.get("Allow")).toBe("POST")
  })
})
