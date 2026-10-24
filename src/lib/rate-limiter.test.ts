import { beforeEach, describe, expect, it } from "vitest"
import { rateLimiter } from "./rate-limiter"

describe("rateLimiter.check", () => {
  const opts = { max: 5, windowMs: 600_000 }

  const now = new Date("2026-04-26T12:00:00Z").getTime()

  function exhaust(key: string, hits: number, options = opts) {
    for (let i = 0; i < hits; i++) {
      rateLimiter.check(key, options, now)
    }
  }

  beforeEach(() => {
    rateLimiter.reset()
  })

  it("allows the first request on a new key", () => {
    const result = rateLimiter.check("1.2.3.4", opts, now)

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it.each([
    ["allows the 5th request", 4, true],
    ["rejects the 6th request", 5, false],
  ])("%s (max=5)", (_label, previousHits, allowed) => {
    exhaust("1.2.3.4", previousHits)

    const result = rateLimiter.check("1.2.3.4", opts, now)

    expect(result.allowed).toBe(allowed)
  })

  it("reports a retry delay within the window once limited", () => {
    exhaust("1.2.3.4", 5)

    const result = rateLimiter.check("1.2.3.4", opts, now)

    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(600)
  })

  it("allows requests again once the TTL window expires", () => {
    exhaust("1.2.3.4", 5)

    const result = rateLimiter.check("1.2.3.4", opts, now + 600_001)

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it("counts distinct keys separately", () => {
    exhaust("1.2.3.4", 5)

    const result = rateLimiter.check("5.6.7.8", opts, now)

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

    const recentlyHit = rateLimiter.check("key-1", lruOpts, now)
    const evicted = rateLimiter.check("key-2", lruOpts, now)

    expect(recentlyHit.allowed).toBe(false)
    expect(evicted.allowed).toBe(true)
  })
})
