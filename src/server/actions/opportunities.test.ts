import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    opportunity: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    company: { findUnique: vi.fn() },
  },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { constraintViolation, objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"

import { createOpportunity, deleteOpportunity, updateOpportunity } from "./opportunities"
import { initialOpportunityFormState } from "./opportunities.types"

const BASE_FIELDS = {
  title: "Refonte d'application",
  role: "",
  status: "PROPOSEE",
  referrerId: NONE_VALUE,
  intermediaryId: NONE_VALUE,
  clientId: NONE_VALUE,
  dailyRate: "",
  contract: NONE_VALUE,
  workMode: NONE_VALUE,
  daysPerWeek: "",
  onSiteDays: "",
  zone: NONE_VALUE,
  startMonth: "",
  durationMonths: "",
  notes: "",
  details: "",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  return data
}

beforeEach(() => {
  vi.mocked(prisma.company.findUnique).mockResolvedValue({ types: ["ESN_RECRUTEMENT"] } as never)
  vi.mocked(prisma.opportunity.create).mockResolvedValue({ id: "o1" } as never)
  vi.mocked(prisma.opportunity.update).mockResolvedValue({ id: "o1" } as never)
  vi.mocked(prisma.opportunity.findUnique).mockResolvedValue({ intermediaryId: null } as never)
})

it.each([
  ["createOpportunity", () => createOpportunity(initialOpportunityFormState, buildFormData())],
  [
    "updateOpportunity",
    () => updateOpportunity("o1", initialOpportunityFormState, buildFormData()),
  ],
  ["deleteOpportunity", () => deleteOpportunity("o1")],
])("%s rejects a call without a session, before touching the database", async (_name, call) => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

  const result = call()

  await expect(result).rejects.toThrow()
  expect(prisma.opportunity.create).not.toHaveBeenCalled()
  expect(prisma.opportunity.update).not.toHaveBeenCalled()
  expect(prisma.opportunity.delete).not.toHaveBeenCalled()
})

describe("createOpportunity", () => {
  it("rejects a missing title", async () => {
    const state = await createOpportunity(initialOpportunityFormState, buildFormData({ title: "" }))

    expect(state.errors.title).toEqual(["L'intitulé est requis"])
    expect(prisma.opportunity.create).not.toHaveBeenCalled()
  })

  it("rejects a final client equal to the intermediary", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ intermediaryId: "c1", clientId: "c1" }),
    )

    expect(state.errors.clientId).toEqual(["Le client final ne peut pas être l'ESN"])
    expect(prisma.opportunity.create).not.toHaveBeenCalled()
  })

  it("rejects more on-site days than worked days", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ daysPerWeek: "3", onSiteDays: "4" }),
    )

    expect(state.errors.onSiteDays).toEqual(["Pas plus de jours sur site que de jours travaillés"])
    expect(prisma.opportunity.create).not.toHaveBeenCalled()
  })

  it("stores the start month as the first day of that month", async () => {
    await createOpportunity(
      initialOpportunityFormState,
      buildFormData({
        startMonth: "2026-04",
        dailyRate: "650",
        contract: "FREELANCE",
        workMode: "HYBRIDE",
        daysPerWeek: "4",
        onSiteDays: "2",
      }),
    )

    expect(prisma.opportunity.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          startMonth: new Date("2026-04-01T00:00:00.000Z"),
          dailyRate: 650,
          contract: "FREELANCE",
          workMode: "HYBRIDE",
          daysPerWeek: 4,
          onSiteDays: 2,
        }),
      }),
    )
  })

  it("accepts an unspecified rhythm and on-site days", async () => {
    await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ daysPerWeek: NONE_VALUE, onSiteDays: NONE_VALUE }),
    )

    expect(prisma.opportunity.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ daysPerWeek: null, onSiteDays: null }) }),
    )
  })

  it("accepts a direct client opportunity without an intermediary", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ clientId: "c2" }),
    )

    expect(state.ok).toBe(true)
    expect(prisma.company.findUnique).not.toHaveBeenCalled()
  })

  it.each([
    ["Opportunity_referrerId_fkey", "referrer_not_found", "referrerId"],
    ["Opportunity_intermediaryId_fkey", "company_not_found", "intermediaryId"],
    ["Opportunity_clientId_fkey", "company_not_found", "clientId"],
  ] as const)(
    "maps a missing referrer or company to its field (%s)",
    async (index, message, field) => {
      vi.mocked(prisma.opportunity.create).mockRejectedValueOnce(
        constraintViolation("P2003", index),
      )

      const state = await createOpportunity(
        initialOpportunityFormState,
        buildFormData({
          referrerId: "r-missing",
          intermediaryId: "esn-missing",
          clientId: "c-missing",
        }),
      )

      expect(state.message).toBe(message)
      expect(Object.keys(state.errors)).toEqual([field])
    },
  )

  it("falls back to an unknown error on a foreign key it does not recognise", async () => {
    vi.mocked(prisma.opportunity.create).mockRejectedValueOnce(
      constraintViolation("P2003", "Opportunity_other_fkey"),
    )

    const state = await createOpportunity(initialOpportunityFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
    expect(state.errors).toEqual({})
  })

  it("leaves a vanished intermediary to its foreign key, mapped to its field", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.opportunity.create).mockRejectedValueOnce(
      constraintViolation("P2003", "Opportunity_intermediaryId_fkey"),
    )

    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ intermediaryId: "esn-missing" }),
    )

    expect(state.message).toBe("company_not_found")
    expect(Object.keys(state.errors)).toEqual(["intermediaryId"])
  })

  it("rejects a daily rate above the integer column maximum", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ dailyRate: "2147483648" }),
    )

    expect(state.errors.dailyRate).toEqual(["Le TJM est un entier positif"])
    expect(prisma.opportunity.create).not.toHaveBeenCalled()
  })
})

