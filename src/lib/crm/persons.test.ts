import { describe, expect, it } from "vitest"

import { optOutDeletesPerson, personDisplayName } from "./persons"

describe("optOutDeletesPerson", () => {
  it.each([
    {
      label: "deletes a person without email nor LinkedIn",
      email: null,
      linkedinUrl: null,
      expected: true,
    },
    {
      label: "keeps a person with an email",
      email: "jane.doe@example.com",
      linkedinUrl: null,
      expected: false,
    },
    {
      label: "keeps a person with a LinkedIn profile",
      email: null,
      linkedinUrl: "https://www.linkedin.com/in/jane-doe",
      expected: false,
    },
  ])("$label on opt-out", ({ email, linkedinUrl, expected }) => {
    const deleted = optOutDeletesPerson({ email, linkedinUrl })

    expect(deleted).toBe(expected)
  })
})

describe("personDisplayName", () => {
  it.each([
    {
      label: "the name",
      person: {
        name: "Jane Doe",
        email: "jane.doe@example.com",
        linkedinUrl: "https://www.linkedin.com/in/jane-doe",
      },
      expected: "Jane Doe",
    },
    {
      label: "the email when the name is missing",
      person: {
        name: null,
        email: "jane.doe@example.com",
        linkedinUrl: "https://www.linkedin.com/in/jane-doe",
      },
      expected: "jane.doe@example.com",
    },
    {
      label: "the LinkedIn profile when name and email are missing",
      person: { name: null, email: null, linkedinUrl: "https://www.linkedin.com/in/jane-doe" },
      expected: "https://www.linkedin.com/in/jane-doe",
    },
    {
      label: "an empty string when nothing identifies the person",
      person: { name: null, email: null, linkedinUrl: null },
      expected: "",
    },
  ])("shows $label", ({ person, expected }) => {
    const displayName = personDisplayName(person)

    expect(displayName).toBe(expected)
  })
})
