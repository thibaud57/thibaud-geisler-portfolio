// Parcours des contacts : un contact créé par son formulaire, puis un lead promu contact (« Depuis un lead »),
// la même personne portant alors les deux fiches. Le contact créé est supprimé par l'écran.
// Tout porte le préfixe du passage.

import { BASE, crmLeft, play, runPrefix, openAdmin, closeAdmin, purgeCrmLeftovers, sampleErrors, personId } from "./_common.mjs"

const prefix = runPrefix()
const names = {
  person: `${prefix} Exemple`,
  email: `${prefix}@example.com`,
  contact: `${prefix} Contact`,
  contactEmail: `${prefix}-contact@example.com`,
}

const session = await openAdmin({ timeout: 60_000 })
const { page, errors, screens } = session
const ids = { person: "", contact: "" }

await play(
  "contacts",
  [
    ["contact", async (report) => {
      await screens.openForm("/admin/contacts/nouveau")
      await page.getByRole("textbox", { name: "Nom", exact: true }).fill(names.contact)
      await page.getByRole("textbox", { name: "Email", exact: true }).fill(names.contactEmail)
      await page.getByRole("checkbox", { name: "Collègue" }).check()
      await screens.save(page)
      await page.waitForURL(`${BASE}/admin/contacts`)
      ids.contact = personId(names.contactEmail)
      const created = await screens.detailText(`/admin/contacts?detail=${ids.contact}`)
      report.check(
        created.includes(names.contact) && created.includes("Collègue"),
        "contact créé, fiche avec son nom et son type",
        names.contact,
      )
    }],
    ["lead promu contact", async (report) => {
      await screens.createLead({ name: names.person, email: names.email })
      ids.person = personId(names.email)
      // Le lead du passage reçoit le rôle Contact : une seule personne, deux rôles
      await screens.openForm("/admin/contacts/nouveau")
      await page.getByRole("radio", { name: "Depuis un lead" }).click()
      await screens.choose(page, "Lead", names.person, names.person)
      // Les champs du lead se chargent après la sélection : enregistrer avant ne fait rien. Le champ de recherche du
      // combobox, rendu dans un portail hors de `main`, porte déjà ce nom : il ne prouve pas le chargement
      await page.waitForFunction((name) => [...document.querySelectorAll("main input")].some((input) => input.value === name), names.person)
      await page.getByRole("checkbox", { name: "Mentor" }).check()
      await screens.save(page)
      await page.waitForURL(`${BASE}/admin/contacts`)
      const asContact = await screens.detailText(`/admin/contacts?detail=${ids.person}`)
      const asLead = await screens.detailText(`/admin/leads?detail=${ids.person}`)
      report.check(
        asContact.includes(names.person) && asContact.includes("Mentor") && asContact.includes("Fiche lead") && asLead.includes("Fiche contact"),
        "lead promu contact : la même personne porte les deux fiches, liées l'une à l'autre",
      )
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
    ["suppression", async (report) => {
      await screens.deleteRow("/admin/contacts", names.contact)
      // Aucun écran ne supprime un lead : la personne promue part en nettoyage SQL
      const left = crmLeft(prefix, { people: [ids.person].filter(Boolean) })
      report.check(left.persons === 1, "contact supprimé par l'écran, la personne promue reste", JSON.stringify(left))
    }],
  ],
  async (report) => {
    // Le SQL passe en premier : un serveur tombé pendant le passage ne doit rien laisser dans la base réelle
    const people = [ids.person].filter(Boolean)
    const purged = purgeCrmLeftovers(prefix, { people })
    report.check(purged.left === 0, "aucune ligne du passage ne reste en base", `${purged.removed} retirée(s) en fin de passage`)
    const failure = await closeAdmin(session)
    report.check(failure === null, "déconnexion de la session admin", failure ?? "")
  },
)
