// Parcours de la revue hebdomadaire : les compteurs calculés depuis le CRM suivent le travail de la semaine
// (message envoyé, conversation engagée, lead en RDV planifié), puis la revue est enregistrée sur un vendredi libre
// et supprimée par son écran. Le travail de la semaine est joué par les écrans, sous le préfixe du passage.
// Une revue existante n'est jamais touchée : la revue du passage se désigne par ses notes, qui portent le préfixe.

import {
  crmLeft, freeFriday, isoDay, one, play, runPrefix, weekLabel, openAdmin, closeAdmin, purgeCrmLeftovers, sampleErrors, dayFromNow, personId,
} from "./_common.mjs"

const prefix = runPrefix()
const names = {
  company: `${prefix} Acme`,
  slug: `${prefix}-acme`,
  person: `${prefix} Exemple`,
  email: `${prefix}@example.com`,
  action: `${prefix} message`,
  opportunity: `${prefix} mission`,
  review: "",
}
const tomorrow = dayFromNow(1)

const session = await openAdmin({ timeout: 60_000 })
const { page, errors, screens } = session
const counters = { before: {} }
const ids = { person: "", review: "" }

await play(
  "revue-hebdo",
  [
    ["compteurs avant", async (report) => {
      counters.before = await screens.weekCounters()
      report.check(Object.keys(counters.before).length === 8, "compteurs calculés depuis le CRM avant le travail de la semaine", JSON.stringify(counters.before))
    }],
    ["travail de la semaine", async (report) => {
      await screens.createCompany({ name: names.company, slug: names.slug })
      await screens.createLead({ name: names.person, email: names.email, company: names.company })
      ids.person = personId(names.email)
      await screens.createAction({ title: names.action, person: names.person, message: "Bonjour, message de vérification." })
      const saved = await screens.moveActionToDone(names.action)
      await screens.replyToAction(names.action, "Merci, parlons-en cette semaine.")
      await screens.createOpportunity({ title: names.opportunity, company: names.company })
      await screens.scheduleInterview({ opportunity: names.opportunity, person: names.person, date: tomorrow })
      report.check(saved && ids.person !== "", "message envoyé, réponse reçue et entretien planifié pour le lead du passage", names.person)
    }],
    ["compteurs après", async (report) => {
      const after = await screens.weekCounters()
      const delta = (key) => after[key] - counters.before[key]
      report.check(
        delta("messagesSent") === 1 && delta("conversationsEngaged") === 1,
        "le message envoyé et la conversation engagée sont comptés",
        `messages ${delta("messagesSent")}, conversations ${delta("conversationsEngaged")}`,
      )
      report.check(delta("activeLeads") === 1, "le lead en RDV planifié compte parmi les leads actifs", `${delta("activeLeads")}`)
    }],
    ["revue enregistrée", async (report) => {
      const friday = freeFriday()
      const label = weekLabel(friday)
      await screens.openForm("/admin/revues-hebdo")
      await page.getByRole("button", { name: "Clôturer la semaine" }).first().click()
      const form = screens.dialog()
      await screens.pickDay(form.locator('button[id$="-closingFriday"]'), friday)
      await form.getByRole("textbox", { name: "Notes", exact: true }).fill(prefix)
      await screens.save(form)
      await screens.toasts().filter({ hasText: "Revue créée" }).first().waitFor()
      // Le vendredi était libre : la seule revue de ce jour portant le préfixe est la nôtre
      ids.review = one(`select id from freelance."WeeklyReview" where "closingFriday" = '${isoDay(friday)}' and notes like '${prefix}%'`)
      names.review = label
      await screens.openList("/admin/revues-hebdo")
      await screens.search(label)
      report.check(
        ids.review !== "" && (await screens.rows().filter({ hasText: label }).count()) === 1,
        "revue enregistrée sur un vendredi libre, présente dans le journal des revues",
        `${label}, vendredi ${friday.toLocaleDateString("fr-FR")}`,
      )
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
    ["suppression", async (report) => {
      await screens.deleteRow("/admin/entretiens", names.opportunity)
      await screens.deleteRow("/admin/opportunites", names.opportunity)
      await screens.deleteRow("/admin/actions-prospection", names.action)
      await screens.deleteRow("/admin/revues-hebdo", names.review)
      await screens.deleteRow("/admin/entreprises", names.slug)
      // Aucun écran ne supprime un lead : la personne part en nettoyage SQL
      const left = crmLeft(prefix, { people: [ids.person].filter(Boolean), reviews: [ids.review].filter(Boolean) })
      report.check(
        left.company + left.actions + left.opportunities + left.interviews + left.weeklyReviews === 0 && left.persons === 1,
        "entretien, opportunité, action, revue et entreprise supprimés par les écrans, le lead reste",
        JSON.stringify(left),
      )
    }],
  ],
  async (report) => {
    // Le SQL passe en premier : un serveur tombé pendant le passage ne doit rien laisser dans la base réelle
    const scope = { people: [ids.person].filter(Boolean), reviews: [ids.review].filter(Boolean) }
    const purged = purgeCrmLeftovers(prefix, scope)
    report.check(purged.left === 0, "aucune ligne du passage ne reste en base", `${purged.removed} retirée(s) en fin de passage`)
    const failure = await closeAdmin(session)
    report.check(failure === null, "déconnexion de la session admin", failure ?? "")
  },
)
