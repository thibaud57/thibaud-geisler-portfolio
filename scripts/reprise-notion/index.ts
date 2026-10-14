import { readFileSync } from "node:fs"

import { z } from "zod"

import { env } from "@/env"
import { prisma } from "@/lib/prisma"

import { importFileSchema, prepare, type Prepared } from "./import-file"
import { checkDatabase, countCrmRows, fetchMissingLogos, writeAll } from "./write"

const [filePath, flag, ...rest] = process.argv.slice(2)
if (!filePath || rest.length > 0 || (flag !== undefined && flag !== "--write")) {
  throw new Error("Usage : just reprise-notion <fichier> [--write]")
}
const write = flag === "--write"

// La production ne se remplit que par dump (docs/PRODUCTION.md) : le script n'écrit que dans une base locale
const { hostname, pathname } = new URL(env.DATABASE_URL)
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  throw new Error(`DATABASE_URL doit viser une base locale, reçu ${hostname}`)
}
const database = pathname.slice(1)
if (database !== "portfolio_dev") {
  throw new Error(`DATABASE_URL doit viser la base portfolio_dev, reçu ${database}`)
}
// Les logos suivent le même chemin que la base : bucket de dev, copiés en production par la procédure
if (!env.R2_ADMIN_BUCKET.endsWith("-dev")) {
  throw new Error(`R2_ADMIN_BUCKET doit viser un bucket de dev, reçu ${env.R2_ADMIN_BUCKET}`)
}

const parsed = importFileSchema.safeParse(JSON.parse(readFileSync(filePath, "utf8")))
if (!parsed.success) {
  console.error(z.prettifyError(parsed.error))
  process.exit(1)
}
const file = parsed.data
const { prepared, issues } = prepare(file)
issues.push(...(await checkDatabase(prepared)))

const lists = Object.keys(prepared) as (keyof Prepared)[]
console.table(
  Object.fromEntries(
    lists.map((list) => [list, { fichier: file[list].length, valides: prepared[list].length }]),
  ),
)
for (const issue of issues) console.log(`[${issue.list}] ${issue.key} : ${issue.message}`)
process.exitCode = issues.length > 0 ? 1 : 0

if (!write) {
  console.log(`Simulation : ${issues.length} erreur(s), rien n'est écrit`)
} else if (issues.length > 0) {
  console.log(`${issues.length} erreur(s) : rien n'est écrit`)
} else {
  await writeAll(prepared)
  console.log("Reprise écrite en une transaction")
  const counted = await countCrmRows()
  const crmLists = Object.keys(counted) as (keyof typeof counted)[]
  console.table(
    Object.fromEntries(
      crmLists.map((list) => [list, { fichier: file[list].length, base: counted[list] }]),
    ),
  )
  for (const list of crmLists) {
    if (counted[list] !== file[list].length) {
      console.log(
        `[base] ${list} : ${counted[list]} ligne(s) en base pour ${file[list].length} dans le fichier`,
      )
      process.exitCode = 1
    }
  }
  const failures = await fetchMissingLogos(prepared)
  for (const failure of failures) console.log(`[logo] ${failure.slug} : ${failure.reason}`)
  console.log(`Logos : ${failures.length} échec(s), à déposer depuis la page de l'entreprise`)
}

await prisma.$disconnect()
