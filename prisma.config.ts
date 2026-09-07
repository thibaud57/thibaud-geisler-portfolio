import { loadEnvConfig } from "@next/env"
loadEnvConfig(process.cwd())

import { defineConfig } from "prisma/config"

const databaseUrl = process.env["DATABASE_URL"]
if (!databaseUrl) {
  throw new Error("DATABASE_URL manquant : le CLI Prisma ne peut joindre aucune base.")
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
    // Prod (Docker) : seed.js bundlé par esbuild au build → spawn `node` (binaire système, dans $PATH).
    // Dev local : tsx via pnpm exec qui hisse node_modules/.bin dans $PATH.
    // tsx reste 100% devDep, jamais shippé en prod.
    seed: process.env.NODE_ENV === "production" ? "node prisma/seed.js" : "tsx prisma/seed.ts",
  },
})
