import type { ErrorEvent, Log } from "@sentry/nextjs"

// Les sous-domaines sont consommés avant le TLD, sinon un domaine composé
// (`exemple.co.uk`) ne serait masqué que jusqu'au premier point.
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi

function redactEmails(value: string): string {
  return value.replace(EMAIL_PATTERN, "[email redacted]")
}

// Un rejet SMTP embarque souvent l'adresse du destinataire dans son message d'erreur
// (ex: contact.ts capture les erreurs de transporter.sendMail) : ce n'est jamais dans
// event.user, donc le scrub sur user seul laisserait fuiter cet email.
function redactExceptionMessages(event: ErrorEvent): ErrorEvent {
  if (!event.exception?.values) return event

  return {
    ...event,
    exception: {
      ...event.exception,
      values: event.exception.values.map((value) =>
        value.value ? { ...value, value: redactEmails(value.value) } : value,
      ),
    },
  }
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  let result = event

  if (result.user) {
    const { email, ip_address, ...safeUser } = result.user
    result = { ...result, user: safeUser }
  }

  if (result.message) result = { ...result, message: redactEmails(result.message) }

  return redactExceptionMessages(result)
}

function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactEmails(value)
  if (Array.isArray(value)) return value.map(redactDeep)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        redactDeep(nested),
      ]),
    )
  }
  return value
}

// `pinoIntegration` alimente deux pipelines : les issues (filtrées par `beforeSend`) et les
// logs Sentry, qui ne passent que par `beforeSendLog`. Sans ce second filtre, l'objet Pino
// complet — `err` sérialisé compris — partirait en clair alors que l'issue correspondante
// est masquée.
export function scrubSentryLog(log: Log): Log {
  const message = redactEmails(log.message) as Log["message"]

  if (!log.attributes) return { ...log, message }

  return { ...log, message, attributes: redactDeep(log.attributes) as Log["attributes"] }
}
