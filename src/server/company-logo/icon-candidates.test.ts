// @vitest-environment node
import { describe, expect, it } from "vitest"

import { findIconCandidates } from "./icon-candidates"

const PAGE = new URL("https://www.acme.example/fr/accueil")

function pathsOf(head: string): string[] {
  return findIconCandidates(`<html><head>${head}</head><body></body></html>`, PAGE).map(
    (candidate) => candidate.url.pathname,
  )
}

describe("findIconCandidates", () => {
  it("ranks apple-touch-icon before any other icon", () => {
    const html = `<head>
      <link rel="icon" href="/icon-512.png" sizes="512x512">
      <link rel="apple-touch-icon" href="/apple.png">
    </head>`

    const candidates = findIconCandidates(html, PAGE)

    expect(candidates.map(({ source, url }) => [source, url.pathname])).toEqual([
      ["apple-touch-icon", "/apple.png"],
      ["icon", "/icon-512.png"],
    ])
  })

  it("orders icons by largest declared size, an svg first", () => {
    const paths = pathsOf(`
      <link rel="icon" href="/16.png" sizes="16x16">
      <link rel="icon" href="/logo.svg" type="image/svg+xml">
      <link rel="shortcut icon" href="/192.png" sizes="192x192">
      <link rel="icon" href="/multi.png" sizes="32x32 64x64">
    `)

    expect(paths).toEqual(["/logo.svg", "/192.png", "/multi.png", "/16.png"])
  })

  it("resolves relative hrefs against the base element, then the page URL", () => {
    const withBase = findIconCandidates(
      `<head><base href="https://cdn.acme.example/assets/"><link rel="icon" href="icon.png"></head>`,
      PAGE,
    )
    const withoutBase = findIconCandidates(`<head><link rel="icon" href="icon.png"></head>`, PAGE)

    expect(withBase[0]?.url.href).toBe("https://cdn.acme.example/assets/icon.png")
    expect(withoutBase[0]?.url.href).toBe("https://www.acme.example/fr/icon.png")
  })

  it("skips ico icons, og:image and non-icon links", () => {
    const paths = pathsOf(`
      <link rel="icon" href="/favicon.ico">
      <link rel="icon" type="image/x-icon" href="/favicon">
      <meta property="og:image" content="/share.png">
      <link rel="stylesheet" href="/app.css">
      <link rel="mask-icon" href="/pinned.svg">
      <link rel="icon" href="/ok.png">
    `)

    expect(paths).toEqual(["/ok.png"])
  })

  it("keeps a single candidate per address, as a wayback capture declares", () => {
    const icon =
      "https://web.archive.org/web/20230608045345im_/https://umbrella.example/wp-content/uploads/2020/07/Umbrella-Favicon.png"
    const html = `<head>
      <link rel="icon" href="${icon}" sizes="32x32"/>
      <link rel="icon" href="${icon}" sizes="192x192"/>
      <link rel="apple-touch-icon" href="${icon}"/>
    </head>`

    const candidates = findIconCandidates(
      html,
      new URL("https://web.archive.org/web/20230608045345/https://umbrella.example/"),
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.source).toBe("apple-touch-icon")
    expect(candidates[0]?.url.href).toBe(icon)
  })

  it("ignores a link declared past the scanned head limit", () => {
    const filler = " ".repeat(128 * 1024)
    const link = `<link rel="icon" href="/late.png">`

    const late = findIconCandidates(`<head>${filler}${link}</head>`, PAGE)
    const early = findIconCandidates(`<head>${link}${filler}</head>`, PAGE)

    expect(late).toEqual([])
    expect(early.map((candidate) => candidate.url.pathname)).toEqual(["/late.png"])
  })

  it("skips a tag longer than the tag limit", () => {
    const oversized = `<link rel="icon" href="/late.png" data-filler="${"a".repeat(4097)}">`
    const normal = `<link rel="icon" href="/ok.png">`

    const paths = pathsOf(`${oversized}${normal}`)

    expect(paths).toEqual(["/ok.png"])
  })
})
