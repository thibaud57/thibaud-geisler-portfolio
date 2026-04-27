'use server'

import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { headers } from 'next/headers'

import { logger } from '@/lib/logger'
import { MAIL_FROM, MAIL_TO, transporter } from '@/lib/mailer'
import { checkRateLimit } from '@/lib/rate-limiter'
import { contactSchema, type ContactInput } from '@/lib/schemas/contact'

export type ContactFormMessage = 'rate_limit' | 'smtp_error' | null

export type ContactFormState = {
  ok: boolean | null
  errors: Partial<Record<keyof ContactInput | '_global', string[]>>
  message: ContactFormMessage
}

export const initialContactFormState: ContactFormState = {
  ok: null,
  errors: {},
  message: null,
}

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const IP_HASH_LENGTH = 8

function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return 'unknown'
  const first = forwardedFor.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, IP_HASH_LENGTH)
}

function buildEmailBody(data: {
  name: string
  company?: string
  email: string
  subject: string
  message: string
}): string {
  const lines = [
    `De : ${data.name} <${data.email}>`,
    ...(data.company ? [`Société : ${data.company}`] : []),
    `Sujet : ${data.subject}`,
    '',
    data.message,
    '',
    '---',
    'Reçu via thibaud-geisler.com (formulaire de contact)',
  ]
  return lines.join('\n')
}

export async function submitContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const requestId = randomUUID()
  const headersList = await headers()
  const ip = extractClientIp(headersList.get('x-forwarded-for'))
  const ipHash = hashIp(ip)
  const log = logger.child({ action: 'submitContact', requestId, ip_hash: ipHash })

  const honeypot = formData.get('website')
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    log.info({ event: 'honeypot:caught' })
    return { ok: true, errors: {}, message: null }
  }

  const rateLimit = checkRateLimit(ip, {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })
  if (!rateLimit.allowed) {
    log.warn({ event: 'rate_limit:exceeded', retryAfterSeconds: rateLimit.retryAfterSeconds })
    return {
      ok: false,
      errors: { _global: ['rate_limit_exceeded'] },
      message: 'rate_limit',
    }
  }

  const result = contactSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ContactFormState['errors'],
      message: null,
    }
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      replyTo: result.data.email,
      subject: `Contact: ${result.data.name} — ${result.data.subject}`,
      text: buildEmailBody(result.data),
    })
    log.info({
      event: 'email:sent',
      has_company: Boolean(result.data.company),
      message_length: result.data.message.length,
    })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    log.error({ err, event: 'email:failed' })
    return { ok: false, errors: {}, message: 'smtp_error' }
  }
}
