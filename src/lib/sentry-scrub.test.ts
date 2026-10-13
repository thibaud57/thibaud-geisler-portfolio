import { describe, expect, it } from "vitest"

import { scrubSentryEvent, scrubSentryLog } from "./sentry-scrub"

describe("scrubSentryEvent", () => {
  it("removes the email and IP address from the user object", () => {
    const event = {
      type: undefined,
      user: { id: "u1", email: "client@example.com", ip_address: "203.0.113.7" },
    }

    const result = scrubSentryEvent(event)

    expect(result.user).toEqual({ id: "u1" })
  })

  it("keeps the non-sensitive user properties", () => {
    const event = { type: undefined, user: { id: "u1", username: "alice" } }

    const result = scrubSentryEvent(event)

    expect(result.user).toEqual({ id: "u1", username: "alice" })
  })

  it("passes an event without a user object through without throwing", () => {
    const event = { type: undefined, message: "boom" }

    const result = scrubSentryEvent(event)

    expect(result).toEqual({ message: "boom" })
  })

  it("redacts a plain email in an exception message (e.g. an SMTP rejection)", () => {
    const event = {
      type: undefined,
      exception: {
        values: [{ type: "Error", value: "Recipient address rejected: visiteur@example.com" }],
      },
    }

    const result = scrubSentryEvent(event)

    expect(result.exception?.values?.[0]?.value).toBe(
      "Recipient address rejected: [email redacted]",
    )
  })

  it("redacts a plain email in event.message", () => {
    const event = { type: undefined, message: "Échec envoi à visiteur@example.com" }

    const result = scrubSentryEvent(event)

    expect(result.message).toBe("Échec envoi à [email redacted]")
  })

  it("redacts a whole email with a compound domain, leaving no TLD behind", () => {
    const event = { type: undefined, message: "rejet pour Camille.Fictif+tag@sub.example.com" }

    const result = scrubSentryEvent(event)

    expect(result.message).toBe("rejet pour [email redacted]")
  })

  it("leaves strings that only look like an email untouched", () => {
    const event = { type: undefined, message: "user@localhost npm@7 a@b 12@34 @handle" }

    const result = scrubSentryEvent(event)

    expect(result.message).toBe("user@localhost npm@7 a@b 12@34 @handle")
  })
})

describe("scrubSentryLog", () => {
  it("redacts an email from the log message", () => {
    const log = { level: "error" as const, message: "envoi refusé pour visiteur@example.com" }

    const result = scrubSentryLog(log)

    expect(result.message).toBe("envoi refusé pour [email redacted]")
  })

  it("redacts an email nested in the err object serialized by Pino", () => {
    const log = {
      level: "error" as const,
      message: "email:failed",
      attributes: {
        event: "email:failed",
        err: {
          type: "Error",
          message: "Recipient address rejected: visiteur@example.com",
          stack: "Error: Recipient address rejected: visiteur@example.com\n    at send",
        },
      },
    }

    const result = scrubSentryLog(log)

    const err = result.attributes?.["err"] as Record<string, string>
    expect(err["message"]).toBe("Recipient address rejected: [email redacted]")
    expect(err["stack"]).not.toContain("visiteur@example.com")
  })

  it("keeps non-sensitive attributes and non-string values", () => {
    const log = {
      level: "warn" as const,
      message: "rate_limit:exceeded",
      attributes: { retryAfterSeconds: 60, has_company: false, event: "rate_limit:exceeded" },
    }

    const result = scrubSentryLog(log)

    expect(result.attributes).toEqual({
      retryAfterSeconds: 60,
      has_company: false,
      event: "rate_limit:exceeded",
    })
  })
})
