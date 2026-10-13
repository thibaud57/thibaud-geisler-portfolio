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

// ICO minimal : en-tête, entrées, images (PNG tel quel ou DIB 32 bits sans masque).
function icoOf(images: { width: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const entries: Buffer[] = []
  let offset = 6 + 16 * images.length
  for (const { width, data } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(width === 256 ? 0 : width, 0)
    entry.writeUInt8(width === 256 ? 0 : width, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += data.length
  }
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)])
}

function bmpEntryOf(width: number): Buffer {
  const info = Buffer.alloc(40)
  info.writeUInt32LE(40, 0)
  info.writeInt32LE(width, 4)
  info.writeInt32LE(width * 2, 8)
  info.writeUInt16LE(1, 12)
  info.writeUInt16LE(32, 14)
  const pixels = Buffer.alloc(width * width * 4, 0)
  for (let i = 0; i < width * width; i++) pixels.set([86, 52, 18, 255], i * 4)
  return Buffer.concat([info, pixels])
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

  it("reads the largest image of an ico, png entries included", async () => {
    const ico = icoOf([
      { width: 16, data: await pngOf(16) },
      { width: 128, data: await pngOf(128) },
    ])

    const normalized = await normalizeIcon(ico)

    expect(await sizeOf(normalized.png)).toEqual({ width: 128, height: 128 })
  })

  it("reads a classic bitmap ico entry", async () => {
    const ico = icoOf([{ width: 48, data: bmpEntryOf(48) }])

    const normalized = await normalizeIcon(ico)

    expect(await sizeOf(normalized.png)).toEqual({ width: 48, height: 48 })
  })

  it("rejects an ico whose largest image is too small", async () => {
    const ico = icoOf([{ width: 16, data: await pngOf(16) }])

    await expect(normalizeIcon(ico)).rejects.toMatchObject({ size: 16 })
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
