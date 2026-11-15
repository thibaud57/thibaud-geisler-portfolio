import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { parseEnv } from "node:util"

import { Client } from "pg"
import type { TestProject } from "vitest/node"

import { assertTestDatabase, deriveTestDatabase } from "@/testing/test-database"

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string
  }
}

// Ni `.env.test` (`@next/env` le charge en mode test) ni `NODE_ENV` ne doivent décider de la base de départ :
// une variable déjà exportée (just, IDE) prime, sinon les fichiers lus par `next dev`.
function devDatabaseUrl(): string {
  const exported = process.env["DATABASE_URL"]
  if (exported) return exported

  for (const file of [".env.local", ".env"].filter((candidate) => existsSync(candidate))) {
    const url = parseEnv(readFileSync(file, "utf8"))["DATABASE_URL"]
    if (url) return url
  }
  throw new Error("DATABASE_URL introuvable : ni exportée, ni dans les fichiers d'env de dev")
}

// Recréée à chaque run : aucun écart possible entre le schéma de la base et les migrations.
export default async function setup(project: TestProject): Promise<void> {
  const database = deriveTestDatabase(devDatabaseUrl())
  assertTestDatabase(database.name)

  const admin = new Client({ connectionString: database.adminUrl })
  await admin.connect()
  try {
    const name = admin.escapeIdentifier(database.name)
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
    await admin.query(`CREATE DATABASE ${name}`)
  } finally {
    await admin.end()
  }

  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: database.url },
    stdio: ["ignore", "ignore", "inherit"],
  })

  project.provide("testDatabaseUrl", database.url)
}
