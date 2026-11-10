import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { companyIdSchema, personIdSchema } from "@/lib/ids"
import { constraintViolation } from "@/lib/matchers-test-setup"
import {
  idOf,
  loadPerson,
  prisma,
  rejectNextTransactionWrite,
  resetDatabase,
  seedPerson,
} from "@/lib/prisma-test-setup"

import { createLead, updateLead, type LeadWriteData } from "./leads"

function leadData(overrides: Partial<LeadWriteData> = {}): LeadWriteData {
  return {
    name: "Jane Doe",
    jobRole: null,
    zone: null,
    email: null,
    phone: null,
    linkedinUrl: null,
    metAt: null,
    notes: null,
    details: null,
    companyId: null,
    origin: "OUTBOUND",
    status: "NOUVEAU",
    interest: null,
    channel: null,
    ...overrides,
  }
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createLead", () => {
  it("creates a lead with its person", async () => {
    const result = await createLead(
      leadData({ email: "jane.doe@example.com", status: "DISCUSSION", score: 7 }),
    )

    expect(result.ok).toBe(true)
    const person = await prisma.person.findFirstOrThrow({ include: { lead: true } })
    expect(result).toEqual({ ok: true, value: { personId: person.id } })
    expect(person).toMatchObject({
      name: "Jane Doe",
      email: "jane.doe@example.com",
      lead: { origin: "OUTBOUND", status: "DISCUSSION", score: 7 },
    })
  })

  it("leaves the score empty when none is given", async () => {
    await createLead(leadData())

    const lead = await prisma.lead.findFirstOrThrow()
    expect(lead.score).toBeNull()
  })

  it("returns person_conflict exists with the existing name and roles", async () => {
    await seedPerson({ email: "john.roe@example.com" }, { lead: false, contact: true })

    const result = await createLead(leadData({ email: "john.roe@example.com" }))

    expect(result).toEqual({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: {
          reason: "exists",
          field: "email",
          personName: "John Roe",
          roles: { lead: false, contact: true },
        },
      },
    })
    expect(await prisma.person.count()).toBe(1)
  })

  it("returns person_conflict opted_out over a duplicate on the other identifier", async () => {
    const optedOutAt = new Date("2026-03-11T23:30:00Z")
    await seedPerson({ name: null, email: "john.roe@example.com", optedOutAt })
    await seedPerson({
      name: "Acme Contact",
      linkedinUrl: "https://www.linkedin.com/in/acme_contact_example",
    })

    const result = await createLead(
      leadData({
        email: "john.roe@example.com",
        linkedinUrl: "https://www.linkedin.com/in/acme_contact_example",
      }),
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: { reason: "opted_out", field: "email", optedOutAt },
      },
    })
  })

  it("returns company_not_found when the company is gone", async () => {
    const result = await createLead(leadData({ companyId: companyIdSchema.parse("missing") }))

    expect(result).toEqual({ ok: false, error: { code: "company_not_found" } })
    expect(await prisma.person.count()).toBe(0)
  })

  it.each([
    ["email", "Person_email_key"],
    ["linkedinUrl", "Person_linkedinUrl_key"],
  ] as const)("maps a unique violation on %s to identity_taken", async (field, index) => {
    rejectNextTransactionWrite("person", constraintViolation("P2002", index))

    const result = await createLead(leadData())

    expect(result).toEqual({ ok: false, error: { code: "identity_taken", field } })
  })
})

