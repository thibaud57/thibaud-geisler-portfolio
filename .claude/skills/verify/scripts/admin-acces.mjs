// Parcours d'accès à l'espace admin : sans session on est renvoyé vers la connexion, un cookie forgé n'ouvre
// aucun écran et affiche « Accès non autorisé », une session réelle ouvre l'écran demandé, puis « Déconnexion » ferme la session et l'accès.
// La connexion par Google demande un vrai compte : elle ne se joue pas, `just dev-login` pose la session de départ.

import { BASE, one, play, openAdmin, closeAdmin, sampleErrors } from "./_common.mjs"

const SCREEN = "/admin/entreprises"
// Libellé propre à l'écran, absent du rendu d'une réponse refusée
const SCREEN_MARKER = "Nouvelle entreprise"

const session = await openAdmin()
const { browser, page, errors } = session
const sessions = () => Number(one(`select count(*) from auth."session"`))

await play(
  "admin-acces",
  [
    ["sans session", async (report) => {
      const response = await fetch(`${BASE}/admin`, { redirect: "manual" })
      await response.body?.cancel()
      const location = response.headers.get("location") ?? ""
      report.check(response.status === 307 && location.includes("/admin/login"), "/admin sans session renvoie vers /admin/login", `${response.status} ${location.replace(BASE, "")}`)
    }],
    ["cookie forgé", async (report) => {
      // Le proxy laisse passer le cookie, la garde serveur le refuse : l'écran rendu est « Accès non autorisé ».
      // Le statut ne le dit pas en dev (le stream a déjà envoyé 200) et le HTML en porte le texte pour toute page : on lit le rendu
      const forged = await browser.newContext()
      try {
        await forged.addCookies([{ name: "better-auth.session_token", value: "forged.value", url: BASE }])
        const forgedPage = await forged.newPage()
        await forgedPage.goto(`${BASE}${SCREEN}`, { waitUntil: "load", timeout: 120_000 })
        const refusal = forgedPage.getByRole("heading", { name: "Accès non autorisé" })
        await refusal.waitFor()
        const content = await forgedPage.getByRole("link", { name: SCREEN_MARKER }).count()
        report.check(
          (await refusal.isVisible()) && content === 0,
          "un cookie forgé affiche « Accès non autorisé » et aucun contenu de l'écran",
          forgedPage.url().replace(BASE, ""),
        )
      } finally {
        await forged.close()
      }
    }],
    ["session ouverte", async (report) => {
      await page.goto(`${BASE}${SCREEN}`, { waitUntil: "load", timeout: 120_000 })
      const marker = page.getByRole("link", { name: SCREEN_MARKER }).first()
      await marker.waitFor()
      report.check(page.url() === `${BASE}${SCREEN}` && (await marker.isVisible()), "une session réelle ouvre l'écran demandé", SCREEN)
    }],
    ["déconnexion", async (report) => {
      const before = sessions()
      await page.waitForTimeout(1500)
      await page.getByRole("button", { name: "Déconnexion" }).first().click()
      await page.waitForURL("**/admin/login")
      const after = sessions()
      report.check(after === before - 1, "la déconnexion renvoie vers /admin/login et retire la session de la base", `${before} puis ${after} session(s)`)
      await page.goto(`${BASE}${SCREEN}`, { waitUntil: "load" })
      report.check(page.url().endsWith("/admin/login"), "après la déconnexion, l'écran redirige vers la connexion", page.url().replace(BASE, ""))
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
  ],
  async (report) => {
    // Sans effet quand la déconnexion a déjà fermé la session, elle la ferme si une étape s'est interrompue avant
    const failure = await closeAdmin(session)
    report.check(failure === null, "déconnexion de la session admin", failure ?? "")
  },
)
