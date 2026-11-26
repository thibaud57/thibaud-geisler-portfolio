// Parcours du calendrier des actions : une relance à faire posée à son jour, glissée sur un autre jour,
// replanifiée et conservée au rechargement. Le lead et l'action portent le préfixe du passage.

import { crmLeft, frDate, one, play, runPrefix, openAdmin, closeAdmin, purgeCrmLeftovers, sampleErrors, dayFromNow, personId } from "./_common.mjs"

const prefix = runPrefix()
const names = {
  person: `${prefix} Exemple`,
  email: `${prefix}@example.com`,
  action: `${prefix} relance`,
}
const tomorrow = dayFromNow(1)

const session = await openAdmin({ timeout: 60_000 })
const { page, errors, screens } = session
const ids = { person: "", action: "" }

await play(
  "calendrier",
  [
    ["relance à faire", async (report) => {
      await screens.createLead({ name: names.person, email: names.email })
      ids.person = personId(names.email)
      await screens.createAction({ title: names.action, person: names.person })
      ids.action = one(`select id from freelance."ProspectingAction" where title = '${names.action}'`)
      await screens.openForm("/admin/actions-prospection/calendrier")
      const now = new Date()
      report.check(
        (await screens.calendarCell(now).count()) === 1 && (await screens.isEventOnDay(names.action, now)),
        "calendrier : la relance à faire est posée à son jour",
        frDate(now),
      )
    }],
    ["replanification", async (report) => {
      // Le lendemain, ou la veille quand il sort de la grille du mois
      const target = (await screens.calendarCell(tomorrow).count()) === 1 ? tomorrow : dayFromNow(-1)
      const from = await page.getByRole("button", { name: new RegExp(names.action) }).boundingBox()
      const to = await screens.calendarCell(target).boundingBox()
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
      await page.mouse.down()
      await page.mouse.move(from.x + from.width / 2 + 8, from.y + from.height / 2 + 8)
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 })
      await page.mouse.up()
      const label = frDate(target)
      const saved = await screens.eventually(
        () => one(`select to_char("occurredAt" at time zone 'Europe/Paris', 'DD/MM/YYYY') from freelance."ProspectingAction" where id = '${ids.action}'`) === label,
      )
      await screens.openForm("/admin/actions-prospection/calendrier")
      report.check(
        saved && (await screens.isEventOnDay(names.action, target)),
        "calendrier : glisser la relance sur un autre jour la replanifie, conservé au rechargement",
        label,
      )
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
    ["suppression", async (report) => {
      await screens.deleteRow("/admin/actions-prospection", names.action)
      const left = crmLeft(prefix, { people: [ids.person].filter(Boolean) })
      report.check(left.actions === 0, "relance supprimée par l'écran du journal", JSON.stringify(left))
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
