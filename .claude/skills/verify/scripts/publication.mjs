// Parcours du propriétaire de l'espace admin au site public : un tag, une entreprise et un projet client
// créés par les écrans, brouillon invisible, publication, renommage du tag, suppression refusée tant
// que le tag est utilisé, dépublication, puis suppression. Seules les entités du passage sont créées
// et supprimées, mais l'app renumérote les listes de projets et de tags à chaque écriture.

import { BASE, closeAdmin, content, openAdmin, play, runPrefix, sampleErrors, sql } from "./_common.mjs"

// Texte propre à la page 404 du site (message `NotFound.description`)
const NOT_FOUND = "n'existe pas ou a été déplacée"
const prefix = runPrefix()
const names = {
  tagSlug: `${prefix}-tag`,
  tagFr: `${prefix} Tag`,
  tagEn: `${prefix} Tag EN`,
  tagRenamedFr: `${prefix} Étiquette`,
  tagRenamedEn: `${prefix} Label`,
  companySlug: `${prefix}-acme`,
  company: `${prefix} Acme`,
  projectSlug: `${prefix}-projet`,
  projectFr: `${prefix} Projet Acme`,
  projectEn: `${prefix} Acme Project`,
}

const session = await openAdmin()
const { browser, page, errors: adminErrors } = session
// Le visiteur est un contexte vierge, sans session : il voit ce que voit le public
const visitorContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const visitor = await visitorContext.newPage()
page.setDefaultTimeout(30_000)
visitor.setDefaultTimeout(30_000)

const { dialog } = session.screens
const alert = () => page.locator('[role="alertdialog"][data-state="open"]').last()
const toast = (text) => page.locator("[data-sonner-toast]", { hasText: text }).first()

// Liste admin : titre attendu, hydratation, puis filtre sur le préfixe du passage
async function openAdminList(path, title) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" })
  await page.getByRole("heading", { level: 1, name: title }).waitFor()
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder^="Rechercher un"]:visible').fill(prefix)
}

const rowOf = (text) => page.locator("table:visible tbody tr", { hasText: text })

async function openAdminForm(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" })
  await page.locator("form:visible").first().waitFor()
  await page.waitForTimeout(1500)
}

// Page publique du visiteur : renvoie le texte rendu une fois le titre affiché
async function visit(path) {
  await visitor.goto(`${BASE}${path}`, { waitUntil: "load" })
  await content(visitor).locator("h1").first().waitFor()
  await visitor.waitForTimeout(500)
  return content(visitor).innerText()
}

const publicLinkCount = () => content(visitor).locator(`a[href$="/projets/${names.projectSlug}"]`).count()

async function listedOnPublic(locale) {
  await visit(`/${locale}/projets`)
  await content(visitor).locator("article").first().waitFor()
  return publicLinkCount()
}

async function setProjectStatus(label) {
  await openAdminList("/admin/projets", "Projets")
  await page.getByRole("link", { name: `Modifier ${names.projectFr}` }).click()
  await page.getByRole("heading", { level: 1, name: names.projectFr }).waitFor()
  await page.waitForTimeout(1500)
  await page.getByRole("combobox", { name: "Statut", exact: true }).click()
  await page.getByRole("option", { name: label, exact: true }).click()
  await page.getByRole("button", { name: "Enregistrer" }).first().click()
  await toast("Projet mis à jour").waitFor()
}

async function confirmDelete(name) {
  await rowOf(name).getByRole("button", { name: `Supprimer ${name}` }).click()
  await alert().waitFor()
  await alert().getByRole("button", { name: "Supprimer", exact: true }).click()
}

const remaining = () => {
  const [projects, companies, tags] = sql(
    `select (select count(*) from public."Project" where slug like '${prefix}-%') || '|' ||
            (select count(*) from freelance."Company" where slug like '${prefix}-%') || '|' ||
            (select count(*) from public."Tag" where slug like '${prefix}-%')`,
  )
    .split("|")
    .map(Number)
  return { projects, companies, tags }
}

