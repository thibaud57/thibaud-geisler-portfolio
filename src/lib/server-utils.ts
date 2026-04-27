import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { headers } from 'next/headers'

import { logger } from '@/lib/logger'

const IP_HASH_LENGTH = 8

export function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return 'unknown'
  const first = forwardedFor.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, IP_HASH_LENGTH)
}

export async function createActionLogger(action: string) {
  const headersList = await headers()
  const ip = extractClientIp(headersList.get('x-forwarded-for'))
  return {
    log: logger.child({ action, requestId: randomUUID(), ip_hash: hashIp(ip) }),
    ip,
  }
}
