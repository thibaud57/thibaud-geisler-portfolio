// Parcours d'un agent sur le serveur MCP du portfolio : clé CRM et portfolio créée par l'écran, lecture d'un projet
// existant, tag et projet brouillon créés (le client est une entreprise créée par l'outil crm), modifiés, retrouvés
// et vus dans l'admin, brouillon absent du site, suppression de la clé. La valeur de la clé reste en mémoire du script.
// L'app renumérote les listes de projets et de tags à chaque écriture : l'ordre des fiches existantes est comparé avant et après.

import {
  apiKeyScreens, BASE, callTool, connectMcp, initializeStatus, play, runPrefix, searchRows, sql, openAdmin, closeAdmin, sampleErrors,
} from "./_common.mjs"

const session = await openAdmin()
const { page, errors } = session
const { keyRow, createKey, deleteKey } = apiKeyScreens(page)

const prefix = runPrefix()
const names = {
  key: `${prefix} duo`,
  companySlug: `${prefix}-acme`,
  companyName: `${prefix} Acme`,
  tagSlug: `${prefix}-tag`,
  projectSlug: `${prefix}-projet`,
  projectTitle: `${prefix} Projet`,
}
const state = { key: "", client: null, companyId: "", tagId: "", projectId: "" }

// Ordre d'affichage des projets et des tags qui ne sont pas ceux du passage : une création ne doit rien renuméroter
const existingOrders = () =>
  sql(`
    SELECT (SELECT coalesce(string_agg(id || ':' || "displayOrder", ',' ORDER BY id), '') FROM public."Project" WHERE slug NOT LIKE '${prefix}-%')
      || '|' || (SELECT coalesce(string_agg(id || ':' || "displayOrder", ',' ORDER BY id), '') FROM public."Tag" WHERE slug NOT LIKE '${prefix}-%');
  `)
const ordersBefore = existingOrders()

