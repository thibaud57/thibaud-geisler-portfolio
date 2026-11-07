import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { CONTACT_DETAILS_TEMPLATE, leadDetailsTemplate } from "@/lib/crm/details-templates"
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

import { attachContact, createContact, updateContact, type ContactWriteData } from "./contacts"

function contactData(overrides: Partial<ContactWriteData> = {}): ContactWriteData {
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
    types: ["COLLEGUE"],
    status: "ACTIF",
    ...overrides,
  }
}

const role = () => ({ types: ["COLLEGUE" as const], status: "ACTIF" as const })

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createContact", () => {
  it("creates a contact with a new person", async () => {
    const result = await createContact(contactData({ email: "jane.doe@example.com" }))

    const person = await prisma.person.findFirstOrThrow({ include: { contact: true, lead: true } })
    expect(result).toEqual({ ok: true, value: { personId: person.id } })
    expect(person).toMatchObject({
      name: "Jane Doe",
      email: "jane.doe@example.com",
      lead: null,
      contact: { types: ["COLLEGUE"], status: "ACTIF" },
    })
  })

  it("returns person_conflict exists naming the lead the email already belongs to", async () => {
    await seedPerson({ email: "john.roe@example.com" })

    const result = await createContact(contactData({ email: "john.roe@example.com" }))

    expect(result).toEqual({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: {
          reason: "exists",
          field: "email",
          personName: "John Roe",
          roles: { lead: true, contact: false },
        },
      },
    })
    expect(await prisma.person.count()).toBe(1)
  })

  it("returns company_not_found when the company is gone", async () => {
    const result = await createContact(contactData({ companyId: companyIdSchema.parse("missing") }))

    expect(result).toEqual({ ok: false, error: { code: "company_not_found" } })
    expect(await prisma.person.count()).toBe(0)
  })
})

describe("attachContact", () => {
  it("attaches a contact to a lead and swaps an untouched lead template", async () => {
    const person = await seedPerson({ details: leadDetailsTemplate("OUTBOUND") })

    const result = await attachContact(idOf(person), role())

    expect(result).toEqual({ ok: true, value: { personId: person.id } })
    expect(await loadPerson(person.id)).toMatchObject({
      details: CONTACT_DETAILS_TEMPLATE,
      contact: { types: ["COLLEGUE"], status: "ACTIF" },
      lead: { origin: "OUTBOUND" },
    })
  })

  it("keeps written details when attaching", async () => {
    const written = "# 🎯 Contexte\n\nRencontré lors d'un salon."
    const person = await seedPerson({ details: written })

    await attachContact(idOf(person), role())

    expect((await loadPerson(person.id)).details).toBe(written)
  })

  it("returns not_a_lead for a person without the lead role", async () => {
    const person = await seedPerson({}, { lead: false, contact: false })

    const result = await attachContact(idOf(person), role())

    expect(result).toEqual({
      ok: false,
      error: { code: "person_conflict", conflict: { reason: "not_a_lead", field: "personId" } },
    })
    expect((await loadPerson(person.id)).contact).toBeNull()
  })

  it("returns exists with both roles for a person who is already a contact", async () => {
    const person = await seedPerson({}, { lead: true, contact: true })

    const result = await attachContact(idOf(person), role())

    expect(result).toEqual({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: {
          reason: "exists",
          field: "personId",
          personName: "John Roe",
          roles: { lead: true, contact: true },
        },
      },
    })
  })

  it("returns opted_out with its date for an opposed lead and leaves no contact role", async () => {
    const optedOutAt = new Date("2026-03-11T23:30:00Z")
    const person = await seedPerson({ name: null, optedOutAt })

    const result = await attachContact(idOf(person), role())

    expect(result).toEqual({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: { reason: "opted_out", field: "personId", optedOutAt },
      },
    })
    expect((await loadPerson(person.id)).contact).toBeNull()
  })

  it("returns person_missing for a person that does not exist", async () => {
    const result = await attachContact(personIdSchema.parse("missing"), role())

    expect(result).toEqual({
      ok: false,
      error: { code: "person_conflict", conflict: { reason: "person_missing", field: "personId" } },
    })
  })
})

