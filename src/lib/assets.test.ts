import { describe, expect, it } from "vitest"

import { assetKeyMatchesQuery } from "./assets"

describe("assetKeyMatchesQuery", () => {
  const key = "projets/client/chatbot-agents-ia/cover.webp"

  it.each(["cover", "COVER.webp", "chatbot-agents", "projets/client"])(
    "matches on the file name or the folder for %s",
    (query) => {
      const result = assetKeyMatchesQuery(key, query)

      expect(result).toBe(true)
    },
  )

  it("matches the full key a detail view sends", () => {
    const result = assetKeyMatchesQuery(key, key)

    expect(result).toBe(true)
  })

  it("rejects a query that spans neither the name nor the folder", () => {
    const result = assetKeyMatchesQuery(key, "logo.png")

    expect(result).toBe(false)
  })
})
