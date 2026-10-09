import { describe, expect, it } from "vitest"

import { isAdminEmail } from "./admin-whitelist"

const ADMIN_EMAIL = "admin@example.com"

describe("isAdminEmail", () => {
  it.each(["admin@example.com", "Admin@Example.COM", "  admin@example.com  "])(
    "autorise %j, égal à adminEmail à la casse et aux espaces près",
    (email) => {
      const allowed = isAdminEmail(email, ADMIN_EMAIL)

      expect(allowed).toBe(true)
    },
  )

  it("normalise aussi adminEmail", () => {
    const allowed = isAdminEmail("admin@example.com", "  Admin@Example.COM ")

    expect(allowed).toBe(true)
  })

  it.each([
    ["intrus@example.com", ADMIN_EMAIL],
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
