import { expect } from "vitest"

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie.
export function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

// Forme réelle sous Prisma 7 + @prisma/adapter-pg (cf. `violatedConstraint`) : P2002 en `<Table>_<col>_key`, P2003 en `<Table>_<col>_fkey`.
export function constraintViolation(code: "P2002" | "P2003", index: string) {
  return { code, meta: { driverAdapterError: { cause: { constraint: { index } } } } }
}
