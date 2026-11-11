import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { interview: { delete: vi.fn(), count: vi.fn() } },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/server/crm/interviews", () => ({
  createInterview: vi.fn(),
  updateInterview: vi.fn(),
}))

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { interviewIdSchema } from "@/lib/ids"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import {
  createInterview as createInterviewRecord,
  updateInterview as updateInterviewRecord,
} from "@/server/crm/interviews"
import { fail, ok } from "@/server/result"

import { createInterview, deleteInterview, updateInterview } from "./interviews"
import { initialInterviewFormState } from "./interviews.types"

const MEETING = new Date("2026-09-28T08:00:00.000Z")

const BASE_FIELDS = {
  opportunityId: "o1",
  side: "ESN",
  type: "RECRUTEUR_RH",
  format: NONE_VALUE,
  status: "PLANIFIE",
  outcome: NONE_VALUE,
  scheduledAt: MEETING.toISOString(),
  score: "",
  decision: NONE_VALUE,
  notes: "",
  details: "",
  newCorrespondents: "[]",
}

function buildFormData(
  overrides: Record<string, string> = {},
  correspondentIds: readonly string[] = [],
): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  for (const id of correspondentIds) data.append("correspondentIds", id)
  return data
}

const WRITTEN = { id: interviewIdSchema.parse("i1") }

beforeEach(() => {
  vi.mocked(createInterviewRecord).mockResolvedValue(ok(WRITTEN))
  vi.mocked(updateInterviewRecord).mockResolvedValue(ok(WRITTEN))
})

it.each([
  ["createInterview", () => createInterview(initialInterviewFormState, buildFormData())],
  ["updateInterview", () => updateInterview("i1", initialInterviewFormState, buildFormData())],
  ["deleteInterview", () => deleteInterview("i1")],
])("%s rejects a call without a session, before touching the database", async (_name, call) => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

  const result = call()

  await expect(result).rejects.toThrow()
  expect(createInterviewRecord).not.toHaveBeenCalled()
  expect(updateInterviewRecord).not.toHaveBeenCalled()
  expect(prisma.interview.delete).not.toHaveBeenCalled()
})

