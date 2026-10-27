import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Locale } from "next-intl"

const { setLanguageMock, useLocaleMock } = vi.hoisted(() => ({
  setLanguageMock: vi.fn(),
  useLocaleMock: vi.fn<() => Locale>(),
}))

vi.mock("next-intl", () => ({
  useLocale: () => useLocaleMock(),
}))

vi.mock("c15t/next", () => ({
  useSetLanguage: () => setLanguageMock,
}))

import { ConsentLanguageSync } from "./consent-language-sync"

beforeEach(() => {
  useLocaleMock.mockReturnValue("fr")
})

describe("<ConsentLanguageSync />", () => {
  it("calls setLanguage with the current locale on mount", () => {
    render(<ConsentLanguageSync />)

    expect(setLanguageMock).toHaveBeenCalledTimes(1)
    expect(setLanguageMock).toHaveBeenCalledWith("fr")
  })

  it("calls setLanguage again with the new locale after a re-render", () => {
    const { rerender } = render(<ConsentLanguageSync />)
    useLocaleMock.mockReturnValue("en")

    rerender(<ConsentLanguageSync />)

    expect(setLanguageMock).toHaveBeenCalledTimes(2)
    expect(setLanguageMock).toHaveBeenLastCalledWith("en")
  })
})
