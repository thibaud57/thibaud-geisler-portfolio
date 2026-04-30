// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('@c15t/nextjs', () => ({
  useConsentManager: vi.fn(),
}))

vi.mock('react-calendly', () => ({
  InlineWidget: ({ url }: { url: string }) => (
    <div data-testid="inline-widget-stub" data-url={url} />
  ),
  useCalendlyEventListener: () => undefined,
}))

vi.mock('@/server/actions/calendly', () => ({
  trackCalendlyEvent: vi.fn(),
}))

import { CalendlyWidget } from './CalendlyWidget'
import { useConsentManager } from '@c15t/nextjs'

const messages = {
  Cookies: {
    openManagerLabel: 'Gérer mes cookies',
    calendlyGated: {
      label: "L'affichage du widget Calendly nécessite votre accord pour les cookies marketing.",
      cta: 'Activer Calendly',
    },
  },
} as const

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="fr" messages={messages} timeZone="Europe/Paris">
      {children}
    </NextIntlClientProvider>
  )
}

const useConsentManagerMock = vi.mocked(useConsentManager)

function buildManagerMock(marketingAccepted: boolean) {
  return {
    has: (category: string) =>
      category === 'necessary' || (category === 'marketing' && marketingAccepted),
    setActiveUI: vi.fn(),
    setLanguage: vi.fn(),
    consents: marketingAccepted
      ? { necessary: true, marketing: true }
      : { necessary: true, marketing: false },
  } as unknown as ReturnType<typeof useConsentManager>
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CalendlyWidget gating marketing', () => {
  it('rend le placeholder gated quand marketing=false', () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(false))

    render(
      <Wrapper>
        <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
      </Wrapper>,
    )

    expect(
      screen.getByText(/L'affichage du widget Calendly nécessite votre accord/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activer Calendly' })).toBeInTheDocument()
    expect(screen.queryByTestId('inline-widget-stub')).toBeNull()
  })

  it('rend le widget Calendly quand marketing=true et url valide', () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(true))

    render(
      <Wrapper>
        <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
      </Wrapper>,
    )

    const stub = screen.getByTestId('inline-widget-stub')
    expect(stub).toBeInTheDocument()
    expect(stub.getAttribute('data-url')).toBe('https://calendly.com/test')
    expect(
      screen.queryByText(/L'affichage du widget Calendly nécessite votre accord/),
    ).toBeNull()
  })

  it('bascule du placeholder gated vers le widget quand marketing passe de false à true', () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(false))

    const { rerender } = render(
      <Wrapper>
        <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
      </Wrapper>,
    )

    expect(
      screen.getByText(/L'affichage du widget Calendly nécessite votre accord/),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('inline-widget-stub')).toBeNull()

    useConsentManagerMock.mockReturnValue(buildManagerMock(true))

    rerender(
      <Wrapper>
        <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
      </Wrapper>,
    )

    expect(screen.getByTestId('inline-widget-stub')).toBeInTheDocument()
    expect(
      screen.queryByText(/L'affichage du widget Calendly nécessite votre accord/),
    ).toBeNull()
  })
})