describe("updateContact", () => {
  it("updates the person and the contact role together", async () => {
    const person = await seedPerson({}, { lead: false, contact: true })

    const result = await updateContact(idOf(person), {
      name: "Jane Doe",
      status: "INACTIF",
      types: ["MENTOR"],
    })

    expect(result).toEqual({ ok: true, value: { personId: person.id } })
    expect(await loadPerson(person.id)).toMatchObject({
      name: "Jane Doe",
      contact: { status: "INACTIF", types: ["MENTOR"] },
    })
  })

  it("returns person_locked when updating an opted-out person", async () => {
    const person = await seedPerson({ optedOutAt: new Date() }, { lead: false, contact: true })

    const result = await updateContact(idOf(person), { name: "Jane Doe" })

    expect(result).toEqual({ ok: false, error: { code: "person_locked" } })
    expect((await loadPerson(person.id)).name).toBe("John Roe")
  })

  it("reports the lock rather than a duplicate on an opted-out person", async () => {
    const person = await seedPerson({ optedOutAt: new Date() }, { lead: false, contact: true })
    await seedPerson({ name: "Acme Contact", email: "acme.contact@example.com" })

    const result = await updateContact(idOf(person), { email: "acme.contact@example.com" })

    expect(result).toEqual({ ok: false, error: { code: "person_locked" } })
  })

  it("returns not_found for a person without the contact role", async () => {
    const person = await seedPerson()

    const result = await updateContact(idOf(person), { name: "Jane Doe" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
    expect((await loadPerson(person.id)).name).toBe("John Roe")
  })

  it("returns person_conflict exists when the new email belongs to another person", async () => {
    const person = await seedPerson({}, { lead: false, contact: true })
    await seedPerson({ name: "Acme Contact", email: "acme.contact@example.com" })

    const result = await updateContact(idOf(person), { email: "acme.contact@example.com" })

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "person_conflict",
        conflict: { reason: "exists", personName: "Acme Contact" },
      },
    })
  })

  it("replaces a details section in the same transaction as the patch", async () => {
    const person = await seedPerson(
      { details: "# Contexte\n\nancien\n" },
      { lead: false, contact: true },
    )

    const result = await updateContact(idOf(person), {
      status: "INACTIF",
      detailsSection: { heading: "Contexte", content: "nouveau" },
    })

    expect(result.ok).toBe(true)
    expect(await loadPerson(person.id)).toMatchObject({
      details: "# Contexte\n\nnouveau\n",
      contact: { status: "INACTIF" },
    })
  })
})

describe("unique and foreign key violations", () => {
  it.each([
    ["email", "Person_email_key"],
    ["linkedinUrl", "Person_linkedinUrl_key"],
    ["email", "Person_other_key"],
  ] as const)("maps a person violation to identity_taken on %s (%s)", async (field, index) => {
    rejectNextTransactionWrite("person", constraintViolation("P2002", index))

    const result = await createContact(contactData())

    expect(result).toEqual({ ok: false, error: { code: "identity_taken", field } })
  })

  it.each(["Contact_pkey", "Contact_personId_key"])(
    "maps a unique violation on %s to identity_taken on personId",
    async (index) => {
      const person = await seedPerson()
      rejectNextTransactionWrite("contact", constraintViolation("P2002", index))

      const result = await attachContact(idOf(person), role())

      expect(result).toEqual({ ok: false, error: { code: "identity_taken", field: "personId" } })
    },
  )

  it("tells a missing person from a missing company on a foreign key violation", async () => {
    const person = await seedPerson()
    rejectNextTransactionWrite("contact", constraintViolation("P2003", "Contact_personId_fkey"))

    const result = await attachContact(idOf(person), role())

    expect(result).toEqual({
      ok: false,
      error: { code: "person_conflict", conflict: { reason: "person_missing", field: "personId" } },
    })
  })
})
