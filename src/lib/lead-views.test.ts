import { describe, expect, it } from "vitest"

import type { LeadInterest, LeadStatus } from "@/generated/prisma/client"

import { LEAD_VIEWS, leadsForView } from "./lead-views"

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
}

function lead(overrides: Partial<TestLead> = {}): TestLead {
  return {
    id: "l1",
    status: "NOUVEAU",
    interest: null,
    optedOutAt: null,
    metAt: null,
    name: "Claire Morel",
    email: null,
    linkedinUrl: null,
    ...overrides,
  }
}

function idsOf(leads: readonly TestLead[]): string[] {
  return leads.map((row) => row.id)
}

describe("leadsForView", () => {
  it("keeps only new, suspect and discussion leads in the in-progress view", () => {
    const leads = STATUSES.map((status) => lead({ id: status, status }))

    const rows = leadsForView(leads, "en-cours")

    expect(idsOf(rows).sort()).toEqual(["DISCUSSION", "NOUVEAU", "SUSPECT"])
  })

  it("keeps hot leads outside lost and out-of-profile in the hot view", () => {
    const leads = [
      ...(["PERDU", "HORS_ICP", "DISCUSSION"] as const).map((status) =>
        lead({ id: `hot-${status}`, status, interest: "HOT" }),
      ),
      lead({ id: "warm-DISCUSSION", status: "DISCUSSION", interest: "WARM" }),
    ]

    const rows = leadsForView(leads, "chauds")

    expect(idsOf(rows)).toEqual(["hot-DISCUSSION"])
  })

  it("keeps stand-by leads in the stand-by view only", () => {
    const leads = [
      lead({ id: "parked", status: "STAND_BY" }),
      lead({ id: "new", status: "NOUVEAU" }),
    ]

    const rows = leadsForView(leads, "stand-by")

    expect(idsOf(rows)).toEqual(["parked"])
  })

  it("keeps opted-out leads out of every view but all", () => {
    const optedOut = lead({
      id: "opted-out",
      status: "NOUVEAU",
      interest: "HOT",
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
      name: null,
    })
    const standBy = lead({ id: "opted-out-stand-by", status: "STAND_BY", optedOutAt: new Date() })

    const visibleIn = LEAD_VIEWS.filter(
      (view) => leadsForView([optedOut, standBy], view).length > 0,
    )

    expect(visibleIn).toEqual(["tous"])
  })

  it("sorts leads without a meeting date last, whatever the direction", () => {
    const leads = [
      lead({ id: "january", metAt: new Date(2026, 0, 10) }),
      lead({ id: "none", metAt: null }),
      lead({ id: "march", metAt: new Date(2026, 2, 10) }),
    ]

    const newestFirst = leadsForView(leads, "en-cours")
    const oldestFirst = leadsForView(leads, "a-qualifier")

    expect(idsOf(newestFirst)).toEqual(["march", "january", "none"])
    expect(idsOf(oldestFirst)).toEqual(["january", "march", "none"])
  })

  it("sorts all leads by name, opted-out leads last", () => {
    const leads = [
      lead({ id: "alice", name: "Alice Dupont", optedOutAt: null }),
      lead({ id: "bob-out", name: "Bob Martin", optedOutAt: new Date("2026-03-12T09:00:00Z") }),
      lead({ id: "zoe", name: "Zoé Martin", optedOutAt: null }),
      lead({ id: "aaron-out", name: "Aaron Durand", optedOutAt: new Date("2026-02-12T09:00:00Z") }),
    ]

    const rows = leadsForView(leads, "tous")

    expect(idsOf(rows)).toEqual(["alice", "zoe", "aaron-out", "bob-out"])
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
      lead({ id: "out-email-zoe", name: null, email: "zoe@example.com", optedOutAt }),
      lead({ id: "active", name: "Alice Dupont" }),
      lead({ id: "out-email-bob", name: null, email: "bob@example.com", optedOutAt }),
    ]

    const rows = leadsForView(leads, "tous")

    expect(idsOf(rows)).toEqual(["active", "out-email-bob", "out-linkedin", "out-email-zoe"])
  })
})
