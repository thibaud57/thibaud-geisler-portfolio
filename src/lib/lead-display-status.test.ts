import { describe, expect, it } from "vitest"

import { leadDisplayStatus } from "./lead-display-status"

describe("leadDisplayStatus", () => {
  it("shows Deal once one of its opportunities is accepted", () => {
    const lead = {
      status: "PERDU" as const,
      opportunities: [{ status: "REFUSEE" as const }, { status: "ACCEPTEE" as const }],
    }

    const status = leadDisplayStatus(lead)

    expect(status).toBe("DEAL")
  })

  it("keeps the entered status otherwise", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [{ status: "OFFRE_RECUE" as const }],
    }

    const status = leadDisplayStatus(lead)

    expect(status).toBe("DISCUSSION")
  })
})
