import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { prisma } from "@/lib/prisma-test-setup"
import { createContact, deleteContact } from "@/server/actions/contacts"
import { initialContactFormState } from "@/server/actions/contacts.types"
import { deleteLead } from "@/server/actions/leads"
import { optOutPerson } from "@/server/actions/persons"

const EMAIL_DOMAIN = "@contacts-integration.example.com"

function createPerson(
  name: string,
  roles: { lead: boolean; contact: boolean },
  optedOutAt: Date | null = null,
) {
  return prisma.person.create({
    data: {
      name,
      optedOutAt,
      email: `${name.toLowerCase().replace(" ", ".")}${EMAIL_DOMAIN}`,
      ...(roles.lead ? { lead: { create: { origin: "OUTBOUND" } } } : {}),
      ...(roles.contact ? { contact: { create: {} } } : {}),
    },
  })
}

afterEach(async () => {
  await prisma.person.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } })
})

describe("deleteContact against real Postgres", () => {
  it("keeps a person who still holds the lead role", async () => {
    const person = await createPerson("Jeanne Exemple", { lead: true, contact: true })

    await deleteContact(person.id)

    const remaining = await prisma.person.findUnique({
      where: { id: person.id },
      include: { lead: true, contact: true },
    })
    expect(remaining?.lead).not.toBeNull()
    expect(remaining?.contact).toBeNull()
  })

  it("deletes a person who holds no other role", async () => {
    const person = await createPerson("Marie Exemple", { lead: false, contact: true })

    await deleteContact(person.id)

    expect(await prisma.person.findUnique({ where: { id: person.id } })).toBeNull()
  })
})

function buildAttachFormData(personId: string): FormData {
  const data = new FormData()
  data.set("personId", personId)
  data.set("status", "ACTIF")
  data.append("types", "COLLEGUE")
  return data
}

describe("createContact attach against real Postgres", () => {
  it("adds the contact role to a lead", async () => {
    const person = await createPerson("Nadia Exemple", { lead: true, contact: false })

    const state = await createContact(initialContactFormState, buildAttachFormData(person.id))

    const attached = await prisma.contact.findUnique({ where: { personId: person.id } })
    expect(state.ok).toBe(true)
    expect(attached).not.toBeNull()
  })

  it("refuses an opposed lead and leaves no contact role", async () => {
    const person = await createPerson(
      "Hugo Exemple",
      { lead: true, contact: false },
      new Date("2026-03-11T23:30:00Z"),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData(person.id))

    const attached = await prisma.contact.findUnique({ where: { personId: person.id } })
    expect(state.message).toBe("contact_opted_out")
    expect(attached).toBeNull()
  })

  it("refuses a person who is not a lead", async () => {
    const person = await createPerson("Sami Exemple", { lead: false, contact: false })

    const state = await createContact(initialContactFormState, buildAttachFormData(person.id))

    const attached = await prisma.contact.findUnique({ where: { personId: person.id } })
    expect(state.errors.personId).toEqual(["Cette personne n'est pas un lead"])
    expect(attached).toBeNull()
  })
})

describe("deleteLead against real Postgres", () => {
  it("keeps a person who still holds the contact role", async () => {
    const person = await createPerson("Louis Exemple", { lead: true, contact: true })

    await deleteLead(person.id)

    const remaining = await prisma.person.findUnique({
      where: { id: person.id },
      include: { lead: true, contact: true },
    })
    expect(remaining?.contact).not.toBeNull()
    expect(remaining?.lead).toBeNull()
  })
})

describe("optOutPerson against real Postgres", () => {
  it("removes the contact role and keeps the lead role with its opposition date", async () => {
    const person = await createPerson("Claire Exemple", { lead: true, contact: true })

    const state = await optOutPerson(person.id)

    const remaining = await prisma.person.findUnique({
      where: { id: person.id },
      include: { lead: true, contact: true },
    })
    expect(state.ok).toBe(true)
    expect(remaining?.contact).toBeNull()
    expect(remaining?.lead).not.toBeNull()
    expect(remaining?.optedOutAt).toBeInstanceOf(Date)
  })
})
