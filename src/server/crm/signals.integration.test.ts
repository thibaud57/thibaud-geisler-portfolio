import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"

import { companyIdSchema, signalIdSchema } from "@/lib/ids"
import {
  idOf,
  OPTED_OUT_AT,
  prisma,
  resetDatabase,
  seedCompany,
  seedPerson,
} from "@/lib/prisma-test-setup"

import { createSignal, updateSignal, type SignalWriteData } from "./signals"

const SEPTEMBER_14 = new Date("2026-09-14T00:00:00.000Z")
const UNKNOWN_SIGNAL = signalIdSchema.parse("missing-signal")

function signalData(overrides: Partial<SignalWriteData> = {}): SignalWriteData {
  return {
    type: "OFFRE_POSTE",
    occurredOn: SEPTEMBER_14,
    content: "Recrute deux développeurs IA",
    sourceUrl: "https://example.com/jobs",
    ...overrides,
  }
}

async function seedCompanyOwner() {
  return companyIdSchema.parse((await seedCompany()).id)
}

async function seedSignal(owner: { companyId: string } | { personId: string }) {
  const row = await prisma.signal.create({
    data: {
      type: "personId" in owner ? "POST" : "OFFRE_POSTE",
      occurredOn: SEPTEMBER_14,
      content: "Signal d'origine",
      sourceUrl: "https://example.com/origin",
      ...owner,
    },
  })
  return signalIdSchema.parse(row.id)
}

const storedSignal = (id: string) => prisma.signal.findUniqueOrThrow({ where: { id } })

beforeEach(async () => {
  await resetDatabase()
})

describe("createSignal", () => {
  it("attaches a signal to a company and returns its id", async () => {
    const companyId = await seedCompanyOwner()

    const result = await createSignal({ companyId }, signalData())

    const stored = await prisma.signal.findFirstOrThrow()
    expect(result).toEqual({ ok: true, value: { id: stored.id } })
    expect(stored).toMatchObject({
      companyId,
      personId: null,
      type: "OFFRE_POSTE",
      occurredOn: SEPTEMBER_14,
      sourceUrl: "https://example.com/jobs",
    })
  })

  it("attaches a signal to an outbound lead", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })

    const result = await createSignal({ personId: idOf(jane) }, signalData({ type: "POST" }))

    const stored = await prisma.signal.findFirstOrThrow()
    expect(result).toEqual({ ok: true, value: { id: stored.id } })
    expect(stored).toMatchObject({ companyId: null, personId: jane.id, type: "POST" })
  })

  it("rejects a type that does not fit the company or the lead", async () => {
    const companyId = await seedCompanyOwner()
    const jane = await seedPerson({ name: "Jane Doe" })

    const onCompany = await createSignal({ companyId }, signalData({ type: "POST" }))
    const onLead = await createSignal({ personId: idOf(jane) }, signalData({ type: "LEVEE" }))

    expect(onCompany).toEqual({ ok: false, error: { code: "type_mismatch" } })
    expect(onLead).toEqual({ ok: false, error: { code: "type_mismatch" } })
    expect(await prisma.signal.count()).toBe(0)
  })

  it("rejects an inbound or opted-out lead, and a person without a lead role", async () => {
    const inbound = await prisma.person.create({
      data: { name: "Sami Bernard", lead: { create: { origin: "INBOUND" } } },
    })
    const opposed = await seedPerson({
      name: null,
      email: "john.roe@example.com",
      optedOutAt: OPTED_OUT_AT,
    })
    const contact = await seedPerson({ name: "Alex Martin" }, { lead: false, contact: true })

    const results = await Promise.all(
      [inbound, opposed, contact].map((person) =>
        createSignal({ personId: idOf(person) }, signalData({ type: "POST" })),
      ),
    )

    expect(results).toEqual(Array(3).fill({ ok: false, error: { code: "lead_not_eligible" } }))
    expect(await prisma.signal.count()).toBe(0)
  })

  it("reports a company that does not exist", async () => {
    const result = await createSignal(
      { companyId: companyIdSchema.parse("missing-company") },
      signalData(),
    )

    expect(result).toEqual({ ok: false, error: { code: "company_not_found" } })
  })
})

describe("updateSignal", () => {
  it("changes the sent fields only and clears the link with null", async () => {
    const companyId = await seedCompanyOwner()
    const id = await seedSignal({ companyId })

    const result = await updateSignal(id, {
      content: "Recrute trois développeurs",
      sourceUrl: null,
    })

    expect(result).toEqual({ ok: true, value: { id } })
    expect(await storedSignal(id)).toMatchObject({
      type: "OFFRE_POSTE",
      occurredOn: SEPTEMBER_14,
      content: "Recrute trois développeurs",
      sourceUrl: null,
    })
  })

  it("never changes the owner", async () => {
    const companyId = await seedCompanyOwner()
    const id = await seedSignal({ companyId })

    await updateSignal(id, signalData({ type: "LEVEE" }))

    expect(await storedSignal(id)).toMatchObject({ companyId, personId: null })
  })

  it("rejects a type that does not fit the stored owner", async () => {
    const companyId = await seedCompanyOwner()
    const id = await seedSignal({ companyId })

    const result = await updateSignal(id, { type: "POST" })

    expect(result).toEqual({ ok: false, error: { code: "type_mismatch" } })
    expect((await storedSignal(id)).type).toBe("OFFRE_POSTE")
  })

  it("edits the signal of a lead that became inbound", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const id = await seedSignal({ personId: jane.id })
    await prisma.lead.update({
      where: { personId: jane.id },
      data: { origin: "INBOUND" },
    })

    const result = await updateSignal(id, { type: "COMMENTAIRE" })

    expect(result).toEqual({ ok: true, value: { id } })
    expect((await storedSignal(id)).type).toBe("COMMENTAIRE")
  })

  it("reports a signal that does not exist", async () => {
    const result = await updateSignal(UNKNOWN_SIGNAL, { content: "x" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })
})

describe("updateSignal when the write reports a missing record", () => {
  const P2025 = { code: "P2025" }

  function rejectNextUpdate() {
    const update = vi.spyOn(prisma.signal, "update").mockRejectedValueOnce(P2025)
    onTestFinished(() => {
      update.mockRestore()
    })
  }

  it("rethrows the error when the signal still exists", async () => {
    const id = await seedSignal({ companyId: await seedCompanyOwner() })
    rejectNextUpdate()

    const result = updateSignal(id, { content: "x" })

    await expect(result).rejects.toBe(P2025)
  })

  it("answers not_found when the signal vanished since it was read", async () => {
    const id = await seedSignal({ companyId: await seedCompanyOwner() })
    rejectNextUpdate()
    const count = vi.spyOn(prisma.signal, "count").mockResolvedValueOnce(0)
    onTestFinished(() => {
      count.mockRestore()
    })

    const result = await updateSignal(id, { content: "x" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })
})
