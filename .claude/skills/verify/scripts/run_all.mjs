// Joue les scénarios de `verify-all` à la suite, puis rend une ligne de synthèse par scénario.
// Séquentiel : les scénarios admin écrivent dans la même base de dev.

import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// Seul endroit à compléter pour ajouter un scénario à `verify-all`
const SCENARIOS = [
  "visiteur-projets",
  "visiteur-preferences",
  "visiteur-consentement",
  "visiteur-pages",
  "visiteur-cv",
  "visiteur-langue",
  "visiteur-mobile",
  "referencement",
  "admin-acces",
  "admin-mobile",
  "publication",
  "prospection",
  "calendrier",
  "opportunites-entretiens",
  "opportunite-acceptee",
  "signaux",
  "contacts",
  "opposition",
  "revue-hebdo",
  "agents-crm",
  "agents-portfolio",
]
const here = dirname(fileURLToPath(import.meta.url))

const results = SCENARIOS.map((name) => {
  console.log(`\n######## ${name}`)
  const started = Date.now()
  const { status } = spawnSync(process.execPath, [join(here, `${name}.mjs`)], { stdio: "inherit" })
  return { name, ok: status === 0, seconds: Math.round((Date.now() - started) / 1000) }
})

console.log("\n######## synthèse")
for (const { name, ok, seconds } of results) console.log(`${ok ? "PASS" : "FAIL"}  ${name} en ${seconds} s`)
const failed = results.filter((result) => !result.ok).length
console.log(`== verify-all : ${failed ? "FAIL" : "PASS"} (${failed} échec(s))`)
process.exit(failed ? 1 : 0)