await play(
  "agents-portfolio",
  [
    ["sans clé", async (report) => {
      const status = await initializeStatus("portfolio", "")
      report.check(status === 401, "initialize sur /api/mcp/portfolio sans clé refusé", String(status))
    }],
    ["clé CRM et portfolio", async (report) => {
      state.key = await createKey(names.key, "Portfolio")
      const row = keyRow(names.key)
      const text = (await row.count()) === 1 ? await row.innerText() : ""
      report.check(
        state.key.startsWith("tgp_") && /crm/i.test(text) && /portfolio/i.test(text),
        "la clé créée par l'écran porte les domaines CRM et Portfolio, sa valeur n'est montrée qu'une fois",
      )
      state.client = await connectMcp("portfolio", state.key)
    }],
    ["outils portfolio", async (report) => {
      const { tools } = await state.client.listTools()
      const toolNames = tools.map((tool) => tool.name)
      report.check(
        ["portfolio_search", "portfolio_fetch", "portfolio_query", "portfolio_create", "portfolio_update"].every((name) =>
          toolNames.includes(name),
        ),
        "le domaine portfolio liste ses outils de lecture et d'écriture",
        `${toolNames.length} outils`,
      )
    }],
    ["lecture d'un projet existant", async (report) => {
      const page1 = await callTool(state.client, "portfolio_query", { entity: "project", limit: 1 })
      const [row] = page1.rows
      const project = await callTool(state.client, "portfolio_fetch", { entity: "project", id: row.id })
      report.check(
        page1.total > 0 && project.id === row.id && project.slug === row.slug && Array.isArray(project.tags),
        "portfolio_query puis portfolio_fetch lisent un projet existant, sans l'écrire",
        `${page1.total} projets`,
      )
    }],
    ["tag et projet créés par les outils", async (report) => {
      const tag = await callTool(state.client, "portfolio_create", {
        entity: "tag",
        data: { slug: names.tagSlug, nameFr: `${prefix} Tag`, nameEn: `${prefix} Tag`, kind: "EXPERTISE" },
      })
      state.tagId = tag.id
      // Le client du projet : une entreprise créée par le domaine crm, avec la même clé
      const crm = await connectMcp("crm", state.key)
      const company = await callTool(crm, "crm_create", {
        entity: "company",
        data: { slug: names.companySlug, name: names.companyName, types: ["CLIENT_FINAL"] },
      })
      await crm.close()
      state.companyId = company.id
      const project = await callTool(state.client, "portfolio_create", {
        entity: "project",
        data: {
          slug: names.projectSlug,
          titleFr: names.projectTitle,
          titleEn: names.projectTitle,
          descriptionFr: "Projet fictif de vérification.",
          descriptionEn: "Fictional verification project.",
          type: "CLIENT",
          formats: ["CLI"],
          companyId: state.companyId,
          workMode: "REMOTE",
          tagIds: [state.tagId],
        },
      })
      state.projectId = project.id
      report.check(
        Boolean(state.companyId && state.tagId && state.projectId),
        "portfolio_create crée un tag puis un projet lié à une entreprise créée par crm_create",
        project.slug,
      )

      const found = await callTool(state.client, "portfolio_search", { query: prefix, limit: 50 })
      const hits = found.results.map((hit) => `${hit.entity}:${hit.id}`)
      report.check(
        hits.includes(`tag:${state.tagId}`) && hits.includes(`project:${state.projectId}`),
        "portfolio_search retrouve le tag et le projet par le préfixe du passage",
        `${found.results.length} résultats`,
      )

      const fetched = await callTool(state.client, "portfolio_fetch", { entity: "project", id: state.projectId })
      report.check(
        fetched.status === "DRAFT" && fetched.tags.map((entry) => entry.id).join() === state.tagId,
        "portfolio_fetch relit le projet en brouillon avec son tag",
        fetched.status,
      )
      report.check(existingOrders() === ordersBefore, "l'ordre d'affichage des projets et tags existants est inchangé")
    }],
    ["modification par l'outil", async (report) => {
      const title = `${names.projectTitle} modifié`
      await callTool(state.client, "portfolio_update", { entity: "project", id: state.projectId, fields: { titleFr: title } })
      const fetched = await callTool(state.client, "portfolio_fetch", { entity: "project", id: state.projectId })
      report.check(
        fetched.titleFr === title && fetched.titleEn === names.projectTitle && fetched.status === "DRAFT",
        "portfolio_update change le titre français seul, le projet reste en brouillon",
      )
    }],
    ["fiches dans l'admin et sur le site", async (report) => {
      const projects = await searchRows(page, "/admin/projets", names.projectSlug)
      report.check((await projects.count()) === 1, "le projet créé par l'outil figure dans /admin/projets", names.projectSlug)
      const tags = await searchRows(page, "/admin/tags", names.tagSlug)
      report.check((await tags.count()) === 1, "le tag créé par l'outil figure dans /admin/tags", names.tagSlug)
      const response = await page.goto(`${BASE}/fr/projets/${names.projectSlug}`, { waitUntil: "load" })
      report.check(response.status() === 404, "le brouillon n'est pas servi sur le site public", String(response.status()))
    }],
    ["suppression de la clé", async (report) => {
      await state.client.close()
      await deleteKey(names.key)
      const status = await initializeStatus("portfolio", state.key)
      report.check(
        (await keyRow(names.key).count()) === 0 && status === 401,
        "la clé supprimée disparaît de la liste et est refusée sur /api/mcp/portfolio",
        String(status),
      )
    }],
    ["console", async (report) => {
      // Le 404 du brouillon, demandé exprès, se signale lui-même en console
      const unexpected = errors.filter((error) => !error.includes(names.projectSlug))
      report.check(unexpected.length === 0, "aucune erreur de console émise par l'app", sampleErrors(unexpected))
    }],
  ],
  async (report) => {
    // Avant la déconnexion : une panne du serveur ne doit pas empêcher de retirer les données.
    // Ordre des clés étrangères : projet (tags liés et ClientMeta en cascade), tag, entreprise, clé
    const likeName = `'${prefix} %'`
    const likeSlug = `'${prefix}-%'`
    try {
      sql(`
        DELETE FROM public."Project" WHERE slug LIKE ${likeSlug};
        DELETE FROM public."Tag" WHERE slug LIKE ${likeSlug};
        DELETE FROM freelance."Company" WHERE slug LIKE ${likeSlug};
        DELETE FROM auth.apikey WHERE name LIKE ${likeName};
      `)
      const left = sql(`
        SELECT (SELECT count(*) FROM public."Project" WHERE slug LIKE ${likeSlug})
          || ' ' || (SELECT count(*) FROM public."ClientMeta" WHERE "projectId" = '${state.projectId || "none"}')
          || ' ' || (SELECT count(*) FROM public."Tag" WHERE slug LIKE ${likeSlug})
          || ' ' || (SELECT count(*) FROM freelance."Company" WHERE slug LIKE ${likeSlug})
          || ' ' || (SELECT count(*) FROM auth.apikey WHERE name LIKE ${likeName});
      `)
      report.check(left === "0 0 0 0 0", "nettoyage : aucun projet, tag, entreprise ni clé restant", left)
      report.check(existingOrders() === ordersBefore, "l'ordre des projets et tags existants est celui d'avant le passage")
    } finally {
      const failure = await closeAdmin(session)
      report.check(failure === null, "déconnexion de la session admin", failure ?? "")
    }
  },
)
