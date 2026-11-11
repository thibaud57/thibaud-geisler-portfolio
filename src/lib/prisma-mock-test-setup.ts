import { vi, type Mock } from "vitest"

// À appeler dans la factory du `vi.mock("@/lib/prisma")` par `await import`, le mock étant hoisted.
export function mockPrismaClient<Delegates extends Record<string, Record<string, Mock>>>(
  delegates: Delegates,
) {
  const prisma = { ...delegates, $transaction: vi.fn() }
  prisma.$transaction.mockImplementation((arg: unknown) =>
    Array.isArray(arg)
      ? Promise.all(arg)
      : (arg as (tx: typeof prisma) => Promise<unknown>)(prisma),
  )
  return prisma
}
