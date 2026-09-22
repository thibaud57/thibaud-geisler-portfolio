import { describe, expect, it } from "vitest"

import { assetKeyMatchesQuery, buildAssetUrl } from "./assets"

describe("buildAssetUrl", () => {
  it("serves a company logo through the public route despite its admin bucket", () => {
    const url = buildAssetUrl("freelance/crm/entreprises/foyer/logo.png")

    expect(url).toBe("/api/assets/freelance/crm/entreprises/foyer/logo.png")
  })

  it("keeps any other admin key behind the guarded route", () => {
    const url = buildAssetUrl("freelance/administration/contrat.pdf")

    expect(url).toBe("/admin/api/assets/freelance/administration/contrat.pdf")
  })
})

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
