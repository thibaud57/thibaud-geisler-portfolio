import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { JsonLd } from "./json-ld"

describe("JsonLd", () => {
  it('renders a <script type="application/ld+json"> with the serialized JSON', () => {
    const { container } = render(<JsonLd data={{ "@type": "Person", name: "X" }} />)

    const script = container.querySelector('script[type="application/ld+json"]')
    if (!script) throw new Error("application/ld+json script not found")

    expect(JSON.parse(script.innerHTML)).toEqual({ "@type": "Person", name: "X" })
  })

  it("escapes </script> as \\u003c to block XSS injection", () => {
    const { container } = render(
      <JsonLd data={{ payload: "</script><script>alert(1)</script>" }} />,
    )

    const script = container.querySelector("script")
    if (!script) throw new Error("script not found")
    const html = script.innerHTML

    expect(html).not.toContain("</script>")
    expect(html).toContain("\\u003c")
  })
})
