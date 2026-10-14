import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { deleteEntity, saveEntity } from "./shared"

const EVENTS = { success: "item:done", failure: "item:failed" }

const recordNotFound = () =>
  Promise.reject(Object.assign(new Error("not found"), { code: "P2025" }))

function save(
  persist: () => Promise<unknown>,
  {
    invalidateCaches = vi.fn(),
    notFound,
  }: { invalidateCaches?: () => void; notFound?: boolean } = {},
) {
  return saveEntity({
    actionName: "saveItem",
    events: EVENTS,
    schema: z.object({ name: z.string() }),
    input: { name: "Acme" },
    persist,
    successLogFields: () => ({}),
    invalidateCaches,
    onValidationError: () => "invalid",
    onSuccess: () => "saved",
    notFound:
      notFound === undefined
        ? undefined
        : { exists: () => Promise.resolve(!notFound), state: () => "gone" },
    onUnknownError: () => "unknown",
  })
}

function remove(
  destroy: () => Promise<unknown>,
  {
    invalidateCaches = vi.fn(),
    exists = false,
  }: { invalidateCaches?: () => void; exists?: boolean } = {},
) {
  return deleteEntity({
    actionName: "deleteItem",
    events: EVENTS,
    successLogFields: {},
    exists: () => Promise.resolve(exists),
    destroy,
    invalidateCaches,
    onSuccess: () => "deleted",
    onUnknownError: () => "unknown",
  })
}

describe("saveEntity", () => {
  it("answers the not-found state on a Prisma P2025 when the target is gone, and refreshes the caches", async () => {
    const invalidateCaches = vi.fn()

    const state = await save(recordNotFound, { invalidateCaches, notFound: true })

    expect(state).toBe("gone")
    expect(invalidateCaches).toHaveBeenCalledTimes(1)
  })

  it("answers onUnknownError on a Prisma P2025 when the target still exists", async () => {
    const invalidateCaches = vi.fn()

    const state = await save(recordNotFound, { invalidateCaches, notFound: false })

    expect(state).toBe("unknown")
    expect(invalidateCaches).not.toHaveBeenCalled()
  })

  it("answers onUnknownError on a Prisma P2025 during a creation", async () => {
    const state = await save(recordNotFound)

    expect(state).toBe("unknown")
  })

  it("answers onUnknownError on any other failure", async () => {
    const state = await save(() => Promise.reject(new Error("boom")), { notFound: true })

    expect(state).toBe("unknown")
  })
})

describe("deleteEntity", () => {
  it("treats a Prisma P2025 as a successful delete when the target is gone, and refreshes the caches", async () => {
    const invalidateCaches = vi.fn()

    const state = await remove(recordNotFound, { invalidateCaches })

    expect(state).toBe("deleted")
    expect(invalidateCaches).toHaveBeenCalledTimes(1)
  })

  it("answers onUnknownError on a Prisma P2025 when the target still exists", async () => {
    const invalidateCaches = vi.fn()

    const state = await remove(recordNotFound, { invalidateCaches, exists: true })

    expect(state).toBe("unknown")
    expect(invalidateCaches).not.toHaveBeenCalled()
  })

  it("answers onUnknownError on any other failure", async () => {
    const state = await remove(() => Promise.reject(new Error("boom")))

    expect(state).toBe("unknown")
  })
})
