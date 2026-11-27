// Parcours du visiteur qui arrive sur la racine, en lecture seule : la langue de son navigateur le mène à /en,
// une langue non gérée à /fr, et une locale explicite dans l'URL n'est jamais redirigée.

import { BASE, consoleErrors, openBrowser, play } from "./_common.mjs"

const browser = await openBrowser()
// Les erreurs de console se remplissent pendant la visite : une liste par navigateur, lue à la fin
const errorLists = []

// Un navigateur vierge dans la langue donnée, arrivé sur `path` : page atteinte et langue du document
async function arriveAs(locale, path) {
  const context = await browser.newContext({ locale, viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  errorLists.push(consoleErrors(page))
  await page.goto(`${BASE}${path}`, { waitUntil: "load" })
  await page.locator("main:not([role=status]) h1").first().waitFor()
  const reached = { url: page.url().replace(BASE, ""), lang: await page.locator("html").getAttribute("lang") }
  await context.close()
  return reached
}

await play(
  "visiteur-langue",
  [
    ["navigateur anglais", async (report) => {
      // La racine redirige en 307 avant tout rendu : la requête sans suivi de redirection en porte le code
      const response = await fetch(`${BASE}/`, { headers: { "Accept-Language": "en" }, redirect: "manual" })
      await response.body?.cancel()
      report.check(
        response.status === 307 && (response.headers.get("location") ?? "").endsWith("/en"),
        "la racine redirige en 307 vers /en pour un navigateur anglais",
        `${response.status} ${(response.headers.get("location") ?? "").replace(BASE, "")}`,
      )
      const reached = await arriveAs("en-US", "/")
      report.check(reached.url === "/en" && reached.lang === "en", "le visiteur anglais arrive sur la page d'accueil en anglais", `${reached.url}, lang ${reached.lang}`)
    }],
    ["langue non gérée", async (report) => {
      const reached = await arriveAs("de-DE", "/")
      report.check(reached.url === "/fr" && reached.lang === "fr", "une langue non gérée mène au français, locale par défaut", `${reached.url}, lang ${reached.lang}`)
    }],
    ["locale explicite", async (report) => {
      const reached = await arriveAs("en-US", "/fr")
      report.check(reached.url === "/fr" && reached.lang === "fr", "un navigateur anglais sur /fr y reste, sans redirection", `${reached.url}, lang ${reached.lang}`)
    }],
    ["console", async (report) => {
      const errors = errorLists.flat()
      report.check(errors.length === 0, "aucune erreur de console émise par le site", errors.slice(0, 2).join(" | "))
    }],
  ],
  async () => {
    await browser.close()
  },
)
