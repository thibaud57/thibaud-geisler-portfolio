import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    person: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    contact: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { constraintViolation, objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"

import { createContact, deleteContact, findLeadForContactAttach, updateContact } from "./contacts"
import { initialContactFormState } from "./contacts.types"

const BASE_FIELDS = {
  name: "Jeanne Dupont",
  jobRole: NONE_VALUE,
  zone: NONE_VALUE,
  companyId: NONE_VALUE,
  email: "",
  phone: "",
  linkedinUrl: "",
  metAt: "",
  notes: "",
  details: "",
  status: "ACTIF",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  data.append("types", "COLLEGUE")
  return data
}

function buildAttachFormData(personId: string): FormData {
  const data = new FormData()
  data.set("personId", personId)
  data.set("status", "ACTIF")
  data.append("types", "COLLEGUE")
  return data
}

function personRecord(overrides: Record<string, unknown> = {}): never {
  return {
    name: "Marie Durand",
    optedOutAt: null,
    lead: { personId: "p9" },
    contact: null,
    ...overrides,
  } as never
}

beforeEach(() => {
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.person.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.person.create).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(prisma.person.update).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(prisma.contact.create).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.contact.update).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.contact.delete).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.person.deleteMany).mockResolvedValue({ count: 1 })
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }] as never)
})

it.each([
  ["createContact", () => createContact(initialContactFormState, buildFormData())],
  ["findLeadForContactAttach", () => findLeadForContactAttach("p9")],
  ["updateContact", () => updateContact("p1", initialContactFormState, buildFormData())],
  ["deleteContact", () => deleteContact("p1")],
])("%s rejects a call without a session, before touching the database", async (_name, call) => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

  const result = call()

  await expect(result).rejects.toThrow()
  expect(prisma.$transaction).not.toHaveBeenCalled()
  expect(prisma.person.findFirst).not.toHaveBeenCalled()
  expect(prisma.person.findUnique).not.toHaveBeenCalled()
})

