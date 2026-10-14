import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { prisma } from "@/lib/prisma-test-setup"
import { erasePersonExchanges } from "@/server/actions/persons"

const EMAIL_DOMAIN = "@persons-integration.example.com"
const OPPORTUNITY_TITLE = "Persons integration opportunity"

function createPerson(name: string, optedOutAt: Date | null) {
  return prisma.person.create({
    data: {
      name,
      optedOutAt,
      email: `${name.toLowerCase().replace(" ", ".")}${EMAIL_DOMAIN}`,
      lead: { create: { origin: "OUTBOUND" } },
    },
  })
}

afterEach(async () => {
  await prisma.person.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await prisma.opportunity.deleteMany({ where: { title: OPPORTUNITY_TITLE } })
})

describe("erasePersonExchanges against real Postgres", () => {
  it("deletes the actions and the interview seat of an opposed person, and stamps the erasure", async () => {
    const person = await createPerson("Jane Doe", new Date("2026-02-02T10:00:00Z"))
    await prisma.prospectingAction.create({
      data: {
        title: "First message",
        personId: person.id,
        channel: "DM_LINKEDIN",
        occurredAt: new Date("2026-03-09T08:00:00Z"),
      },
    })
    const interview = await prisma.interview.create({
      data: {
        side: "ESN",
        type: "PREMIER_CONTACT",
        scheduledAt: new Date("2026-03-20T09:00:00Z"),
        opportunity: { create: { title: OPPORTUNITY_TITLE } },
        correspondents: { connect: { id: person.id } },
      },
    })

    const state = await erasePersonExchanges(person.id)

    const erased = await prisma.person.findUnique({
      where: { id: person.id },
      include: { prospectingActions: true, interviews: true },
    })
    const keptInterview = await prisma.interview.findUnique({ where: { id: interview.id } })
    expect(state.ok).toBe(true)
    expect(erased?.exchangesErasedAt).toBeInstanceOf(Date)
    expect(erased?.prospectingActions).toEqual([])
    expect(erased?.interviews).toEqual([])
    expect(keptInterview).not.toBeNull()
  })

  it("leaves a person who never opted out untouched", async () => {
    const person = await createPerson("John Smith", null)
    await prisma.prospectingAction.create({
      data: {
        title: "First message",
        personId: person.id,
        channel: "DM_LINKEDIN",
        occurredAt: new Date("2026-03-09T08:00:00Z"),
      },
    })

    await erasePersonExchanges(person.id)

    const untouched = await prisma.person.findUnique({
      where: { id: person.id },
      include: { prospectingActions: true },
    })
    expect(untouched?.exchangesErasedAt).toBeNull()
    expect(untouched?.prospectingActions).toHaveLength(1)
  })
})
