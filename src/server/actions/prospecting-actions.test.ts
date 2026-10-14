import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    prospectingAction: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    lead: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { constraintViolation, objectMatch } from "@/lib/matchers-test-setup"
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
const MONDAY_MIDNIGHT_IN_PARIS = new Date("2026-03-08T23:00:00Z")
const REPLY = "Merci, on peut en parler jeudi."
const OPTED_OUT_AT = new Date("2026-02-02T10:00:00Z")
const OPTED_OUT_MESSAGE = "Cette personne s'est opposée à la prospection le 02/02/2026"
const PROSPECTABLE_ROWS = [{ optedOutAt: null }]
const OPTED_OUT_ROWS = [{ optedOutAt: OPTED_OUT_AT }]

const BASE_FIELDS = {
  title: "Relance proposition",
  personId: "p1",
  channel: "DM_LINKEDIN",
  status: "A_FAIRE",
  occurredAt: "2026-03-09",
  respondedAt: "",
  message: "",
  reply: "",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  return data
}

beforeEach(() => {
  // Seule l'horloge est figée : les promesses et les timers du logger restent réels.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.mocked(prisma.prospectingAction.create).mockResolvedValue({ id: "a1" } as never)
  vi.mocked(prisma.prospectingAction.update).mockResolvedValue({ id: "a1" } as never)
  vi.mocked(prisma.lead.findUnique).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.$queryRaw).mockResolvedValue(PROSPECTABLE_ROWS)
})

afterEach(() => {
  vi.useRealTimers()
})

it.each([
  [
    "createProspectingAction",
    () => createProspectingAction(initialProspectingActionFormState, buildFormData()),
  ],
  [
    "updateProspectingAction",
    () => updateProspectingAction("a1", initialProspectingActionFormState, buildFormData()),
  ],
  ["deleteProspectingAction", () => deleteProspectingAction("a1")],
  ["changeProspectingActionStatus", () => changeProspectingActionStatus("a1", "FAIT")],
  ["rescheduleProspectingAction", () => rescheduleProspectingAction("a1", "2026-03-12")],
])("%s rejects a call without a session, before touching the database", async (_name, call) => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

  const result = call()

  await expect(result).rejects.toThrow()
  expect(prisma.$transaction).not.toHaveBeenCalled()
  expect(prisma.prospectingAction.create).not.toHaveBeenCalled()
  expect(prisma.prospectingAction.update).not.toHaveBeenCalled()
  expect(prisma.prospectingAction.updateMany).not.toHaveBeenCalled()
  expect(prisma.prospectingAction.delete).not.toHaveBeenCalled()
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

  it("rejects a date that is not a calendar day", async () => {
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
        data: objectMatch({
          status: "REPONDU",
          occurredAt: MONDAY_MIDNIGHT_IN_PARIS,
          respondedAt: NOW,
        }),
      }),
    )
  })

  it("stores the reply with a replied action", async () => {
    await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData({ status: "REPONDU", reply: REPLY }),
    )

    expect(prisma.prospectingAction.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ status: "REPONDU", reply: REPLY }) }),
    )
  })

  it("maps a missing person to the person field", async () => {
    vi.mocked(prisma.prospectingAction.create).mockRejectedValueOnce(
      constraintViolation("P2003", "ProspectingAction_personId_fkey"),
    )

    const state = await createProspectingAction(initialProspectingActionFormState, buildFormData())

    expect(state.message).toBe("person_not_found")
    expect(state.errors.personId).toBeDefined()
  })

  it("refuses a person without a lead record", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce(null)

    const state = await createProspectingAction(initialProspectingActionFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.errors.personId).toEqual(["Cette personne n'a pas de fiche lead"])
    expect(prisma.prospectingAction.create).not.toHaveBeenCalled()
  })

  it("refuses a person who opposed prospecting", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce(OPTED_OUT_ROWS)

    const state = await createProspectingAction(initialProspectingActionFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.errors.personId).toEqual([OPTED_OUT_MESSAGE])
    expect(prisma.prospectingAction.create).not.toHaveBeenCalled()
  })
})

