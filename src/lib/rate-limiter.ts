export type RateLimitOptions = {
  max: number
  windowMs: number
  cap?: number
}

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

// borne mémoire (~64KB max : 1000 keys × ~64B/bucket) — single-instance MVP
const DEFAULT_CAP = 1000
const buckets = new Map<string, number[]>()

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const { max, windowMs, cap = DEFAULT_CAP } = options
  const now = Date.now()
  const cutoff = now - windowMs
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > cutoff)

  // delete + set : Map.set sur key existante ne réordonne pas (FIFO sinon, pas LRU)
  buckets.delete(key)

  if (timestamps.length >= max) {
    const oldest = timestamps[0] ?? now
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    buckets.set(key, timestamps)
    return { allowed: false, retryAfterSeconds }
  }

  timestamps.push(now)
  buckets.set(key, timestamps)

  if (buckets.size > cap) {
    const firstKey = buckets.keys().next().value
    if (firstKey !== undefined) {
      buckets.delete(firstKey)
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

export function __resetRateLimiter(): void {
  buckets.clear()
}
