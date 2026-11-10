import { describe, expect, it } from "vitest"

import { normalizeLinkedinProfileUrl } from "./linkedin"

describe("normalizeLinkedinProfileUrl", () => {
  it.each([
    [
      "https://fr.linkedin.com/in/Marie_Durand_Example/?originalSubdomain=fr#about",
      "https://www.linkedin.com/in/marie_durand_example",
    ],
    [
      "http://linkedin.com/in/marie_durand_example",
      "https://www.linkedin.com/in/marie_durand_example",
    ],
    [
      "https://www.linkedin.com/in/Jérôme_Lambert_Example",
      "https://www.linkedin.com/in/j%C3%A9r%C3%B4me_lambert_example",
    ],
    [
      "https://www.linkedin.com/in/j%C3%A9r%C3%B4me_lambert_example/",
      "https://www.linkedin.com/in/j%C3%A9r%C3%B4me_lambert_example",
    ],
  ])(
    "normalizes the host, the case, a trailing slash and query parameters (%s)",
    (value, expected) => {
      const normalized = normalizeLinkedinProfileUrl(value)

      expect(normalized).toBe(expected)
    },
  )

  it.each(["linkedin.com/in/marie_durand_example", " www.linkedin.com/in/marie_durand_example/ "])(
    "accepts a profile URL typed without a scheme (%s)",
    (value) => {
      const normalized = normalizeLinkedinProfileUrl(value)

      expect(normalized).toBe("https://www.linkedin.com/in/marie_durand_example")
    },
  )

  it.each([
    "https://www.linkedin.com/company/acme",
    "https://evil-linkedin.com/in/marie_durand_example",
    "https://example.com/in/marie-durand-7e91d3",
    "pas une adresse",
  ])("rejects a company page and another site (%s)", (value) => {
    const normalized = normalizeLinkedinProfileUrl(value)

    expect(normalized).toBeNull()
  })
})
