// Parcours d'un signal d'entreprise : « Nouveau signal » depuis la page de l'entreprise, badge « Récent » dans la card
// et dans la vue détail, filtre « Récent » de la liste Entreprises, puis suppression de l'entreprise, qui emporte le signal.
// Tout porte le préfixe du passage.

import { one, play, runPrefix, openAdmin, closeAdmin, purgeCrmLeftovers, sampleErrors, companyId } from "./_common.mjs"

const prefix = runPrefix()
const names = {
  company: `${prefix} Acme`,
  slug: `${prefix}-acme`,
  content: `${prefix} offre de développeur`,
  url: "https://example.com/emplois",
}
// Le 1er du mois courant : l'offre de poste y est encore récente
const now = new Date()
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

const session = await openAdmin({ timeout: 60_000 })
const { page, errors, screens } = session
const ids = { company: "" }

// Lignes de la liste Entreprises retenues par le filtre « Récent », pour l'entreprise du passage
async function rowsWithRecentFilter() {
  await screens.openList("/admin/entreprises")
  await screens.search(names.slug)
  await page.getByRole("button", { name: "Filtres" }).click()
  await page.getByRole("checkbox", { name: /^Récent/ }).click()
  await page.keyboard.press("Escape")
  await page.waitForTimeout(600)
  return screens.rows().filter({ hasText: names.company }).count()
}

await play(
  "signaux",
  [
    ["préparation", async (report) => {
      await screens.createCompany({ name: names.company, slug: names.slug })
      ids.company = companyId(names.slug)
      report.check(ids.company !== "", "entreprise du passage créée par l'écran", names.company)
    }],
    ["filtre sans signal", async (report) => {
      const count = await rowsWithRecentFilter()
      report.check(count === 0, "sans signal, l'entreprise n'apparaît pas au filtre « Récent »", `${count} ligne(s)`)
    }],
    ["nouveau signal", async (report) => {
      await screens.openForm(`/admin/entreprises/${ids.company}`)
      await page.getByRole("button", { name: "Nouveau signal" }).click()
      const form = screens.dialog()
      await screens.pickDay(form.locator('button[id$="-occurredOn"]'), firstOfMonth)
      await form.getByRole("textbox", { name: "Lien source", exact: true }).fill(names.url)
      await form.getByRole("textbox", { name: "Contenu", exact: true }).fill(names.content)
      await screens.save(form)
      await screens.toasts().filter({ hasText: "Signal créé" }).first().waitFor()
      const saved = one(`select count(*) from freelance."Signal" where "companyId" = '${ids.company}' and type = 'OFFRE_POSTE'`)
      const card = await page.locator("main").innerText()
      report.check(
        saved === "1" && card.includes(names.content) && card.includes("Offre de poste") && card.includes("Récent"),
        "la card Signaux de la page montre l'offre de poste enregistrée, badge « Récent »",
        `${saved} signal en base`,
      )
    }],
    ["vue détail", async (report) => {
      const text = await screens.detailText(`/admin/entreprises?detail=${ids.company}`)
      report.check(
        // Le titre d'un bloc est rendu en capitales par le style : innerText le rend tel quel
        /signaux/i.test(text) && text.includes("Offre de poste") && text.includes(names.content) && text.includes("Récent"),
        "le bloc Signaux de la vue détail de l'entreprise montre le signal, badge « Récent »",
      )
    }],
    ["filtre avec signal", async (report) => {
      const count = await rowsWithRecentFilter()
      report.check(count === 1, "avec un signal récent, l'entreprise ressort au filtre « Récent »", `${count} ligne(s)`)
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
    ["suppression", async (report) => {
      await screens.deleteRow("/admin/entreprises", names.slug)
      const left = one(`select count(*) from freelance."Signal" where "companyId" = '${ids.company}'`)
      report.check(left === "0", "l'entreprise supprimée par l'écran emporte son signal", `${left} signal restant`)
    }],
  ],
  async (report) => {
    // Le SQL passe en premier : un serveur tombé pendant le passage ne doit rien laisser dans la base réelle
    const purged = purgeCrmLeftovers(prefix)
    report.check(purged.left === 0, "aucune ligne du passage ne reste en base", `${purged.removed} retirée(s) en fin de passage`)
    const failure = await closeAdmin(session)
    report.check(failure === null, "déconnexion de la session admin", failure ?? "")
  },
)