describe("updateOpportunity", () => {
  it("refuses an intermediary that is not typed ESN / Recrutement", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ types: ["CLIENT_FINAL"] } as never)

    const state = await updateOpportunity(
      "o1",
      initialOpportunityFormState,
      buildFormData({ intermediaryId: "c1" }),
    )

    expect(state.message).toBe("intermediary_not_esn")
    expect(state.errors.intermediaryId).toEqual([
      "L'ESN doit être une entreprise de type ESN / Recrutement",
    ])
    expect(prisma.opportunity.update).not.toHaveBeenCalled()
  })

  it("keeps an intermediary that lost its ESN type when it is unchanged", async () => {
    vi.mocked(prisma.opportunity.findUnique).mockResolvedValue({ intermediaryId: "c1" } as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ types: ["CLIENT_FINAL"] } as never)

    const state = await updateOpportunity(
      "o1",
      initialOpportunityFormState,
      buildFormData({ intermediaryId: "c1", status: "ACCEPTEE" }),
    )

    expect(state.ok).toBe(true)
    expect(prisma.opportunity.update).toHaveBeenCalled()
  })
})

describe("opportunity deleted since the screen loaded", () => {
  it("answers an update with opportunity_not_found and keeps the typed values", async () => {
    vi.mocked(prisma.opportunity.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.opportunity.count).mockResolvedValueOnce(0)

    const state = await updateOpportunity("o1", initialOpportunityFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("opportunity_not_found")
    expect(state.values?.title).toBe("Refonte d'application")
  })

  it("answers an update with unknown_error when the opportunity still exists", async () => {
    vi.mocked(prisma.opportunity.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.opportunity.count).mockResolvedValueOnce(1)

    const state = await updateOpportunity("o1", initialOpportunityFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })

  it("answers a delete with success", async () => {
    vi.mocked(prisma.opportunity.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.opportunity.count).mockResolvedValueOnce(0)

    const state = await deleteOpportunity("o1")

    expect(state.ok).toBe(true)
  })

  it("answers a delete with unknown_error when the opportunity still exists", async () => {
    vi.mocked(prisma.opportunity.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.opportunity.count).mockResolvedValueOnce(1)

    const state = await deleteOpportunity("o1")

    expect(state.message).toBe("unknown_error")
  })
})
