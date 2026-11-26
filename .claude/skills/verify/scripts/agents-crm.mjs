// Parcours d'un agent sur le serveur MCP du CRM : refus sans clé, clé limitée au CRM créée par l'écran, entreprise et
// lead créés et retrouvés par les outils, vus dans l'admin, refus sur le domaine portfolio, suppression de la clé.
// La valeur de la clé reste en mémoire du script.

import {
  apiKeyScreens, callTool, connectMcp, initializeStatus, play, runPrefix, searchRows, sql, openAdmin, closeAdmin, sampleErrors,
} from "./_common.mjs"

const session = await openAdmin()
const { page, errors } = session
const { keyRow, createKey, deleteKey } = apiKeyScreens(page)

const prefix = runPrefix()
const names = {
  // Sans le nom d'un domaine : la ligne de la clé ne doit citer « CRM » que par ses domaines
  key: `${prefix} agent`,
  companySlug: `${prefix}-acme`,
  companyName: `${prefix} Acme`,
  person: `${prefix} Verify Exemple`,
}
const state = { key: "", client: null, companyId: "", leadId: "" }

await play(
  "agents-crm",
  [
    ["sans clé", async (report) => {
      const status = await initializeStatus("crm", "")
      report.check(status === 401, "initialize sur /api/mcp/crm sans clé refusé", String(status))
    }],
    ["clé du CRM", async (report) => {
      state.key = await createKey(names.key)
      report.check(state.key.startsWith("tgp_"), "la modale affiche une clé préfixée tgp_, une seule fois")
      const row = keyRow(names.key)
      const text = (await row.count()) === 1 ? await row.innerText() : ""
      report.check(
        /crm/i.test(text) && !/portfolio/i.test(text) && !(await page.locator("body").innerText()).includes(state.key),
        "la liste montre la clé limitée au CRM, sans sa valeur",
      )
    }],
    ["outils crm", async (report) => {
      state.client = await connectMcp("crm", state.key)
      const { tools } = await state.client.listTools()
      const toolNames = tools.map((tool) => tool.name)
      report.check(
        ["crm_search", "crm_fetch", "crm_query", "crm_create", "crm_update"].every((name) => toolNames.includes(name)),
        "le domaine crm liste ses outils de lecture et d'écriture",
        `${toolNames.length} outils`,
      )
    }],
    ["création par les outils crm", async (report) => {
      const company = await callTool(state.client, "crm_create", {
        entity: "company",
        data: { slug: names.companySlug, name: names.companyName, types: ["CLIENT_FINAL"] },
      })
      state.companyId = company.id
      const lead = await callTool(state.client, "crm_create", {
        entity: "lead",
        data: { name: names.person, origin: "OUTBOUND", email: `${prefix}@example.com`, companyId: state.companyId },
      })
      state.leadId = lead.id
      report.check(Boolean(state.companyId && state.leadId), "crm_create crée l'entreprise puis le lead", company.slug)

      const found = await callTool(state.client, "crm_search", { query: prefix, entities: ["company", "lead"], limit: 50 })
      const hits = found.results.map((hit) => `${hit.entity}:${hit.id}`)
      report.check(
        hits.includes(`company:${state.companyId}`) && hits.includes(`lead:${state.leadId}`),
        "crm_search retrouve l'entreprise et le lead par le préfixe du passage",
        `${found.results.length} résultats`,
      )

      const fetched = await callTool(state.client, "crm_fetch", { entity: "lead", id: state.leadId })
      report.check(fetched.name === names.person, "crm_fetch relit le lead créé", fetched.name)
    }],
    ["fiches dans l'admin", async (report) => {
      const companies = await searchRows(page, "/admin/entreprises", names.companySlug)
      report.check((await companies.count()) === 1, "l'entreprise créée par l'outil figure dans /admin/entreprises", names.companyName)
      const leads = await searchRows(page, "/admin/leads", names.person)
      report.check((await leads.count()) === 1, "le lead créé par l'outil figure dans /admin/leads", names.person)
    }],
    ["clé du CRM sur portfolio", async (report) => {
      const status = await initializeStatus("portfolio", state.key)
      report.check(status === 403, "la clé limitée au CRM est refusée sur /api/mcp/portfolio", String(status))
    }],
    ["suppression de la clé", async (report) => {
      await state.client.close()
      await deleteKey(names.key)
      report.check((await keyRow(names.key).count()) === 0, "la clé disparaît de la liste après confirmation")
      const status = await initializeStatus("crm", state.key)
      report.check(status === 401, "la clé supprimée est refusée sur /api/mcp/crm", String(status))
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
  ],
  async (report) => {
    // Avant la déconnexion : une panne du serveur ne doit pas empêcher de retirer les données.
    // Ordre des clés étrangères : lead, personne, entreprise, clé
    const likePerson = `'${prefix} %'`
    const likeSlug = `'${prefix}-%'`
    try {
      sql(`
        DELETE FROM freelance."Lead" WHERE "personId" IN (SELECT id FROM freelance."Person" WHERE name LIKE ${likePerson});
        DELETE FROM freelance."Person" WHERE name LIKE ${likePerson};
        DELETE FROM freelance."Company" WHERE slug LIKE ${likeSlug};
        DELETE FROM auth.apikey WHERE name LIKE ${likePerson};
      `)
      const left = sql(`
        SELECT (SELECT count(*) FROM freelance."Person" WHERE name LIKE ${likePerson})
          || ' ' || (SELECT count(*) FROM freelance."Company" WHERE slug LIKE ${likeSlug})
          || ' ' || (SELECT count(*) FROM auth.apikey WHERE name LIKE ${likePerson});
      `)
      report.check(left === "0 0 0", "nettoyage : aucune personne, entreprise ni clé restante", left)
    } finally {
      const failure = await closeAdmin(session)
      report.check(failure === null, "déconnexion de la session admin", failure ?? "")
    }
  },
)
