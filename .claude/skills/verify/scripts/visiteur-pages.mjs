// Parcours du visiteur qui lit les pages du site, en lecture seule : services, à propos, contact, mentions légales,
// confidentialité, puis une adresse inconnue. Le formulaire de contact n'est jamais soumis : il envoie un vrai e-mail.

import { BASE, play, openVisitor, sampleErrors } from "./_common.mjs"

const { browser, page, errors } = await openVisitor()
const ABSENT = "/fr/verify-page-absente"

await play(
  "visiteur-pages",
  [
    ["pages", async (report) => {
      const paths = ["/fr/services", "/fr/a-propos", "/fr/contact", "/fr/mentions-legales", "/fr/confidentialite"]
      const statuses = []
      for (const path of paths) {
        const response = await page.goto(`${BASE}${path}`, { waitUntil: "load" })
        await page.locator("main:not([role=status]) h1").first().waitFor()
        statuses.push(response.status())
      }
      report.check(statuses.every((status) => status === 200), "services, à propos, contact et pages légales", statuses.join(" "))
    }],
    ["introuvable", async (report) => {
      const response = await page.goto(`${BASE}${ABSENT}`, { waitUntil: "load" })
      report.check(response.status() === 404, "route inconnue en 404", String(response.status()))
    }],
    ["console", async (report) => {
      // Le 404 demandé exprès se signale lui-même en console
      const unexpected = errors.filter((error) => !error.includes(ABSENT))
      report.check(unexpected.length === 0, "aucune erreur de console émise par le site", sampleErrors(unexpected))
    }],
  ],
  async () => {
    await browser.close()
  },
)
