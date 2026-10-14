import { describe, expect, it } from "vitest"

import {
  companyLinksLabel,
  countClientProjects,
  hasAcceptedOpportunity,
  isWorkedCompany,
  joinedEndClientNames,
} from "./companies"

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
  it.each([
    {
      label: "as client",
      opportunitiesAsIntermediary: [],
      opportunitiesAsClient: [{ status: "ACCEPTEE" as const }],
      expected: true,
    },
    {
      label: "as intermediary",
      opportunitiesAsIntermediary: [{ status: "ACCEPTEE" as const }],
      opportunitiesAsClient: [],
      expected: true,
    },
    {
      label: "by none of its opportunities",
      opportunitiesAsIntermediary: [{ status: "PROPOSEE" as const }],
      opportunitiesAsClient: [{ status: "REFUSEE" as const }],
      expected: false,
    },
  ])("marks a company worked $label: $expected", ({ expected, ...company }) => {
    const worked = hasAcceptedOpportunity(company)

    expect(worked).toBe(expected)
  })
})

describe("isWorkedCompany", () => {
  it("counts only client projects toward a company being worked", () => {
    const clientMetas = [
      { project: { type: "PERSONAL" as const } },
      { project: { type: "CLIENT" as const } },
      { project: { type: "CLIENT" as const } },
    ]

    const count = countClientProjects(clientMetas)

    expect(count).toBe(2)
  })

  it("does not mark a company worked for a personal project alone", () => {
    const clientProjectCount = countClientProjects([{ project: { type: "PERSONAL" as const } }])

    const worked = isWorkedCompany({
      clientProjectCount,
      opportunitiesAsIntermediary: [],
      opportunitiesAsClient: [],
    })

    expect(worked).toBe(false)
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
