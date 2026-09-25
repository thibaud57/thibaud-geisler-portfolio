import "server-only"
import { createHash, randomUUID } from "node:crypto"
import * as Sentry from "@sentry/nextjs"
import { headers } from "next/headers"

import { env } from "@/env"
import { logger } from "@/lib/logger"

const IP_HASH_LENGTH = 8

export function stringField(formData: FormData, key: string, fallback = ""): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : fallback
}

// getAll, jamais get : un FormData renvoyant plusieurs valeurs pour un champ, get() ne garderait
// que la première et silencierait la perte des autres.
export function stringValues(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string")
}

export function isPrismaError(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === code
}

// Prisma 7 + @prisma/adapter-pg ne porte pas `meta.target` sur un P2002 : l'index de contrainte
// vit sous `meta.driverAdapterError.cause.constraint.index` (nom Postgres `<Table>_<col>_key`),
// constaté sur ce projet le 2026-09-19. `meta.target` reste un filet pour un autre chemin d'erreur.
// Une clé étrangère violée (P2003) suit le même chemin, avec un nom en `<Table>_<col>_fkey`.
export function violatedConstraint(err: unknown): string {
  if (typeof err !== "object" || err === null) return ""
  const meta = (err as { meta?: unknown }).meta
  if (typeof meta !== "object" || meta === null) return ""

  const driverIndex = (
    meta as { driverAdapterError?: { cause?: { constraint?: { index?: unknown } } } }
  ).driverAdapterError?.cause?.constraint?.index
  if (typeof driverIndex === "string") return driverIndex

  const target = (meta as { target?: unknown }).target
  if (Array.isArray(target)) return target.join(",")
  return typeof target === "string" ? target : ""
}

export function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return "unknown"
  const first = forwardedFor.split(",")[0]?.trim()
  return first && first.length > 0 ? first : "unknown"
}

// Sel obligatoire : un hash d'IP non salé est réversible par brute-force (espace IPv4 fini).
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(env.IP_HASH_SALT + ip)
    .digest("hex")
    .slice(0, IP_HASH_LENGTH)
}

// `child` est générique sur les niveaux custom pino (`Logger<ChildCustomLevels>`) : passer par
// cette fonction concrète (plutôt que `ReturnType<typeof logger.child>`, qui instancie le générique
// sur son défaut au lieu du type réellement produit par cet appel précis) garde `ActionContext.log`
// et la valeur construite ci-dessous strictement identiques.
function createChildLogger(action: string, ip: string) {
  return logger.child({ action, requestId: randomUUID(), ip_hash: hashIp(ip) })
}

export interface ActionContext {
  log: ReturnType<typeof createChildLogger>
  ip: string
}

// withServerActionInstrumentation enveloppe un callback (API Sentry, cf. docs/knowledges/sentry.md
// § Instrumentation des Server Actions) : elle ne peut pas s'insérer dans une fonction déjà entrée.
// Ce point d'entrée en devient donc un lui-même, seul moyen d'obtenir `log`/`ip` étant d'appeler ce
// wrapper : aucune Server Action ne peut plus oublier l'instrumentation.
export async function createActionLogger<T>(
  action: string,
  handler: (ctx: ActionContext) => T | Promise<T>,
): Promise<T> {
  return Sentry.withServerActionInstrumentation(action, async () => {
    const headersList = await headers()
    const ip = extractClientIp(headersList.get("x-forwarded-for"))
    const log = createChildLogger(action, ip)
    return handler({ log, ip })
  })
}
