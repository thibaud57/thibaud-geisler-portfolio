import { describe, expect, it } from "vitest"

import { normalizeLinkedinProfileUrl } from "./linkedin"

describe("normalizeLinkedinProfileUrl", () => {
  it.each([
    [
      "https://fr.linkedin.com/in/jeanne-dupont-4b2a1c/?originalSubdomain=fr#about",
      "https://www.linkedin.com/in/jeanne-dupont-4b2a1c",
    ],
    ["http://linkedin.com/in/jeanne-dupont-4b2a1c", "https://www.linkedin.com/in/jeanne-dupont-4b2a1c"],
    [
      "https://www.linkedin.com/in/jerome-lambert-8b1d4f",
      "https://www.linkedin.com/in/jerome-lambert-8b1d4f",
    ],
    [
      "https://www.linkedin.com/in/jerome-lambert-8b1d4f/",
      "https://www.linkedin.com/in/jerome-lambert-8b1d4f",
    ],
  ])(
    "normalizes the host, the case, a trailing slash and query parameters (%s)",
    (value, expected) => {
      const normalized = normalizeLinkedinProfileUrl(value)

      expect(normalized).toBe(expected)
    },
  )

  it.each(["linkedin.com/in/jeanne-dupont-4b2a1c", " www.linkedin.com/in/jeanne-dupont-4b2a1c/ "])(
    "accepts a profile URL typed without a scheme (%s)",
    (value) => {
      const normalized = normalizeLinkedinProfileUrl(value)

      expect(normalized).toBe("https://www.linkedin.com/in/jeanne-dupont-4b2a1c")
    },
  )

  it.each([
    "https://www.linkedin.com/company/acme",
    "https://evil-linkedin.com/in/jeanne-dupont-4b2a1c",
    "https://example.com/in/jeanne-dupont-4b2a1c",
    "pas une adresse",
  ])("rejects a company page and another site (%s)", (value) => {
    const normalized = normalizeLinkedinProfileUrl(value)

    expect(normalized).toBeNull()
  })
})
