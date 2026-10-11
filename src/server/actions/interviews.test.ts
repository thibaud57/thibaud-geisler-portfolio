import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const client = {
    interview: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/person"

import { createInterview, updateInterview } from "./interviews"
import { initialInterviewFormState } from "./interviews.types"

const MEETING = new Date("2026-09-28T08:00:00.000Z")

const BASE_FIELDS = {
  opportunityId: "o1",
  side: "ESN",
  type: "RECRUTEUR_RH",
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

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

// `vi.clearAllMocks` n'efface que les appels : les réponses sont remises à chaque test.
beforeEach(() => {
  vi.mocked(prisma.opportunity.findUnique).mockResolvedValue({ intermediaryId: "c-esn" } as never)
  vi.mocked(prisma.person.count).mockResolvedValue(0)
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.person.create).mockResolvedValue({ id: "new-1" } as never)
  vi.mocked(prisma.interview.create).mockResolvedValue({ id: "i1" } as never)
  vi.mocked(prisma.interview.update).mockResolvedValue({ id: "i1" } as never)
})

afterEach(() => {
  vi.clearAllMocks()
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

  it("empties the outcome when the status is not Fait", async () => {
    await createInterview(
      initialInterviewFormState,
      buildFormData({ status: "PLANIFIE", outcome: "POSITIF" }),
    )

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ outcome: null }) }),
    )
  })

  it("keeps an empty outcome on a Fait interview", async () => {
    await createInterview(initialInterviewFormState, buildFormData({ status: "FAIT" }))

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ outcome: null }) }),
    )
  })

  it("keeps the outcome on a Fait interview", async () => {
    await createInterview(
      initialInterviewFormState,
      buildFormData({ status: "FAIT", outcome: "POSITIF" }),
    )

    expect(prisma.interview.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ outcome: "POSITIF" }) }),
    )
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createInterview(initialInterviewFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.opportunity.findUnique).not.toHaveBeenCalled()
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
