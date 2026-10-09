import "server-only"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { env } from "@/env"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  // Le driver adapter reprend les défauts de `pg`, sans timeout de connexion : une base injoignable
  // ferait attendre la requête indéfiniment. 5 s, le défaut de Prisma 6.
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
  })
  return new PrismaClient({
    adapter,
    log: ["warn", "error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