describe("updateProspectingAction", () => {
  it("applies the status rules on update, from the stored status and date", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockResolvedValueOnce({
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

  it("refuses to move an action to a person without a lead record", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce(null)

    const state = await updateProspectingAction(
      "a1",
      initialProspectingActionFormState,
      buildFormData(),
    )

    expect(state.errors.personId).toEqual(["Cette personne n'a pas de fiche lead"])
    expect(prisma.prospectingAction.update).not.toHaveBeenCalled()
  })

  it("refuses to rewrite an action of a person who opposed prospecting", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]).mockResolvedValueOnce(OPTED_OUT_ROWS)

    const state = await updateProspectingAction(
      "a1",
      initialProspectingActionFormState,
      buildFormData({ status: "FAIT" }),
    )

    expect(state.errors.personId).toEqual([OPTED_OUT_MESSAGE])
    expect(prisma.prospectingAction.update).not.toHaveBeenCalled()
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
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockResolvedValueOnce({
      status: "FAIT",
      occurredAt: MONDAY,
      respondedAt: null,
      reply: null,
    } as never)

    const state = await changeProspectingActionStatus("a1", "REPONDU")

    expect(state.ok).toBe(true)
    expect(prisma.prospectingAction.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "REPONDU", occurredAt: MONDAY, respondedAt: NOW, reply: null },
    })
  })

  it("keeps the reply when the status alone moves a replied action to converted", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockResolvedValueOnce({
      status: "REPONDU",
      occurredAt: MONDAY,
      respondedAt: NOW,
      reply: REPLY,
    } as never)

    await changeProspectingActionStatus("a1", "CONVERTI")

    expect(prisma.prospectingAction.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "CONVERTI", occurredAt: MONDAY, respondedAt: NOW, reply: REPLY },
    })
  })

  it("clears the reply when the status alone moves a replied action back to done", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockResolvedValueOnce({
      status: "REPONDU",
      occurredAt: MONDAY,
      respondedAt: NOW,
      reply: REPLY,
    } as never)

    await changeProspectingActionStatus("a1", "FAIT")

    expect(prisma.prospectingAction.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "FAIT", occurredAt: MONDAY, respondedAt: null, reply: null },
    })
  })

  it("refuses to move an action of a person who opposed prospecting", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]).mockResolvedValueOnce(OPTED_OUT_ROWS)

    const state = await changeProspectingActionStatus("a1", "FAIT")

    expect(state.ok).toBe(false)
    expect(state.errors.status).toEqual([OPTED_OUT_MESSAGE])
    expect(prisma.prospectingAction.update).not.toHaveBeenCalled()
  })

  it("tells the board the action was deleted and refreshes the screens", async () => {
    vi.mocked(prisma.prospectingAction.findUniqueOrThrow).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.prospectingAction.count).mockResolvedValueOnce(0)

    const state = await changeProspectingActionStatus("a1", "FAIT")

    expect(state.ok).toBe(false)
    expect(state.errors.status).toEqual(["Cette action a été supprimée"])
    expect(revalidatePath).toHaveBeenCalled()
  })
})

describe("rescheduleProspectingAction", () => {
  const THURSDAY = "2026-03-12"
  const THURSDAY_MIDNIGHT_IN_PARIS = new Date("2026-03-11T23:00:00Z")

  it("moves a to-do action to its new day", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValueOnce({ count: 1 })

    const state = await rescheduleProspectingAction("a1", THURSDAY)

    expect(state.ok).toBe(true)
    expect(prisma.prospectingAction.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", status: "A_FAIRE" },
      data: { occurredAt: THURSDAY_MIDNIGHT_IN_PARIS },
    })
  })

  it("refuses to move an action already sent", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValueOnce({ count: 0 })
    vi.mocked(prisma.prospectingAction.count).mockResolvedValueOnce(1)

    const state = await rescheduleProspectingAction("a1", THURSDAY)

    expect(state.ok).toBe(false)
    expect(state.errors.occurredAt).toEqual(["Seule une action à faire se replanifie"])
  })

  it("refuses to move an action of a person who opposed prospecting", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]).mockResolvedValueOnce(OPTED_OUT_ROWS)

    const state = await rescheduleProspectingAction("a1", THURSDAY)

    expect(state.ok).toBe(false)
    expect(state.errors.occurredAt).toEqual([OPTED_OUT_MESSAGE])
    expect(prisma.prospectingAction.updateMany).not.toHaveBeenCalled()
  })

  it("tells a deleted action apart from one already sent", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValueOnce({ count: 0 })
    vi.mocked(prisma.prospectingAction.count).mockResolvedValueOnce(0)

    const state = await rescheduleProspectingAction("a1", THURSDAY)

    expect(state.ok).toBe(false)
    expect(state.errors.occurredAt).toEqual(["Cette action a été supprimée"])
  })

  it("refreshes the screens after a refusal, which showed a stale action", async () => {
    vi.mocked(prisma.prospectingAction.updateMany).mockResolvedValueOnce({ count: 0 })
    vi.mocked(prisma.prospectingAction.count).mockResolvedValueOnce(1)

    await rescheduleProspectingAction("a1", THURSDAY)

    expect(revalidatePath).toHaveBeenCalled()
  })

  it("rejects a value that is not a calendar day", async () => {
    const state = await rescheduleProspectingAction("a1", "2026-03-12T09:00")

    expect(state.errors.occurredAt).toBeDefined()
    expect(prisma.prospectingAction.updateMany).not.toHaveBeenCalled()
  })
})
