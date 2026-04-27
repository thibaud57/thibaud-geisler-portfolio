import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetRateLimiter, checkRateLimit } from './rate-limiter'

describe('checkRateLimit', () => {
  const opts = { max: 5, windowMs: 600_000 }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'))
    __resetRateLimiter()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autorise la première requête sur une nouvelle key', () => {
    const result = checkRateLimit('1.2.3.4', opts)

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it('autorise la 5e requête consécutive (max=5)', () => {
    for (let i = 0; i < 4; i++) {
      checkRateLimit('1.2.3.4', opts)
    }
    const fifth = checkRateLimit('1.2.3.4', opts)

    expect(fifth.allowed).toBe(true)
    expect(fifth.retryAfterSeconds).toBe(0)
  })

  it('rejette la 6e requête (rate limit) avec retryAfterSeconds > 0', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4', opts)
    }
    const sixth = checkRateLimit('1.2.3.4', opts)

    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0)
    expect(sixth.retryAfterSeconds).toBeLessThanOrEqual(600)
  })

  it('reset le compteur après que la fenêtre TTL expire', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4', opts)
    }
    expect(checkRateLimit('1.2.3.4', opts).allowed).toBe(false)

    vi.advanceTimersByTime(600_001)

    const afterReset = checkRateLimit('1.2.3.4', opts)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.retryAfterSeconds).toBe(0)
  })

  it('isole les keys distinctes (req sur A ne décompte pas sur B)', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4', opts)
    }
    expect(checkRateLimit('1.2.3.4', opts).allowed).toBe(false)

    const otherIp = checkRateLimit('5.6.7.8', opts)
    expect(otherIp.allowed).toBe(true)
  })

  it('respecte le cap LRU : évince la plus ancienne entrée au-delà du cap', () => {
    const lruOpts = { max: 1, windowMs: 600_000, cap: 3 }

    checkRateLimit('key-1', lruOpts)
    checkRateLimit('key-2', lruOpts)
    checkRateLimit('key-3', lruOpts)
    checkRateLimit('key-4', lruOpts)
    const result = checkRateLimit('key-1', lruOpts)
    expect(result.allowed).toBe(true)
  })

  it('vrai LRU : un hit récent protège la key de l\'éviction (≠ FIFO)', () => {
    const lruOpts = { max: 2, windowMs: 600_000, cap: 3 }

    checkRateLimit('key-1', lruOpts)
    checkRateLimit('key-2', lruOpts)
    checkRateLimit('key-3', lruOpts)

    checkRateLimit('key-1', lruOpts)

    checkRateLimit('key-4', lruOpts)

    expect(checkRateLimit('key-1', lruOpts).allowed).toBe(false)
    expect(checkRateLimit('key-2', lruOpts).allowed).toBe(true)
  })
})
