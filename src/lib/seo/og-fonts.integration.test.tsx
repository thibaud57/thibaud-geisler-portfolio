import { ImageResponse } from "next/og"

import { loadOgFonts } from "./og-fonts"
import { OgTemplate } from "./og-template"

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

describe("loadOgFonts", () => {
  it("provides fonts that the OG engine renders into a PNG", async () => {
    const fonts = await loadOgFonts()

    const image = await new ImageResponse(
      <OgTemplate kind="site" locale="fr" title="Titre" subtitle="Sous-titre" />,
      { width: 1200, height: 630, fonts },
    ).arrayBuffer()

    expect([...new Uint8Array(image.slice(0, 8))]).toEqual(PNG_SIGNATURE)
  })
})
