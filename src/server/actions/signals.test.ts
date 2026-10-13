import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    signal: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    lead: { findUnique: vi.fn() },
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

import { createCompanySignal, createPersonSignal, deleteSignal, updateSignal } from "./signals"
import { initialSignalFormState } from "./signals.types"

const BASE_FIELDS = {
  type: "OFFRE_POSTE",
  occurredOn: "2026-09-14",
  content: "Recrute deux développeurs IA",
  sourceUrl: "https://example.com/jobs",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  return data
}

beforeEach(() => {
  vi.mocked(prisma.signal.create).mockResolvedValue({ id: "s1" } as never)
  vi.mocked(prisma.signal.update).mockResolvedValue({ id: "s1" } as never)
})

it.each([
  ["createCompanySignal", () => createCompanySignal("c1", initialSignalFormState, buildFormData())],
  ["createPersonSignal", () => createPersonSignal("l1", initialSignalFormState, buildFormData())],
  ["updateSignal", () => updateSignal("s1", initialSignalFormState, buildFormData())],
  ["deleteSignal", () => deleteSignal("s1")],
])("%s rejects a call without a session, before touching the database", async (_name, call) => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

  const result = call()

  await expect(result).rejects.toThrow()
  expect(prisma.signal.create).not.toHaveBeenCalled()
  expect(prisma.signal.update).not.toHaveBeenCalled()
  expect(prisma.signal.delete).not.toHaveBeenCalled()
})

describe("createCompanySignal", () => {
  it("attaches a new signal to its company", async () => {
    await createCompanySignal("c1", initialSignalFormState, buildFormData())

    expect(prisma.signal.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          companyId: "c1",
          type: "OFFRE_POSTE",
          occurredOn: new Date(Date.UTC(2026, 8, 14)),
        }),
      }),
    )
  })

  it("refuses a person-level type on a company", async () => {
    const state = await createCompanySignal(
      "c1",
      initialSignalFormState,
      buildFormData({ type: "POST" }),
    )

    expect(state.errors.type).toEqual(["Ce type ne concerne pas cette fiche"])
    expect(prisma.signal.create).not.toHaveBeenCalled()
  })

  it("reports a company that no longer exists", async () => {
    vi.mocked(prisma.signal.create).mockRejectedValueOnce(
      constraintViolation("P2003", "Signal_companyId_fkey"),
    )

    const state = await createCompanySignal("c1", initialSignalFormState, buildFormData())

    expect(state.message).toBe("company_not_found")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("refuses a content over 500 characters and a link over 2048", async () => {
    const state = await createCompanySignal(
      "c1",
      initialSignalFormState,
      buildFormData({
        content: "a".repeat(501),
        sourceUrl: `https://example.com/${"a".repeat(2048)}`,
      }),
    )

    expect(state.errors.content).toEqual(["Le contenu ne peut pas dépasser 500 caractères"])
    expect(state.errors.sourceUrl).toEqual(["Le lien ne peut pas dépasser 2048 caractères"])
    expect(prisma.signal.create).not.toHaveBeenCalled()
  })
})

describe("createPersonSignal", () => {
  it.each([
    { label: "an inbound lead", origin: "INBOUND", optedOutAt: null },
    {
      label: "an opted-out lead",
      origin: "OUTBOUND",
      optedOutAt: new Date("2026-09-01T10:00:00.000Z"),
    },
  ])("refuses a signal on $label", async ({ origin, optedOutAt }) => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
      origin,
      person: { optedOutAt },
    } as never)

    const state = await createPersonSignal(
      "l1",
      initialSignalFormState,
      buildFormData({ type: "POST" }),
    )

    expect(state.message).toBe("lead_not_eligible")
    expect(prisma.signal.create).not.toHaveBeenCalled()
  })

  it("checks the lead and creates the signal in one transaction", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
      origin: "OUTBOUND",
      person: { optedOutAt: null },
    } as never)

    const state = await createPersonSignal(
      "l1",
      initialSignalFormState,
      buildFormData({ type: "POST" }),
    )

    expect(state.ok).toBe(true)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(prisma.signal.create).toHaveBeenCalledOnce()
  })
})

describe("updateSignal", () => {
  it("edits a signal of a lead that became inbound", async () => {
    vi.mocked(prisma.signal.findUnique).mockResolvedValueOnce({
      companyId: null,
      personId: "l1",
    } as never)

    const state = await updateSignal("s1", initialSignalFormState, buildFormData({ type: "POST" }))

    expect(state.ok).toBe(true)
    expect(prisma.signal.update).toHaveBeenCalledOnce()
  })

  it("reports a signal that no longer exists", async () => {
    vi.mocked(prisma.signal.findUnique).mockResolvedValueOnce(null)

    const state = await updateSignal("s1", initialSignalFormState, buildFormData())

    expect(state.message).toBe("signal_not_found")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("reports a signal deleted between the read and the update", async () => {
    vi.mocked(prisma.signal.findUnique).mockResolvedValueOnce({
      companyId: "c1",
      personId: null,
    } as never)
    vi.mocked(prisma.signal.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.signal.count).mockResolvedValueOnce(0)

    const state = await updateSignal("s1", initialSignalFormState, buildFormData())

    expect(state.message).toBe("signal_not_found")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("reports an unknown error when a P2025 comes while the signal still exists", async () => {
    vi.mocked(prisma.signal.findUnique).mockResolvedValueOnce({
      companyId: "c1",
      personId: null,
    } as never)
    vi.mocked(prisma.signal.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.signal.count).mockResolvedValueOnce(1)

    const state = await updateSignal("s1", initialSignalFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })

  it("refuses to change a company signal to a person-level type", async () => {
    vi.mocked(prisma.signal.findUnique).mockResolvedValueOnce({
      companyId: "c1",
      personId: null,
    } as never)

    const state = await updateSignal("s1", initialSignalFormState, buildFormData({ type: "POST" }))

    expect(state.errors.type).toEqual(["Ce type ne concerne pas cette fiche"])
    expect(prisma.signal.update).not.toHaveBeenCalled()
  })
})

describe("deleteSignal", () => {
  it("treats a signal already deleted elsewhere as deleted", async () => {
    vi.mocked(prisma.signal.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.signal.count).mockResolvedValueOnce(0)

    const state = await deleteSignal("s1")

    expect(state.ok).toBe(true)
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("reports an unknown error when a P2025 comes while the signal still exists", async () => {
    vi.mocked(prisma.signal.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.signal.count).mockResolvedValueOnce(1)

    const state = await deleteSignal("s1")

    expect(state.message).toBe("unknown_error")
  })
})
