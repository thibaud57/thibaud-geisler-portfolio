import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const client = {
    interview: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    opportunity: { findUnique: vi.fn() },
    person: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  }
  // Le mock rejoue la transaction avec le même client : pas de vraie base derrière `tx`.
  return {
    prisma: {
      ...client,
      $transaction: vi.fn((callback: (tx: typeof client) => unknown) => callback(client)),
    },
  }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"

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

beforeEach(() => {
  vi.mocked(prisma.opportunity.findUnique).mockResolvedValue({ intermediaryId: "c-esn" } as never)
  vi.mocked(prisma.person.count).mockResolvedValue(0)
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.person.create).mockResolvedValue({ id: "new-1" } as never)
  vi.mocked(prisma.interview.create).mockResolvedValue({ id: "i1" } as never)
  vi.mocked(prisma.interview.update).mockResolvedValue({ id: "i1" } as never)
})

it.each([
  ["createInterview", () => createInterview(initialInterviewFormState, buildFormData())],
  ["updateInterview", () => updateInterview("i1", initialInterviewFormState, buildFormData())],
  ["deleteInterview", () => deleteInterview("i1")],
])("%s rejects a call without a session, before touching the database", async (_name, call) => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

  const result = call()

  await expect(result).rejects.toThrow()
  expect(prisma.$transaction).not.toHaveBeenCalled()
  expect(prisma.opportunity.findUnique).not.toHaveBeenCalled()
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
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it("rejects a date without its time zone offset", async () => {
    const state = await createInterview(
      initialInterviewFormState,
      buildFormData({ scheduledAt: "2026-09-28T10:00" }),
    )

    expect(state.errors.scheduledAt).toBeDefined()
  })

  it("refuses an interview led by the intermediary of an opportunity without one", async () => {
    vi.mocked(prisma.opportunity.findUnique).mockResolvedValue({ intermediaryId: null } as never)

    const state = await createInterview(initialInterviewFormState, buildFormData({ side: "ESN" }))

    expect(state.message).toBe("opportunity_without_intermediary")
    expect(state.errors.side).toEqual([
      "Cette opportunité n'a pas d'ESN : l'entretien est mené par le client final",
    ])
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it("refuses an unknown or opted-out correspondent", async () => {
    vi.mocked(prisma.person.count).mockResolvedValue(1)

    const state = await createInterview(initialInterviewFormState, buildFormData({}, ["p1", "p2"]))

    expect(state.message).toBe("correspondent_not_found")
    expect(prisma.person.count).toHaveBeenCalledWith(
      objectMatch({ where: objectMatch({ optedOutAt: null }) }),
    )
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it.each(["11", "-1", "1.5"])("rejects a score outside 0 to 10 (%s)", async (score) => {
    const state = await createInterview(initialInterviewFormState, buildFormData({ score }))

    expect(state.errors.score).toBeDefined()
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it("accepts a score of 10", async () => {
    await createInterview(initialInterviewFormState, buildFormData({ score: "10" }))

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ score: 10 }) }),
    )
  })

  it.each([
    ["the format chosen for the interview", "VISIO", "VISIO"],
    ["no format when none is chosen", NONE_VALUE, null],
  ])("saves %s", async (_label, format, expected) => {
    await createInterview(initialInterviewFormState, buildFormData({ format }))

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ format: expected }) }),
    )
  })

  it("connects the correspondents on create", async () => {
    vi.mocked(prisma.person.count).mockResolvedValue(2)

    await createInterview(initialInterviewFormState, buildFormData({}, ["p1", "p2", "p1"]))

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          scheduledAt: MEETING,
          correspondents: { connect: [{ id: "p1" }, { id: "p2" }] },
        }),
      }),
    )
  })

  it("creates a Contact-role person of the chosen type for a new correspondent", async () => {
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

    expect(prisma.person.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          name: "Sami Bernard",
          contact: { create: { types: ["COMMERCIAL"], status: "ACTIF" } },
        }),
      }),
    )
    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ correspondents: { connect: [{ id: "new-1" }] } }) }),
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
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it("refuses a new correspondent whose email is already known", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: "Sami Bernard",
      email: "sami@example.com",
      optedOutAt: null,
      lead: null,
      contact: { personId: "existing" },
    } as never)

    const state = await createInterview(
      initialInterviewFormState,
      buildFormData({
        newCorrespondents: JSON.stringify([
          { name: "Sami Bernard", contactType: "COMMERCIAL", email: "sami@example.com" },
        ]),
      }),
    )

    expect(state.message).toBe("correspondent_exists")
    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      objectMatch({ where: objectMatch({ OR: [{ email: "sami@example.com" }] }) }),
    )
    expect(prisma.person.create).not.toHaveBeenCalled()
    expect(prisma.interview.create).not.toHaveBeenCalled()
  })

  it.each([
    ["empties the outcome when the status is not Fait", "PLANIFIE", "POSITIF", null],
    ["keeps an empty outcome on a Fait interview", "FAIT", NONE_VALUE, null],
    ["keeps the outcome on a Fait interview", "FAIT", "POSITIF", "POSITIF"],
  ])("%s", async (_label, status, outcome, expected) => {
    await createInterview(initialInterviewFormState, buildFormData({ status, outcome }))

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ outcome: expected }) }),
    )
  })
})

describe("updateInterview", () => {
  it("replaces the correspondents on update", async () => {
    vi.mocked(prisma.person.count).mockResolvedValue(1)

    await updateInterview("i1", initialInterviewFormState, buildFormData({}, ["p3"]))

    expect(prisma.interview.update).toHaveBeenCalledWith(
      objectMatch({
        where: { id: "i1" },
        data: objectMatch({ correspondents: { set: [{ id: "p3" }] } }),
      }),
    )
  })

  it("keeps an opted-out correspondent already attached to the interview", async () => {
    vi.mocked(prisma.person.count).mockResolvedValue(1)

    await updateInterview("i1", initialInterviewFormState, buildFormData({}, ["p3"]))

    expect(prisma.person.count).toHaveBeenCalledWith(
      objectMatch({
        where: objectMatch({
          OR: [{ optedOutAt: null }, { interviews: { some: { id: "i1" } } }],
        }),
      }),
    )
    expect(prisma.interview.update).toHaveBeenCalled()
  })
})

describe("interview deleted since the screen loaded", () => {
  it("answers an update with interview_not_found and keeps the typed values", async () => {
    vi.mocked(prisma.interview.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.interview.count).mockResolvedValueOnce(0)

    const state = await updateInterview(
      "i1",
      initialInterviewFormState,
      buildFormData({ notes: "À rappeler" }),
    )

    expect(state.ok).toBe(false)
    expect(state.message).toBe("interview_not_found")
    expect(state.values?.notes).toBe("À rappeler")
  })

  it("answers an update with unknown_error when the interview still exists", async () => {
    vi.mocked(prisma.interview.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.interview.count).mockResolvedValueOnce(1)

    const state = await updateInterview("i1", initialInterviewFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })

  it("answers a creation with unknown_error when a correspondent to attach vanished", async () => {
    vi.mocked(prisma.interview.create).mockRejectedValueOnce({ code: "P2025" })

    const state = await createInterview(initialInterviewFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })

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
