import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    prospectingAction: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"

import {
  changeProspectingActionStatus,
  createProspectingAction,
  deleteProspectingAction,
  rescheduleProspectingAction,
  updateProspectingAction,
} from "./prospecting-actions"
import { initialProspectingActionFormState } from "./prospecting-actions.types"

const NOW = new Date("2026-03-11T13:30:00Z")
const MONDAY = new Date("2026-03-09T08:00:00Z")

const BASE_FIELDS = {
  title: "Relance proposition",
  personId: "p1",
  channel: "DM_LINKEDIN",
  status: "A_FAIRE",
  occurredAt: MONDAY.toISOString(),
  respondedAt: "",
  message: "",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  return data
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

beforeEach(() => {
  // Seule l'horloge est figée : les promesses et les timers du logger restent réels.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.mocked(prisma.prospectingAction.create).mockResolvedValue({ id: "a1" } as never)
  vi.mocked(prisma.prospectingAction.update).mockResolvedValue({ id: "a1" } as never)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("createProspectingAction", () => {
  it("rejects a missing title or person", async () => {
    const state = await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData({ title: "", personId: "" }),
    )

    expect(state.errors.title).toEqual(["L'action est requise"])
    expect(state.errors.personId).toEqual(["Choisissez une personne"])
    expect(prisma.prospectingAction.create).not.toHaveBeenCalled()
  })

  it("rejects a date without its time zone offset", async () => {
    const state = await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData({ occurredAt: "2026-03-12T14:30" }),
    )

    expect(state.errors.occurredAt).toBeDefined()
  })

  it("creates a replied action with its reply time", async () => {
    await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData({ status: "REPONDU" }),
    )

    expect(prisma.prospectingAction.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({ status: "REPONDU", occurredAt: MONDAY, respondedAt: NOW }),
      }),
    )
  })

  it("maps a missing person to the person field", async () => {
    vi.mocked(prisma.prospectingAction.create).mockRejectedValue({ code: "P2003" })

    const state = await createProspectingAction(initialProspectingActionFormState, buildFormData())

    expect(state.message).toBe("person_not_found")
    expect(state.errors.personId).toBeDefined()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createProspectingAction(initialProspectingActionFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.prospectingAction.create).not.toHaveBeenCalled()
  })
})

describe("updateProspectingAction", () => {
  it("applies the status rules on update, from the stored status and date", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockResolvedValue({
      status: "A_FAIRE",
      occurredAt: MONDAY,
      respondedAt: null,
    } as never)

    await updateProspectingAction(
      "a1",
      initialProspectingActionFormState,
      buildFormData({ status: "FAIT" }),
    )

    expect(prisma.prospectingAction.update).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ status: "FAIT", occurredAt: NOW, respondedAt: null }) }),
    )
  })

  it("answers prospecting_action_not_found when the action was deleted meanwhile", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.prospectingAction.count).mockResolvedValueOnce(0)

    const state = await updateProspectingAction(
      "a1",
      initialProspectingActionFormState,
      buildFormData(),
    )

    expect(state.message).toBe("prospecting_action_not_found")
  })

  it("answers unknown_error on a P2025 while the action still exists", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.prospectingAction.count).mockResolvedValueOnce(1)

    const state = await updateProspectingAction(
      "a1",
      initialProspectingActionFormState,
      buildFormData(),
    )

    expect(state.message).toBe("unknown_error")
  })
})

describe("deleteProspectingAction", () => {
  it("treats an action already deleted elsewhere as deleted", async () => {
    vi.mocked(prisma.prospectingAction.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.prospectingAction.count).mockResolvedValueOnce(0)

    const state = await deleteProspectingAction("a1")

    expect(state.ok).toBe(true)
  })

  it("answers unknown_error on a P2025 while the action still exists", async () => {
    vi.mocked(prisma.prospectingAction.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.prospectingAction.count).mockResolvedValueOnce(1)

    const state = await deleteProspectingAction("a1")

    expect(state.message).toBe("unknown_error")
  })
})

describe("changeProspectingActionStatus", () => {
  it("changes the status alone and applies the same rules", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockResolvedValue({
      status: "FAIT",
      occurredAt: MONDAY,
      respondedAt: null,
    } as never)

    const state = await changeProspectingActionStatus("a1", "REPONDU")

    expect(state.ok).toBe(true)
    expect(prisma.prospectingAction.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "REPONDU", occurredAt: MONDAY, respondedAt: NOW },
    })
  })
})

describe("rescheduleProspectingAction", () => {
  const THURSDAY = new Date("2026-03-12T08:00:00Z")

  it("moves a to-do action to its new time", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValue({ count: 1 })

    const state = await rescheduleProspectingAction("a1", THURSDAY.toISOString())

    expect(state.ok).toBe(true)
    expect(prisma.prospectingAction.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", status: "A_FAIRE" },
      data: { occurredAt: THURSDAY },
    })
  })

  it("refuses to move an action already sent", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.prospectingAction.findUnique).mockResolvedValue({ id: "a1" } as never)

    const state = await rescheduleProspectingAction("a1", THURSDAY.toISOString())

    expect(state.ok).toBe(false)
    expect(state.errors.occurredAt).toEqual(["Seule une action à faire se replanifie"])
  })

  it("tells a deleted action apart from one already sent", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.prospectingAction.findUnique).mockResolvedValue(null)

    const state = await rescheduleProspectingAction("a1", THURSDAY.toISOString())

    expect(state.ok).toBe(false)
    expect(state.errors.occurredAt).toEqual(["Cette action a été supprimée"])
  })

  it("refreshes the screens after a refusal, which showed a stale action", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.prospectingAction.findUnique).mockResolvedValue({ id: "a1" } as never)

    await rescheduleProspectingAction("a1", THURSDAY.toISOString())

    expect(revalidatePath).toHaveBeenCalled()
  })

  it("rejects a date without its time zone offset", async () => {
    const state = await rescheduleProspectingAction("a1", "2026-03-12T09:00")

    expect(state.errors.occurredAt).toBeDefined()
    expect(prisma.prospectingAction.updateMany).not.toHaveBeenCalled()
  })

  it("rejects a reschedule without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = rescheduleProspectingAction("a1", THURSDAY.toISOString())

    await expect(result).rejects.toThrow()
    expect(prisma.prospectingAction.updateMany).not.toHaveBeenCalled()
  })
})
