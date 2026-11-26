// Parcours du visiteur sur téléphone (390 px), en lecture seule : menu de navigation ouvert sans débordement
// horizontal, puis entrée « Projets » du menu.

import { BASE, play, openVisitor, sampleErrors, overflows } from "./_common.mjs"

const { browser, page, errors } = await openVisitor({ width: 390, height: 844 })

await play(
  "visiteur-mobile",
  [
    ["menu", async (report) => {
      await page.goto(`${BASE}/fr`, { waitUntil: "load" })
      await page.locator("main:not([role=status]) h1").first().waitFor()
      // Un clic parti pendant l'hydratation la fait échouer (`data-aria-hidden`) : attendre qu'elle soit finie
      await page.waitForTimeout(1500)
      await page.getByRole("button", { name: "Ouvrir le menu de navigation" }).click()
      await page.getByRole("link", { name: "Projets" }).last().waitFor()
      report.check(!(await overflows(page)), "menu mobile à 390 px, sans débordement horizontal")
    }],
    ["navigation", async (report) => {
      await page.getByRole("link", { name: "Projets" }).last().click()
      await page.waitForURL("**/fr/projets")
      await page.locator("main:not([role=status]) article").first().waitFor()
      report.check(!(await overflows(page)), "liste des projets atteinte par le menu mobile, sans débordement horizontal")
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par le site", sampleErrors(errors))
    }],
  ],
  async () => {
    await browser.close()
  },
)
