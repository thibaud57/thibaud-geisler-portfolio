import { describe, expect, it } from "vitest"

import { isFrenchLayout, registrationLabel } from "./legal-entities"

const SIRET = "12345678901234"

function entity(overrides: Partial<Parameters<typeof registrationLabel>[0]> = {}) {
  return {
    siret: SIRET,
    rcsCity: "Paris",
    rcsNumber: null,
    address: { country: "FR" },
    ...overrides,
  }
}

describe("isFrenchLayout", () => {
  it.each([[undefined], [null], ["FR"]])("treats %j as France", (country) => {
    const result = isFrenchLayout(country)

    expect(result).toBe(true)
  })

  it.each([["LU"], [""]])("keeps %j apart", (country) => {
    const result = isFrenchLayout(country)

    expect(result).toBe(false)
  })
})

describe("registrationLabel", () => {
  it.each([
    {
      label: "joins the RCS city and the SIREN in France",
      overrides: {},
      expected: "RCS Paris 123456789",
    },
    {
      label: "falls back to the RCS city when the SIREN is missing in France",
      overrides: { siret: null },
      expected: "RCS Paris",
    },
    {
      label: "stays empty in France without a RCS city",
      overrides: { rcsCity: null },
      expected: null,
    },
    {
      label: "treats a missing address as France",
      overrides: { address: null },
      expected: "RCS Paris 123456789",
    },
    {
      label: "joins the RCS city and number outside France",
      overrides: { address: { country: "LU" }, rcsNumber: "B123456", rcsCity: "Luxembourg" },
      expected: "Luxembourg B123456",
    },
  ])("$label", ({ overrides, expected }) => {
    const label = registrationLabel(entity(overrides))

    expect(label).toBe(expected)
  })
})
