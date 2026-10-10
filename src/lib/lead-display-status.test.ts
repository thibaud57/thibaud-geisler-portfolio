import { describe, expect, it } from "vitest"

import { leadDisplayStatus } from "./lead-display-status"

const NOW = new Date(2026, 8, 27, 12, 0).getTime()

describe("leadDisplayStatus", () => {
  it("shows Deal once one of its opportunities is accepted", () => {
    const lead = {
      status: "PERDU" as const,
      opportunities: [{ status: "REFUSEE" as const }, { status: "ACCEPTEE" as const }],
      interviews: [],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DEAL")
  })

  it("keeps the entered status otherwise", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [{ status: "OFFRE_RECUE" as const }],
      interviews: [],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DISCUSSION")
  })

  it("shows a scheduled meeting when the lead is a correspondent of an upcoming planned interview", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [],
      interviews: [{ status: "PLANIFIE" as const, scheduledAt: new Date(2026, 8, 28, 10, 0) }],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("RDV_PLANIFIE")
  })

  it("shows a scheduled meeting for an interview at the current instant", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [],
      interviews: [{ status: "PLANIFIE" as const, scheduledAt: new Date(NOW) }],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("RDV_PLANIFIE")
  })

  it("keeps Deal ahead of a scheduled meeting", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [{ status: "ACCEPTEE" as const }],
      interviews: [{ status: "PLANIFIE" as const, scheduledAt: new Date(2026, 8, 28, 10, 0) }],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DEAL")
  })

  it("ignores a past interview and one no longer planned", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [],
      interviews: [
        { status: "PLANIFIE" as const, scheduledAt: new Date(2026, 8, 27, 9, 0) },
        { status: "FAIT" as const, scheduledAt: new Date(2026, 8, 28, 10, 0) },
      ],
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DISCUSSION")
  })
})
