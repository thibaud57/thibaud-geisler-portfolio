import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }))

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("@/lib/logger", () => ({ logger: { child: vi.fn(() => log) } }))

import { fail, ok, type DomainResult } from "@/server/crm/result"

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

type DomainState = { invalid: true } | { saved: string } | { failed: string } | { unknown: true }

function saveDomain(
  persist: () => Promise<DomainResult<{ id: string }, { code: "company_gone" | "slug_taken" }>>,
  {
    invalidateCaches = vi.fn(),
    invalidate,
  }: { invalidateCaches?: () => void; invalidate: boolean },
) {
  return saveEntity({
    actionName: "saveItem",
    events: EVENTS,
    schema: z.object({ name: z.string() }),
    input: { name: "Acme" },
    persist,
    successLogFields: () => ({}),
    invalidateCaches,
    onValidationError: (): DomainState => ({ invalid: true }),
    onSuccess: (value) => ({ saved: value.id }),
    onDomainError: (error) => ({ state: { failed: error.code }, invalidate }),
    onUnknownError: (): DomainState => ({ unknown: true }),
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

describe("saveEntity with a domain result", () => {
  it("answers the domain error state and refreshes the caches when onDomainError asks for it", async () => {
    const invalidateCaches = vi.fn()

    const state = await saveDomain(() => Promise.resolve(fail({ code: "company_gone" as const })), {
      invalidateCaches,
      invalidate: true,
    })

    expect(state).toEqual({ failed: "company_gone" })
    expect(invalidateCaches).toHaveBeenCalledTimes(1)
    expect(log.info).not.toHaveBeenCalledWith(expect.objectContaining({ event: EVENTS.success }))
  })

  it("answers the domain error state without refreshing the caches when onDomainError does not ask for it", async () => {
    const invalidateCaches = vi.fn()

    const state = await saveDomain(() => Promise.resolve(fail({ code: "slug_taken" as const })), {
      invalidateCaches,
      invalidate: false,
    })

    expect(state).toEqual({ failed: "slug_taken" })
    expect(invalidateCaches).not.toHaveBeenCalled()
    expect(log.info).not.toHaveBeenCalledWith(expect.objectContaining({ event: EVENTS.success }))
  })

  it("passes the domain value to onSuccess, refreshes the caches and logs the success", async () => {
    const invalidateCaches = vi.fn()

    const state = await saveDomain(() => Promise.resolve(ok({ id: "c1" })), {
      invalidateCaches,
      invalidate: false,
    })

    expect(state).toEqual({ saved: "c1" })
    expect(invalidateCaches).toHaveBeenCalledTimes(1)
    expect(log.info).toHaveBeenCalledWith(expect.objectContaining({ event: EVENTS.success }))
  })

  it("answers onUnknownError and logs the failure when persist throws", async () => {
    const state = await saveDomain(() => Promise.reject(new Error("boom")), { invalidate: true })

    expect(state).toEqual({ unknown: true })
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ event: EVENTS.failure }))
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
