import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { signal: { delete: vi.fn(), count: vi.fn() } },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/server/crm/signals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/crm/signals")>()),
  createSignal: vi.fn(),
  updateSignal: vi.fn(),
}))

import { revalidatePath } from "next/cache"

import { signalIdSchema } from "@/lib/ids"
import { getCurrentUser } from "@/lib/get-current-user"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/server/crm/result"
import { createSignal, updateSignal as updateSignalRecord } from "@/server/crm/signals"

import { createCompanySignal, createPersonSignal, deleteSignal, updateSignal } from "./signals"
import { initialSignalFormState } from "./signals.types"

const WRITTEN = { id: signalIdSchema.parse("s1") }

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
  vi.mocked(createSignal).mockResolvedValue(ok(WRITTEN))
  vi.mocked(updateSignalRecord).mockResolvedValue(ok(WRITTEN))
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
  expect(createSignal).not.toHaveBeenCalled()
  expect(updateSignalRecord).not.toHaveBeenCalled()
  expect(prisma.signal.delete).not.toHaveBeenCalled()
})

describe("createCompanySignal", () => {
  it("hands its company and the parsed fields to the domain, the day at midnight UTC", async () => {
    const state = await createCompanySignal("c1", initialSignalFormState, buildFormData())

    expect(state.ok).toBe(true)
    expect(createSignal).toHaveBeenCalledWith(
      { companyId: "c1" },
      objectMatch({
        type: "OFFRE_POSTE",
        occurredOn: new Date(Date.UTC(2026, 8, 14)),
        sourceUrl: "https://example.com/jobs",
      }),
    )
    expect(revalidatePath).toHaveBeenCalledTimes(2)
  })

  it("shows a type that does not fit on the type field, without invalidating", async () => {
    vi.mocked(createSignal).mockResolvedValueOnce(fail({ code: "type_mismatch" }))

    const state = await createCompanySignal(
      "c1",
      initialSignalFormState,
      buildFormData({ type: "POST" }),
    )

    expect(state.errors.type).toEqual(["Ce type ne concerne pas cette fiche"])
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("reports a company that no longer exists and invalidates the lists", async () => {
    vi.mocked(createSignal).mockResolvedValueOnce(fail({ code: "company_not_found" }))

    const state = await createCompanySignal("c1", initialSignalFormState, buildFormData())

    expect(state.message).toBe("company_not_found")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("answers company_not_found for an empty company id, without writing", async () => {
    const state = await createCompanySignal("", initialSignalFormState, buildFormData())

    expect(state.message).toBe("company_not_found")
    expect(createSignal).not.toHaveBeenCalled()
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
    expect(createSignal).not.toHaveBeenCalled()
  })
})

describe("createPersonSignal", () => {
  it("hands its lead to the domain", async () => {
    const state = await createPersonSignal(
      "l1",
      initialSignalFormState,
      buildFormData({ type: "POST" }),
    )

    expect(state.ok).toBe(true)
    expect(createSignal).toHaveBeenCalledWith({ personId: "l1" }, objectMatch({ type: "POST" }))
  })

  it("reports a lead that cannot receive a signal, without invalidating", async () => {
    vi.mocked(createSignal).mockResolvedValueOnce(fail({ code: "lead_not_eligible" }))

    const state = await createPersonSignal(
      "l1",
      initialSignalFormState,
      buildFormData({ type: "POST" }),
    )

    expect(state.message).toBe("lead_not_eligible")
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("answers lead_not_eligible for an empty lead id, without writing or invalidating", async () => {
    const state = await createPersonSignal("", initialSignalFormState, buildFormData())

    expect(state.message).toBe("lead_not_eligible")
    expect(createSignal).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("updateSignal", () => {
  it("hands its id and the parsed fields to the domain", async () => {
    const state = await updateSignal("s1", initialSignalFormState, buildFormData())

    expect(state.ok).toBe(true)
    expect(updateSignalRecord).toHaveBeenCalledWith(
      "s1",
      objectMatch({ type: "OFFRE_POSTE", content: "Recrute deux développeurs IA" }),
    )
  })

  it("reports a signal that no longer exists and invalidates the lists", async () => {
    vi.mocked(updateSignalRecord).mockResolvedValueOnce(fail({ code: "not_found" }))

    const state = await updateSignal("s1", initialSignalFormState, buildFormData())

    expect(state.message).toBe("signal_not_found")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("answers signal_not_found for an empty signal id, without writing, and invalidates the lists", async () => {
    const state = await updateSignal("", initialSignalFormState, buildFormData())

    expect(state.message).toBe("signal_not_found")
    expect(updateSignalRecord).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("reports a type that does not fit on the type field", async () => {
    vi.mocked(updateSignalRecord).mockResolvedValueOnce(fail({ code: "type_mismatch" }))

    const state = await updateSignal("s1", initialSignalFormState, buildFormData({ type: "POST" }))

    expect(state.errors.type).toEqual(["Ce type ne concerne pas cette fiche"])
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("reports an unknown error when the domain throws", async () => {
    vi.mocked(updateSignalRecord).mockRejectedValueOnce(new Error("database down"))

    const state = await updateSignal("s1", initialSignalFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
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
