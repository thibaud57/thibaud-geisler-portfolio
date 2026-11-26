// Parcours d'un moteur de recherche ou d'un agent qui lit le site, par requêtes HTTP, en lecture seule :
// robots.txt renvoie au sitemap, le sitemap liste un projet publié dans les deux langues, llms.txt le liste aussi,
// et sa page répond.

import { BASE, play } from "./_common.mjs"

const state = { slug: "" }
const get = (path) => fetch(`${BASE}${path}`)

await play("referencement", [
  ["robots", async (report) => {
    const response = await get("/robots.txt")
    report.check(response.status === 200 && (await response.text()).includes("sitemap.xml"), "robots.txt renvoie au sitemap")
  }],
  ["sitemap", async (report) => {
    const sitemap = await (await get("/sitemap.xml")).text()
    state.slug = sitemap.match(/\/fr\/projets\/([^<"/\s]+)/)?.[1] ?? ""
    report.check(
      state.slug !== "" && sitemap.includes(`/en/projets/${state.slug}`),
      "sitemap : un projet publié dans les deux langues",
      state.slug,
    )
  }],
  ["llms", async (report) => {
    const llms = await (await get("/llms.txt")).text()
    report.check(state.slug !== "" && llms.includes(state.slug), "llms.txt liste le projet du sitemap", state.slug)
  }],
  ["page du projet", async (report) => {
    const response = await get(`/fr/projets/${state.slug}`)
    await response.body?.cancel()
    report.check(state.slug !== "" && response.status === 200, "la page du projet listé répond", String(response.status))
  }],
])
