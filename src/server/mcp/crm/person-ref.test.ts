import { describe, expect, it } from "vitest"

import { personRef } from "./person-ref"

describe("personRef", () => {
  it.each([
    ["renders an opted-out person without her name", "person-1", null],
    ["hides the name of a person who opted out even when it is still set", "person-3", "John Roe"],
  ])("%s", (_label, id, name) => {
    const person = { id, name, optedOutAt: new Date("2026-10-01T00:00:00Z") }

    const ref = personRef(person)

    expect(ref).toStrictEqual({ id, name: null, optedOut: true })
  })

  it("renders another person with her name", () => {
    const person = { id: "person-2", name: "Jane Doe", optedOutAt: null }

    const ref = personRef(person)

    expect(ref).toStrictEqual({ id: "person-2", name: "Jane Doe" })
  })
})
