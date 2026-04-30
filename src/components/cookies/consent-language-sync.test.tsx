import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from 'next-intl'

const setLanguageMock = vi.fn()
const useLocaleMock = vi.fn<() => Locale>()

vi.mock('next-intl', () => ({
  useLocale: () => useLocaleMock(),
}))

vi.mock('@c15t/nextjs', () => ({
  useConsentManager: () => ({
    setLanguage: setLanguageMock,
    consents: {},
    has: () => false,
    setActiveUI: () => undefined,
  }),
}))

import { ConsentLanguageSync } from './consent-language-sync'

beforeEach(() => {
  setLanguageMock.mockClear()
  useLocaleMock.mockReturnValue('fr')
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('<ConsentLanguageSync />', () => {
  it('appelle setLanguage(locale) au mount avec la locale courante', () => {
    useLocaleMock.mockReturnValue('fr')
    render(<ConsentLanguageSync />)
    expect(setLanguageMock).toHaveBeenCalledTimes(1)
    expect(setLanguageMock).toHaveBeenCalledWith('fr')
  })

  it('rappelle setLanguage avec la nouvelle locale après changement (re-render)', () => {
    useLocaleMock.mockReturnValue('fr')
    const { rerender } = render(<ConsentLanguageSync />)
    expect(setLanguageMock).toHaveBeenCalledWith('fr')

    useLocaleMock.mockReturnValue('en')
    act(() => {
      rerender(<ConsentLanguageSync />)
    })

    expect(setLanguageMock).toHaveBeenCalledTimes(2)
    expect(setLanguageMock).toHaveBeenLastCalledWith('en')
  })

  it('ne génère pas de warning React au unmount', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<ConsentLanguageSync />)
    unmount()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
