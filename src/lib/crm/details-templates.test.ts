import { describe, expect, it } from "vitest"

import {
  COMPANY_DETAILS_TEMPLATE,
  CONTACT_DETAILS_TEMPLATE,
  detailsAfterOriginChange,
  interviewDetailsTemplate,
  leadDetailsTemplate,
  OPPORTUNITY_DETAILS_TEMPLATE,
} from "./details-templates"

describe("leadDetailsTemplate", () => {
  it("gives the outbound template the context then the hypothesis", () => {
    const headings = leadDetailsTemplate("OUTBOUND")
      .split("\n")
      .filter((line) => line.startsWith("# "))

    expect(headings).toEqual(["# 🎯 Contexte", "# 💡 Hypothèse / Angle"])
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
    const written = "# 🎯 Contexte\n\nRencontré lors d'un salon."

    const details = detailsAfterOriginChange(written, "INBOUND", "OUTBOUND")

    expect(details).toBe(written)
  })
})

describe("CONTACT_DETAILS_TEMPLATE", () => {
  it("gives the contact template only the sections without a dedicated field", () => {
    expect(CONTACT_DETAILS_TEMPLATE).toBe("# 💼 Profil\n\n# 🤝 Relation\n\n# 🔗 Liens\n")
  })
})

describe("COMPANY_DETAILS_TEMPLATE", () => {
  it("leaves the notes to the notes field", () => {
    const headings = COMPANY_DETAILS_TEMPLATE.split("\n").filter((line) => line.startsWith("# "))

    expect(headings).toEqual([
      "# 🏢 À propos",
      "# 📊 Chiffres clés",
      "# 🌐 Activités",
      "# 🤝 Contexte de la relation",
      "# 🔗 Liens",
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

describe("interviewDetailsTemplate", () => {
  function headingsOf(template: string): string[] {
    return template.split("\n").filter((line) => line.startsWith("# "))
  }

  it("gives each interview type its template", () => {
    const firstContact = headingsOf(interviewDetailsTemplate("PREMIER_CONTACT"))
    const hr = headingsOf(interviewDetailsTemplate("RECRUTEUR_RH"))
    const negotiation = headingsOf(interviewDetailsTemplate("NEGOCIATION"))
    const technical = headingsOf(interviewDetailsTemplate("TECHNIQUE"))

    expect(firstContact).toEqual([
      "# 📋 Contexte du contact",
      "# 🚩 Red flags",
      "# ✅ Green flags",
      "# ➡️ Suite",
    ])
    expect(hr).toEqual([
      "# 🎯 Objectifs",
      "# 💪 Préparation ciblée",
      "# 🗒️ Déroulé",
      "# 🎯 Évaluation",
      "# 🚩 Red flags",
      "# ✅ Green flags",
      "# 🎬 Pourquoi et conditions",
      "# ➡️ Suite",
    ])
    expect(negotiation).toEqual(hr)
    expect(technical).toEqual([
      "# 🎯 Objectifs",
      "# 💪 Préparation ciblée",
      "# 💻 Exercice technique",
      "# 🗒️ Déroulé",
      "# 🎯 Évaluation",
      "# 🚩 Red flags",
      "# ✅ Green flags",
      "# 🎬 Pourquoi et conditions",
      "# ➡️ Suite",
    ])
  })
})
