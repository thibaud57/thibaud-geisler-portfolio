import { renderHook } from "@testing-library/react"
import { toast } from "sonner"
import { describe, expect, it, vi } from "vitest"

import { useSaveFeedback } from "./use-save-feedback"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

type Message = "opportunity_not_found" | "company_not_found" | "unknown_error"
interface State {
  ok: boolean | null
  message: Message | null
}

const GONE = { code: "opportunity_not_found", toast: "Cette opportunité a été supprimée" } as const

function renderFeedback(state: State, onSaved = vi.fn()) {
  renderHook(() => {
    useSaveFeedback<Message>(state, {
      saved: "Opportunité créée",
      onSaved,
      gone: GONE,
      messages: { company_not_found: "Cette entreprise n'existe plus" },
    })
  })
  return onSaved
}

describe("useSaveFeedback", () => {
  it("toasts the success and hands over to onSaved", () => {
    const onSaved = renderFeedback({ ok: true, message: null })

    expect(toast.success).toHaveBeenCalledWith("Opportunité créée")
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it("toasts the vanished record and leaves the form through onSaved", () => {
    const onSaved = renderFeedback({ ok: false, message: "opportunity_not_found" })

    expect(toast.error).toHaveBeenCalledWith("Cette opportunité a été supprimée")
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it("keeps the form open on an error with its own message", () => {
    const onSaved = renderFeedback({ ok: false, message: "company_not_found" })

    expect(toast.error).toHaveBeenCalledWith("Cette entreprise n'existe plus")
    expect(onSaved).not.toHaveBeenCalled()
  })

  it("falls back to the generic message on an unknown error", () => {
    renderFeedback({ ok: false, message: "unknown_error" })

    expect(toast.error).toHaveBeenCalledWith("Une erreur est survenue, réessayez")
  })

  it("stays silent before any submission", () => {
    const onSaved = renderFeedback({ ok: null, message: null })

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
