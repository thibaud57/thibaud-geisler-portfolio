import { describe, expect, it } from "vitest"

import type {
  InterviewStatus,
  LeadInterest,
  LeadStatus,
  OpportunityStatus,
} from "@/generated/prisma/client"

import { isActiveLead, LEAD_VIEWS, leadsForView } from "./lead-views"

const NOW = new Date(2026, 8, 27, 12, 0).getTime()

const STATUSES: readonly LeadStatus[] = [
  "NOUVEAU",
  "SUSPECT",
  "DISCUSSION",
  "HORS_ICP",
  "PERDU",
  "STAND_BY",
]

interface TestLead {
  id: string
  status: LeadStatus
  interest: LeadInterest | null
  optedOutAt: Date | null
  metAt: Date | null
  name: string | null
  email: string | null
  linkedinUrl: string | null
  opportunities: { status: OpportunityStatus }[]
  interviews: { status: InterviewStatus; scheduledAt: Date }[]
}

function lead(overrides: Partial<TestLead> = {}): TestLead {
  return {
    id: "l1",
    status: "NOUVEAU",
    interest: null,
    optedOutAt: null,
    metAt: null,
    name: "Marie Durand",
    email: null,
    linkedinUrl: null,
    opportunities: [],
    interviews: [],
    ...overrides,
  }
}

describe("isActiveLead", () => {
  it("treats a lead with an accepted opportunity as not active", () => {
    const deal = lead({ status: "DISCUSSION", opportunities: [{ status: "ACCEPTEE" }] })
    const optedOut = lead({ optedOutAt: new Date("2026-03-12T09:00:00Z") })
    const fresh = lead({ status: "NOUVEAU" })

    const results = [deal, optedOut, fresh].map((row) => isActiveLead(row, NOW))

    expect(results).toEqual([false, false, true])
  })
})

describe("leadsForView", () => {
  it("keeps only new, suspect, discussion and scheduled leads in the in-progress view", () => {
    const leads = [
      ...STATUSES.map((status) => lead({ id: status, status })),
      lead({
        id: "meeting",
        status: "STAND_BY",
        interviews: [{ status: "PLANIFIE", scheduledAt: new Date(2026, 8, 28, 10, 0) }],
      }),
    ]

    const rows = leadsForView(leads, "en-cours", NOW)

    expect(rows.map(({ id }) => id).sort()).toEqual(["DISCUSSION", "NOUVEAU", "SUSPECT", "meeting"])
  })

  it("keeps only hot leads of the active pipeline in the hot view", () => {
    const leads = [
      ...(["PERDU", "HORS_ICP", "STAND_BY", "DISCUSSION"] as const).map((status) =>
        lead({ id: `hot-${status}`, status, interest: "HOT" }),
      ),
      lead({
        id: "hot-deal",
        status: "DISCUSSION",
        interest: "HOT",
        opportunities: [{ status: "ACCEPTEE" }],
      }),
      lead({ id: "warm-DISCUSSION", status: "DISCUSSION", interest: "WARM" }),
    ]

    const rows = leadsForView(leads, "chauds", NOW)

    expect(rows.map(({ id }) => id)).toEqual(["hot-DISCUSSION"])
  })

  it.each(["en-cours", "chauds"] as const)(
    "keeps a lead with an accepted opportunity out of the %s view",
    (view) => {
      const deal = lead({
        id: "deal",
        status: "DISCUSSION",
        interest: "HOT",
        opportunities: [{ status: "ACCEPTEE" }],
      })

      const rows = leadsForView([deal], view, NOW)

      expect(rows).toEqual([])
    },
  )

  it("keeps stand-by leads in the stand-by view only", () => {
    const leads = [
      lead({ id: "parked", status: "STAND_BY" }),
      lead({ id: "new", status: "NOUVEAU" }),
    ]

    const rows = leadsForView(leads, "stand-by", NOW)

    expect(rows.map(({ id }) => id)).toEqual(["parked"])
  })

  it("keeps opted-out leads out of every view but all", () => {
    const optedOut = lead({
      id: "opted-out",
      status: "NOUVEAU",
      interest: "HOT",
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
      name: null,
    })
    const standBy = lead({
      id: "opted-out-stand-by",
      status: "STAND_BY",
      optedOutAt: new Date("2026-09-20T09:00:00Z"),
    })

    const visibleIn = LEAD_VIEWS.filter(
      (view) => leadsForView([optedOut, standBy], view, NOW).length > 0,
    )

    expect(visibleIn).toEqual(["all"])
  })

  it.each([
    { view: "en-cours", expected: ["march", "january", "none"] },
    { view: "a-qualifier", expected: ["january", "march", "none"] },
  ] as const)("sorts leads without a meeting date last in the $view view", ({ view, expected }) => {
    const leads = [
      lead({ id: "january", metAt: new Date(2026, 0, 10) }),
      lead({ id: "none", metAt: null }),
      lead({ id: "march", metAt: new Date(2026, 2, 10) }),
    ]

    const rows = leadsForView(leads, view, NOW)

    expect(rows.map(({ id }) => id)).toEqual(expected)
  })

  it("sorts all leads by name, opted-out leads last", () => {
    const leads = [
      lead({ id: "hugo", name: "Hugo Martin", optedOutAt: null }),
      lead({ id: "sami-out", name: "Sami Bernard", optedOutAt: new Date("2026-03-12T09:00:00Z") }),
      lead({ id: "louis", name: "Louis Garnier", optedOutAt: null }),
      lead({
        id: "jeanne-out",
        name: "Jeanne Dupont",
        optedOutAt: new Date("2026-02-12T09:00:00Z"),
      }),
    ]

    const rows = leadsForView(leads, "all", NOW)

    expect(rows.map(({ id }) => id)).toEqual(["hugo", "louis", "jeanne-out", "sami-out"])
  })

  it("sorts opted-out leads without a name by their email or LinkedIn", () => {
    const optedOutAt = new Date("2026-03-12T09:00:00Z")
    const leads = [
      lead({
        id: "out-linkedin",
        name: null,
        linkedinUrl: "https://www.linkedin.com/in/jeanne-dupont-4b2a1c",
        optedOutAt,
      }),
      lead({ id: "out-email-last", name: null, email: "zack@example.com", optedOutAt }),
      lead({ id: "active", name: "Hugo Martin" }),
      lead({ id: "out-email-first", name: null, email: "adam@example.com", optedOutAt }),
    ]

    const rows = leadsForView(leads, "all", NOW)

    expect(rows.map(({ id }) => id)).toEqual([
      "active",
      "out-email-first",
      "out-linkedin",
      "out-email-last",
    ])
  })
})
