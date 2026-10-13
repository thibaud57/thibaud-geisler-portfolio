import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { prisma } from "@/lib/prisma-test-setup"
import {
  changeProspectingActionStatus,
  createProspectingAction,
  rescheduleProspectingAction,
  updateProspectingAction,
} from "@/server/actions/prospecting-actions"
import { initialProspectingActionFormState } from "@/server/actions/prospecting-actions.types"

const EMAIL_DOMAIN = "@prospecting-actions-integration.example.com"
const OPTED_OUT_AT = new Date("2026-02-02T10:00:00Z")
const OPTED_OUT_MESSAGE = "Cette personne s'est opposée à la prospection le 02/02/2026"

function createLead(name: string, optedOutAt: Date | null = null) {
  return prisma.person.create({
    data: {
      name,
      optedOutAt,
      email: `${name.toLowerCase().replace(" ", ".")}${EMAIL_DOMAIN}`,
      lead: { create: { origin: "OUTBOUND" } },
    },
  })
}

function createAction(personId: string, title: string) {
  return prisma.prospectingAction.create({
    data: { title, personId, channel: "DM_LINKEDIN", occurredAt: new Date("2026-03-09T08:00:00Z") },
  })
}

function buildFormData(personId: string, title: string): FormData {
  const data = new FormData()
  const fields = {
    title,
    personId,
    channel: "DM_LINKEDIN",
    status: "A_FAIRE",
    occurredAt: "2026-03-09",
    respondedAt: "",
    message: "",
    reply: "",
  }
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

afterEach(async () => {
  await prisma.person.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
})

describe("prospecting action guards against real Postgres", () => {
  it("moves an action between two prospectable leads", async () => {
    const source = await createLead("Alice Moreau")
    const target = await createLead("Bruno Lambert")
    const action = await createAction(source.id, "Premier message")

    const state = await updateProspectingAction(
      action.id,
      initialProspectingActionFormState,
      buildFormData(target.id, "Premier message"),
    )

    const moved = await prisma.prospectingAction.findUnique({ where: { id: action.id } })
    expect(state.ok).toBe(true)
    expect(moved?.personId).toBe(target.id)
  })

  it("refuses to rewrite an action of an opposed person by moving it to a prospectable lead", async () => {
    const opposed = await createLead("Clara Fontaine", OPTED_OUT_AT)
    const target = await createLead("David Perrin")
    const action = await createAction(opposed.id, "Message d'origine")

    const state = await updateProspectingAction(
      action.id,
      initialProspectingActionFormState,
      buildFormData(target.id, "Message réécrit"),
    )

    const untouched = await prisma.prospectingAction.findUnique({ where: { id: action.id } })
    expect(state.ok).toBe(false)
    expect(state.errors.personId).toEqual([OPTED_OUT_MESSAGE])
    expect(untouched?.personId).toBe(opposed.id)
    expect(untouched?.title).toBe("Message d'origine")
  })

  it("refuses to create an action for an opposed lead", async () => {
    const opposed = await createLead("Elsa Roche", OPTED_OUT_AT)

    const state = await createProspectingAction(
      initialProspectingActionFormState,
      buildFormData(opposed.id, "Relance"),
    )

    const actions = await prisma.prospectingAction.count({ where: { personId: opposed.id } })
    expect(state.errors.personId).toEqual([OPTED_OUT_MESSAGE])
    expect(actions).toBe(0)
  })

  it("refuses to change the status of an action of an opposed person", async () => {
    const opposed = await createLead("Farid Colin", OPTED_OUT_AT)
    const action = await createAction(opposed.id, "Message d'origine")

    const state = await changeProspectingActionStatus(action.id, "FAIT")

    const untouched = await prisma.prospectingAction.findUnique({ where: { id: action.id } })
    expect(state.errors.status).toEqual([OPTED_OUT_MESSAGE])
    expect(untouched?.status).toBe("A_FAIRE")
  })

  it("refuses to reschedule an action of an opposed person", async () => {
    const opposed = await createLead("Gaelle Henry", OPTED_OUT_AT)
    const action = await createAction(opposed.id, "Message d'origine")

    const state = await rescheduleProspectingAction(action.id, "2026-04-01")

    const untouched = await prisma.prospectingAction.findUnique({ where: { id: action.id } })
    expect(state.errors.occurredAt).toEqual([OPTED_OUT_MESSAGE])
    expect(untouched?.occurredAt).toEqual(action.occurredAt)
  })
})
