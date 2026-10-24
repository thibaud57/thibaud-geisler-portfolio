import type { Metadata } from "next"
import { describe, expect, it } from "vitest"

import { buildPageMetadata, type BuildPageMetadataInput } from "./seo"

const SITE_URL = "https://thibaud-geisler.com"

function buildInput(overrides?: Partial<BuildPageMetadataInput>): BuildPageMetadataInput {
  return {
    locale: "fr",
    path: "/services",
    title: "Services",
    description: "Description des services",
    siteName: "Thibaud Geisler : IA & Développement",
    indexable: true,
    ...overrides,
  }
}

function ogType(meta: Metadata): string | undefined {
  return (meta.openGraph as { type?: string } | undefined)?.type
}

describe("buildPageMetadata", () => {
  it("passes title and description through unchanged (Next.js applies the template from the root layout)", () => {
    const meta = buildPageMetadata(buildInput({ title: "X", description: "Y" }))

    expect(meta.title).toBe("X")
    expect(meta.description).toBe("Y")
  })

  it('defaults the Open Graph type to "website"', () => {
    const meta = buildPageMetadata(buildInput())

    expect(ogType(meta)).toBe("website")
  })

  it('uses the Open Graph type "article" when given', () => {
    const meta = buildPageMetadata(buildInput({ ogType: "article" }))

    expect(ogType(meta)).toBe("article")
  })

  it.each([
    ["fr", "fr_FR"],
    ["en", "en_US"],
  ] as const)("maps locale %s to the Open Graph locale %s", (locale, ogLocale) => {
    const meta = buildPageMetadata(buildInput({ locale }))

    expect(meta.openGraph?.locale).toBe(ogLocale)
  })

  it("lists the other locales as Open Graph alternates", () => {
    const meta = buildPageMetadata(buildInput({ locale: "fr" }))

    expect(meta.openGraph?.alternateLocale).toEqual(["en_US"])
  })

  it.each([
    ["a static page", "fr", "/services", `${SITE_URL}/fr/services`],
    ["the home page without a trailing slash", "fr", "", `${SITE_URL}/fr`],
    [
      "a nested case study",
      "en",
      "/projets/webapp-gestion-sinistres",
      `${SITE_URL}/en/projets/webapp-gestion-sinistres`,
    ],
  ] as const)("builds an absolute Open Graph url for %s", (_label, locale, path, expected) => {
    const meta = buildPageMetadata(buildInput({ locale, path }))

    expect(meta.openGraph?.url).toBe(expected)
  })

  it("exposes siteName, title and description in Open Graph", () => {
    const meta = buildPageMetadata(buildInput({ siteName: "Site", title: "T", description: "D" }))

    expect(meta.openGraph?.siteName).toBe("Site")
    expect(meta.openGraph?.title).toBe("T")
    expect(meta.openGraph?.description).toBe("D")
  })

  it("builds a large-image Twitter card with title and description", () => {
    const meta = buildPageMetadata(buildInput({ title: "T", description: "D" }))

    expect(meta.twitter).toStrictEqual({
      card: "summary_large_image",
      title: "T",
      description: "D",
    })
  })

  it("sets the canonical to the Open Graph url", () => {
    const meta = buildPageMetadata(buildInput({ locale: "fr", path: "/services" }))

    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/fr/services`)
    expect(meta.alternates?.canonical).toBe(meta.openGraph?.url)
  })

  it("exposes fr, en and x-default language alternates", () => {
    const meta = buildPageMetadata(buildInput({ path: "/services" }))

    expect(meta.alternates?.languages).toMatchObject({
      fr: "/fr/services",
      en: "/en/services",
      "x-default": "/fr/services",
    })
  })

  it.each([
    [true, undefined],
    [false, { index: false, follow: false }],
  ])("sets robots when indexable is %s", (indexable, expected) => {
    const meta = buildPageMetadata(buildInput({ indexable }))

    expect(meta.robots).toEqual(expected)
  })
})
