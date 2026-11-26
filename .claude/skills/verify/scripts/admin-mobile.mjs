// Parcours de l'admin sur téléphone (390 px), en lecture seule : la sidebar est masquée et s'ouvre en tiroir par le
// déclencheur du header, une entrée du tiroir mène à son écran et le referme, sans débordement horizontal.

import { BASE, closeAdmin, openAdmin, overflows, play, sampleErrors } from "./_common.mjs"

const session = await openAdmin()
const { page, errors } = session
await page.setViewportSize({ width: 390, height: 844 })
const drawer = page.locator('[data-slot="sidebar"][data-mobile="true"]')

await play(
  "admin-mobile",
  [
    ["sidebar masquée", async (report) => {
      await page.goto(`${BASE}/admin/tags`, { waitUntil: "load", timeout: 120_000 })
      await page.locator("main h1:visible").first().waitFor()
      // Un clic parti avant la fin de l'hydratation n'ouvre pas le tiroir
      await page.waitForTimeout(1500)
      report.check(
        (await drawer.count()) === 0 && (await page.getByRole("button", { name: "Toggle Sidebar" }).isVisible()),
        "sous 768 px, la sidebar est masquée et son déclencheur est dans le header",
      )
      report.check(!(await overflows(page)), "écran de l'admin à 390 px, sans débordement horizontal")
    }],
    ["tiroir", async (report) => {
      await page.getByRole("button", { name: "Toggle Sidebar" }).click()
      await drawer.waitFor()
      await drawer.getByRole("link", { name: "Assets" }).waitFor()
      report.check(!(await overflows(page)), "tiroir ouvert à 390 px, sans débordement horizontal")
    }],
    ["navigation", async (report) => {
      await drawer.getByRole("link", { name: "Assets" }).click()
      await page.waitForURL("**/admin/assets")
      await page.locator("main h1:visible").first().waitFor()
      await drawer.waitFor({ state: "hidden" })
      report.check(!(await overflows(page)), "écran Assets atteint par le tiroir, refermé, sans débordement horizontal")
    }],
    ["console", async (report) => {
      report.check(errors.length === 0, "aucune erreur de console émise par l'app", sampleErrors(errors))
    }],
  ],
  async (report) => {
    const failure = await closeAdmin(session)
    report.check(failure === null, "déconnexion de la session admin", failure ?? "")
  },
)
