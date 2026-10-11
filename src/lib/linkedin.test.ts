import { describe, expect, it } from "vitest"

import { normalizeLinkedinProfileUrl } from "./linkedin"

describe("normalizeLinkedinProfileUrl", () => {
  it.each([
    [
      "https://fr.linkedin.com/in/Marie-Durand-7e91d3/?originalSubdomain=fr#about",
      "https://www.linkedin.com/in/marie-durand-7e91d3",
    ],
    [
      "http://linkedin.com/in/marie-durand-7e91d3",
      "https://www.linkedin.com/in/marie-durand-7e91d3",
    ],
    [
      "https://www.linkedin.com/in/Jérôme-Lambert-8b1d4f",
      "https://www.linkedin.com/in/j%C3%A9r%C3%B4me-lambert-8b1d4f",
    ],
    [
      "https://www.linkedin.com/in/j%C3%A9r%C3%B4me-lambert-8b1d4f/",
      "https://www.linkedin.com/in/j%C3%A9r%C3%B4me-lambert-8b1d4f",
    ],
  ])(
    "normalizes the host, the case, a trailing slash and query parameters (%s)",
    (value, expected) => {
      const normalized = normalizeLinkedinProfileUrl(value)

      expect(normalized).toBe(expected)
    },
  )

  it.each(["linkedin.com/in/marie-durand-7e91d3", " www.linkedin.com/in/marie-durand-7e91d3/ "])(
    "accepts a profile URL typed without a scheme (%s)",
    (value) => {
      const normalized = normalizeLinkedinProfileUrl(value)

      expect(normalized).toBe("https://www.linkedin.com/in/marie-durand-7e91d3")
    },
  )

  it.each([
    "https://www.linkedin.com/company/acme",
    "https://evil-linkedin.com/in/marie-durand-7e91d3",
    "https://example.com/in/marie-durand-7e91d3",
    "pas une adresse",
  ])("rejects a company page and another site (%s)", (value) => {
    const normalized = normalizeLinkedinProfileUrl(value)

    expect(normalized).toBeNull()
  })
})
