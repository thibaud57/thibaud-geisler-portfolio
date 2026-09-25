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
  },
})
