// Parcours de l'opposition à la prospection : un lead contacté (un échange fait, une relance à faire) et déjà
// contact, puis « Ne plus contacter ». Son nom est effacé, la relance disparaît du journal, l'échange déjà eu
// reste, le lead sort de la liste des contacts. Tout porte le préfixe du passage.
// Le rôle Contact est posé par SQL : la promotion par son formulaire est le parcours `contacts`.

import { BASE, one, play, runPrefix, sql, openAdmin, closeAdmin, purgeCrmLeftovers, sampleErrors, personId } from "./_common.mjs"

const prefix = runPrefix()
const names = {
  person: `${prefix} Exemple`,
  email: `${prefix}@example.com`,
  done: `${prefix} échange`,
  todo: `${prefix} relance`,
}

const session = await openAdmin({ timeout: 60_000 })
const { page, errors, screens } = session
const ids = { person: "" }

await play(
  "opposition",
  [
    ["préparation", async (report) => {
      await screens.createLead({ name: names.person, email: names.email })
      ids.person = personId(names.email)
      sql(`insert into freelance."Contact" ("personId", "updatedAt") values ('${ids.person}', now())`)
      await screens.createAction({ title: names.done, person: names.person })
      const saved = await screens.moveActionToDone(names.done)
      await screens.createAction({ title: names.todo, person: names.person })
      report.check(saved && ids.person !== "", "lead contacté, déjà contact, un échange fait et une relance à faire", names.person)
    }],
    ["avant l'opposition", async (report) => {
      await screens.openList("/admin/contacts")
      await screens.search(prefix)
      report.check((await screens.rows().filter({ hasText: names.person }).count()) === 1, "liste des contacts : le lead y figure avant l'opposition")
      await screens.openList("/admin/actions-prospection")
      await screens.search(prefix)
      report.check(
        (await screens.rows().filter({ hasText: names.todo }).count()) === 1 && (await screens.rows().filter({ hasText: names.done }).count()) === 1,
        "journal : la relance à faire et l'échange fait sont visibles avant l'opposition",
      )
    }],
    ["opposition", async (report) => {
      await screens.openForm(`/admin/leads/${ids.person}`)
      await page.getByRole("button", { name: "Ne plus contacter" }).click()
      await page.getByRole("alertdialog").getByRole("button", { name: "Ne plus contacter" }).click()
      await page.waitForURL(`${BASE}/admin/leads`)
      const lead = await screens.detailText(`/admin/leads?detail=${ids.person}`)
      report.check(/ne plus contacter/i.test(lead) && !lead.includes(names.person), "lead opposé : affiché « ne plus contacter », nom effacé")
      await screens.openList("/admin/actions-prospection")
      await screens.search(prefix)
      report.check(
        (await screens.rows().filter({ hasText: names.todo }).count()) === 0 && (await screens.rows().filter({ hasText: names.done }).count()) === 1,
        "relance à faire disparue du journal, l'échange déjà eu reste",
      )
      await screens.goto("/admin/contacts")
      await page.locator("main h1:visible").first().waitFor()
      await page.waitForTimeout(1500)
      // Sans autre contact, la liste est vide et n'offre plus de champ de recherche
      if ((await page.locator("main input[type=search]:visible").count()) > 0) await screens.search(prefix)
      // Le nom est effacé par l'opposition : la ligne absente à l'écran ne prouve la sortie qu'avec le rôle retiré en base
      const role = one(`select count(*) from freelance."Contact" where "personId" = '${ids.person}'`)
      report.check(
        (await screens.rows().filter({ hasText: names.person }).count()) === 0 && role === "0",
        "le lead opposé est sorti de la liste des contacts, son rôle Contact est retiré",
        `rôle Contact en base : ${role}`,
      )
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
  ],
  async (report) => {
    // Une fiche d'opposition ne se supprime par l'écran qu'après les 3 ans de conservation : elle part en nettoyage SQL
    const people = [ids.person].filter(Boolean)
    const purged = purgeCrmLeftovers(prefix, { people })
    report.check(purged.left === 0, "aucune ligne du passage ne reste en base", `${purged.removed} retirée(s) en fin de passage`)
    const failure = await closeAdmin(session)
    report.check(failure === null, "déconnexion de la session admin", failure ?? "")
  },
)
