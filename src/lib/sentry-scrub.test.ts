import { describe, expect, it } from "vitest"

import { scrubSentryEvent, scrubSentryLog } from "./sentry-scrub"

describe("scrubSentryEvent", () => {
  it("retire l'email et l'adresse IP de l'objet user", () => {
    const event = {
      type: undefined,
      user: { id: "u1", email: "client@example.com", ip_address: "203.0.113.7" },
    }

    const result = scrubSentryEvent(event)

    expect(result.user).toEqual({ id: "u1" })
  })

  it("conserve les propriétés non sensibles de user", () => {
    const event = { type: undefined, user: { id: "u1", username: "alice" } }

    const result = scrubSentryEvent(event)

    expect(result.user).toEqual({ id: "u1", username: "alice" })
  })

  it("traverse un événement sans objet user sans lever", () => {
    const event = { type: undefined, message: "boom" }

    const result = scrubSentryEvent(event)

    expect(result).toEqual({ message: "boom" })
  })

  it("retourne toujours l'événement et jamais undefined", () => {
    const event = { type: undefined }

    const result = scrubSentryEvent(event)

    expect(result).toBeDefined()
  })

  it("retire un email en clair dans le message d'une exception (ex: rejet SMTP)", () => {
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

  it("retire un email en clair dans event.message", () => {
    const event = { type: undefined, message: "Échec envoi à visiteur@example.com" }

    const result = scrubSentryEvent(event)

    expect(result.message).toBe("Échec envoi à [email redacted]")
  })

  it("retire l'intégralité d'un email à domaine composé, sans laisser le TLD", () => {
    const event = { type: undefined, message: "rejet pour Camille.Fictif+tag@sub.example.com" }

    const result = scrubSentryEvent(event)

    expect(result.message).toBe("rejet pour [email redacted]")
  })

  it("laisse intactes les chaînes qui ressemblent à un email sans en être", () => {
    const event = { type: undefined, message: "user@localhost npm@7 a@b 12@34 @handle" }

    const result = scrubSentryEvent(event)

    expect(result.message).toBe("user@localhost npm@7 a@b 12@34 @handle")
  })
})

describe("scrubSentryLog", () => {
  it("retire un email du message du log", () => {
    const log = { level: "error" as const, message: "envoi refusé pour visiteur@example.com" }

    const result = scrubSentryLog(log)

    expect(result.message).toBe("envoi refusé pour [email redacted]")
  })

  it("retire un email imbriqué dans l'objet err sérialisé par Pino", () => {
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

  it("conserve les attributs non sensibles et les types non-string", () => {
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

  it("retourne toujours le log et jamais null", () => {
    const log = { level: "info" as const, message: "boot" }

    const result = scrubSentryLog(log)

    expect(result).toBeDefined()
  })
})
