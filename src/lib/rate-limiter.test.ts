import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { rateLimiter } from "./rate-limiter"

describe("rateLimiter.check", () => {
  const opts = { max: 5, windowMs: 600_000 }

  function exhaust(key: string, hits: number, options = opts) {
    for (let i = 0; i < hits; i++) {
      rateLimiter.check(key, options)
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-26T12:00:00Z"))
    rateLimiter.reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows the first request on a new key", () => {
    const result = rateLimiter.check("1.2.3.4", opts)

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it.each([
    ["allows the 5th request", 4, true],
    ["rejects the 6th request", 5, false],
  ])("%s (max=5)", (_label, previousHits, allowed) => {
    exhaust("1.2.3.4", previousHits)

    const result = rateLimiter.check("1.2.3.4", opts)

    expect(result.allowed).toBe(allowed)
  })

  it("reports a retry delay within the window once limited", () => {
    exhaust("1.2.3.4", 5)

    const result = rateLimiter.check("1.2.3.4", opts)

    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(600)
  })

  it("allows requests again once the TTL window expires", () => {
    exhaust("1.2.3.4", 5)
    vi.advanceTimersByTime(600_001)

    const result = rateLimiter.check("1.2.3.4", opts)

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it("counts distinct keys separately", () => {
    exhaust("1.2.3.4", 5)

    const result = rateLimiter.check("5.6.7.8", opts)

    expect(result.allowed).toBe(true)
  })

  it("evicts the least recently used key, not the oldest inserted one", () => {
    // max 1 : une clé gardée reste bloquée, seule une clé évincée repart à zéro.
    const lruOpts = { max: 1, windowMs: 600_000, cap: 3 }
    exhaust("key-1", 1, lruOpts)
    exhaust("key-2", 1, lruOpts)
    exhaust("key-3", 1, lruOpts)
    exhaust("key-1", 1, lruOpts)
    exhaust("key-4", 1, lruOpts)

    const recentlyHit = rateLimiter.check("key-1", lruOpts)
    const evicted = rateLimiter.check("key-2", lruOpts)

    expect(recentlyHit.allowed).toBe(false)
    expect(evicted.allowed).toBe(true)
  })
})
