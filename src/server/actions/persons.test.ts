import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    person: {
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    prospectingAction: { deleteMany: vi.fn() },
    signal: { deleteMany: vi.fn() },
    contact: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { revalidatePath } from "next/cache"

import { ADMIN_PROSPECTING_ACTIONS_PATH } from "@/lib/admin/routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"

import { erasePersonExchanges, optOutPerson } from "./persons"

beforeEach(() => {
  vi.mocked(prisma.person.update).mockResolvedValue({ id: "p1" } as never)
})

it.each([
  ["optOutPerson", () => optOutPerson("p1")],
  ["erasePersonExchanges", () => erasePersonExchanges("p1")],
])("%s rejects a call without a session, before touching the database", async (_name, call) => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

  const result = call()

  await expect(result).rejects.toThrow()
  expect(prisma.$transaction).not.toHaveBeenCalled()
})

describe("optOutPerson", () => {
  beforeEach(() => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: "marie@example.com",
      linkedinUrl: null,
      optedOutAt: null,
      lead: { personId: "p1" },
    } as never)
  })

  it("clears everything but email and LinkedIn when a person opts out", async () => {
    const state = await optOutPerson("p1")

    expect(state.ok).toBe(true)
    const data = vi.mocked(prisma.person.update).mock.calls[0]?.[0]?.data as Record<string, unknown>
    expect(data).toEqual(
      objectMatch({
        name: null,
        jobRole: null,
        zone: null,
        phone: null,
        metAt: null,
        notes: null,
        details: null,
        companyId: null,
        optedOutAt: expect.any(Date) as unknown,
      }),
    )
    expect(data).not.toHaveProperty("email")
    expect(data).not.toHaveProperty("linkedinUrl")
  })

  it("refreshes the prospecting actions list that shows the person", async () => {
    await optOutPerson("p1")

    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PROSPECTING_ACTIONS_PATH, "layout")
  })

  it("deletes the person's signals when they object to prospecting", async () => {
    await optOutPerson("p1")

    expect(prisma.signal.deleteMany).toHaveBeenCalledWith({ where: { personId: "p1" } })
  })

  it("removes the contact role when a person opts out", async () => {
    await optOutPerson("p1")

    expect(prisma.contact.deleteMany).toHaveBeenCalledWith({ where: { personId: "p1" } })
  })

  it("refuses to oppose a person without the lead role", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValueOnce({
      email: "jeanne.dupont@example.com",
      linkedinUrl: null,
      optedOutAt: null,
      lead: null,
    } as never)

    const state = await optOutPerson("p1")

    expect(state).toEqual({ ok: false, message: "unknown_error" })
    expect(prisma.person.update).not.toHaveBeenCalled()
    expect(prisma.person.delete).not.toHaveBeenCalled()
    expect(prisma.contact.deleteMany).not.toHaveBeenCalled()
  })

  it("deletes a person that opts out without email nor LinkedIn", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValueOnce({
      email: null,
      linkedinUrl: null,
      optedOutAt: null,
      lead: { personId: "p1" },
    } as never)

    await optOutPerson("p1")

    expect(prisma.person.delete).toHaveBeenCalledWith({ where: { id: "p1" } })
    expect(prisma.person.update).not.toHaveBeenCalled()
  })

  it("does not touch the person's prospecting actions on a simple stop", async () => {
    await optOutPerson("p1")

    expect(prisma.prospectingAction.deleteMany).not.toHaveBeenCalled()
  })

  it("keeps the first opt-out date when a person opts out twice", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValueOnce({
      email: "marie@example.com",
      linkedinUrl: null,
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
    } as never)

    const state = await optOutPerson("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).not.toHaveBeenCalled()
    expect(prisma.person.delete).not.toHaveBeenCalled()
  })
})

describe("erasePersonExchanges", () => {
  beforeEach(() => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
      exchangesErasedAt: null,
    } as never)
  })

  it("erases the exchange trace only once", async () => {
    const state = await erasePersonExchanges("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).toHaveBeenCalledWith(
      objectMatch({
        where: { id: "p1" },
        data: objectMatch({ exchangesErasedAt: expect.any(Date) as unknown }),
      }),
    )
  })

  it("refuses to erase exchanges of a person who never opted out", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValueOnce({
      optedOutAt: null,
      exchangesErasedAt: null,
    } as never)

    const state = await erasePersonExchanges("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).not.toHaveBeenCalled()
  })

  it("keeps the first erasure date when exchanges are erased twice", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValueOnce({
      optedOutAt: new Date("2026-03-10T09:00:00Z"),
      exchangesErasedAt: new Date("2026-03-12T09:00:00Z"),
    } as never)

    const state = await erasePersonExchanges("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).not.toHaveBeenCalled()
  })

  it("removes the person from its interviews", async () => {
    await erasePersonExchanges("p1")

    const data = vi.mocked(prisma.person.update).mock.calls[0]?.[0]?.data as Record<string, unknown>
    expect(data).toHaveProperty("interviews", { set: [] })
  })
})
