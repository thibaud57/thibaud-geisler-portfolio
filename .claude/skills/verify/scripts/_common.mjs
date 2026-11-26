// Primitives des scénarios `verify-all` : rapport, navigateur, session admin, base de dev.
// Aucun import de l'app : elle se pilote par ses écrans, ses routes et l'état de sa base.

import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright-core"

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
// L'origine est fixée par `BETTER_AUTH_URL` : sur un autre port, la déconnexion répond 403
export const BASE = "http://localhost:3000"
const POSTGRES = "thibaud-geisler-portfolio-postgres-1"

export class Report {
  failures = 0

  check(ok, label, detail = "") {
    if (!ok) this.failures += 1
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` : ${detail}` : ""}`)
    return ok
  }

  note(label) {
    console.log(`NOTE  ${label}`)
  }
}

// Préfixe des entités d'un passage, retirées en fin de scénario
export const runPrefix = () => `verify-${randomBytes(3).toString("hex")}`

// Joue les étapes dans l'ordre. Une exception est un FAIL nommé, le nettoyage passe toujours
export async function play(name, steps, cleanup) {
  const report = new Report()
  try {
    for (const [label, step] of steps) {
      try {
        await step(report)
      } catch (error) {
        // Première ligne de l'erreur, plus celle qui nomme l'élément attendu quand le navigateur la donne
        const lines = String(error).split("\n")
        const waited = lines.find((line) => line.includes("waiting for"))
        report.check(false, `${label} : étape interrompue`, [lines[0], waited?.trim()].filter(Boolean).join(" | "))
        break
      }
    }
  } finally {
    await cleanup?.(report)
  }
  console.log(`== ${name} : ${report.failures ? "FAIL" : "PASS"} (${report.failures} échec(s))`)
  process.exit(report.failures ? 1 : 0)
}

export async function openBrowser() {
  return chromium.launch({ channel: "chrome", headless: true })
}

// Erreurs de console émises par l'app elle-même, les domaines tiers en émettent toujours
export function consoleErrors(page) {
  const errors = []
  page.on("console", (message) => {
    const { url } = message.location()
    if (message.type() !== "error" || !url.startsWith(BASE)) return
    // Page affichée au moment de l'erreur et source qui l'émet : l'une dit où, l'autre quoi
    const text = message.text().replace(/\s+/g, " ").slice(0, 300)
    errors.push(`${page.url().replace(BASE, "")} : ${text} (${url.replace(BASE, "")})`)
  })
  return errors
}

// Session admin réelle par `just dev-login`, cookie lu du jar puis jar supprimé : il vaut une session
export async function adminContext(browser) {
  const dir = mkdtempSync(join(tmpdir(), "portfolio-verify-"))
  // Barres obliques : la recette passe le chemin à bash, qui mangerait les barres inverses de Windows
  const jar = join(dir, "admin.jar").replaceAll("\\", "/")
  const login = spawnSync("just", ["dev-login", jar], { cwd: ROOT, encoding: "utf8" })
  if (login.status !== 0) throw new Error(`just dev-login a échoué : ${login.stderr.trim().split("\n").at(-1)}`)
  const cookies = readFileSync(jar, "utf8")
    .split("\n")
    .map((line) => line.replace(/^#HttpOnly_/, ""))
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length >= 7)
    .map((parts) => ({ name: parts[5], value: parts[6].trim(), url: BASE }))
  rmSync(dir, { recursive: true, force: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addCookies(cookies)
  return context
}

// Lève quand la déconnexion est refusée : la session de `just dev-login` resterait ouverte en base
export async function signOut(context) {
  const response = await context.request.post(`${BASE}/api/auth/sign-out`, { headers: { Origin: BASE }, data: {} })
  await context.close()
  if (!response.ok()) throw new Error(`déconnexion refusée : ${response.status()}`)
}

// Navigateur vierge de visiteur, page ouverte, erreurs de console de l'app relevées au fil du passage
export async function openVisitor({ width = 1280, height = 900 } = {}) {
  const browser = await openBrowser()
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  return { browser, context, page, errors: consoleErrors(page) }
}

// Session admin réelle, page ouverte, erreurs de console relevées et gestes de l'admin. `timeout` : délai par défaut des attentes
export async function openAdmin({ timeout } = {}) {
  const browser = await openBrowser()
  const context = await adminContext(browser)
  if (timeout) context.setDefaultTimeout(timeout)
  const page = await context.newPage()
  return { browser, context, page, errors: consoleErrors(page), screens: adminScreens(page) }
}

// Ferme la session admin puis le navigateur, même quand la déconnexion échoue. Rend le message de l'échec, sinon null
export async function closeAdmin({ browser, context }) {
  try {
    await signOut(context)
    return null
  } catch (error) {
    return String(error).split("\n")[0]
  } finally {
    await browser.close()
  }
}

// Les deux premières erreurs de console, pour le détail d'un contrôle
export const sampleErrors = (errors) => errors.slice(0, 2).join(" | ")

// Le contenu de la page, hors écran de chargement (`role=status`) : le navigateur garde les pages déjà visitées dans le DOM
export const content = (target) => target.locator("main:not([role=status])")

export const overflows = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)

// Un jour décalé de `days` par rapport à maintenant (négatif : dans le passé)
export const dayFromNow = (days) => new Date(Date.now() + days * DAY_MS)

// SQL sur la base de dev, envoyé sur stdin : le shell développerait `$$` dans un argument
export function sql(statement) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", POSTGRES, "psql", "-U", "portfolio", "-d", "portfolio_dev", "-A", "-t", "-v", "ON_ERROR_STOP=1"],
    { input: statement, encoding: "utf8" },
  )
  if (result.status !== 0) throw new Error(`psql : ${result.stderr.trim()}`)
  return result.stdout.trim()
}

// Lecture d'une valeur unique : première ligne du résultat
export const one = (statement) => sql(statement).split("\n")[0]

// Ids des fiches créées par les écrans, relus par leur clé naturelle (vide si la fiche n'existe pas)
export const personId = (email) => one(`select id from freelance."Person" where email = '${email}'`)
export const companyId = (slug) => one(`select id from freelance."Company" where slug = '${slug}'`)
export const opportunityId = (title) => one(`select id from freelance."Opportunity" where title = '${title}'`)

export const isoDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export const frDate = (date) => date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })
export const DAY_MS = 86_400_000

// La semaine de revue se clôt le vendredi : celui d'aujourd'hui, ou le suivant
export const fridayOfWeek = (day) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate() + ((5 - day.getDay() + 7) % 7))

// Semaine ISO d'un vendredi, au format de la liste des revues (« S48 · 2026 »)
export function weekLabel(friday) {
  const thursday = new Date(Date.UTC(friday.getFullYear(), friday.getMonth(), friday.getDate() - 1))
  const week = Math.ceil(((thursday - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / DAY_MS + 1) / 7)
  return `S${String(week).padStart(2, "0")} · ${thursday.getUTCFullYear()}`
}

// Premier vendredi, cette semaine ou après, sans revue en base : une revue existante n'est jamais touchée
export function freeFriday() {
  const first = fridayOfWeek(new Date())
  const candidates = Array.from({ length: 8 }, (_, week) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7 * week))
  const friday = candidates.find((day) => one(`select count(*) from freelance."WeeklyReview" where "closingFriday" = '${isoDay(day)}'`) === "0")
  if (!friday) throw new Error("aucun vendredi libre dans les 8 prochaines semaines")
  return friday
}

const COUNTER_KEYS = [
  "connectionsSent",
  "connectionsAccepted",
  "messagesSent",
  "conversationsEngaged",
  "refusalsReceived",
  "meetingsBooked",
  "interviewsHeld",
  "activeLeads",
]

const quoted = (list) => list.map((id) => `'${id}'`).join(",")

// Lignes du CRM encore en base sous le préfixe d'un passage, par table. Une personne opposée n'a plus de nom :
// on la retrouve par e-mail ou par id relevé pendant le passage. La revue n'a pas de nom propre : ses notes portent le préfixe,
// et son id relevé la désigne aussi, au cas où le passage l'aurait modifiée
export function crmLeft(prefix, { people = [], reviews = [] } = {}) {
  const [company, persons, actions, opportunities, interviews, weeklyReviews] = sql(`
    select
      (select count(*) from freelance."Company" where slug like '${prefix}%'),
      (select count(*) from freelance."Person" where email like '${prefix}%' or name like '${prefix}%' ${people.length ? `or id in (${quoted(people)})` : ""}),
      (select count(*) from freelance."ProspectingAction" where title like '${prefix}%'),
      (select count(*) from freelance."Opportunity" where title like '${prefix}%'),
      (select count(*) from freelance."Interview" where "opportunityId" in (select id from freelance."Opportunity" where title like '${prefix}%')),
      (select count(*) from freelance."WeeklyReview" where notes like '${prefix}%' ${reviews.length ? `or id in (${quoted(reviews)})` : ""})
  `)
    .split("|")
    .map(Number)
  return { company, persons, actions, opportunities, interviews, weeklyReviews }
}

export const crmTotal = (counts) => Object.values(counts).reduce((sum, count) => sum + count, 0)

// Retire par SQL ce que le passage a laissé, dans l'ordre des clés étrangères (l'opportunité restreint la suppression de l'entreprise)
export function purgeCrm(prefix, { people = [], reviews = [] } = {}) {
  sql(`
    delete from freelance."Interview" where "opportunityId" in (select id from freelance."Opportunity" where title like '${prefix}%');
    delete from freelance."Opportunity" where title like '${prefix}%';
    delete from freelance."ProspectingAction" where title like '${prefix}%';
    delete from freelance."Person" where email like '${prefix}%' or name like '${prefix}%' ${people.length ? `or id in (${quoted(people)})` : ""};
    delete from freelance."Company" where slug like '${prefix}%';
    delete from freelance."WeeklyReview" where notes like '${prefix}%' ${reviews.length ? `or id in (${quoted(reviews)})` : ""};
  `)
}

// Filet de fin de passage : retire ce qui reste sous le préfixe et rend le nombre de lignes retirées puis celui qui subsiste
export function purgeCrmLeftovers(prefix, scope = {}) {
  const removed = crmTotal(crmLeft(prefix, scope))
  purgeCrm(prefix, scope)
  return { removed, left: crmTotal(crmLeft(prefix, scope)) }
}

// Gestes de l'espace admin partagés par les scénarios : la page est celle du scénario, rien n'est jugé ici
export function adminScreens(page) {
  const dialog = () => page.locator('[role="dialog"][data-state="open"]').last()
  const rows = () => page.locator("table:visible tbody tr")
  const toasts = () => page.locator("[data-sonner-toast]")
  const column = (status) => page.locator(`[data-slot=kanban-column][data-value="${status}"]`)
  const goto = (path) => page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 120_000 })

  // Une liste admin charge en différé : lignes présentes, puis hydratation avant le premier clic
  async function openList(path) {
    await goto(path)
    await rows().first().waitFor()
    await page.waitForTimeout(1500)
  }

  async function openForm(path) {
    await goto(path)
    // L'éditeur de Détails rend aussi des h1 : le titre de page est le premier
    await page.locator("main h1:visible").first().waitFor()
    await page.waitForTimeout(1500)
  }

  async function search(text) {
    await page.locator("main input[type=search]:visible").fill(text)
    await page.waitForTimeout(600)
  }

  // Liste d'options d'un Select ou d'un combobox de recherche, ouverte dans un portail
  async function choose(scope, label, option, query) {
    await scope.getByRole("combobox", { name: label, exact: true }).click()
    if (query) await page.getByPlaceholder(/^Chercher/).last().fill(query)
    await page.getByRole("option", { name: option }).first().click()
  }

  const save = (scope) => scope.getByRole("button", { name: "Enregistrer" }).click()

  // Texte d'une vue détail ouverte par `?detail=<id>`
  async function detailText(path) {
    await goto(path)
    await dialog().waitFor()
    return (await dialog().innerText()).replace(/\s+/g, " ")
  }

  async function deleteRow(path, text) {
    await openList(path)
    await search(text)
    await rows().filter({ hasText: text }).getByRole("button", { name: /^Supprimer/ }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer", exact: true }).click()
    await toasts().filter({ hasText: /supprimée?$/ }).first().waitFor()
  }

  // Un jour d'un champ date : le popover se referme entre deux actions espacées, on l'ouvre et on clique à la suite
  async function pickDay(trigger, date) {
    const label = frDate(date)
    await trigger.click()
    // Calendrier rendu avant de chercher le jour : compté trop tôt, le jour passe pour absent du mois
    await page.locator("button[data-day]").first().waitFor()
    const day = page.locator(`button[data-day="${label}"]`)
    // Un jour de fin de mois ou un vendredi à venir est sur une page suivante du calendrier
    for (let attempt = 0; attempt < 3 && (await day.count()) === 0; attempt += 1) {
      await page.locator('button[name="next-month"]:visible').click()
      await page.locator("button[data-day]").first().waitFor()
    }
    // Jour introuvable : dire ce que le calendrier affiche, un clic en attente ne dirait rien de la cause
    if ((await day.count()) === 0) {
      const shown = await page.locator("button[data-day]").evaluateAll((days) => days.map((item) => item.dataset.day))
      throw new Error(`jour ${label} absent du calendrier, affiché du ${shown.at(0)} au ${shown.at(-1)} (${shown.length} jours)`)
    }
    await day.click()
  }

  async function eventually(condition, timeout = 15_000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (condition()) return true
      await page.waitForTimeout(500)
    }
    return false
  }

  async function openPipeline() {
    await goto("/admin/actions-prospection/pipeline")
    await page.locator("main h1:visible").waitFor()
    await page.waitForTimeout(1500)
  }

  // Glisser d'une carte vers une colonne : le pointeur passe par la poignée de la carte
  async function dragCard(title, status) {
    const handle = page.locator("[data-slot=kanban-item]", { hasText: title }).locator("[data-slot=kanban-item-handle]")
    const from = await handle.boundingBox()
    const to = await column(status).boundingBox()
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10)
    await page.mouse.move(to.x + to.width / 2, to.y + 100, { steps: 15 })
    await page.mouse.up()
    await column(status).getByText(title).waitFor()
  }

  // Cellule d'un jour du calendrier des actions, nommée par son aria-label
  const calendarCell = (date) =>
    page.locator(
      `[data-slot="event-calendar-month-cell"][aria-label="${date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" })}"]`,
    )

  // Les pastilles flottent au-dessus des cellules : une action est à son jour quand son centre tombe dans la cellule
  async function isEventOnDay(title, date) {
    const event = await page.getByRole("button", { name: new RegExp(title) }).boundingBox()
    const cell = await calendarCell(date).boundingBox()
    const x = event.x + event.width / 2
    const y = event.y + event.height / 2
    return x >= cell.x && x <= cell.x + cell.width && y >= cell.y && y <= cell.y + cell.height
  }

  async function createCompany({ name, slug }) {
    await openForm("/admin/entreprises/nouvelle")
    await page.getByRole("textbox", { name: "Nom", exact: true }).fill(name)
    await page.getByRole("textbox", { name: "Slug", exact: true }).fill(slug)
    await page.getByRole("checkbox", { name: "Client final" }).check()
    await save(page)
    await page.waitForURL(`${BASE}/admin/entreprises`)
  }

  async function createLead({ name, email, company }) {
    await openForm("/admin/leads/nouveau")
    await page.getByRole("textbox", { name: "Nom", exact: true }).fill(name)
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(email)
    if (company) await choose(page, "Entreprise", company, company)
    await choose(page, "Origine", "Outbound")
    await save(page)
    await page.waitForURL(`${BASE}/admin/leads`)
  }

  // Une action à faire, créée par la fenêtre du pipeline
  async function createAction({ title, person, message }) {
    await openPipeline()
    await page.getByRole("button", { name: "Nouvelle action" }).first().click()
    const form = dialog()
    await form.getByRole("textbox", { name: "Action", exact: true }).fill(title)
    await choose(form, "Personne", person, person)
    if (message) await form.getByRole("textbox", { name: "Message", exact: true }).fill(message)
    await save(form)
    await toasts().filter({ hasText: "Action créée" }).first().waitFor()
  }

  // Glisse l'action dans Fait puis attend l'enregistrement, qu'un rechargement trop tôt interromprait. Rend vrai quand elle est enregistrée
  async function moveActionToDone(title) {
    await openPipeline()
    await dragCard(title, "FAIT")
    const saved = await eventually(() => one(`select status from freelance."ProspectingAction" where title = '${title}'`) === "FAIT")
    await openPipeline()
    return saved
  }

  // Depuis le pipeline, déjà ouvert sur l'action dans la colonne Fait
  async function replyToAction(title, reply) {
    await column("FAIT").getByText(title).click()
    await dialog().getByRole("button", { name: "Modifier" }).click()
    const form = dialog()
    await choose(form, "Statut", "Répondu")
    await form.getByRole("textbox", { name: "Réponse", exact: true }).fill(reply)
    await save(form)
    await toasts().filter({ hasText: "Action mise à jour" }).first().waitFor()
  }

  async function createOpportunity({ title, company }) {
    await openForm("/admin/opportunites/nouvelle")
    await page.getByRole("textbox", { name: "Intitulé", exact: true }).fill(title)
    await choose(page, "Client final", company, company)
    await save(page)
    await page.waitForURL(`${BASE}/admin/opportunites`)
  }

  async function scheduleInterview({ opportunity, person, date }) {
    await openForm("/admin/entretiens/nouveau")
    await choose(page, "Opportunité", opportunity, opportunity)
    await pickDay(page.locator('button[id$="-scheduledAt"]'), date)
    await page.getByRole("combobox", { name: "Correspondants", exact: true }).click()
    await page.getByPlaceholder(/^Chercher/).last().fill(person)
    await page.getByRole("option", { name: new RegExp(person) }).first().click()
    await page.keyboard.press("Escape")
    await save(page)
    await page.waitForURL((url) => !url.pathname.endsWith("/nouveau"))
  }

  // Compteurs du formulaire de revue pour la semaine en cours, sans rien enregistrer
  async function weekCounters() {
    await openForm("/admin/revues-hebdo")
    await page.getByRole("button", { name: "Clôturer la semaine" }).first().click()
    const form = dialog()
    await pickDay(form.locator('button[id$="-closingFriday"]'), fridayOfWeek(new Date()))
    await form.getByRole("button", { name: "Calculer depuis le CRM" }).click()
    await toasts().filter({ hasText: "Compteurs calculés" }).first().waitFor()
    const values = {}
    for (const key of COUNTER_KEYS) values[key] = Number(await form.locator(`input[name="${key}"]`).inputValue())
    await form.getByRole("button", { name: "Annuler" }).click()
    return values
  }

  return {
    dialog, rows, toasts, column, goto, openList, openForm, search, choose, save, detailText, deleteRow, pickDay, eventually,
    openPipeline, dragCard, calendarCell, isEventOnDay, createCompany, createLead, createAction, moveActionToDone, replyToAction,
    createOpportunity, scheduleInterview, weekCounters,
  }
}

