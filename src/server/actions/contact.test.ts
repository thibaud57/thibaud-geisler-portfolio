import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { headers } from "next/headers"
import { transporter } from "@/lib/mailer"
import { rateLimiter } from "@/lib/rate-limiter"
import { logger } from "@/lib/logger"
import { objectMatch } from "@/lib/matchers-test-setup"

vi.mock("@/lib/mailer", () => ({
  transporter: { sendMail: vi.fn() },
  MAIL_FROM: "from@test.local",
  MAIL_TO: "to@test.local",
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}))

import { submitContact } from "./contact"
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, initialContactFormState } from "./contact.types"

const FORM_DEFAULTS = {
  name: "Alice",
  company: "Acme",
  email: "alice@acme.example",
  subject: "Projet IA",
  message: "Bonjour, j’aimerais discuter d’un projet IA dans ma boite.",
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

interface ChildLog {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les
// requalifie une fois ici, plutôt qu'un cast sur chaque objet attendu.
const stringContaining = (value: string): string => {
  const matcher: unknown = expect.stringContaining(value)
  return matcher as string
}
const anyNumber = (): number => {
  const matcher: unknown = expect.any(Number)
  return matcher as number
}

const getChildLog = (): ChildLog => {
  const result: unknown = vi.mocked(logger.child).mock.results.at(-1)?.value
  if (!result) throw new Error("logger.child was never called")
  return result as ChildLog
}

describe("submitContact", () => {
  beforeEach(() => {
    vi.spyOn(rateLimiter, "check").mockReturnValue({ allowed: true, retryAfterSeconds: 0 })
    vi.mocked(headers).mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }))
    vi.mocked(transporter.sendMail).mockResolvedValue(undefined)
    rateLimiter.reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sends the email and returns ok:true on a valid payload within the rate limit", async () => {
    const result = await submitContact(initialContactFormState, buildFormData())

    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: "from@test.local",
      to: "to@test.local",
      replyTo: "alice@acme.example",
      subject: "Contact: Alice — Projet IA",
      text: stringContaining("De : Alice <alice@acme.example>"),
    })
    const callArg = vi.mocked(transporter.sendMail).mock.calls[0]?.[0]
    expect(callArg?.text).toContain("Société : Acme")
    expect(callArg?.text).toContain("Sujet : Projet IA")
    expect(callArg?.text).toContain("Bonjour, j’aimerais discuter")
    expect(callArg?.text).toContain("Reçu via thibaud-geisler.com")

    expect(result).toEqual({ ok: true, errors: {}, message: null })

    const childLog = getChildLog()
    expect(childLog.info).toHaveBeenCalledWith({
      event: "email:sent",
      has_company: true,
      message_length: anyNumber(),
      duration_ms: anyNumber(),
    })
  })

  it("catches the honeypot and returns a fake ok:true without sending", async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ website: "https://spam.example" }),
    )

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(rateLimiter.check).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, errors: {}, message: null })

    const childLog = getChildLog()
    expect(childLog.info).toHaveBeenCalledWith({ event: "honeypot:caught" })
  })

  it("does not trigger the honeypot when website only holds spaces", async () => {
    await submitContact(initialContactFormState, buildFormData({ website: "   " }))

    expect(transporter.sendMail).toHaveBeenCalled()
  })

  it("rejects an invalid email with email_invalid and sends nothing", async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ email: "pas-un-email" }),
    )

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.errors.email).toEqual(["email_invalid"])
    expect(result.message).toBeNull()
  })

  it("keeps the typed values in state.values when validation fails", async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ email: "pas-un-email" }),
    )

    expect(result.values).toEqual({ ...FORM_DEFAULTS, email: "pas-un-email" })
  })

  it("does not return state.values on success", async () => {
    const result = await submitContact(initialContactFormState, buildFormData())

    expect(result.ok).toBe(true)
    expect(result.values).toBeUndefined()
  })

  it("returns several field errors at once (empty name and short message)", async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ name: "", message: "Trop court" }),
    )

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.errors.name).toEqual(["name_required"])
    expect(result.errors.message).toEqual(["message_too_short"])
  })

  it("rejects with rate_limit and a warn log when rateLimiter.check denies", async () => {
    vi.mocked(rateLimiter.check).mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 240,
    })

    const result = await submitContact(initialContactFormState, buildFormData())

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: false,
      errors: {},
      message: "rate_limit",
      values: { ...FORM_DEFAULTS },
    })

    const childLog = getChildLog()
    expect(childLog.warn).toHaveBeenCalledWith({
      event: "rate_limit:exceeded",
      retryAfterSeconds: 240,
    })
  })

  it("returns smtp_error when transporter.sendMail throws", async () => {
    const smtpError = new Error("SMTP connection refused")
    vi.mocked(transporter.sendMail).mockRejectedValueOnce(smtpError)

    const result = await submitContact(initialContactFormState, buildFormData())

    expect(result).toEqual({
      ok: false,
      errors: {},
      message: "smtp_error",
      values: { ...FORM_DEFAULTS },
    })

    const childLog = getChildLog()
    expect(childLog.error).toHaveBeenCalledWith({
      err: smtpError,
      event: "email:failed",
    })
  })

  it.each([
    ["is absent", undefined, "unknown"],
    ["lists several addresses", "1.2.3.4, 10.0.0.1, 172.16.0.1", "1.2.3.4"],
    ["has spaces around the first address", "  1.2.3.4  ,  10.0.0.1  ", "1.2.3.4"],
  ])(
    "keys the rate limit on the first IP when x-forwarded-for %s",
    async (_label, forwardedFor, expectedKey) => {
      vi.mocked(headers).mockResolvedValueOnce(
        new Headers(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      )

      await submitContact(initialContactFormState, buildFormData())

      expect(rateLimiter.check).toHaveBeenCalledWith(expectedKey, {
        max: RATE_LIMIT_MAX,
        windowMs: RATE_LIMIT_WINDOW_MS,
      })
    },
  )

  it("omits the company line and logs has_company:false when company is absent", async () => {
    await submitContact(initialContactFormState, buildFormData({}, { omit: ["company"] }))

    const callArg = vi.mocked(transporter.sendMail).mock.calls[0]?.[0]
    expect(callArg?.text).not.toContain("Société :")

    const childLog = getChildLog()
    expect(childLog.info).toHaveBeenCalledWith(
      objectMatch({
        event: "email:sent",
        has_company: false,
      }),
    )
  })

  it("never logs email, name, subject or message in clear (GDPR)", async () => {
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
