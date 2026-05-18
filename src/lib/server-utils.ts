import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { headers } from 'next/headers'

import { env } from '@/env'
import { logger } from '@/lib/logger'

const IP_HASH_LENGTH = 8

export function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return 'unknown'
  const first = forwardedFor.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}

// Sel obligatoire : un hash d'IP non salé est réversible par brute-force (espace IPv4 fini).
export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(env.IP_HASH_SALT + ip)
    .digest('hex')
    .slice(0, IP_HASH_LENGTH)
}

export async function createActionLogger(action: string) {
  const headersList = await headers()
  const ip = extractClientIp(headersList.get('x-forwarded-for'))
  return {
    log: logger.child({ action, requestId: randomUUID(), ip_hash: hashIp(ip) }),
    ip,
  }
}
