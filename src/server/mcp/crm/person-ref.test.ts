import { describe, expect, it } from "vitest"

import { personRef } from "./person-ref"

describe("personRef", () => {
  it("renders an opted-out person without her name", () => {
    const person = { id: "person-1", name: null, optedOutAt: new Date("2026-10-01T00:00:00Z") }

    const ref = personRef(person)

    expect(ref).toStrictEqual({ id: "person-1", name: null, optedOut: true })
  })

  it("renders another person with her name", () => {
    const person = { id: "person-2", name: "Jane Doe", optedOutAt: null }

    const ref = personRef(person)

    expect(ref).toStrictEqual({ id: "person-2", name: "Jane Doe" })
  })

  it("hides the name of a person who opted out even when it is still set", () => {
    const person = {
      id: "person-3",
      name: "John Roe",
      optedOutAt: new Date("2026-10-01T00:00:00Z"),
    }

    const ref = personRef(person)

    expect(ref).toStrictEqual({ id: "person-3", name: null, optedOut: true })
  })
})