describe("createContact", () => {
  it("normalizes the LinkedIn profile link and lowercases the email", async () => {
    await createContact(
      initialContactFormState,
      buildFormData({
        email: " Jeanne.Dupont@Example.COM ",
        linkedinUrl: "fr.linkedin.com/in/Jeanne-Dupont-4b2a1c/",
      }),
    )

    expect(prisma.person.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          email: "jeanne.dupont@example.com",
          linkedinUrl: "https://www.linkedin.com/in/jeanne-dupont-4b2a1c",
        }),
      }),
    )
    expect(prisma.contact.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ types: ["COLLEGUE"], personId: "p1" }) }),
    )
  })

  it("refuses a second contact with the same email or LinkedIn profile, naming it", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: "Jeanne Dupont",
      email: "jeanne@example.com",
      optedOutAt: null,
      lead: null,
      contact: { personId: "p2" },
    } as never)

    const state = await createContact(
      initialContactFormState,
      buildFormData({ email: "JEANNE@example.com" }),
    )

    expect(state.message).toBe("contact_exists")
    expect(state.errors.email).toEqual(["Ce contact existe déjà : Jeanne Dupont"])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("points to the lead picker when the person only holds the lead role", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: "Marie Durand",
      email: "marie@example.com",
      optedOutAt: null,
      lead: { personId: "p2" },
      contact: null,
    } as never)

    const state = await createContact(
      initialContactFormState,
      buildFormData({ email: "marie@example.com" }),
    )

    expect(state.message).toBe("contact_exists")
    expect(state.errors.email).toEqual([
      "Cette personne est déjà un lead : Marie Durand, choisissez-la « Depuis un lead »",
    ])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("names the stop date when the person opposed", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: null,
      email: null,
      optedOutAt: new Date("2026-03-11T23:30:00Z"),
    } as never)

    const state = await createContact(
      initialContactFormState,
      buildFormData({ linkedinUrl: "https://www.linkedin.com/in/jeanne-dupont-4b2a1c" }),
    )

    expect(state.message).toBe("contact_opted_out")
    expect(state.errors.linkedinUrl).toEqual([
      "Cette personne s'est opposée à la prospection le 12/03/2026",
    ])
  })

  it("creates the role on an existing person without writing its fields", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(personRecord())

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.ok).toBe(true)
    expect(prisma.person.create).not.toHaveBeenCalled()
    expect(prisma.contact.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ personId: "p9", types: ["COLLEGUE"], status: "ACTIF" }) }),
    )
  })

  it("attaches the role even when the lead's own fields would not validate", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(personRecord({ name: null }))
    const data = buildAttachFormData("p9")
    data.set("name", "")
    data.set("email", "not-an-email")

    const state = await createContact(initialContactFormState, data)

    expect(state.ok).toBe(true)
    expect(prisma.contact.create).toHaveBeenCalled()
  })

  it("refuses to attach the contact role to a person who already has it", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(
      personRecord({ contact: { personId: "p9" } }),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("contact_exists")
    expect(state.errors.personId).toEqual(["Ce contact existe déjà : Marie Durand"])
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it("refuses to attach the contact role to a person who opposed", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(
      personRecord({ name: null, optedOutAt: new Date("2026-03-11T23:30:00Z") }),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("contact_opted_out")
    expect(state.errors.personId).toEqual([
      "Cette personne s'est opposée à la prospection le 12/03/2026",
    ])
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it("refuses to attach the contact role to a person that no longer exists", async () => {
    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("person_not_found")
    expect(state.errors.personId).toBeDefined()
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it("maps a missing company to its field", async () => {
    vi.mocked(prisma.person.create).mockRejectedValueOnce(
      constraintViolation("P2003", "Person_companyId_fkey"),
    )

    const state = await createContact(
      initialContactFormState,
      buildFormData({ companyId: "c-missing" }),
    )

    expect(state.message).toBe("company_not_found")
    expect(state.errors.companyId).toBeDefined()
  })

  it("maps a concurrent duplicate on the LinkedIn profile to its field", async () => {
    vi.mocked(prisma.person.create).mockRejectedValueOnce(
      constraintViolation("P2002", "Person_linkedinUrl_key"),
    )

    const state = await createContact(
      initialContactFormState,
      buildFormData({ linkedinUrl: "https://www.linkedin.com/in/jeanne-dupont-4b2a1c" }),
    )

    expect(state.message).toBe("contact_exists")
    expect(state.errors.linkedinUrl).toEqual(["Cette personne existe déjà"])
  })

  it("refuses to attach the contact role to a person without the lead role", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(personRecord({ lead: null }))

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.ok).toBe(false)
    expect(state.errors.personId).toEqual(["Cette personne n'est pas un lead"])
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it("locks the person row before reading its roles and writing the contact", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(personRecord())

    await createContact(initialContactFormState, buildAttachFormData("p9"))

    const lockOrder = vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0] ?? Infinity
    const readOrder = vi.mocked(prisma.person.findUnique).mock.invocationCallOrder[0] ?? -1
    const createOrder = vi.mocked(prisma.contact.create).mock.invocationCallOrder[0] ?? -1
    expect(lockOrder).toBeLessThan(readOrder)
    expect(lockOrder).toBeLessThan(createOrder)
  })

  it("maps a unique violation on an unknown constraint to the email field", async () => {
    vi.mocked(prisma.person.create).mockRejectedValueOnce(
      constraintViolation("P2002", "Person_other_key"),
    )

    const state = await createContact(initialContactFormState, buildFormData())

    expect(state.message).toBe("contact_exists")
    expect(state.errors.email).toEqual(["Cette personne existe déjà"])
    expect(state.errors.personId).toBeUndefined()
  })

  it("maps a unique violation without constraint details to the email field", async () => {
    vi.mocked(prisma.person.create).mockRejectedValueOnce({ code: "P2002" })

    const state = await createContact(initialContactFormState, buildFormData())

    expect(state.errors.email).toEqual(["Cette personne existe déjà"])
  })

  it("maps a concurrent duplicate on the contact primary key to the lead field", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(personRecord())
    vi.mocked(prisma.contact.create).mockRejectedValueOnce(
      constraintViolation("P2002", "Contact_pkey"),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("contact_exists")
    expect(state.errors.personId).toEqual(["Cette personne existe déjà"])
  })

  it("maps a person deleted during the attach to person_not_found", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(personRecord())
    vi.mocked(prisma.contact.create).mockRejectedValueOnce(
      constraintViolation("P2003", "Contact_personId_fkey"),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("person_not_found")
    expect(state.errors.personId).toBeDefined()
  })
})

describe("findLeadForContactAttach", () => {
  it("only looks up a lead who is not opposed and not yet a contact", async () => {
    await findLeadForContactAttach("p9")

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      objectMatch({
        where: { id: "p9", optedOutAt: null, contact: { is: null }, lead: { isNot: null } },
      }),
    )
  })
})

describe("updateContact", () => {
  it("ignores the contact being edited when checking duplicates", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: null } as never)

    await updateContact(
      "p1",
      initialContactFormState,
      buildFormData({ email: "jeanne@example.com" }),
    )

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      objectMatch({ where: objectMatch({ NOT: { id: "p1" } }) }),
    )
  })

  it("writes both the person fields and the role fields", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: null } as never)

    const state = await updateContact(
      "p1",
      initialContactFormState,
      buildFormData({ email: " Jeanne.Dupont@Example.COM ", status: "INACTIF" }),
    )

    expect(state.ok).toBe(true)
    expect(prisma.person.update).toHaveBeenCalledWith(
      objectMatch({
        where: { id: "p1" },
        data: objectMatch({ email: "jeanne.dupont@example.com" }),
      }),
    )
    expect(prisma.contact.update).toHaveBeenCalledWith(
      objectMatch({
        where: { personId: "p1" },
        data: objectMatch({ types: ["COLLEGUE"], status: "INACTIF" }),
      }),
    )
  })

  it("names the lead role when the new identity belongs to a lead-only person", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: null } as never)
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: "Marie Durand",
      email: "marie@example.com",
      optedOutAt: null,
      lead: { personId: "p2" },
      contact: null,
    } as never)

    const state = await updateContact(
      "p1",
      initialContactFormState,
      buildFormData({ email: "marie@example.com" }),
    )

    expect(state.message).toBe("contact_exists")
    expect(state.errors.email).toEqual(["Cette personne est déjà un lead : Marie Durand"])
    expect(prisma.person.update).not.toHaveBeenCalled()
  })

  it("reports the lock rather than a duplicate when the person opposed since the page loaded", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: new Date() } as never)
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: "Marie Durand",
      email: "marie@example.com",
      optedOutAt: null,
      lead: null,
      contact: { personId: "p2" },
    } as never)

    const state = await updateContact(
      "p1",
      initialContactFormState,
      buildFormData({ email: "marie@example.com" }),
    )

    expect(state.message).toBe("contact_opted_out_locked")
    expect(prisma.person.findFirst).not.toHaveBeenCalled()
  })

  it("reports a contact deleted since the page loaded", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: null } as never)
    vi.mocked(prisma.contact.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.contact.count).mockResolvedValueOnce(0)

    const state = await updateContact("p1", initialContactFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("contact_not_found")
  })

  it("reports an unknown error when a P2025 comes while the contact still exists", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: null } as never)
    vi.mocked(prisma.contact.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.contact.count).mockResolvedValueOnce(1)

    const state = await updateContact("p1", initialContactFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })

  it("refuses to edit an opted-out contact", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: new Date() } as never)

    const state = await updateContact("p1", initialContactFormState, buildFormData())

    expect(state.message).toBe("contact_opted_out_locked")
    expect(prisma.person.update).not.toHaveBeenCalled()
    expect(prisma.contact.update).not.toHaveBeenCalled()
  })
})

describe("deleteContact", () => {
  it("deletes the person through one conditional statement that spares any other role", async () => {
    await deleteContact("p1")

    expect(prisma.contact.delete).toHaveBeenCalledWith({ where: { personId: "p1" } })
    expect(prisma.person.deleteMany).toHaveBeenCalledWith({
      where: { id: "p1", lead: { is: null }, contact: { is: null } },
    })
  })

  it("treats a contact already deleted elsewhere as deleted, without touching the person", async () => {
    vi.mocked(prisma.contact.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.contact.count).mockResolvedValueOnce(0)

    const state = await deleteContact("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.deleteMany).not.toHaveBeenCalled()
  })

  it("reports an unknown error when a P2025 comes while the contact still exists", async () => {
    vi.mocked(prisma.contact.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.contact.count).mockResolvedValueOnce(1)

    const state = await deleteContact("p1")

    expect(state.message).toBe("unknown_error")
  })
})
