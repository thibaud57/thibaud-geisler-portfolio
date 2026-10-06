// @vitest-environment node
import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { IconTooSmallError, normalizeIcon, UnreadableIconError } from "./normalize-icon"

function pngOf(width: number, height = width): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 18, g: 52, b: 86, alpha: 1 } },
  })
    .png()
    .toBuffer()
}

async function sizeOf(png: Buffer): Promise<{ width?: number; height?: number }> {
  const { width, height } = await sharp(png).metadata()
  return { width, height }
}

describe("normalizeIcon", () => {
  it("rejects an icon smaller than 32 px", async () => {
    const icon = await pngOf(16)

    const result = normalizeIcon(icon)

    await expect(result).rejects.toBeInstanceOf(IconTooSmallError)
    await expect(result).rejects.toMatchObject({ size: 16 })
  })

  it("never enlarges a 48 px icon", async () => {
    const icon = await pngOf(48)

    const normalized = await normalizeIcon(icon)

    expect(await sizeOf(normalized.png)).toEqual({ width: 48, height: 48 })
  })

  it("scales a large icon down to 256 px", async () => {
    const icon = await pngOf(512, 256)

    const normalized = await normalizeIcon(icon)

    expect(await sizeOf(normalized.png)).toEqual({ width: 256, height: 128 })
    expect([normalized.width, normalized.height]).toEqual([512, 256])
  })

  it("renders an svg icon at 256 px", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="#123456"/></svg>',
    )

    const normalized = await normalizeIcon(svg)

    expect(await sizeOf(normalized.png)).toEqual({ width: 256, height: 256 })
  })

  it("rejects a file that is not an image", async () => {
    const html = Buffer.from("<html><body>Not found</body></html>")

    const result = normalizeIcon(html)

    await expect(result).rejects.toBeInstanceOf(UnreadableIconError)
  })

  it("rejects an image that fails to render", async () => {
    const png = await pngOf(64)
    const truncated = png.subarray(0, 100)

    const result = normalizeIcon(truncated)

    await expect(result).rejects.toBeInstanceOf(UnreadableIconError)
  })

  it("rejects a very wide svg as unreadable instead of failing on density", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20000" height="10"><rect width="20000" height="10" fill="#123456"/></svg>',
    )

    const result = normalizeIcon(svg)

    await expect(result).rejects.toBeInstanceOf(UnreadableIconError)
  })
})