describe("createInterview", () => {
  it("rejects a missing opportunity or date", async () => {
    const state = await createInterview(
      initialInterviewFormState,
      buildFormData({ opportunityId: "", scheduledAt: "" }),
    )

    expect(state.errors.opportunityId).toEqual(["Choisissez une opportunité"])
    expect(state.errors.scheduledAt).toBeDefined()
    expect(createInterviewRecord).not.toHaveBeenCalled()
  })

  it("rejects a date without its time zone offset", async () => {
    const state = await createInterview(
      initialInterviewFormState,
      buildFormData({ scheduledAt: "2026-09-28T10:00" }),
    )

    expect(state.errors.scheduledAt).toBeDefined()
  })

  it.each(["11", "-1", "1.5"])("rejects a score outside 0 to 10 (%s)", async (score) => {
    const state = await createInterview(initialInterviewFormState, buildFormData({ score }))

    expect(state.errors.score).toBeDefined()
    expect(createInterviewRecord).not.toHaveBeenCalled()
  })

  it("accepts a score of 10", async () => {
    await createInterview(initialInterviewFormState, buildFormData({ score: "10" }))

    expect(createInterviewRecord).toHaveBeenCalledWith(objectMatch({ score: 10 }))
  })

  it.each([
    ["the format chosen for the interview", "VISIO", "VISIO"],
    ["no format when none is chosen", NONE_VALUE, null],
  ])("hands %s to the domain", async (_label, format, expected) => {
    await createInterview(initialInterviewFormState, buildFormData({ format }))

    expect(createInterviewRecord).toHaveBeenCalledWith(objectMatch({ format: expected }))
  })

  it("hands the date and the distinct correspondent ids to the domain", async () => {
    await createInterview(initialInterviewFormState, buildFormData({}, ["p1", "p2", "p1"]))

    expect(createInterviewRecord).toHaveBeenCalledWith(
      objectMatch({ scheduledAt: MEETING, correspondentIds: ["p1", "p2"] }),
    )
  })

  it("hands a new correspondent to the domain with its contact type", async () => {
    await createInterview(
      initialInterviewFormState,
      buildFormData({
        newCorrespondents: JSON.stringify([
          {
            name: "Sami Bernard",
            jobRole: "RECRUTEUR",
            contactType: "COMMERCIAL",
            email: "sami@example.com",
          },
        ]),
      }),
    )

    expect(createInterviewRecord).toHaveBeenCalledWith(
      objectMatch({
        newCorrespondents: [
          objectMatch({
            name: "Sami Bernard",
            contactType: "COMMERCIAL",
            email: "sami@example.com",
          }),
        ],
      }),
    )
  })

  it("refuses a new correspondent without a contact type", async () => {
    const state = await createInterview(
      initialInterviewFormState,
      buildFormData({
        newCorrespondents: JSON.stringify([{ name: "Sami Bernard", email: "sami@example.com" }]),
      }),
    )

    expect(state.errors.newCorrespondents).toBeDefined()
    expect(createInterviewRecord).not.toHaveBeenCalled()
  })

  it.each([
    ["empties the outcome when the status is not Fait", "PLANIFIE", "POSITIF", null],
    ["keeps an empty outcome on a Fait interview", "FAIT", NONE_VALUE, null],
    ["keeps the outcome on a Fait interview", "FAIT", "POSITIF", "POSITIF"],
  ])("%s", async (_label, status, outcome, expected) => {
    await createInterview(initialInterviewFormState, buildFormData({ status, outcome }))

    expect(createInterviewRecord).toHaveBeenCalledWith(objectMatch({ outcome: expected }))
  })

  it("keeps the lists as they are after a refusal", async () => {
    vi.mocked(createInterviewRecord).mockResolvedValueOnce(
      fail({ code: "opportunity_without_intermediary" }),
    )

    await createInterview(initialInterviewFormState, buildFormData())

    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refreshes the lists after a success", async () => {
    await createInterview(initialInterviewFormState, buildFormData())

    expect(revalidatePath).toHaveBeenCalled()
  })

  it("answers an unexpected failure with an unknown error", async () => {
    vi.mocked(createInterviewRecord).mockRejectedValueOnce(new Error("database down"))

    const state = await createInterview(initialInterviewFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
    expect(state.errors).toEqual({})
  })
})

describe("domain errors", () => {
  it.each([
    [
      { code: "opportunity_not_found" },
      "opportunity_not_found",
      "opportunityId",
      "Cette opportunité n'existe plus, recharge la page",
    ],
    [
      { code: "opportunity_without_intermediary" },
      "opportunity_without_intermediary",
      "side",
      "Cette opportunité n'a pas d'ESN : l'entretien est mené par le client final",
    ],
    [
      { code: "correspondent_not_found" },
      "correspondent_not_found",
      "correspondentIds",
      "Un des correspondants n'existe plus, recharge la page",
    ],
    [
      {
        code: "correspondent_exists",
        conflict: {
          reason: "exists",
          field: "email",
          personName: "Sami Bernard",
          roles: { lead: false, contact: true },
        },
      },
      "correspondent_exists",
      "newCorrespondents",
      "Ce contact existe déjà : Sami Bernard",
    ],
    [
      {
        code: "correspondent_exists",
        conflict: {
          reason: "exists",
          field: "email",
          personName: "Sami Bernard",
          roles: { lead: true, contact: false },
        },
      },
      "correspondent_exists",
      "newCorrespondents",
      "Cette personne est déjà un lead : Sami Bernard, choisissez-la parmi les correspondants existants",
    ],
    [
      {
        code: "correspondent_exists",
        conflict: {
          reason: "opted_out",
          field: "email",
          optedOutAt: new Date("2026-10-01T00:00:00Z"),
        },
      },
      "correspondent_exists",
      "newCorrespondents",
      "Cette personne s'est opposée à la prospection le 01/10/2026",
    ],
  ] as const)("maps %j to its message and field", async (error, message, field, text) => {
    vi.mocked(createInterviewRecord).mockResolvedValueOnce(fail(error))

    const state = await createInterview(initialInterviewFormState, buildFormData())

    expect(state.message).toBe(message)
    expect(state.errors).toEqual({ [field]: [text] })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("updateInterview", () => {
  it("hands the parsed id and fields to the domain", async () => {
    const state = await updateInterview(
      "i1",
      initialInterviewFormState,
      buildFormData({ status: "FAIT", outcome: "POSITIF" }, ["p3"]),
    )

    expect(state.ok).toBe(true)
    expect(updateInterviewRecord).toHaveBeenCalledWith(
      "i1",
      objectMatch({ status: "FAIT", outcome: "POSITIF", correspondentIds: ["p3"] }),
    )
  })

  it("answers interview_not_found, keeps the typed values and refreshes the lists", async () => {
    vi.mocked(updateInterviewRecord).mockResolvedValueOnce(fail({ code: "not_found" }))

    const state = await updateInterview(
      "i1",
      initialInterviewFormState,
      buildFormData({ notes: "À rappeler" }),
    )

    expect(state.ok).toBe(false)
    expect(state.message).toBe("interview_not_found")
    expect(state.values?.notes).toBe("À rappeler")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("answers an empty id like a deleted interview, without calling the domain", async () => {
    const state = await updateInterview("", initialInterviewFormState, buildFormData())

    expect(state.message).toBe("interview_not_found")
    expect(updateInterviewRecord).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalled()
  })
})

describe("interview deleted since the screen loaded", () => {
  it("answers a delete with success", async () => {
    vi.mocked(prisma.interview.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.interview.count).mockResolvedValueOnce(0)

    const state = await deleteInterview("i1")

    expect(state.ok).toBe(true)
  })

  it("answers a delete with unknown_error when the interview still exists", async () => {
    vi.mocked(prisma.interview.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.interview.count).mockResolvedValueOnce(1)

    const state = await deleteInterview("i1")

    expect(state.message).toBe("unknown_error")
  })
})
