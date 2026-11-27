// Parcours d'une opportunité : une entreprise et un lead, l'opportunité de l'entreprise, un entretien planifié
// avec le lead comme correspondant (le lead passe en RDV planifié), puis suppression de l'entretien et de l'opportunité.
// Tout porte le préfixe du passage.

import { crmLeft, play, runPrefix, openAdmin, closeAdmin, purgeCrmLeftovers, sampleErrors, dayFromNow, personId, opportunityId } from "./_common.mjs"

const prefix = runPrefix()
const names = {
  company: `${prefix} Acme`,
  slug: `${prefix}-acme`,
  person: `${prefix} Exemple`,
  email: `${prefix}@example.com`,
  opportunity: `${prefix} mission`,
}
const tomorrow = dayFromNow(1)

const session = await openAdmin({ timeout: 60_000 })
const { page, errors, screens } = session
const ids = { person: "", opportunity: "" }

await play(
  "opportunites-entretiens",
  [
    ["préparation", async (report) => {
      await screens.createCompany({ name: names.company, slug: names.slug })
      await screens.createLead({ name: names.person, email: names.email, company: names.company })
      ids.person = personId(names.email)
      report.check(ids.person !== "", "entreprise et lead du passage créés par les écrans", names.person)
    }],
    ["opportunité", async (report) => {
      await screens.createOpportunity({ title: names.opportunity, company: names.company })
      ids.opportunity = opportunityId(names.opportunity)
      const text = await screens.detailText(`/admin/opportunites?detail=${ids.opportunity}`)
      report.check(
        text.includes(names.opportunity) && text.includes(names.company),
        "opportunité créée pour l'entreprise",
        names.opportunity,
      )
    }],
    ["entretien", async (report) => {
      await screens.scheduleInterview({ opportunity: names.opportunity, person: names.person, date: tomorrow })
      const text = await screens.detailText(`/admin/leads?detail=${ids.person}`)
      report.check(
        text.includes(names.opportunity) && /rdv planifié/i.test(text),
        "entretien lié à l'opportunité, lead interlocuteur affiché en RDV planifié",
      )
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
    ["suppression", async (report) => {
      await screens.deleteRow("/admin/entretiens", names.opportunity)
      await screens.deleteRow("/admin/opportunites", names.opportunity)
      const left = crmLeft(prefix, { people: [ids.person].filter(Boolean) })
      report.check(left.interviews + left.opportunities === 0, "entretien et opportunité supprimés par les écrans", JSON.stringify(left))
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
