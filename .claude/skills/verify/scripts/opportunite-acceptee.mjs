// Parcours d'une opportunité acceptée : un lead apporte une opportunité chez un client final, elle est En cours, le lead
// reste dans la vue En cours et le client n'est pas travaillé. Passée à Acceptée par son formulaire, elle rejoint
// Acceptées, le lead affiche « Deal » et sort de En cours, le client entre dans Travaillées. Tout porte le préfixe du passage.

import {
  crmLeft, one, play, runPrefix, searchRows, openAdmin, closeAdmin, purgeCrmLeftovers, sampleErrors, personId, opportunityId,
} from "./_common.mjs"

const prefix = runPrefix()
const names = {
  company: `${prefix} Acme`,
  slug: `${prefix}-acme`,
  person: `${prefix} Exemple`,
  email: `${prefix}@example.com`,
  opportunity: `${prefix} mission`,
}

const session = await openAdmin({ timeout: 60_000 })
const { page, errors, screens } = session
const ids = { person: "", opportunity: "" }
// Le badge de statut est rendu en capitales par le style : innerText le rend tel quel
const IS_DEAL = /\bdeal\b/i

// Lignes d'une vue de liste portant le texte cherché
const inView = async (path, text) => (await searchRows(page, path, text)).count()

await play(
  "opportunite-acceptee",
  [
    ["préparation", async (report) => {
      await screens.createCompany({ name: names.company, slug: names.slug })
      await screens.createLead({ name: names.person, email: names.email, company: names.company })
      ids.person = personId(names.email)
      // L'apporteur arrive prérempli par l'adresse, comme depuis la card « Opportunités apportées » de la page du lead
      await screens.openForm(`/admin/opportunites/nouvelle?referrer=${ids.person}`)
      await page.getByRole("textbox", { name: "Intitulé", exact: true }).fill(names.opportunity)
      await screens.choose(page, "Client final", names.company, names.company)
      await screens.save(page)
      await page.waitForURL(/\/admin\/opportunites$/)
      ids.opportunity = opportunityId(names.opportunity)
      report.check(ids.person !== "" && ids.opportunity !== "", "lead, entreprise et opportunité apportée par le lead créés par les écrans", names.opportunity)
    }],
    ["avant l'acceptation", async (report) => {
      const counts = {
        opportunityInProgress: await inView("/admin/opportunites/en-cours", names.opportunity),
        opportunityAccepted: await inView("/admin/opportunites/acceptees", names.opportunity),
        leadInProgress: await inView("/admin/leads/en-cours", names.person),
        companyWorked: await inView("/admin/entreprises/travaillees", names.company),
      }
      const detail = await screens.detailText(`/admin/leads?detail=${ids.person}`)
      report.check(
        counts.opportunityInProgress === 1 && counts.opportunityAccepted === 0 && counts.leadInProgress === 1 && counts.companyWorked === 0 && !IS_DEAL.test(detail),
        "proposée : dans En cours et pas dans Acceptées, lead En cours sans « Deal », client non travaillé",
        JSON.stringify(counts),
      )
    }],
    ["acceptation", async (report) => {
      await screens.openForm(`/admin/opportunites/${ids.opportunity}`)
      await screens.choose(page, "Statut", "Acceptée")
      await screens.save(page)
      await page.waitForURL(/\/admin\/opportunites$/)
      const status = one(`select status from freelance."Opportunity" where id = '${ids.opportunity}'`)
      report.check(status === "ACCEPTEE", "le formulaire enregistre l'opportunité à Acceptée", status)
    }],
    ["après l'acceptation", async (report) => {
      const counts = {
        opportunityInProgress: await inView("/admin/opportunites/en-cours", names.opportunity),
        opportunityAccepted: await inView("/admin/opportunites/acceptees", names.opportunity),
        leadInProgress: await inView("/admin/leads/en-cours", names.person),
        companyWorked: await inView("/admin/entreprises/travaillees", names.company),
      }
      report.check(
        counts.opportunityInProgress === 0 && counts.opportunityAccepted === 1,
        "acceptée : l'opportunité quitte En cours pour Acceptées",
        JSON.stringify({ en_cours: counts.opportunityInProgress, acceptees: counts.opportunityAccepted }),
      )
      const detail = await screens.detailText(`/admin/leads?detail=${ids.person}`)
      report.check(
        IS_DEAL.test(detail) && counts.leadInProgress === 0,
        "le lead affiche « Deal » et sort de la vue En cours",
        `${counts.leadInProgress} ligne(s) dans En cours`,
      )
      report.check(counts.companyWorked === 1, "le client final entre dans la vue Travaillées des entreprises", `${counts.companyWorked} ligne(s)`)
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
    ["suppression", async (report) => {
      await screens.deleteRow("/admin/opportunites", names.opportunity)
      await screens.deleteRow("/admin/entreprises", names.slug)
      // Aucun écran ne supprime un lead : la personne part en nettoyage SQL
      const left = crmLeft(prefix, { people: [ids.person].filter(Boolean) })
      report.check(
        left.company + left.opportunities === 0 && left.persons === 1,
        "opportunité et entreprise supprimées par les écrans, le lead reste",
        JSON.stringify(left),
      )
    }],
  ],
  async (report) => {
    // Le SQL passe en premier : un serveur tombé pendant le passage ne doit rien laisser dans la base réelle
    const scope = { people: [ids.person].filter(Boolean) }
    const purged = purgeCrmLeftovers(prefix, scope)
    report.check(purged.left === 0, "aucune ligne du passage ne reste en base", `${purged.removed} retirée(s) en fin de passage`)
    const failure = await closeAdmin(session)
    report.check(failure === null, "déconnexion de la session admin", failure ?? "")
  },
)
