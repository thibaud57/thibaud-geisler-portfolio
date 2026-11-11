import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { opportunity: { delete: vi.fn(), count: vi.fn() } },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/server/crm/opportunities", () => ({
  createOpportunity: vi.fn(),
  updateOpportunity: vi.fn(),
}))

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { opportunityIdSchema } from "@/lib/ids"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import {
  createOpportunity as createOpportunityRecord,
  updateOpportunity as updateOpportunityRecord,
} from "@/server/crm/opportunities"
import { fail, ok } from "@/server/result"

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

const SUMMARY = { id: opportunityIdSchema.parse("o1"), title: "Refonte d'application" }

beforeEach(() => {
  vi.mocked(createOpportunityRecord).mockResolvedValue(ok(SUMMARY))
  vi.mocked(updateOpportunityRecord).mockResolvedValue(ok(SUMMARY))
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
  expect(createOpportunityRecord).not.toHaveBeenCalled()
  expect(updateOpportunityRecord).not.toHaveBeenCalled()
  expect(prisma.opportunity.delete).not.toHaveBeenCalled()
})

describe("createOpportunity", () => {
  it("rejects a missing title", async () => {
    const state = await createOpportunity(initialOpportunityFormState, buildFormData({ title: "" }))

    expect(state.errors.title).toEqual(["L'intitulé est requis"])
    expect(createOpportunityRecord).not.toHaveBeenCalled()
  })

  it("rejects a final client equal to the intermediary", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ intermediaryId: "c1", clientId: "c1" }),
    )

    expect(state.errors.clientId).toEqual(["Le client final ne peut pas être l'ESN"])
    expect(createOpportunityRecord).not.toHaveBeenCalled()
  })

  it("rejects more on-site days than worked days", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ daysPerWeek: "3", onSiteDays: "4" }),
    )

    expect(state.errors.onSiteDays).toEqual(["Pas plus de jours sur site que de jours travaillés"])
    expect(createOpportunityRecord).not.toHaveBeenCalled()
  })

  it("rejects a daily rate above the integer column maximum", async () => {
    const state = await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ dailyRate: "2147483648" }),
    )

    expect(state.errors.dailyRate).toEqual(["Le TJM est un entier positif"])
    expect(createOpportunityRecord).not.toHaveBeenCalled()
  })

  it("hands the parsed fields to the domain, the start month as the first day of that month", async () => {
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

    expect(createOpportunityRecord).toHaveBeenCalledWith(
      objectMatch({
        startMonth: new Date("2026-04-01T00:00:00.000Z"),
        dailyRate: 650,
        contract: "FREELANCE",
        workMode: "HYBRIDE",
        daysPerWeek: 4,
        onSiteDays: 2,
      }),
    )
  })

  it("accepts an unspecified rhythm and on-site days", async () => {
    await createOpportunity(
      initialOpportunityFormState,
      buildFormData({ daysPerWeek: NONE_VALUE, onSiteDays: NONE_VALUE }),
    )

    expect(createOpportunityRecord).toHaveBeenCalledWith(
      objectMatch({ daysPerWeek: null, onSiteDays: null }),
    )
  })

  it("keeps the lists as they are after a refusal", async () => {
    vi.mocked(createOpportunityRecord).mockResolvedValueOnce(fail({ code: "intermediary_not_esn" }))

    await createOpportunity(initialOpportunityFormState, buildFormData())

    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refreshes the lists after a success", async () => {
    await createOpportunity(initialOpportunityFormState, buildFormData())

    expect(revalidatePath).toHaveBeenCalled()
  })

  it("answers an unexpected failure with an unknown error", async () => {
    vi.mocked(createOpportunityRecord).mockRejectedValueOnce(new Error("database down"))

    const state = await createOpportunity(initialOpportunityFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
    expect(state.errors).toEqual({})
  })
})

describe("domain errors", () => {
  it.each([
    [
      { code: "intermediary_not_esn" },
      "intermediary_not_esn",
      "intermediaryId",
      "L'ESN doit être une entreprise de type ESN / Recrutement",
    ],
    [
      { code: "referrer_not_found", field: "referrerId" },
      "referrer_not_found",
      "referrerId",
      "Cet apporteur n'existe plus, recharge la page",
    ],
    [
      { code: "company_not_found", field: "intermediaryId" },
      "company_not_found",
      "intermediaryId",
      "Cette entreprise n'existe plus, recharge la page",
    ],
    [
      { code: "company_not_found", field: "clientId" },
      "company_not_found",
      "clientId",
      "Cette entreprise n'existe plus, recharge la page",
    ],
    [
      { code: "client_is_intermediary" },
      null,
      "clientId",
      "Le client final ne peut pas être l'ESN",
    ],
    [
      { code: "days_out_of_range" },
      null,
      "onSiteDays",
      "Pas plus de jours sur site que de jours travaillés",
    ],
  ] as const)("maps %j to its message and field", async (error, message, field, text) => {
    vi.mocked(updateOpportunityRecord).mockResolvedValueOnce(fail(error))

    const state = await updateOpportunity("o1", initialOpportunityFormState, buildFormData())

    expect(state.message).toBe(message)
    expect(state.errors).toEqual({ [field]: [text] })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("updateOpportunity", () => {
  it("hands the parsed id and fields to the domain", async () => {
    const state = await updateOpportunity(
      "o1",
      initialOpportunityFormState,
      buildFormData({ intermediaryId: "c1", status: "ACCEPTEE" }),
    )

    expect(state.ok).toBe(true)
    expect(updateOpportunityRecord).toHaveBeenCalledWith(
      "o1",
      objectMatch({ intermediaryId: "c1", status: "ACCEPTEE" }),
    )
  })

  it("answers opportunity_not_found, keeps the typed values and refreshes the lists", async () => {
    vi.mocked(updateOpportunityRecord).mockResolvedValueOnce(fail({ code: "not_found" }))

    const state = await updateOpportunity("o1", initialOpportunityFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("opportunity_not_found")
    expect(state.values?.title).toBe("Refonte d'application")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("answers an empty id like a deleted opportunity, without calling the domain", async () => {
    const state = await updateOpportunity("", initialOpportunityFormState, buildFormData())

    expect(state.message).toBe("opportunity_not_found")
    expect(updateOpportunityRecord).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalled()
  })
})

describe("opportunity deleted since the screen loaded", () => {
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
