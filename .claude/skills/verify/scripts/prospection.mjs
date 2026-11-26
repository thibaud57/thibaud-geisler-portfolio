// Parcours de prospection du propriétaire : une entreprise, un lead, une action à faire (pipeline, journal),
// faite par glisser, réponse reçue, puis suppression de l'action et de l'entreprise par les écrans.
// Tout porte le préfixe du passage, retiré par l'app puis par SQL en dernier recours.

import { crmLeft, frDate, one, play, runPrefix, openAdmin, closeAdmin, purgeCrmLeftovers, sampleErrors, personId, companyId } from "./_common.mjs"

const prefix = runPrefix()
const names = {
  company: `${prefix} Acme`,
  slug: `${prefix}-acme`,
  person: `${prefix} Exemple`,
  email: `${prefix}@example.com`,
  action: `${prefix} message`,
}
const today = frDate(new Date())

const session = await openAdmin({ timeout: 60_000 })
const { page, errors, screens } = session
const ids = { company: "", person: "" }

await play(
  "prospection",
  [
    ["entreprise", async (report) => {
      await screens.createCompany({ name: names.company, slug: names.slug })
      await screens.openList("/admin/entreprises")
      await screens.search(names.slug)
      ids.company = companyId(names.slug)
      report.check(
        (await screens.rows().filter({ hasText: names.company }).count()) === 1 && ids.company !== "",
        "entreprise créée, présente dans la liste",
        names.company,
      )
    }],
    ["lead", async (report) => {
      await screens.createLead({ name: names.person, email: names.email, company: names.company })
      ids.person = personId(names.email)
      const text = await screens.detailText(`/admin/leads?detail=${ids.person}`)
      report.check(
        text.includes(names.person) && text.includes(names.company) && /nouveau/i.test(text),
        "lead créé, rattaché à l'entreprise, statut Nouveau",
        names.person,
      )
    }],
    ["action à faire", async (report) => {
      await screens.createAction({ title: names.action, person: names.person, message: "Bonjour, message de vérification." })
      report.check(
        (await screens.column("A_FAIRE").getByText(names.action).count()) === 1,
        "action visible dans la colonne À faire du pipeline",
      )
      await screens.openList("/admin/actions-prospection")
      await screens.search(names.action)
      report.check((await screens.rows().filter({ hasText: names.action }).count()) === 1, "action visible dans le journal")
      const company = await screens.detailText(`/admin/entreprises?detail=${ids.company}`)
      report.check(company.includes("Premier contact —"), "fiche entreprise : une action à faire n'est pas un premier contact")
    }],
    ["action faite", async (report) => {
      const saved = await screens.moveActionToDone(names.action)
      report.check(
        saved && (await screens.column("FAIT").getByText(names.action).count()) === 1,
        "glisser l'action dans la colonne Fait la passe à Fait, conservé au rechargement",
      )
    }],
    ["réponse reçue", async (report) => {
      await screens.replyToAction(names.action, "Merci, parlons-en cette semaine.")
      const actionId = one(`select id from freelance."ProspectingAction" where title = '${names.action}'`)
      const detail = await screens.detailText(`/admin/actions-prospection?detail=${actionId}`)
      report.check(
        detail.includes("Merci, parlons-en cette semaine.") && /répondu/i.test(detail),
        "vue détail de l'action : statut Répondu et texte de la réponse",
      )
      const lead = await screens.detailText(`/admin/leads?detail=${ids.person}`)
      report.check(
        lead.includes(`Dernier contact de sa part ${today}`),
        "fiche du lead : dernier contact de sa part daté du jour",
        today,
      )
      const company = await screens.detailText(`/admin/entreprises?detail=${ids.company}`)
      report.check(company.includes(`Premier contact ${today}`), "fiche entreprise : premier contact daté du jour", today)
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
    ["suppression", async (report) => {
      await screens.deleteRow("/admin/actions-prospection", names.action)
      await screens.deleteRow("/admin/entreprises", names.slug)
      // Aucun écran ne supprime un lead : la personne part en nettoyage SQL
      const left = crmLeft(prefix, { people: [ids.person].filter(Boolean) })
      report.check(
        left.company + left.actions === 0 && left.persons === 1,
        "action et entreprise supprimées par les écrans, le lead reste",
        JSON.stringify(left),
      )
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
