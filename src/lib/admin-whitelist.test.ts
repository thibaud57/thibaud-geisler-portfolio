import { describe, expect, it } from "vitest"

import { isAdminEmail } from "./admin-whitelist"

const ADMIN_EMAIL = "admin@exemple.fr"

describe("isAdminEmail", () => {
  it.each(["admin@exemple.fr", "Admin@Exemple.FR", "  admin@exemple.fr  "])(
    "autorise %j, égal à adminEmail à la casse et aux espaces près",
    (email) => {
      const allowed = isAdminEmail(email, ADMIN_EMAIL)

      expect(allowed).toBe(true)
    },
  )

  it("normalise aussi adminEmail", () => {
    const allowed = isAdminEmail("admin@exemple.fr", "  Admin@Exemple.FR ")

    expect(allowed).toBe(true)
  })

  it.each([
    ["intrus@exemple.fr", ADMIN_EMAIL],
    ["", ADMIN_EMAIL],
    [null, ADMIN_EMAIL],
    [undefined, ADMIN_EMAIL],
    [ADMIN_EMAIL, ""],
    [ADMIN_EMAIL, null],
    [ADMIN_EMAIL, undefined],
    ["", ""],
  ])("refuse %j quand adminEmail vaut %j", (email, adminEmail) => {
    const allowed = isAdminEmail(email, adminEmail)

    expect(allowed).toBe(false)
  })
})
