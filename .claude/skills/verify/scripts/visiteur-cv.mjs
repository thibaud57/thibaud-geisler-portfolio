// Parcours du visiteur qui télécharge le CV, en lecture seule : un clic sur le lien de l'accueil télécharge un PDF.

import { statSync } from "node:fs"

import { BASE, play, openVisitor, sampleErrors } from "./_common.mjs"

const { browser, page, errors } = await openVisitor()

await play(
  "visiteur-cv",
  [
    ["CV", async (report) => {
      await page.goto(`${BASE}/fr`, { waitUntil: "load" })
      await page.locator("main:not([role=status]) h1").first().waitFor()
      // Le lien porte l'attribut `download` : le visiteur clique, le navigateur enregistre le fichier
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /CV/ }).first().click()])
      const failure = await download.failure()
      const size = failure ? 0 : statSync(await download.path()).size
      report.check(
        failure === null && download.suggestedFilename().toLowerCase().endsWith(".pdf") && size > 0,
        "le clic sur le lien du CV télécharge un PDF non vide",
        `${download.suggestedFilename()}, ${size} octets${failure ? `, échec : ${failure}` : ""}`,
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
