import { describe, expect, it } from "vitest"

import { isAdminPath, requiresSession } from "./admin-routes"

describe("isAdminPath", () => {
  it.each(["/admin", "/admin/projets", "/admin/login"])(
    "recognizes %j as part of the admin space",
    (pathname) => {
      const result = isAdminPath(pathname)

      expect(result).toBe(true)
    },
  )

  it.each(["/administration", "/adminx", "/", "/fr/projets", "/fr/admin"])(
    "does not recognize %j as part of the admin space",
    (pathname) => {
      const result = isAdminPath(pathname)

      expect(result).toBe(false)
    },
  )
})

describe("requiresSession", () => {
  it.each(["/admin", "/admin/projets"])("requires a session for %j", (pathname) => {
    const result = requiresSession(pathname)

    expect(result).toBe(true)
  })

  it.each(["/admin/login", "/api/auth/callback/google"])(
    "exempts %j from the session check",
    (pathname) => {
      const result = requiresSession(pathname)

      expect(result).toBe(false)
    },
  )
})
