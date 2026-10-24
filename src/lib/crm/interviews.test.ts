import { describe, expect, it } from "vitest"

import type { InterviewType } from "@/generated/prisma/client"

import {
  interviewPlaces,
  interviewTitle,
  interviewTitleOf,
  resolveInterviewSide,
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
  it.each([
    { id: "first", number: null, previousId: null },
    { id: "hr", number: 1, previousId: "first" },
    { id: "tech", number: 2, previousId: "hr" },
    { id: "other", number: 1, previousId: null },
  ])(
    "places interview $id at number $number after $previousId within its opportunity",
    ({ id, number, previousId }) => {
      const places = interviewPlaces(opportunityInterviews())

      expect(places.get(id)).toEqual({ number, previousId })
    },
  )

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
  it.each([
    ["PREMIER_CONTACT", null, "Premier contact"],
    ["TECHNIQUE", 2, "Entretien 2 · Technique"],
  ] as const)("titles a %s interview numbered %s as %s", (type, number, expected) => {
    const title = interviewTitle(type, number)

    expect(title).toBe(expected)
  })
})

describe("interviewTitleOf", () => {
  const opportunity = { title: "Mission data" }

  it("titles an interview by its place in the opportunity", () => {
    const places = interviewPlaces(opportunityInterviews())

    const title = interviewTitleOf({ ...technical(), opportunity }, places)

    expect(title).toBe("Entretien 2 · Technique")
  })

  it("appends the opportunity when asked", () => {
    const places = interviewPlaces(opportunityInterviews())

    const title = interviewTitleOf({ ...technical(), opportunity }, places, {
      withOpportunity: true,
    })

    expect(title).toBe("Entretien 2 · Technique · Mission data")
  })

  it("appends the opportunity to a first contact too", () => {
    const places = interviewPlaces(opportunityInterviews())
    const first = interview({ id: "first", type: "PREMIER_CONTACT" })

    const title = interviewTitleOf({ ...first, opportunity }, places, { withOpportunity: true })

    expect(title).toBe("Premier contact · Mission data")
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

describe("resolveInterviewSide", () => {
  it("defaults to ESN when the opportunity has an intermediary", () => {
    const side = resolveInterviewSide({ choice: null, stored: undefined, hasIntermediary: true })

    expect(side).toBe("ESN")
  })

  it("defaults to CLIENT_FINAL when the opportunity has no intermediary", () => {
    const side = resolveInterviewSide({ choice: null, stored: undefined, hasIntermediary: false })

    expect(side).toBe("CLIENT_FINAL")
  })

  it("keeps the explicit choice over the default", () => {
    const side = resolveInterviewSide({
      choice: "CLIENT_FINAL",
      stored: undefined,
      hasIntermediary: true,
    })

    expect(side).toBe("CLIENT_FINAL")
  })

  it("falls back to CLIENT_FINAL when ESN is chosen without an intermediary", () => {
    const side = resolveInterviewSide({ choice: "ESN", stored: undefined, hasIntermediary: false })

    expect(side).toBe("CLIENT_FINAL")
  })

  it("returns the stored side when nothing is chosen", () => {
    const side = resolveInterviewSide({
      choice: null,
      stored: "CLIENT_FINAL",
      hasIntermediary: true,
    })

    expect(side).toBe("CLIENT_FINAL")
  })
})
