import { beforeEach, describe, expect, it } from "vitest"

import type { Prisma } from "@/generated/prisma/client"
import { prospectingActionIdSchema, type PersonId } from "@/lib/ids"
import { constraintViolation } from "@/lib/matchers-test-setup"
import {
  idOf,
  OPTED_OUT_AT,
  prisma,
  rejectNextTransactionWrite,
  resetDatabase,
  seedOptedOutLead,
  seedPerson,
} from "@/lib/prisma-test-setup"

import {
  createProspectingAction,
  updateProspectingAction,
  type ProspectingActionWriteData,
} from "./prospecting-actions"

const MONDAY_MIDNIGHT_IN_PARIS = new Date("2026-03-08T23:00:00Z")
const TUESDAY_MIDNIGHT_IN_PARIS = new Date("2026-03-09T23:00:00Z")
const REPLY = "Merci, on peut en parler jeudi."
const UNKNOWN_ACTION = prospectingActionIdSchema.parse("missing-action")

function actionData(
  personId: PersonId,
  overrides: Partial<ProspectingActionWriteData> = {},
): ProspectingActionWriteData {
  return {
    title: "Relance proposition",
    personId,
    channel: "DM_LINKEDIN",
    status: "A_FAIRE",
    occurredAt: MONDAY_MIDNIGHT_IN_PARIS,
    respondedAt: null,
    message: null,
    reply: null,
    ...overrides,
  }
}

async function seedAction(
  personId: string,
  data: Partial<Prisma.ProspectingActionUncheckedCreateInput> = {},
) {
  const row = await prisma.prospectingAction.create({
    data: {
      title: "Relance proposition",
      personId,
      channel: "DM_LINKEDIN",
      occurredAt: MONDAY_MIDNIGHT_IN_PARIS,
      ...data,
    },
  })
  return prospectingActionIdSchema.parse(row.id)
}

const storedAction = (id: string) => prisma.prospectingAction.findUniqueOrThrow({ where: { id } })

beforeEach(async () => {
  await resetDatabase()
})

describe("createProspectingAction", () => {
  it("creates an action and returns its id", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })

    const result = await createProspectingAction(actionData(idOf(jane), { message: "Bonjour" }))

    const stored = await prisma.prospectingAction.findFirstOrThrow()
    expect(result).toEqual({ ok: true, value: { id: stored.id } })
    expect(stored).toMatchObject({
      title: "Relance proposition",
      personId: jane.id,
      status: "A_FAIRE",
      occurredAt: MONDAY_MIDNIGHT_IN_PARIS,
      message: "Bonjour",
    })
  })

  it("rejects a person without a lead role and an opted-out lead with its date", async () => {
    const contact = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })
    const opposed = await seedOptedOutLead()

    const withoutRole = await createProspectingAction(actionData(idOf(contact)))
    const optedOut = await createProspectingAction(actionData(idOf(opposed)))

    expect(withoutRole).toEqual({
      ok: false,
      error: { code: "person_conflict", conflict: { reason: "no_lead_role", field: "personId" } },
    })
    expect(optedOut).toEqual({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: { reason: "opted_out", field: "personId", optedOutAt: OPTED_OUT_AT },
      },
    })
    expect(await prisma.prospectingAction.count()).toBe(0)
  })

  it("returns person_not_found on a foreign key violation of personId", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    rejectNextTransactionWrite(
      "prospectingAction",
      constraintViolation("P2003", "ProspectingAction_personId_fkey"),
    )

    const result = await createProspectingAction(actionData(idOf(jane)))

    expect(result).toEqual({ ok: false, error: { code: "person_not_found" } })
  })

  it("sets the reply time of an action created as replied and keeps its day", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const before = new Date()

    await createProspectingAction(actionData(idOf(jane), { status: "REPONDU", reply: REPLY }))

    const stored = await prisma.prospectingAction.findFirstOrThrow()
    expect(stored.occurredAt).toEqual(MONDAY_MIDNIGHT_IN_PARIS)
    expect(stored.reply).toBe(REPLY)
    expect(stored.respondedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime())
  })
})

