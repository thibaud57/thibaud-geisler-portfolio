import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    person: { deleteMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    contact: { delete: vi.fn(), count: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/server/crm/contacts", () => ({
  attachContact: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
}))

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { personIdSchema } from "@/lib/ids"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import {
  attachContact as attachContactRecord,
  createContact as createContactRecord,
  updateContact as updateContactRecord,
} from "@/server/crm/contacts"
import type { PersonFieldsError } from "@/server/crm/person-write"
import { fail, ok } from "@/server/result"

import { createContact, deleteContact, findLeadForContactAttach, updateContact } from "./contacts"
import { initialContactFormState } from "./contacts.types"

const BASE_FIELDS = {
  name: "Jane Doe",
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

const existsConflict = (
  roles: { lead: boolean; contact: boolean },
  field: "email" | "personId" = "email",
): PersonFieldsError => ({
  code: "person_conflict",
  conflict: { reason: "exists", field, personName: "John Roe", roles },
})

const OPTED_OUT_AT = new Date("2026-03-11T23:30:00Z")

beforeEach(() => {
  vi.mocked(createContactRecord).mockResolvedValue(ok({ personId: "p1" }))
  vi.mocked(attachContactRecord).mockResolvedValue(ok({ personId: "p9" }))
  vi.mocked(updateContactRecord).mockResolvedValue(ok({ personId: "p1" }))
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null)
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
  expect(createContactRecord).not.toHaveBeenCalled()
  expect(updateContactRecord).not.toHaveBeenCalled()
})

