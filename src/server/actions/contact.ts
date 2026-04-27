'use server'

import 'server-only'

import { MAIL_FROM, MAIL_TO, transporter } from '@/lib/mailer'
import { checkRateLimit } from '@/lib/rate-limiter'
import { contactSchema, type ContactInput } from '@/lib/schemas/contact'
import { createActionLogger } from '@/lib/server-utils'

import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, type ContactFormState } from './contact.types'

type ZodFieldErrors = Partial<Record<keyof ContactInput, string[]>>

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
  const { log, ip } = await createActionLogger('submitContact')

  const honeypot = formData.get('website')
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    log.info({ event: 'honeypot:caught' })
    return { ok: true, errors: {}, message: null }
  }

  const submittedValues: ContactFormState['values'] = {
    name: String(formData.get('name') ?? ''),
    company: String(formData.get('company') ?? ''),
    email: String(formData.get('email') ?? ''),
    subject: String(formData.get('subject') ?? ''),
    message: String(formData.get('message') ?? ''),
  }

  const rateLimit = checkRateLimit(ip, {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })
  if (!rateLimit.allowed) {
    log.warn({ event: 'rate_limit:exceeded', retryAfterSeconds: rateLimit.retryAfterSeconds })
    return {
      ok: false,
      errors: {},
      message: 'rate_limit',
      values: submittedValues,
    }
  }

  const result = contactSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ZodFieldErrors,
      message: null,
      values: submittedValues,
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
    return { ok: false, errors: {}, message: 'smtp_error', values: submittedValues }
  }
}
