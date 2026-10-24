import { describe, expect, it } from "vitest"

import { deleteOutcomeOf } from "./delete-outcome"

type Code = "tag_in_use" | "unknown_error"

const DENIALS = { tag_in_use: "Ce tag est utilisé" }

describe("deleteOutcomeOf", () => {
  it("deletes on success", () => {
    const outcome = deleteOutcomeOf<Code>({ ok: true }, DENIALS)

    expect(outcome).toEqual({ status: "deleted" })
  })

  it("denies with the mapped reason", () => {
    const outcome = deleteOutcomeOf<Code>({ ok: false, message: "tag_in_use" }, DENIALS)

    expect(outcome).toEqual({ status: "denied", reason: "Ce tag est utilisé" })
  })

  it("fails on an unmapped code", () => {
    const outcome = deleteOutcomeOf<Code>({ ok: false, message: "unknown_error" }, DENIALS)

    expect(outcome).toEqual({ status: "failed" })
  })

  it("fails on a validation-only failure", () => {
    const outcome = deleteOutcomeOf<Code>({ ok: false, message: null }, DENIALS)

    expect(outcome).toEqual({ status: "failed" })
  })
})