describe("createContact", () => {
  it("normalizes the LinkedIn profile link and lowercases the email", async () => {
    await createContact(
      initialContactFormState,
      buildFormData({
        email: " Jane.Doe@Example.COM ",
        linkedinUrl: "fr.linkedin.com/in/Jane_Doe_Example_A/",
      }),
    )

    expect(createContactRecord).toHaveBeenCalledWith(
      objectMatch({
        email: "jane.doe@example.com",
        linkedinUrl: "https://www.linkedin.com/in/jane_doe_example_a",
        types: ["COLLEGUE"],
        status: "ACTIF",
      }),
    )
  })

  it("answers ok and refreshes the lists after the domain wrote the contact", async () => {
    const state = await createContact(initialContactFormState, buildFormData())

    expect(state.ok).toBe(true)
    expect(revalidatePath).toHaveBeenCalled()
  })

  it.each([
    [
      "refuses a second contact with the same email, naming it",
      { lead: false, contact: true },
      "Ce contact existe déjà : John Roe",
    ],
    [
      "points to the lead picker when the person only holds the lead role",
      { lead: true, contact: false },
      "Cette personne est déjà un lead : John Roe, choisissez-la « Depuis un lead »",
    ],
  ])("%s", async (_label, roles, message) => {
    vi.mocked(createContactRecord).mockResolvedValue(fail(existsConflict(roles)))

    const state = await createContact(initialContactFormState, buildFormData())

    expect(state.message).toBe("contact_exists")
    expect(state.errors.email).toEqual([message])
  })

  it("names the stop date when the person opposed", async () => {
    vi.mocked(createContactRecord).mockResolvedValue(
      fail({
        code: "person_conflict",
        conflict: { reason: "opted_out", field: "linkedinUrl", optedOutAt: OPTED_OUT_AT },
      }),
    )

    const state = await createContact(initialContactFormState, buildFormData())

    expect(state.message).toBe("contact_opted_out")
    expect(state.errors.linkedinUrl).toEqual([
      "Cette personne s'est opposée à la prospection le 12/03/2026",
    ])
  })

  it("maps a missing company to its field", async () => {
    vi.mocked(createContactRecord).mockResolvedValue(fail({ code: "company_not_found" }))

    const state = await createContact(
      initialContactFormState,
      buildFormData({ companyId: "c-missing" }),
    )

    expect(state.message).toBe("company_not_found")
    expect(state.errors.companyId).toBeDefined()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each(["email", "linkedinUrl", "personId"] as const)(
    "maps a concurrent unique violation on %s to its field",
    async (field) => {
      vi.mocked(createContactRecord).mockResolvedValue(fail({ code: "identity_taken", field }))

      const state = await createContact(initialContactFormState, buildFormData())

      expect(state.message).toBe("contact_exists")
      expect(state.errors[field]).toEqual(["Cette personne existe déjà"])
    },
  )

  it("reports an unknown error when the domain throws", async () => {
    vi.mocked(createContactRecord).mockRejectedValueOnce(new Error("boom"))

    const state = await createContact(initialContactFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })
})

describe("createContact attaching an existing lead", () => {
  it("hands the role to the domain without writing person fields", async () => {
    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.ok).toBe(true)
    expect(attachContactRecord).toHaveBeenCalledWith(personIdSchema.parse("p9"), {
      types: ["COLLEGUE"],
      status: "ACTIF",
    })
    expect(createContactRecord).not.toHaveBeenCalled()
  })

  it("attaches the role even when the lead's own fields would not validate", async () => {
    const data = buildAttachFormData("p9")
    data.set("name", "")
    data.set("email", "not-an-email")

    const state = await createContact(initialContactFormState, data)

    expect(state.ok).toBe(true)
    expect(attachContactRecord).toHaveBeenCalled()
  })

  it("refuses a person who already has the contact role", async () => {
    vi.mocked(attachContactRecord).mockResolvedValue(
      fail(existsConflict({ lead: true, contact: true }, "personId")),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("contact_exists")
    expect(state.errors.personId).toEqual(["Ce contact existe déjà : John Roe"])
  })

  it("refuses a person who opposed, giving the date", async () => {
    vi.mocked(attachContactRecord).mockResolvedValue(
      fail({
        code: "person_conflict",
        conflict: { reason: "opted_out", field: "personId", optedOutAt: OPTED_OUT_AT },
      }),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("contact_opted_out")
    expect(state.errors.personId).toEqual([
      "Cette personne s'est opposée à la prospection le 12/03/2026",
    ])
  })

  it("refuses a person that no longer exists", async () => {
    vi.mocked(attachContactRecord).mockResolvedValue(
      fail({ code: "person_conflict", conflict: { reason: "person_missing", field: "personId" } }),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("person_not_found")
    expect(state.errors.personId).toBeDefined()
  })

  it("refuses a person without the lead role", async () => {
    vi.mocked(attachContactRecord).mockResolvedValue(
      fail({ code: "person_conflict", conflict: { reason: "not_a_lead", field: "personId" } }),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.ok).toBe(false)
    expect(state.errors.personId).toEqual(["Cette personne n'est pas un lead"])
  })

  it("maps a concurrent duplicate on the contact primary key to the lead field", async () => {
    vi.mocked(attachContactRecord).mockResolvedValue(
      fail({ code: "identity_taken", field: "personId" }),
    )

    const state = await createContact(initialContactFormState, buildAttachFormData("p9"))

    expect(state.message).toBe("contact_exists")
    expect(state.errors.personId).toEqual(["Cette personne existe déjà"])
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
  it("hands the person id and the parsed fields to the domain", async () => {
    await updateContact(
      "p1",
      initialContactFormState,
      buildFormData({ email: " Jane.Doe@Example.COM ", status: "INACTIF" }),
    )

    expect(updateContactRecord).toHaveBeenCalledWith(
      personIdSchema.parse("p1"),
      objectMatch({ email: "jane.doe@example.com", types: ["COLLEGUE"], status: "INACTIF" }),
    )
  })

  it("names the lead role when the new identity belongs to a lead-only person", async () => {
    vi.mocked(updateContactRecord).mockResolvedValue(
      fail(existsConflict({ lead: true, contact: false })),
    )

    const state = await updateContact("p1", initialContactFormState, buildFormData())

    expect(state.message).toBe("contact_exists")
    expect(state.errors.email).toEqual(["Cette personne est déjà un lead : John Roe"])
  })

  it("reports the lock when the person opposed since the page loaded", async () => {
    vi.mocked(updateContactRecord).mockResolvedValue(fail({ code: "person_locked" }))

    const state = await updateContact("p1", initialContactFormState, buildFormData())

    expect(state.message).toBe("contact_opted_out_locked")
  })

  it("reports a contact deleted since the page loaded and realigns the lists", async () => {
    vi.mocked(updateContactRecord).mockResolvedValue(fail({ code: "not_found" }))

    const state = await updateContact("p1", initialContactFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("contact_not_found")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("answers contact_not_found for an empty person id, without writing", async () => {
    const state = await updateContact("", initialContactFormState, buildFormData())

    expect(state.message).toBe("contact_not_found")
    expect(updateContactRecord).not.toHaveBeenCalled()
  })

  it("reports an unknown error when the domain throws", async () => {
    vi.mocked(updateContactRecord).mockRejectedValueOnce(new Error("boom"))

    const state = await updateContact("p1", initialContactFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
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
