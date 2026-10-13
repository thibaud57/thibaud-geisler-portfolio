import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"

vi.mock("@c15t/nextjs/headless", () => ({
  useConsentManager: vi.fn(),
}))

vi.mock("react-calendly", () => ({
  InlineWidget: ({ url }: { url: string }) => (
    <div data-testid="inline-widget-stub" data-url={url} />
  ),
  useCalendlyEventListener: () => undefined,
}))

vi.mock("@/server/actions/calendly", () => ({
  trackCalendlyEvent: vi.fn(),
}))

import { CalendlyWidget } from "./CalendlyWidget"
import { useConsentManager } from "@c15t/nextjs/headless"

const messages = {
  Cookies: {
    openManagerLabel: "Gérer mes cookies",
    calendlyGated: {
      label: "L'affichage du widget Calendly nécessite votre accord pour les cookies marketing.",
      cta: "Activer Calendly",
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
      category === "necessary" || (category === "marketing" && marketingAccepted),
    setActiveUI: vi.fn(),
    setLanguage: vi.fn(),
    consents: marketingAccepted
      ? { necessary: true, marketing: true }
      : { necessary: true, marketing: false },
  } as unknown as ReturnType<typeof useConsentManager>
}

function Widget() {
  return (
    <Wrapper>
      <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
    </Wrapper>
  )
}

const GATED_LABEL = /L'affichage du widget Calendly nécessite votre accord/

describe("CalendlyWidget marketing gating", () => {
  it("renders the gated placeholder when marketing is refused", () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(false))

    render(<Widget />)

    expect(screen.getByText(GATED_LABEL)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Activer Calendly" })).toBeInTheDocument()
    expect(screen.queryByTestId("inline-widget-stub")).toBeNull()
  })

  it("renders the Calendly widget when marketing is accepted", () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(true))

    render(<Widget />)

    const stub = screen.getByTestId("inline-widget-stub")
    expect(stub.getAttribute("data-url")).toBe("https://calendly.com/test")
    expect(screen.queryByText(GATED_LABEL)).toBeNull()
  })

  it("swaps the gated placeholder for the widget once marketing is accepted", () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(false))
    const { rerender } = render(<Widget />)
    useConsentManagerMock.mockReturnValue(buildManagerMock(true))

    rerender(<Widget />)

    expect(screen.getByTestId("inline-widget-stub")).toBeInTheDocument()
    expect(screen.queryByText(GATED_LABEL)).toBeNull()
  })
})
