import { describe, expect, it } from "vitest"

import { companyLinksLabel, hasAcceptedOpportunity, joinedEndClientNames } from "./companies"

describe("joinedEndClientNames", () => {
  it("names each accepted opportunity's end client once, sorted", () => {
    const company = {
      opportunitiesAsIntermediary: [
        { status: "ACCEPTEE" as const, client: { id: "c-globex", name: "Globex" } },
        { status: "ACCEPTEE" as const, client: { id: "c-acme", name: "Acme SAS" } },
        { status: "ACCEPTEE" as const, client: { id: "c-acme", name: "Acme SAS" } },
        { status: "PROPOSEE" as const, client: { id: "c-initech", name: "Initech" } },
        { status: "ACCEPTEE" as const, client: null },
      ],
    }

    const names = joinedEndClientNames(company)

    expect(names).toEqual(["Acme SAS", "Globex"])
  })
})

describe("hasAcceptedOpportunity", () => {
  it("marks a company worked once one of its opportunities is accepted, as intermediary or as client", () => {
    const asClient = {
      opportunitiesAsIntermediary: [],
      opportunitiesAsClient: [{ status: "ACCEPTEE" as const }],
    }
    const none = {
      opportunitiesAsIntermediary: [{ status: "PROPOSEE" as const }],
      opportunitiesAsClient: [],
    }

    expect(hasAcceptedOpportunity(asClient)).toBe(true)
    expect(hasAcceptedOpportunity(none)).toBe(false)
  })
})

describe("companyLinksLabel", () => {
  it.each([
    [2, 0, "2 projets"],
    [0, 1, "1 opportunité"],
    [2, 1, "2 projets et 1 opportunité"],
  ])("names %s projects and %s opportunities as %s", (projects, opportunities, expected) => {
    const label = companyLinksLabel(projects, opportunities)

    expect(label).toBe(expected)
  })
})
