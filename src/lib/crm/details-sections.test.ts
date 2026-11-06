import { describe, expect, it } from "vitest"

import { replaceDetailsSection } from "./details-sections"
import { COMPANY_DETAILS_TEMPLATE } from "./details-templates"

const COMPANY_HEADINGS = [
  "🏢 À propos",
  "📊 Chiffres clés",
  "🌐 Activités",
  "🤝 Contexte de la relation",
  "🔗 Liens",
]

describe("replaceDetailsSection", () => {
  it("replaces the body of a section and keeps the others", () => {
    const result = replaceDetailsSection(COMPANY_DETAILS_TEMPLATE, "Chiffres clés", "50 salariés")

    expect(result).toEqual({
      ok: true,
      details: `# 🏢 À propos

# 📊 Chiffres clés

50 salariés

# 🌐 Activités

# 🤝 Contexte de la relation

# 🔗 Liens
`,
    })
  })

  it("matches a heading regardless of emoji, case and accents", () => {
    const result = replaceDetailsSection(
      COMPANY_DETAILS_TEMPLATE,
      "a propos",
      "Éditeur de logiciels",
    )

    expect(result).toEqual({
      ok: true,
      details: COMPANY_DETAILS_TEMPLATE.replace(
        "# 🏢 À propos\n",
        "# 🏢 À propos\n\nÉditeur de logiciels\n",
      ),
    })
  })

  it("replaces the last section up to the end of the text", () => {
    const withLinks = `${COMPANY_DETAILS_TEMPLATE}\nhttps://acme.example\n`

    const result = replaceDetailsSection(withLinks, "Liens", "https://acme.example/about")

    expect(result).toEqual({
      ok: true,
      details: `${COMPANY_DETAILS_TEMPLATE}\nhttps://acme.example/about\n`,
    })
  })

  it("replaces only the first of two sections sharing a title", () => {
    const details = "# Liens\n\nhttps://a.example\n\n# Liens\n\nhttps://b.example\n"

    const result = replaceDetailsSection(details, "Liens", "https://c.example")

    expect(result).toEqual({
      ok: true,
      details: "# Liens\n\nhttps://c.example\n\n# Liens\n\nhttps://b.example\n",
    })
  })

  it("reports a missing heading with the headings present", () => {
    const result = replaceDetailsSection(COMPANY_DETAILS_TEMPLATE, "Salaires", "n/a")

    expect(result).toEqual({
      ok: false,
      code: "section_not_found",
      headings: COMPANY_HEADINGS,
    })
  })

  it.each([null, ""])("reports empty details for %j", (details) => {
    const result = replaceDetailsSection(details, "Liens", "https://acme.example")

    expect(result).toEqual({ ok: false, code: "no_details" })
  })
})
