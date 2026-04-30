import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { headers } from 'next/headers'
import { transporter } from '@/lib/mailer'
import { rateLimiter } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'

vi.mock('@/lib/mailer', () => ({
  transporter: { sendMail: vi.fn() },
  MAIL_FROM: 'from@test.local',
  MAIL_TO: 'to@test.local',
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}))

import { submitContact } from './contact'
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  initialContactFormState,
} from './contact.types'

const FORM_DEFAULTS = {
  name: 'Alice',
  company: 'Acme',
  email: 'alice@acme.fr',
  subject: 'Projet IA',
  message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
} as const

const buildFormData = (
  overrides: Record<string, string> = {},
  options: { omit?: readonly string[] } = {},
): FormData => {
  const fd = new FormData()
  const omit = new Set(options.omit ?? [])
  for (const [key, value] of Object.entries({ ...FORM_DEFAULTS, ...overrides })) {
    if (omit.has(key)) continue
    fd.append(key, value)
  }
  return fd
}

type ChildLog = {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

const getChildLog = (): ChildLog => {
  const result = vi.mocked(logger.child).mock.results.at(-1)?.value
  if (!result) throw new Error('logger.child was never called')
  return result as ChildLog
}

describe('submitContact', () => {
  beforeEach(() => {
    vi.spyOn(rateLimiter, 'check').mockReturnValue({ allowed: true, retryAfterSeconds: 0 })
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-forwarded-for': '1.2.3.4' }) as never)
    vi.mocked(transporter.sendMail).mockResolvedValue(undefined as never)
    rateLimiter.reset()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('exporte un initialContactFormState idle (ok=null, errors vides, message null)', () => {
    expect(initialContactFormState).toEqual({
      ok: null,
      errors: {},
      message: null,
    })
  })

  it("envoie l'email et retourne ok:true sur payload valide + rate limit OK", async () => {
    const result = await submitContact(initialContactFormState, buildFormData())

    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: 'from@test.local',
      to: 'to@test.local',
      replyTo: 'alice@acme.fr',
      subject: 'Contact: Alice — Projet IA',
      text: expect.stringContaining('De : Alice <alice@acme.fr>'),
    })
    const callArg = vi.mocked(transporter.sendMail).mock.calls[0]?.[0]
    expect(callArg?.text).toContain('Société : Acme')
    expect(callArg?.text).toContain('Sujet : Projet IA')
    expect(callArg?.text).toContain('Bonjour, j’aimerais discuter')
    expect(callArg?.text).toContain('Reçu via thibaud-geisler.com')

    expect(result).toEqual({ ok: true, errors: {}, message: null })

    const childLog = getChildLog()
    expect(childLog.info).toHaveBeenCalledWith({
      event: 'email:sent',
      has_company: true,
      message_length: expect.any(Number),
    })
  })

  it('détecte le honeypot et retourne ok:true factice sans envoyer (sendMail jamais appelé)', async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ website: 'https://spam.com' }),
    )

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(rateLimiter.check).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, errors: {}, message: null })

    const childLog = getChildLog()
    expect(childLog.info).toHaveBeenCalledWith({ event: 'honeypot:caught' })
  })

  it('ne déclenche pas le honeypot quand website ne contient que des espaces', async () => {
    await submitContact(initialContactFormState, buildFormData({ website: '   ' }))

    expect(transporter.sendMail).toHaveBeenCalled()
  })

  it("rejette un email invalide avec errors.email = [\"email_invalid\"] et n'envoie pas", async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ email: 'pas-un-email' }),
    )

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.errors.email).toEqual(['email_invalid'])
    expect(result.message).toBeNull()
  })

  it('preserve les valeurs saisies dans state.values en cas d\'erreur Zod', async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ email: 'pas-un-email' }),
    )

    expect(result.values).toEqual({ ...FORM_DEFAULTS, email: 'pas-un-email' })
  })

  it('ne renvoie pas state.values en cas de succes (form reset normal)', async () => {
    const result = await submitContact(initialContactFormState, buildFormData())

    expect(result.ok).toBe(true)
    expect(result.values).toBeUndefined()
  })

  it('retourne plusieurs erreurs Zod en cascade (name vide + message court)', async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ name: '', message: 'Trop court' }),
    )

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.errors.name).toEqual(['name_required'])
    expect(result.errors.message).toEqual(['message_too_short'])
  })

  it('rejette quand rateLimiter.check retourne allowed:false (message rate_limit + log warn)', async () => {
    vi.mocked(rateLimiter.check).mockReturnValue({
      allowed: false,
      retryAfterSeconds: 240,
    })

    const result = await submitContact(initialContactFormState, buildFormData())

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: false,
      errors: {},
      message: 'rate_limit',
      values: { ...FORM_DEFAULTS },
    })

    const childLog = getChildLog()
    expect(childLog.warn).toHaveBeenCalledWith({
      event: 'rate_limit:exceeded',
      retryAfterSeconds: 240,
    })
  })

  it('retourne smtp_error quand transporter.sendMail throw', async () => {
    const smtpError = new Error('SMTP connection refused')
    vi.mocked(transporter.sendMail).mockRejectedValueOnce(smtpError)

    const result = await submitContact(initialContactFormState, buildFormData())

    expect(result).toEqual({
      ok: false,
      errors: {},
      message: 'smtp_error',
      values: { ...FORM_DEFAULTS },
    })

    const childLog = getChildLog()
    expect(childLog.error).toHaveBeenCalledWith({
      err: smtpError,
      event: 'email:failed',
    })
  })

  it('utilise "unknown" comme key quand x-forwarded-for est absent', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers() as never)

    await submitContact(initialContactFormState, buildFormData())

    expect(rateLimiter.check).toHaveBeenCalledWith('unknown', {
      max: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    })
  })

  it('extrait la première IP de la chaîne x-forwarded-for', async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 172.16.0.1' }) as never,
    )

    await submitContact(initialContactFormState, buildFormData())

    expect(rateLimiter.check).toHaveBeenCalledWith('1.2.3.4', {
      max: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    })
  })

  it('trim les espaces autour de la première IP de x-forwarded-for', async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-forwarded-for': '  1.2.3.4  ,  10.0.0.1  ' }) as never,
    )

    await submitContact(initialContactFormState, buildFormData())

    expect(rateLimiter.check).toHaveBeenCalledWith('1.2.3.4', {
      max: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    })
  })

  it('omet la ligne Société et log has_company:false quand company est absente', async () => {
    await submitContact(initialContactFormState, buildFormData({}, { omit: ['company'] }))

    const callArg = vi.mocked(transporter.sendMail).mock.calls[0]?.[0]
    expect(callArg?.text).not.toContain('Société :')

    const childLog = getChildLog()
    expect(childLog.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'email:sent',
        has_company: false,
      }),
    )
  })

  it('ne loggue jamais email/name/subject/message en clair (RGPD)', async () => {
    await submitContact(initialContactFormState, buildFormData())

    const childLog = getChildLog()
    const allLogPayloads = [
      ...childLog.info.mock.calls.map((c: unknown[]) => c[0]),
      ...childLog.warn.mock.calls.map((c: unknown[]) => c[0]),
      ...childLog.error.mock.calls.map((c: unknown[]) => c[0]),
    ]

    for (const payload of allLogPayloads) {
      const json = JSON.stringify(payload ?? {})
      for (const value of Object.values(FORM_DEFAULTS)) {
        expect(json).not.toContain(value)
      }
    }
  })
})
