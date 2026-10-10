import { describe, expect, it } from "vitest"

import {
  CONTACT_DETAILS_TEMPLATE,
  detailsAfterOriginChange,
  leadDetailsTemplate,
  OPPORTUNITY_DETAILS_TEMPLATE,
} from "./details-templates"

describe("leadDetailsTemplate", () => {
  it("gives the outbound template the hypothesis and context sections", () => {
    const template = leadDetailsTemplate("OUTBOUND")

    expect(template).toContain("# 💡 Hypothèse / Angle")
    expect(template).toContain("# 🎯 Contexte")
    expect(template).not.toContain("Signal")
  })

  it("gives the inbound template the context section only", () => {
    const template = leadDetailsTemplate("INBOUND")

    expect(template).toBe("# 🎯 Contexte\n")
  })
})

describe("detailsAfterOriginChange", () => {
  it("fills the template of the new origin when details are empty", () => {
    const details = detailsAfterOriginChange("", "", "OUTBOUND")

    expect(details).toBe(leadDetailsTemplate("OUTBOUND"))
  })

  it("swaps the template when the origin changes on untouched details", () => {
    const details = detailsAfterOriginChange(leadDetailsTemplate("OUTBOUND"), "OUTBOUND", "INBOUND")

    expect(details).toBe(leadDetailsTemplate("INBOUND"))
  })

  it("swaps the template when the origin changes on a reformatted template", () => {
    const reformatted = `${leadDetailsTemplate("OUTBOUND").replaceAll("\n\n", "\n")}\n`

    const details = detailsAfterOriginChange(reformatted, "OUTBOUND", "INBOUND")

    expect(details).toBe(leadDetailsTemplate("INBOUND"))
  })

  it("keeps written details when the origin changes", () => {
    const written = "# 🎯 Contexte\n\nRencontré au salon IA de Luxembourg."

    const details = detailsAfterOriginChange(written, "INBOUND", "OUTBOUND")

    expect(details).toBe(written)
  })
})

describe("CONTACT_DETAILS_TEMPLATE", () => {
  it("gives the contact template its five sections", () => {
    const headings = CONTACT_DETAILS_TEMPLATE.split("\n").filter((line) => line.startsWith("# "))

    expect(headings).toEqual([
      "# 💼 Profil",
      "# 🤝 Relation",
      "# 📅 Historique",
      "# 🔗 Liens",
      "# 📝 Notes libres",
    ])
  })
})

describe("OPPORTUNITY_DETAILS_TEMPLATE", () => {
  it("gives the opportunity template its three sections", () => {
    const headings = OPPORTUNITY_DETAILS_TEMPLATE.split("\n").filter((line) =>
      line.startsWith("# "),
    )

    expect(headings).toEqual(["# 🎯 Contexte", "# 👤 Profil recherché", "# 🛠️ Contenu technique"])
  })
})
