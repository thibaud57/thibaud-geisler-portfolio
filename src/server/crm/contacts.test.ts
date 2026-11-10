import { beforeEach, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    person: { findUnique: vi.fn(), update: vi.fn() },
    contact: { create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})

import { personIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"

import { attachContact } from "./contacts"

beforeEach(() => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }] as never)
  vi.mocked(prisma.person.findUnique).mockResolvedValue({
    name: "Jane Doe",
    details: null,
    optedOutAt: null,
    lead: { origin: "OUTBOUND" },
    contact: null,
  } as never)
  vi.mocked(prisma.contact.create).mockResolvedValue({ personId: "p9" } as never)
})

it("locks the person row before reading its roles and writing the contact", async () => {
  await attachContact(personIdSchema.parse("p9"), { types: ["COLLEGUE"], status: "ACTIF" })

  const lockOrder = vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0] ?? Infinity
  const readOrder = vi.mocked(prisma.person.findUnique).mock.invocationCallOrder[0] ?? -1
  const createOrder = vi.mocked(prisma.contact.create).mock.invocationCallOrder[0] ?? -1
  expect(lockOrder).toBeLessThan(readOrder)
  expect(lockOrder).toBeLessThan(createOrder)
})
