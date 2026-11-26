// Parcours du visiteur qui refuse les cookies, en lecture seule : bandeau au premier passage, « Tout rejeter »,
// choix enregistré, bandeau absent au rechargement. Un contexte vierge : aucune trace d'un passage précédent.

import { BASE, play, openVisitor, sampleErrors } from "./_common.mjs"

const { browser, context, page, errors } = await openVisitor()

await play(
  "visiteur-consentement",
  [
    ["refus", async (report) => {
      await page.goto(`${BASE}/fr`, { waitUntil: "load" })
      const reject = page.getByRole("button", { name: "Tout rejeter" })
      await reject.waitFor()
      await reject.click()
      await reject.waitFor({ state: "hidden" })
      await page.reload({ waitUntil: "load" })
      // Preuve positive d'abord : le choix est enregistré. Le bandeau se cherche une fois la page hydratée
      const stored = (await context.cookies()).some((cookie) => cookie.name === "c15t")
      await page.getByRole("button", { name: "Gérer mes cookies" }).waitFor()
      await page.waitForTimeout(1500)
      report.check(
        stored && (await reject.count()) === 0,
        "refus du consentement enregistré, bandeau absent au rechargement",
        `cookie c15t : ${stored}`,
      )
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par le site", sampleErrors(errors))
    }],
  ],
  async () => {
    await browser.close()
  },
)
