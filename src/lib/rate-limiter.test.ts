import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimiter } from './rate-limiter'

describe('rateLimiter.check', () => {
  const opts = { max: 5, windowMs: 600_000 }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'))
    rateLimiter.reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autorise la première requête sur une nouvelle key', () => {
    const result = rateLimiter.check('1.2.3.4', opts)

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it('autorise la 5e requête consécutive (max=5)', () => {
    for (let i = 0; i < 4; i++) {
      rateLimiter.check('1.2.3.4', opts)
    }
    const fifth = rateLimiter.check('1.2.3.4', opts)

    expect(fifth.allowed).toBe(true)
    expect(fifth.retryAfterSeconds).toBe(0)
  })

  it('rejette la 6e requête (rate limit) avec retryAfterSeconds > 0', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.check('1.2.3.4', opts)
    }
    const sixth = rateLimiter.check('1.2.3.4', opts)

    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0)
    expect(sixth.retryAfterSeconds).toBeLessThanOrEqual(600)
  })

  it('reset le compteur après que la fenêtre TTL expire', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.check('1.2.3.4', opts)
    }
    expect(rateLimiter.check('1.2.3.4', opts).allowed).toBe(false)

    vi.advanceTimersByTime(600_001)

    const afterReset = rateLimiter.check('1.2.3.4', opts)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.retryAfterSeconds).toBe(0)
  })

  it('isole les keys distinctes (req sur A ne décompte pas sur B)', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.check('1.2.3.4', opts)
    }
    expect(rateLimiter.check('1.2.3.4', opts).allowed).toBe(false)

    const otherIp = rateLimiter.check('5.6.7.8', opts)
    expect(otherIp.allowed).toBe(true)
  })

  it('respecte le cap LRU : évince la plus ancienne entrée au-delà du cap', () => {
    const lruOpts = { max: 1, windowMs: 600_000, cap: 3 }

    rateLimiter.check('key-1', lruOpts)
    rateLimiter.check('key-2', lruOpts)
    rateLimiter.check('key-3', lruOpts)
    rateLimiter.check('key-4', lruOpts)
    const result = rateLimiter.check('key-1', lruOpts)
    expect(result.allowed).toBe(true)
  })

  it('vrai LRU : un hit récent protège la key de l\'éviction (≠ FIFO)', () => {
    const lruOpts = { max: 2, windowMs: 600_000, cap: 3 }

    rateLimiter.check('key-1', lruOpts)
    rateLimiter.check('key-2', lruOpts)
    rateLimiter.check('key-3', lruOpts)

    rateLimiter.check('key-1', lruOpts)

    rateLimiter.check('key-4', lruOpts)

    expect(rateLimiter.check('key-1', lruOpts).allowed).toBe(false)
    expect(rateLimiter.check('key-2', lruOpts).allowed).toBe(true)
  })
})
