import { beforeEach, describe, expect, it, vi } from "vitest"

const { childLog } = vi.hoisted(() => ({
  childLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: { child: vi.fn(() => childLog) } }))

import { auth } from "@/lib/auth"
import { DAY_MS } from "@/lib/date-time"
import { getCurrentUser } from "@/lib/get-current-user"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma, resetDatabase, seedUser } from "@/lib/prisma-test-setup"
import { createApiKey, deleteApiKey } from "@/server/actions/api-keys"
import { type ApiKeyFormState, initialApiKeyFormState } from "@/server/actions/api-keys.types"
import { findApiKeysForAdmin } from "@/server/queries/api-keys"

type TestUser = Awaited<ReturnType<typeof getCurrentUser>>

let user: TestUser

beforeEach(async () => {
  await resetDatabase()
  user = await seedUser()
  vi.mocked(getCurrentUser).mockResolvedValue(user)
})

function form({
  name = "Poste",
  domains = ["crm"],
  expiry = "90",
}: {
  name?: string
  domains?: string[]
  expiry?: string
} = {}): FormData {
  const data = new FormData()
  data.set("name", name)
  data.set("expiry", expiry)
  domains.forEach((domain) => {
    data.append("domains", domain)
  })
  return data
}

function createdKey(state: ApiKeyFormState): { name: string; key: string } {
  if (state.ok !== true) throw new Error("expected a created key")
  return state.created
}

describe("createApiKey against real Postgres", () => {
  it.each([30, 90, 365])(
    "creates a CRM key valid for %i days and returns its value once",
    async (days) => {
      const expectedExpiry = Date.now() + days * DAY_MS

      const state = await createApiKey(initialApiKeyFormState, form({ expiry: String(days) }))

      const { key } = createdKey(state)
      const verified = await auth.api.verifyApiKey({ body: { key } })
      expect(key.startsWith("tgp_")).toBe(true)
      expect(verified.valid).toBe(true)
      expect(verified.key?.permissions).toEqual({ crm: ["read", "write"] })
      expect(Math.abs((verified.key?.expiresAt?.getTime() ?? 0) - expectedExpiry)).toBeLessThan(
        60_000,
      )
    },
  )

  it("creates a key without expiresAt for none", async () => {
    const state = await createApiKey(initialApiKeyFormState, form({ expiry: "none" }))

    const verified = await auth.api.verifyApiKey({ body: { key: createdKey(state).key } })
    expect(verified.key?.expiresAt).toBeNull()
  })

  it.each([
    ["empty", ""],
    ["blank", "   "],
    ["33 characters", "a".repeat(33)],
  ])("rejects a %s name and keeps the input", async (_label, name) => {
    const state = await createApiKey(initialApiKeyFormState, form({ name }))

    expect(state.ok).toBe(false)
    if (state.ok !== false) throw new Error("expected a failure")
    expect(state.errors.name).toBeDefined()
    expect(state.values?.name).toBe(name)
    expect(await prisma.apikey.count()).toBe(0)
  })

  it.each([
    ["empty", []],
    ["unknown", ["compta"]],
  ])("rejects a %s domain list without creating a row", async (_label, domains) => {
    const state = await createApiKey(initialApiKeyFormState, form({ domains }))

    expect(state.ok).toBe(false)
    if (state.ok !== false) throw new Error("expected a failure")
    expect(state.errors.domains).toBeDefined()
    expect(await prisma.apikey.count()).toBe(0)
  })

  it("stores a repeated domain once", async () => {
    const state = await createApiKey(initialApiKeyFormState, form({ domains: ["crm", "crm"] }))

    const verified = await auth.api.verifyApiKey({ body: { key: createdKey(state).key } })
    expect(verified.key?.permissions).toEqual({ crm: ["read", "write"] })
  })

  it("refuses createApiKey without a session and creates nothing", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("unauthorized"))

    await expect(createApiKey(initialApiKeyFormState, form())).rejects.toThrow("unauthorized")

    expect(await prisma.apikey.count()).toBe(0)
  })

  it("logs api_key:created with keyId and never the key value", async () => {
    const state = await createApiKey(initialApiKeyFormState, form())

    const { key } = createdKey(state)
    const keyId: unknown = expect.any(String)
    expect(childLog.info).toHaveBeenCalledWith(objectMatch({ event: "api_key:created", keyId }))
    const logged = JSON.stringify(
      [childLog.info, childLog.warn, childLog.error].map((fn) => fn.mock.calls),
    )
    expect(logged).not.toContain(key)
  })
})

describe("deleteApiKey against real Postgres", () => {
  it("deletes a key, which no longer verifies", async () => {
    const created = await auth.api.createApiKey({
      body: { userId: user.id, name: "Poste", permissions: { crm: ["read"] } },
    })

    const state = await deleteApiKey(created.id)

    expect(state.ok).toBe(true)
    const verified = await auth.api.verifyApiKey({ body: { key: created.key } })
    expect(verified.valid).toBe(false)
  })

  it("logs api_key:deleted with the keyId", async () => {
    const created = await auth.api.createApiKey({
      body: { userId: user.id, name: "Poste", permissions: { crm: ["read"] } },
    })

    await deleteApiKey(created.id)

    expect(childLog.info).toHaveBeenCalledWith(
      objectMatch({ event: "api_key:deleted", keyId: created.id }),
    )
  })

  it("answers success when deleting an unknown id", async () => {
    const state = await deleteApiKey("unknown-id")

    expect(state.ok).toBe(true)
  })

  it("refuses deleteApiKey without a session and deletes nothing", async () => {
    const created = await auth.api.createApiKey({
      body: { userId: user.id, name: "Poste", permissions: { crm: ["read"] } },
    })
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("unauthorized"))

    await expect(deleteApiKey(created.id)).rejects.toThrow("unauthorized")

    expect(await prisma.apikey.count()).toBe(1)
  })
})

describe("findApiKeysForAdmin against real Postgres", () => {
  it("lists keys without the key field, domains parsed, nameless and expired keys included", async () => {
    // Toutes les clés d'abord : la purge en tâche de fond de createApiKey retirerait une clé déjà expirée
    const named = await auth.api.createApiKey({
      body: { userId: user.id, name: "Poste", permissions: { crm: ["read", "write"] } },
    })
    const nameless = await auth.api.createApiKey({
      body: { userId: user.id, permissions: { crm: ["read"] } },
    })
    const expired = await auth.api.createApiKey({
      body: { userId: user.id, name: "Ancienne", permissions: { crm: ["read"] } },
    })
    await prisma.apikey.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const keys = await findApiKeysForAdmin()

    expect(keys).toHaveLength(3)
    expect(keys.every((row) => !Object.keys(row).includes("key"))).toBe(true)
    expect(keys.find((row) => row.id === named.id)?.domains).toEqual(["crm"])
    expect(keys.find((row) => row.id === nameless.id)?.name).toBeNull()
    expect(keys.find((row) => row.id === expired.id)?.expiresAt).toBeInstanceOf(Date)
  })
})
