import { describe, expect, it } from "vitest"

import { assertTestDatabase, deriveTestDatabase } from "./test-database"

describe("deriveTestDatabase", () => {
  it("suffixes the dev database and keeps the server, credentials and options", () => {
    const database = deriveTestDatabase(
      "postgresql://jane:secret@db.example:5432/app_dev?sslmode=disable",
    )

    expect(database).toEqual({
      name: "app_dev_test",
      url: "postgresql://jane:secret@db.example:5432/app_dev_test?sslmode=disable",
      adminUrl: "postgresql://jane:secret@db.example:5432/postgres?sslmode=disable",
    })
  })

  it("rejects a URL that names no database", () => {
    expect(() => deriveTestDatabase("postgresql://jane:secret@db.example:5432")).toThrow(
      "DATABASE_URL ne nomme aucune base",
    )
  })
})

describe("assertTestDatabase", () => {
  it("accepts a database ending with _test", () => {
    expect(() => {
      assertTestDatabase("app_dev_test")
    }).not.toThrow()
  })

  it.each(["app_dev", "app_test_dev", "postgres"])("refuses %s", (name) => {
    expect(() => {
      assertTestDatabase(name)
    }).toThrow("refusée")
  })
})
