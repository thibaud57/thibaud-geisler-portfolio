// Parcours du visiteur qui découvre les projets, en lecture seule : accueil, entrée « Projets » du menu,
// filtres Clients et Personnels, ouverture d'une étude de cas depuis la liste.

import { BASE, play, openVisitor, sampleErrors, content } from "./_common.mjs"

const { browser, page, errors } = await openVisitor()
const state = { slug: "", title: "" }

await play(
  "visiteur-projets",
  [
    ["accueil", async (report) => {
      const response = await page.goto(`${BASE}/fr`, { waitUntil: "load" })
      await content(page).locator("h1").first().waitFor()
      const links = await page.getByRole("banner").getByRole("link").count()
      report.check(response.status() === 200 && links >= 5, "accueil en français, navigation présente", `${response.status()}, ${links} liens`)
    }],
    ["liste des projets", async (report) => {
      await page.getByRole("banner").getByRole("link", { name: "Projets" }).first().click()
      await page.waitForURL("**/fr/projets")
      // La page d'accueil quittée reste cachée dans le DOM avec ses propres cartes : seules les cartes visibles comptent
      const cards = content(page).locator("article:visible")
      await cards.first().waitFor()
      const all = await cards.count()
      await page.getByRole("tab", { name: "Clients" }).click()
      await page.waitForTimeout(400)
      const clients = await cards.count()
      await page.getByRole("tab", { name: "Personnels" }).click()
      await page.waitForTimeout(400)
      const personal = await cards.count()
      report.check(
        all > 0 && clients > 0 && personal > 0 && clients + personal === all,
        "liste des projets depuis le menu, filtres Clients et Personnels",
        `${all} projets, ${clients} clients, ${personal} personnels`,
      )
      await page.getByRole("tab", { name: "Tous" }).click()
    }],
    ["étude de cas", async (report) => {
      const link = content(page).locator("article:visible a").first()
      state.slug = (await link.getAttribute("href")).split("/").at(-1)
      state.title = await content(page).locator("article:visible h2").first().innerText()
      await link.click()
      await page.waitForURL(`**/fr/projets/${state.slug}`)
      // La liste quittée reste cachée dans le DOM : le titre attendu se cherche par son nom
      const heading = page.getByRole("heading", { level: 1, name: state.title })
      await heading.waitFor()
      report.check(await heading.isVisible(), "ouverture d'une étude de cas depuis la liste", state.slug)
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par le site", sampleErrors(errors))
    }],
  ],
  async () => {
    await browser.close()
  },
)
