import { describe, expect, it } from "vitest"

import {
  CONTACT_DETAILS_TEMPLATE,
  detailsAfterContactPromotion,
  detailsAfterOriginChange,
  leadDetailsTemplate,
} from "./details-templates"

describe("detailsAfterOriginChange", () => {
  it("fills the template of the new origin when details are empty", () => {
    const details = detailsAfterOriginChange("", null, "OUTBOUND")

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

describe("detailsAfterContactPromotion", () => {
  it("replaces an untouched lead template by the contact template", () => {
    const details = detailsAfterContactPromotion(leadDetailsTemplate("OUTBOUND"), "OUTBOUND")

    expect(details).toBe(CONTACT_DETAILS_TEMPLATE)
  })

  it("fills the contact template when the lead details are empty", () => {
    const details = detailsAfterContactPromotion(null, "INBOUND")

    expect(details).toBe(CONTACT_DETAILS_TEMPLATE)
  })

  it("keeps written lead details", () => {
    const written = "# 🎯 Contexte\n\nRencontré lors d'un salon."

    const details = detailsAfterContactPromotion(written, "INBOUND")

    expect(details).toBe(written)
  })
})
