import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

import { prisma } from "@/lib/prisma"

import { erasePersonExchanges, optOutPerson } from "./persons"

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

beforeEach(() => {
  vi.mocked(prisma.person.update).mockResolvedValue({ id: "p1" } as never)
})

describe("optOutPerson", () => {
  afterEach(() => vi.clearAllMocks())

  it("clears everything but email and LinkedIn when a person opts out", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: "marie@example.com",
      linkedinUrl: null,
      optedOutAt: null,
      lead: { personId: "p1" },
    } as never)

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

  it("removes the contact role when a person opts out", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: "jeanne.dupont@example.com",
      linkedinUrl: null,
      optedOutAt: null,
      lead: { personId: "p1" },
    } as never)

    await optOutPerson("p1")

    expect(prisma.contact.deleteMany).toHaveBeenCalledWith({ where: { personId: "p1" } })
  })

  it("deletes the person's signals when they object to prospecting", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: "jeanne.dupont@example.com",
      linkedinUrl: null,
      optedOutAt: null,
      lead: { personId: "p1" },
    } as never)

    await optOutPerson("p1")

    expect(prisma.signal.deleteMany).toHaveBeenCalledWith({ where: { personId: "p1" } })
  })

  it("refuses to oppose a person without the lead role", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
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
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
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
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      email: "marie@example.com",
      linkedinUrl: null,
      optedOutAt: null,
      lead: { personId: "p1" },
    } as never)

    await optOutPerson("p1")

    expect(prisma.prospectingAction.deleteMany).not.toHaveBeenCalled()
  })

  it("keeps the first opt-out date when a person opts out twice", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
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
  afterEach(() => vi.clearAllMocks())

  it("erases the exchange trace only once", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
      exchangesErasedAt: null,
    } as never)

    const state = await erasePersonExchanges("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).toHaveBeenCalledWith(
      objectMatch({
        where: { id: "p1" },
        data: objectMatch({ exchangesErasedAt: expect.any(Date) as unknown }),
      }),
    )
  })

  it("erases the person's prospecting actions along with the exchange trace", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: new Date("2026-03-12T09:00:00Z"),
      exchangesErasedAt: null,
    } as never)

    await erasePersonExchanges("p1")

    expect(prisma.prospectingAction.deleteMany).toHaveBeenCalledWith({ where: { personId: "p1" } })
  })

  it("refuses to erase exchanges of a person who never opted out", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: null,
      exchangesErasedAt: null,
    } as never)

    const state = await erasePersonExchanges("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).not.toHaveBeenCalled()
  })

  it("keeps the first erasure date when exchanges are erased twice", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: new Date("2026-03-10T09:00:00Z"),
      exchangesErasedAt: new Date("2026-03-12T09:00:00Z"),
    } as never)

    const state = await erasePersonExchanges("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.update).not.toHaveBeenCalled()
  })

  it("removes the person from its interviews", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      optedOutAt: new Date("2026-09-01"),
      exchangesErasedAt: null,
    } as never)

    await erasePersonExchanges("p1")

    const data = vi.mocked(prisma.person.update).mock.calls[0]?.[0]?.data as Record<string, unknown>
    expect(data).toHaveProperty("interviews", { set: [] })
  })
})
