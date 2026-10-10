import { describe, expect, it } from "vitest"

import type { InterviewType } from "@/generated/prisma/client"

import { interviewPlaces, interviewTitle } from "./interviews"

interface TestInterview {
  id: string
  opportunityId: string
  type: InterviewType
  scheduledAt: Date
  createdAt: Date
}

function interview(overrides: Partial<TestInterview> = {}): TestInterview {
  return {
    id: "i1",
    opportunityId: "o1",
    type: "RECRUTEUR_RH",
    scheduledAt: new Date(2026, 8, 1, 10, 0),
    createdAt: new Date(2026, 7, 20),
    ...overrides,
  }
}

const OPPORTUNITY_INTERVIEWS = [
  interview({ id: "tech", type: "TECHNIQUE", scheduledAt: new Date(2026, 8, 15, 10, 0) }),
  interview({ id: "first", type: "PREMIER_CONTACT", scheduledAt: new Date(2026, 8, 1, 10, 0) }),
  interview({ id: "hr", type: "RECRUTEUR_RH", scheduledAt: new Date(2026, 8, 8, 10, 0) }),
  interview({
    id: "other",
    opportunityId: "o2",
    type: "TECHNIQUE",
    scheduledAt: new Date(2026, 8, 2, 10, 0),
  }),
]

describe("interviewPlaces", () => {
  it("numbers interviews after the first contact within their opportunity, by date", () => {
    const places = interviewPlaces(OPPORTUNITY_INTERVIEWS)

    expect(places.get("first")?.number).toBeNull()
    expect(places.get("hr")?.number).toBe(1)
    expect(places.get("tech")?.number).toBe(2)
    expect(places.get("other")?.number).toBe(1)
  })

  it("names the previous interview of the same opportunity", () => {
    const places = interviewPlaces(OPPORTUNITY_INTERVIEWS)

    expect(places.get("tech")?.previousId).toBe("hr")
    expect(places.get("hr")?.previousId).toBe("first")
    expect(places.get("first")?.previousId).toBeNull()
    expect(places.get("other")?.previousId).toBeNull()
  })

  it("keeps a stable number for two interviews at the same time", () => {
    const sameTime = new Date(2026, 8, 8, 10, 0)
    const interviews = [
      interview({ id: "later", scheduledAt: sameTime, createdAt: new Date(2026, 7, 22) }),
      interview({ id: "earlier", scheduledAt: sameTime, createdAt: new Date(2026, 7, 21) }),
    ]

    const places = interviewPlaces(interviews)

    expect(places.get("earlier")?.number).toBe(1)
    expect(places.get("later")?.number).toBe(2)
  })
})

describe("interviewTitle", () => {
  it("titles a first contact by its type and a later interview by its number", () => {
    const first = interviewTitle("PREMIER_CONTACT", null)
    const technical = interviewTitle("TECHNIQUE", 2)

    expect(first).toBe("Premier contact")
    expect(technical).toBe("Entretien 2 · Technique")
  })
})