await play(
  "publication",
  [
    ["tag", async (report) => {
      await openAdminList("/admin/tags", "Tags")
      await page.getByRole("button", { name: "Nouveau tag" }).click()
      await dialog().waitFor()
      await dialog().getByLabel("Nom (français)").fill(names.tagFr)
      await dialog().getByLabel("Nom (anglais)").fill(names.tagEn)
      await dialog().getByLabel("Slug").fill(names.tagSlug)
      // Le choix de la catégorie propose le rang suivant : il est laissé tel quel
      await dialog().getByRole("combobox", { name: "Catégorie" }).click()
      await page.getByRole("option", { name: "Infra", exact: true }).click()
      await dialog().getByRole("button", { name: "Enregistrer" }).click()
      await toast("Tag créé").waitFor()
      await openAdminList("/admin/tags", "Tags")
      report.check((await rowOf(names.tagFr).count()) === 1, "tag créé, présent dans la liste des tags", names.tagSlug)
    }],
    ["entreprise", async (report) => {
      await openAdminForm("/admin/entreprises/nouvelle")
      const form = page.locator("form:visible").first()
      await form.getByLabel("Nom", { exact: true }).fill(names.company)
      await form.getByLabel("Slug", { exact: true }).fill(names.companySlug)
      await form.getByRole("checkbox", { name: "Client final" }).click()
      await form.getByRole("button", { name: "Enregistrer" }).first().click()
      await toast("Entreprise créée").waitFor()
      await openAdminList("/admin/entreprises", "Entreprises")
      report.check((await rowOf(names.company).count()) === 1, "entreprise créée, présente dans la liste", names.companySlug)
    }],
    ["projet en brouillon", async (report) => {
      await openAdminForm("/admin/projets/nouveau")
      const form = page.locator("form:visible").first()
      await form.getByLabel("Titre (français)").fill(names.projectFr)
      await form.getByLabel("Titre (anglais)").fill(names.projectEn)
      await form.getByLabel("Slug", { exact: true }).fill(names.projectSlug)
      await form.getByRole("checkbox", { name: "API" }).click()
      await form.getByRole("textbox", { name: "Description (français)" }).fill("Projet fictif de vérification, sans client réel.")
      await form.getByRole("tab", { name: /Anglais/ }).first().click()
      await form.getByRole("textbox", { name: "Description (anglais)" }).fill("Fictional verification project, no real client.")
      await form.getByRole("combobox", { name: "Ajouter un tag" }).click()
      await page.getByPlaceholder("Rechercher un tag…").fill(names.tagFr)
      await page.getByRole("option", { name: names.tagFr, exact: true }).waitFor()
      await page.keyboard.press("Enter")
      await form.getByRole("button", { name: `Retirer ${names.tagFr}` }).waitFor()
      await form.getByRole("combobox", { name: "Entreprise" }).click()
      await page.getByPlaceholder("Chercher une entreprise").fill(names.company)
      // Entrée plutôt qu'un clic : la liste se re-rend et détache l'option visée
      await page.getByRole("option", { name: names.company, exact: true }).waitFor()
      await page.keyboard.press("Enter")
      await form.getByRole("combobox", { name: "Entreprise" }).filter({ hasText: names.company }).waitFor()
      await form.getByRole("button", { name: "Enregistrer" }).first().click()
      await toast("Projet créé").waitFor()
      await openAdminList("/admin/projets", "Projets")
      const row = rowOf(names.projectFr)
      report.check(
        (await row.count()) === 1 && (await row.innerText()).includes("Brouillon"),
        "projet client créé en brouillon, avec son tag et son entreprise",
        names.projectSlug,
      )
    }],
    ["brouillon invisible", async (report) => {
      const links = await listedOnPublic("fr")
      const listText = await content(visitor).innerText()
      report.check(links === 0 && !listText.includes(names.projectFr), "brouillon absent de /fr/projets")
      const text = await visit(`/fr/projets/${names.projectSlug}`)
      report.check(
        text.includes(NOT_FOUND) && !text.includes(names.projectFr),
        "page du brouillon rendue introuvable",
        text.replace(/\s+/g, " ").slice(0, 40),
      )
    }],
    ["publication", async (report) => {
      await setProjectStatus("Publié")
      const [fr, en] = [await listedOnPublic("fr"), await listedOnPublic("en")]
      report.check(fr === 1 && en === 1, "projet publié, listé sur /fr/projets et /en/projets", `${fr} et ${en} lien`)
      const text = await visit(`/fr/projets/${names.projectSlug}`)
      const title = await content(visitor).locator("h1").first().innerText()
      report.check(
        title === names.projectFr && text.includes(names.company) && text.includes(names.tagFr),
        "page du projet ouverte, avec son entreprise et son tag",
        title,
      )
      const sitemap = await (await visitorContext.request.get(`${BASE}/sitemap.xml`)).text()
      const llms = await (await visitorContext.request.get(`${BASE}/llms.txt`)).text()
      report.check(
        sitemap.includes(`/fr/projets/${names.projectSlug}`) && sitemap.includes(`/en/projets/${names.projectSlug}`),
        "sitemap.xml liste le projet dans les deux langues",
      )
      report.check(llms.includes(names.projectSlug), "llms.txt liste le projet")
    }],
    ["renommage du tag", async (report) => {
      await openAdminList("/admin/tags", "Tags")
      await rowOf(names.tagFr).getByRole("button", { name: `Modifier ${names.tagFr}` }).click()
      await dialog().waitFor()
      await dialog().getByLabel("Nom (français)").fill(names.tagRenamedFr)
      await dialog().getByLabel("Nom (anglais)").fill(names.tagRenamedEn)
      await dialog().getByRole("button", { name: "Enregistrer" }).click()
      await toast("Tag mis à jour").waitFor()
      const fr = await visit(`/fr/projets/${names.projectSlug}`)
      report.check(
        fr.includes(names.tagRenamedFr) && !fr.includes(names.tagFr),
        "nouveau nom du tag sur la page publique française",
        names.tagRenamedFr,
      )
      const en = await visit(`/en/projets/${names.projectSlug}`)
      report.check(en.includes(names.tagRenamedEn), "nouveau nom du tag sur la page publique anglaise", names.tagRenamedEn)
    }],
    ["suppression du tag refusée", async (report) => {
      await openAdminList("/admin/tags", "Tags")
      await rowOf(names.tagRenamedFr).getByRole("button", { name: `Supprimer ${names.tagRenamedFr}` }).click()
      await alert().waitFor()
      const confirm = alert().getByRole("button", { name: "Supprimer", exact: true })
      // Le refus est connu au rendu (bouton inactif) ou arrive du serveur après le clic
      if (await confirm.isEnabled()) await confirm.click()
      const denial = alert().getByText(/ne peut pas être supprimé/)
      await denial.waitFor()
      report.check(await denial.isVisible(), "refus affiché pour le tag encore utilisé", (await denial.innerText()).trim())
      await alert().getByRole("button", { name: "Annuler" }).click()
      await openAdminList("/admin/tags", "Tags")
      report.check((await rowOf(names.tagRenamedFr).count()) === 1, "le tag reste dans la liste après le refus")
    }],
    ["dépublication", async (report) => {
      await setProjectStatus("Brouillon")
      const links = await listedOnPublic("fr")
      const text = await visit(`/fr/projets/${names.projectSlug}`)
      report.check(
        links === 0 && text.includes(NOT_FOUND) && !text.includes(names.projectFr),
        "projet dépublié : absent de la liste, page introuvable",
      )
    }],
    ["suppressions", async (report) => {
      await openAdminList("/admin/projets", "Projets")
      await confirmDelete(names.projectFr)
      await toast("Projet supprimé").waitFor()
      await openAdminList("/admin/entreprises", "Entreprises")
      await confirmDelete(names.company)
      await toast("Entreprise supprimée").waitFor()
      await openAdminList("/admin/tags", "Tags")
      await confirmDelete(names.tagRenamedFr)
      await toast("Tag supprimé").waitFor()
      const left = remaining()
      report.check(
        left.projects + left.companies + left.tags === 0,
        `aucune ligne ne reste sous le préfixe ${prefix}`,
        `projets ${left.projects}, entreprises ${left.companies}, tags ${left.tags}`,
      )
    }],
    ["console", async (report) => {
      report.check(adminErrors.length === 0, "aucune erreur de console émise par l'espace admin", sampleErrors(adminErrors))
    }],
  ],
  async (report) => {
    // Filet : une étape interrompue laisse des lignes, retirées par le préfixe dans l'ordre des contraintes
    const left = remaining()
    if (left.projects + left.companies + left.tags > 0) {
      sql(`delete from public."Project" where slug like '${prefix}-%'`)
      sql(`delete from freelance."Company" where slug like '${prefix}-%'`)
      sql(`delete from public."Tag" where slug like '${prefix}-%'`)
      report.note(`nettoyage par SQL sous ${prefix} : projets ${left.projects}, entreprises ${left.companies}, tags ${left.tags}`)
    }
    const failure = await closeAdmin(session)
    report.check(failure === null, "déconnexion de la session admin", failure ?? "")
  },
)
