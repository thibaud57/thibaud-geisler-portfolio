import { describe, expect, it } from "vitest"

import { leadDisplayStatus } from "./lead-display-status"

const NOW = new Date(2026, 8, 27, 12, 0)

describe("leadDisplayStatus", () => {
  it("shows Deal once one of its opportunities is accepted", () => {
    const lead = {
      status: "PERDU" as const,
      opportunities: [{ status: "REFUSEE" as const }, { status: "ACCEPTEE" as const }],
      interviews: [],
      optedOutAt: null,
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DEAL")
  })

  it("keeps the entered status otherwise", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [{ status: "OFFRE_RECUE" as const }],
      interviews: [],
      optedOutAt: null,
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DISCUSSION")
  })

  it.each([
    { label: "upcoming", scheduledAt: new Date(2026, 8, 28, 10, 0) },
    { label: "at the current instant", scheduledAt: new Date(NOW) },
  ])("shows a scheduled meeting for a planned interview $label", ({ scheduledAt }) => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [],
      interviews: [{ status: "PLANIFIE" as const, scheduledAt }],
      optedOutAt: null,
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("RDV_PLANIFIE")
  })

  it("keeps Deal ahead of a scheduled meeting", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [{ status: "ACCEPTEE" as const }],
      interviews: [{ status: "PLANIFIE" as const, scheduledAt: new Date(2026, 8, 28, 10, 0) }],
      optedOutAt: null,
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
      optedOutAt: null,
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBe("DISCUSSION")
  })

  it("gives an opted-out person no displayed status, even with an accepted deal", () => {
    const lead = {
      status: "DISCUSSION" as const,
      opportunities: [{ status: "ACCEPTEE" as const }],
      interviews: [{ status: "PLANIFIE" as const, scheduledAt: new Date(2026, 8, 28, 10, 0) }],
      optedOutAt: new Date(2026, 8, 1),
    }

    const status = leadDisplayStatus(lead, NOW)

    expect(status).toBeNull()
  })
})
