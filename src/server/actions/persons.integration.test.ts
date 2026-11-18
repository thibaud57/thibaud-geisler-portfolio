import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"
import { prisma } from "@/testing/prisma"
import { erasePersonExchanges, optOutPerson } from "@/server/actions/persons"

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

function actionFactory(personId: string) {
  return (title: string, channel: ActionChannel, status: ActionStatus, occurredAt: string) =>
    prisma.prospectingAction.create({
      data: { title, personId, channel, status, occurredAt: new Date(occurredAt) },
    })
}

afterEach(async () => {
  await prisma.person.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
  await prisma.opportunity.deleteMany({ where: { title: OPPORTUNITY_TITLE } })
})

describe("optOutPerson against real Postgres", () => {
  it("deletes planned actions and refuses the latest pending message when opting out", async () => {
    const person = await createPerson("Jane Doe", null)
    const action = actionFactory(person.id)
    const firstDm = await action("First DM", "DM_LINKEDIN", "FAIT", "2026-03-02T08:00:00Z")
    const email = await action("Follow-up email", "EMAIL", "FAIT", "2026-03-09T08:00:00Z")
    await action("Planned DM", "DM_LINKEDIN", "A_FAIRE", "2026-03-16T08:00:00Z")
    await action("Planned call", "CALL", "A_FAIRE", "2026-03-17T08:00:00Z")
    const before = new Date()

    const state = await optOutPerson(person.id)

    const remaining = await prisma.prospectingAction.findMany({
      where: { personId: person.id },
      orderBy: { occurredAt: "asc" },
    })
    expect(state.ok).toBe(true)
    expect(remaining.map((kept) => [kept.id, kept.status])).toEqual([
      [firstDm.id, "FAIT"],
      [email.id, "REFUSE"],
    ])
    expect(remaining[1]?.respondedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime())
  })

  it("deletes planned actions without refusing anything when no message awaits", async () => {
    const person = await createPerson("Jane Doe", null)
    const action = actionFactory(person.id)
    await action("Connection", "CONNEXION_LINKEDIN", "FAIT", "2026-03-02T08:00:00Z")
    await action("Call", "CALL", "FAIT", "2026-03-03T08:00:00Z")
    await action("Answered DM", "DM_LINKEDIN", "REPONDU", "2026-03-04T08:00:00Z")
    await action("Planned DM", "DM_LINKEDIN", "A_FAIRE", "2026-03-16T08:00:00Z")

    await optOutPerson(person.id)

    const remaining = await prisma.prospectingAction.findMany({
      where: { personId: person.id },
      orderBy: { occurredAt: "asc" },
    })
    expect(remaining.map((kept) => [kept.title, kept.status])).toEqual([
      ["Connection", "FAIT"],
      ["Call", "FAIT"],
      ["Answered DM", "REPONDU"],
    ])
  })
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
