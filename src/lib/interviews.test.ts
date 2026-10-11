import { describe, expect, it } from "vitest"

import type { InterviewType } from "@/generated/prisma/client"

import {
  interviewPlaces,
  interviewTitle,
  toInterviewLink,
  toLeadInterviewLinks,
  toOpportunityInterviewLinks,
} from "./interviews"

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

function technical(): TestInterview {
  return interview({ id: "tech", type: "TECHNIQUE", scheduledAt: new Date(2026, 8, 15, 10, 0) })
}

function hr(): TestInterview {
  return interview({ id: "hr", type: "RECRUTEUR_RH", scheduledAt: new Date(2026, 8, 8, 10, 0) })
}

function opportunityInterviews(): TestInterview[] {
  return [
    technical(),
    interview({ id: "first", type: "PREMIER_CONTACT", scheduledAt: new Date(2026, 8, 1, 10, 0) }),
    hr(),
    interview({
      id: "other",
      opportunityId: "o2",
      type: "TECHNIQUE",
      scheduledAt: new Date(2026, 8, 2, 10, 0),
    }),
  ]
}

describe("interviewPlaces", () => {
  it("numbers interviews after the first contact within their opportunity, by date", () => {
    const places = interviewPlaces(opportunityInterviews())

    expect(places.get("first")?.number).toBeNull()
    expect(places.get("hr")?.number).toBe(1)
    expect(places.get("tech")?.number).toBe(2)
    expect(places.get("other")?.number).toBe(1)
  })

  it("names the previous interview of the same opportunity", () => {
    const places = interviewPlaces(opportunityInterviews())

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

describe("toLeadInterviewLinks", () => {
  it("numbers each interview over every interview of its opportunity and names the opportunity", () => {
    const opportunity = {
      id: "o1",
      title: "Mission data",
      interviews: opportunityInterviews().filter(({ opportunityId }) => opportunityId === "o1"),
    }
    const leadInterviews = [
      { ...technical(), status: "PLANIFIE" as const, opportunity },
      { ...hr(), status: "FAIT" as const, opportunity },
    ]

    const links = toLeadInterviewLinks(leadInterviews, (id) => `/admin/entretiens/${id}`)

    expect(links).toMatchObject([
      {
        id: "tech",
        href: "/admin/entretiens/tech",
        label: "Entretien 2 · Technique",
        meta: "Mission data · Planifié",
      },
      {
        id: "hr",
        href: "/admin/entretiens/hr",
        label: "Entretien 1 · Recruteur/RH",
        meta: "Mission data · Fait",
      },
    ])
  })
})

describe("toOpportunityInterviewLinks", () => {
  it("numbers each interview over the whole opportunity and builds its href", () => {
    const interviews = opportunityInterviews()
      .filter(({ opportunityId }) => opportunityId === "o1")
      .map((row) => ({ ...row, status: "PLANIFIE" as const }))

    const links = toOpportunityInterviewLinks(interviews, (id) => `/admin/entretiens/${id}`)

    expect(links.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: "/admin/entretiens/tech", label: "Entretien 2 · Technique" },
      { href: "/admin/entretiens/first", label: "Premier contact" },
      { href: "/admin/entretiens/hr", label: "Entretien 1 · Recruteur/RH" },
    ])
  })
})

describe("toInterviewLink", () => {
  it("labels the interview by its place in the opportunity and shows its status", () => {
    const places = interviewPlaces(opportunityInterviews())

    const link = toInterviewLink({ ...hr(), status: "FAIT" }, places, "/admin/entretiens/hr")

    expect(link).toMatchObject({ label: "Entretien 1 · Recruteur/RH", meta: "Fait" })
  })
})