describe("updateLead", () => {
  it("updates the person and the lead together", async () => {
    const person = await seedPerson({ email: "john.roe@example.com" })

    const result = await updateLead(idOf(person), {
      name: "Jane Doe",
      status: "PERDU",
      score: 3,
    })

    expect(result).toEqual({ ok: true, value: { personId: person.id } })
    expect(await loadPerson(person.id)).toMatchObject({
      name: "Jane Doe",
      email: "john.roe@example.com",
      lead: { status: "PERDU", score: 3 },
    })
  })

  it("returns person_locked when updating an opted-out person", async () => {
    const person = await seedPerson({ optedOutAt: new Date("2026-03-11T23:30:00Z") })

    const result = await updateLead(idOf(person), { name: "Jane Doe" })

    expect(result).toEqual({ ok: false, error: { code: "person_locked" } })
    expect((await loadPerson(person.id)).name).toBe("John Roe")
  })

  it("reports the lock rather than a duplicate on an opted-out person", async () => {
    const person = await seedPerson({ optedOutAt: new Date("2026-03-11T23:30:00Z") })
    await seedPerson({ name: "Acme Contact", email: "acme.contact@example.com" })

    const result = await updateLead(idOf(person), { email: "acme.contact@example.com" })

    expect(result).toEqual({ ok: false, error: { code: "person_locked" } })
  })

  it("returns person_conflict exists when the new email belongs to another person", async () => {
    const person = await seedPerson()
    await seedPerson({ name: "Acme Contact", email: "acme.contact@example.com" })

    const result = await updateLead(idOf(person), { email: "acme.contact@example.com" })

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: { reason: "exists", personName: "Acme Contact" },
      },
    })
  })

  it("returns not_found for a person that does not exist", async () => {
    const result = await updateLead(personIdSchema.parse("missing"), { name: "Jane Doe" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })

  it("returns not_found for a person without the lead role", async () => {
    const person = await seedPerson({}, { lead: false, contact: true })

    const result = await updateLead(idOf(person), { name: "Jane Doe" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
    expect((await loadPerson(person.id)).name).toBe("John Roe")
  })

  it("returns company_not_found when the company is gone", async () => {
    const person = await seedPerson()

    const result = await updateLead(idOf(person), { companyId: companyIdSchema.parse("missing") })

    expect(result).toEqual({ ok: false, error: { code: "company_not_found" } })
  })

  it("patches partially without reading the identity that is absent", async () => {
    const person = await seedPerson()
    await seedPerson({
      name: "Acme Contact",
      linkedinUrl: "https://www.linkedin.com/in/acme_contact_example",
    })

    const result = await updateLead(idOf(person), { email: "jane.doe@example.com" })

    expect(result.ok).toBe(true)
    expect(await loadPerson(person.id)).toMatchObject({
      email: "jane.doe@example.com",
      linkedinUrl: null,
      name: "John Roe",
    })
  })

  it("replaces a details section in the same transaction as the patch", async () => {
    const person = await seedPerson({ details: "# Contexte\n\nancien\n\n# Suite\n\nà garder\n" })

    const result = await updateLead(idOf(person), {
      status: "DISCUSSION",
      detailsSection: { heading: "Contexte", content: "nouveau" },
    })

    expect(result.ok).toBe(true)
    expect(await loadPerson(person.id)).toMatchObject({
      details: "# Contexte\n\nnouveau\n\n# Suite\n\nà garder\n",
      lead: { status: "DISCUSSION" },
    })
  })

  it("writes nothing when the details section is missing", async () => {
    const person = await seedPerson({ details: "# Contexte\n\nancien\n" })

    const result = await updateLead(idOf(person), {
      name: "Jane Doe",
      detailsSection: { heading: "Absente", content: "nouveau" },
    })

    expect(result).toEqual({
      ok: false,
      error: { code: "section_not_found", headings: ["Contexte"] },
    })
    expect(await loadPerson(person.id)).toMatchObject({
      name: "John Roe",
      details: "# Contexte\n\nancien\n",
    })
  })

  it("returns no_details when the person has no details to patch", async () => {
    const person = await seedPerson()

    const result = await updateLead(idOf(person), {
      detailsSection: { heading: "Contexte", content: "nouveau" },
    })

    expect(result).toEqual({ ok: false, error: { code: "no_details" } })
  })
})
