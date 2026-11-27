// Parcours du visiteur qui règle ses préférences, en lecture seule : langue de l'interface (même page en anglais)
// et thème clair ou sombre, conservé au rechargement.

import { BASE, play, openVisitor, sampleErrors } from "./_common.mjs"

const { browser, page, errors } = await openVisitor()

await play(
  "visiteur-preferences",
  [
    ["langue", async (report) => {
      await page.goto(`${BASE}/fr/projets`, { waitUntil: "load" })
      await page.locator("main:not([role=status]) h1").first().waitFor()
      // Un clic parti avant la fin de l'hydratation n'ouvre pas le menu
      await page.waitForTimeout(1500)
      await page.getByRole("button", { name: "Changer de langue" }).click()
      await page.getByRole("menuitem", { name: "English" }).click()
      await page.waitForURL("**/en/projets")
      const lang = await page.locator("html").getAttribute("lang")
      report.check(lang === "en", "passage en anglais sur la même page", `${page.url().replace(BASE, "")}, lang ${lang}`)
    }],
    ["thème", async (report) => {
      const dark = () => page.evaluate(() => document.documentElement.classList.contains("dark"))
      const before = await dark()
      await page.getByRole("button", { name: "Toggle theme" }).click()
      const after = await dark()
      await page.reload({ waitUntil: "load" })
      report.check(before !== after && (await dark()) === after, "changement de thème, conservé au rechargement", `sombre : ${before} puis ${after}`)
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par le site", sampleErrors(errors))
    }],
  ],
  async () => {
    await browser.close()
  },
)
