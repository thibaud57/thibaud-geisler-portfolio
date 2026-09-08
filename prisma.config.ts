import { loadEnvConfig } from "@next/env"
loadEnvConfig(process.cwd())

import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Repli documente par Prisma : `generate` n'a pas besoin d'URL, mais echouerait si le
    // chargement du config throw. Le stage `deps` du Dockerfile n'a pas DATABASE_URL.
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrations: {
    path: "prisma/migrations",
    // Prod (Docker) : seed.js bundlé par esbuild au build → spawn `node` (binaire système, dans $PATH).
    // Dev local : tsx via pnpm exec qui hisse node_modules/.bin dans $PATH.
    // tsx reste 100% devDep, jamais shippé en prod.
    seed: process.env.NODE_ENV === "production" ? "node prisma/seed.js" : "tsx prisma/seed.ts",
  },
})