const INITIALIZE = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "verify", version: "1.0.0" } },
}

// Statut HTTP d'un `initialize`, avec ou sans clé : le client MCP lève une exception au refus, sans le statut
export async function initializeStatus(domain, key) {
  const response = await fetch(`${BASE}/api/mcp/${domain}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(INITIALIZE),
  })
  await response.body?.cancel()
  return response.status
}

// Client MCP d'un agent : le client officiel, sur le serveur lancé, avec la clé de l'agent
export async function connectMcp(domain, key) {
  const { Client, StreamableHTTPClientTransport } = await import("@modelcontextprotocol/client")
  const client = new Client({ name: "verify", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${BASE}/api/mcp/${domain}`), {
      requestInit: { headers: { Authorization: `Bearer ${key}` } },
    }),
  )
  return client
}

// Appel d'un outil : le JSON rendu, ou une exception si l'outil refuse
export async function callTool(client, name, args) {
  const result = await client.callTool({ name, arguments: args })
  const [block] = result.content
  const text = block?.type === "text" ? block.text : ""
  if (result.isError) throw new Error(`${name} refusé : ${text}`)
  return JSON.parse(text)
}

// Écran des clés d'API : la valeur d'une clé n'apparaît qu'à sa création, elle reste en mémoire du script
export function apiKeyScreens(page) {
  const keyRow = (name) => page.locator("table:visible tbody tr").filter({ hasText: name })

  // Crée une clé par la modale : le CRM est coché d'office, `extraDomain` s'y ajoute. Rend la valeur lue
  async function createKey(name, extraDomain) {
    await page.goto(`${BASE}/admin/cles-api`, { waitUntil: "load" })
    await page.waitForTimeout(1500)
    await page.getByRole("button", { name: "Nouvelle clé" }).click()
    const dialog = page.locator('[role="dialog"][data-state="open"]')
    await dialog.locator('input[name="name"]').fill(name)
    if (extraDomain) {
      await dialog.locator('button[id$="-domains"]').click()
      await page.locator("[cmdk-item]").filter({ hasText: extraDomain }).click()
      // Un clic sur le titre referme la liste sans fermer la modale, ce que ferait Échap
      await dialog.getByRole("heading").first().click()
    }
    await dialog.getByRole("button", { name: "Créer la clé" }).click()
    const field = dialog.locator("input[readonly]")
    await field.waitFor()
    const value = await field.inputValue()
    await dialog.getByRole("button", { name: /Terminé|Fermer|J'ai copié/ }).last().click()
    await dialog.waitFor({ state: "hidden" })
    await page.waitForTimeout(800)
    return value
  }

  async function deleteKey(name) {
    await page.goto(`${BASE}/admin/cles-api`, { waitUntil: "load" })
    await page.waitForTimeout(1500)
    await keyRow(name).getByRole("button", { name: /Supprimer/ }).click()
    await page.locator("[role=alertdialog]").getByRole("button", { name: "Supprimer" }).click()
    await keyRow(name).waitFor({ state: "detached" })
  }

  return { keyRow, createKey, deleteKey }
}

// Les listes de l'admin se filtrent par le champ de recherche, la page précédente reste cachée dans le DOM
export async function searchRows(page, path, term) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" })
  await page.waitForTimeout(1500)
  await page.locator("input[type=search], input[placeholder^=Rechercher]:visible").first().fill(term)
  await page.waitForTimeout(600)
  return page.locator("table:visible tbody tr").filter({ hasText: term })
}
