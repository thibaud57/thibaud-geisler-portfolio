import { writeFileSync } from "node:fs"

import { betterAuth } from "better-auth"
import { testUtils } from "better-auth/plugins"

import { env } from "@/env"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const outFile = process.argv[2]
if (!outFile) throw new Error("Usage : just dev-login <fichier>")

// Le script fabrique une session admin valide sans OAuth : il ne doit jamais viser autre chose qu'une app locale
const { hostname } = new URL(env.BETTER_AUTH_URL)
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  throw new Error(`BETTER_AUTH_URL doit viser localhost, reçu ${hostname}`)
}

// testUtils reste hors de l'instance de l'app, qu'il doterait d'un moyen de créer une session sans Google.
// Les options de l'app sont reprises telles quelles : même secret, même nom de cookie, mêmes hooks
const devAuth = betterAuth({ ...auth.options, plugins: [testUtils()] })
const ctx = await devAuth.$context

const found = await ctx.internalAdapter.findUserByEmail(env.ADMIN_EMAIL)
if (!found) {
  throw new Error("Aucun compte admin en base : se connecter une fois via Google sur /admin/login")
}

const cookies = await ctx.test.getCookies({ userId: found.user.id })
const jar = cookies.map((cookie) =>
  [
    cookie.domain,
    "FALSE",
    cookie.path,
    cookie.secure ? "TRUE" : "FALSE",
    cookie.expires ?? 0,
    cookie.name,
    cookie.value,
  ].join("\t"),
)
writeFileSync(outFile, `# Netscape HTTP Cookie File\n${jar.join("\n")}\n`)

await prisma.$disconnect()
console.log(`Session admin de dev créée, cookie écrit dans ${outFile} (curl -b ${outFile})`)
