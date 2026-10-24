import { describe, expect, it } from "vitest"
import { z } from "zod"
import { contactSchema } from "./contact"

const VALID_MESSAGE = "Bonjour, j’aimerais discuter d’un projet IA dans ma boite."

function createPayload(overrides?: Record<string, unknown>) {
  return {
    name: "Alice",
    email: "alice@acme.example",
    subject: "Projet IA",
    message: VALID_MESSAGE,
    ...overrides,
  }
}

describe("contactSchema", () => {
  it("accepts a minimal valid payload without company", () => {
    const result = contactSchema.safeParse(createPayload())

    expect(result.success).toBe(true)
    expect(result.data).toEqual(createPayload())
    expect(result.data?.company).toBeUndefined()
  })

  it("trims the required string fields", () => {
    const result = contactSchema.safeParse(
      createPayload({
        name: "  Alice  ",
        email: "  alice@acme.example  ",
        subject: "  Projet IA  ",
        message: `  ${VALID_MESSAGE}  `,
      }),
    )

    expect(result.data).toEqual(createPayload())
  })

  it.each([
    ["name is blank after trimming", { name: "   " }, "name", "name_required"],
    ["subject is empty", { subject: "" }, "subject", "subject_required"],
    ["name exceeds 120 characters", { name: "a".repeat(121) }, "name", "name_too_long"],
    [
      "email exceeds 200 characters",
      { email: `${"a".repeat(200)}@acme.example` },
      "email",
      "email_too_long",
    ],
    ["subject exceeds 200 characters", { subject: "a".repeat(201) }, "subject", "subject_too_long"],
    ["company exceeds 200 characters", { company: "a".repeat(201) }, "company", "company_too_long"],
    [
      "message exceeds 5000 characters",
      { message: "a".repeat(5001) },
      "message",
      "message_too_long",
    ],
    ["email has an invalid format", { email: "pas-un-email" }, "email", "email_invalid"],
    ["message is under 20 characters", { message: "Trop court" }, "message", "message_too_short"],
    ["name is absent", { name: undefined }, "name", "name_required"],
    ["email is absent", { email: undefined }, "email", "email_invalid"],
  ] as const)("returns the code for a field error when %s", (_label, overrides, field, code) => {
    const result = contactSchema.safeParse(createPayload(overrides))

    expect(result.error && z.flattenError(result.error).fieldErrors).toHaveProperty(field, [code])
  })

  it("ignores an unknown field such as the website honeypot", () => {
    const result = contactSchema.safeParse(createPayload({ website: "spam-bot-filled" }))

    expect(result.success).toBe(true)
    expect(result.data).not.toHaveProperty("website")
  })
})
