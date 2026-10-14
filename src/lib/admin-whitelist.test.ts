import { describe, expect, it } from "vitest"

import { isAdminEmail } from "./admin-whitelist"

const ADMIN_EMAIL = "admin@example.com"

describe("isAdminEmail", () => {
  it.each([
    ["admin@example.com", ADMIN_EMAIL],
    ["Admin@Example.COM", ADMIN_EMAIL],
    ["  admin@example.com  ", ADMIN_EMAIL],
    ["admin@example.com", "  Admin@Example.COM "],
  ])("allows %j when adminEmail is %j, ignoring case and spaces", (email, adminEmail) => {
    const allowed = isAdminEmail(email, adminEmail)

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
  ])("refuses %j when adminEmail is %j", (email, adminEmail) => {
    const allowed = isAdminEmail(email, adminEmail)

    expect(allowed).toBe(false)
  })
})