describe("updateProspectingAction", () => {
  it("sets the reply time and takes the sending time on a status-only patch to REPONDU", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const id = await seedAction(jane.id)
    const before = new Date()

    const result = await updateProspectingAction(id, { status: "REPONDU" })

    const stored = await storedAction(id)
    expect(result).toEqual({ ok: true, value: { id } })
    expect(stored.status).toBe("REPONDU")
    expect(stored.respondedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(stored.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
  })

  it("keeps the stored reply time and the stored day when the patch changes the title only", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const respondedAt = new Date("2026-03-10T09:00:00Z")
    const id = await seedAction(jane.id, { status: "REPONDU", respondedAt, reply: REPLY })

    await updateProspectingAction(id, { title: "Nouveau titre" })

    expect(await storedAction(id)).toMatchObject({
      title: "Nouveau titre",
      status: "REPONDU",
      occurredAt: MONDAY_MIDNIGHT_IN_PARIS,
      respondedAt,
      reply: REPLY,
    })
  })

  it("keeps the reply when absent and clears it when null", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const id = await seedAction(jane.id, {
      status: "REPONDU",
      respondedAt: new Date("2026-03-10T09:00:00Z"),
      reply: REPLY,
    })

    await updateProspectingAction(id, { message: "Relance envoyée" })
    const kept = (await storedAction(id)).reply
    await updateProspectingAction(id, { reply: null })
    const cleared = (await storedAction(id)).reply

    expect(kept).toBe(REPLY)
    expect(cleared).toBeNull()
  })

  it("clears the reply and its time when the status leaves the replied statuses", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const id = await seedAction(jane.id, {
      status: "REPONDU",
      respondedAt: new Date("2026-03-10T09:00:00Z"),
      reply: REPLY,
    })

    await updateProspectingAction(id, { status: "FAIT" })

    expect(await storedAction(id)).toMatchObject({
      status: "FAIT",
      respondedAt: null,
      reply: null,
    })
  })

  it("takes the day of the patch when it differs from the stored one", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const id = await seedAction(jane.id)

    await updateProspectingAction(id, { occurredAt: TUESDAY_MIDNIGHT_IN_PARIS })

    expect((await storedAction(id)).occurredAt).toEqual(TUESDAY_MIDNIGHT_IN_PARIS)
  })

  it("guards the stored person when the patch omits personId", async () => {
    const opposed = await seedOptedOutLead()
    const id = await seedAction(opposed.id)

    const result = await updateProspectingAction(id, { title: "Réécrit" })

    expect(result).toEqual({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: { reason: "opted_out", field: "personId", optedOutAt: OPTED_OUT_AT },
      },
    })
    expect((await storedAction(id)).title).toBe("Relance proposition")
  })

  it("refuses to move an action to a person without a lead role or to an opted-out lead", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const contact = await seedPerson({ name: "Sami Bernard" }, { lead: false, contact: true })
    const opposed = await seedOptedOutLead()
    const id = await seedAction(jane.id)

    const toContact = await updateProspectingAction(id, { personId: idOf(contact) })
    const toOpposed = await updateProspectingAction(id, { personId: idOf(opposed) })

    expect(toContact).toMatchObject({ ok: false, error: { conflict: { reason: "no_lead_role" } } })
    expect(toOpposed).toMatchObject({ ok: false, error: { conflict: { reason: "opted_out" } } })
    expect((await storedAction(id)).personId).toBe(jane.id)
  })

  it("returns person_not_found on a foreign key violation of personId", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const other = await seedPerson({ name: "Sami Bernard" })
    const id = await seedAction(jane.id)
    rejectNextTransactionWrite(
      "prospectingAction",
      constraintViolation("P2003", "ProspectingAction_personId_fkey"),
      "update",
    )

    const result = await updateProspectingAction(id, { personId: idOf(other) })

    expect(result).toEqual({ ok: false, error: { code: "person_not_found" } })
  })

  it("answers not_found for an unknown action", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })

    const withPerson = await updateProspectingAction(UNKNOWN_ACTION, { personId: idOf(jane) })
    const withoutPerson = await updateProspectingAction(UNKNOWN_ACTION, { title: "x" })

    expect(withPerson).toEqual({ ok: false, error: { code: "not_found" } })
    expect(withoutPerson).toEqual({ ok: false, error: { code: "not_found" } })
  })
})
