import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { MonthField } from "./MonthField"

function renderField(defaultValue: string) {
  return render(
    <MonthField
      id="m"
      name="startMonth"
      label="Démarrage"
      errors={undefined}
      defaultValue={defaultValue}
    />,
  )
}

function hiddenValue(container: HTMLElement): string | undefined {
  return container.querySelector<HTMLInputElement>('input[type="hidden"][name="startMonth"]')?.value
}

describe("MonthField", () => {
  it("keeps the default month as YYYY-MM", () => {
    const { container } = renderField("2026-04")

    expect(hiddenValue(container)).toBe("2026-04")
  })

  it("sends an incomplete month so that validation refuses it", () => {
    const { container } = renderField("-04")

    expect(hiddenValue(container)).toBe("-04")
  })

  it("zero-pads the picked month", async () => {
    const user = userEvent.setup()
    const { container } = renderField("2026-11")

    await user.click(screen.getByRole("button", { name: "Démarrage" }))
    await user.click(screen.getByRole("button", { name: "avril 2026" }))

    expect(hiddenValue(container)).toBe("2026-04")
  })

  it("empties the value when the month is cleared", async () => {
    const user = userEvent.setup()
    const { container } = renderField("2026-04")

    await user.click(screen.getByRole("button", { name: "Démarrage" }))
    await user.click(screen.getByRole("button", { name: "Effacer" }))

    expect(hiddenValue(container)).toBe("")
  })
})
