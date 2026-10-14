import { describe, expect, it } from "vitest"

import { buildSitemapEntries, PUBLIC_STATIC_PATHS } from "./sitemap"

const SITE_URL_FIXTURE = "https://thibaud-geisler.com"

type SitemapInput = Parameters<typeof buildSitemapEntries>[0]

function buildEntries(overrides?: Partial<SitemapInput>) {
  return buildSitemapEntries({
    staticPaths: [],
    projects: [],
    siteUrl: SITE_URL_FIXTURE,
    ...overrides,
  })
}

function buildProject(overrides?: { slug?: string; updatedAt?: Date }) {
  return {
    slug: overrides?.slug ?? "sample",
    updatedAt: overrides?.updatedAt ?? new Date("2026-01-01T00:00:00Z"),
  }
}

describe("PUBLIC_STATIC_PATHS", () => {
  it("lists the public paths of the portfolio", () => {
    expect(PUBLIC_STATIC_PATHS).toEqual([
      "",
      "/services",
      "/projets",
      "/a-propos",
      "/contact",
      "/mentions-legales",
      "/confidentialite",
    ])
  })
})

describe("buildSitemapEntries", () => {
  it.each([
    ["a static page", "/services", `${SITE_URL_FIXTURE}/fr/services`],
    ["the home page without a trailing slash", "", `${SITE_URL_FIXTURE}/fr`],
  ])("builds the default-locale canonical for %s", (_label, path, expected) => {
    const entries = buildEntries({ staticPaths: [path] })

    expect(entries[0]?.url).toBe(expected)
  })

  it("exposes fr, en and x-default alternates on static pages", () => {
    const entries = buildEntries({ staticPaths: ["/services"] })

    expect(entries[0]?.alternates?.languages).toMatchObject({
      fr: `${SITE_URL_FIXTURE}/fr/services`,
      en: `${SITE_URL_FIXTURE}/en/services`,
      "x-default": `${SITE_URL_FIXTURE}/fr/services`,
    })
  })

  it("generates one entry per project and per locale", () => {
    const entries = buildEntries({
      projects: [
        buildProject({ slug: "webapp-gestion-sinistres" }),
        buildProject({ slug: "projet-exemple" }),
      ],
    })

    expect(entries.map((e) => e.url)).toEqual([
      `${SITE_URL_FIXTURE}/fr/projets/webapp-gestion-sinistres`,
      `${SITE_URL_FIXTURE}/en/projets/webapp-gestion-sinistres`,
      `${SITE_URL_FIXTURE}/fr/projets/projet-exemple`,
      `${SITE_URL_FIXTURE}/en/projets/projet-exemple`,
    ])
  })

  it("leaves lastModified out of static pages, which have no reliable content date", () => {
    const entries = buildEntries({ staticPaths: ["/services"] })

    expect(entries.every((entry) => !("lastModified" in entry))).toBe(true)
  })

  it("uses the project updatedAt as lastModified", () => {
    const updatedAt = new Date("2026-03-15T10:00:00Z")

    const entries = buildEntries({ projects: [buildProject({ updatedAt })] })

    expect(entries[0]?.lastModified).toBe(updatedAt)
  })

  it("exposes fr, en and x-default alternates on projects", () => {
    const entries = buildEntries({
      projects: [buildProject({ slug: "webapp-gestion-sinistres" })],
    })

    expect(entries[0]?.alternates?.languages).toMatchObject({
      fr: `${SITE_URL_FIXTURE}/fr/projets/webapp-gestion-sinistres`,
      en: `${SITE_URL_FIXTURE}/en/projets/webapp-gestion-sinistres`,
      "x-default": `${SITE_URL_FIXTURE}/fr/projets/webapp-gestion-sinistres`,
    })
  })

  it("builds one entry per locale for each static path and project", () => {
    const entries = buildEntries({
      staticPaths: PUBLIC_STATIC_PATHS,
      projects: [
        buildProject({ slug: "a" }),
        buildProject({ slug: "b" }),
        buildProject({ slug: "c" }),
      ],
    })

    expect(entries).toHaveLength((PUBLIC_STATIC_PATHS.length + 3) * 2)
  })

  it("orders each path fr then en, static pages before projects", () => {
    const entries = buildEntries({
      staticPaths: ["/services"],
      projects: [buildProject({ slug: "webapp-gestion-sinistres" })],
    })

    expect(entries.map((e) => e.url)).toEqual([
      `${SITE_URL_FIXTURE}/fr/services`,
      `${SITE_URL_FIXTURE}/en/services`,
      `${SITE_URL_FIXTURE}/fr/projets/webapp-gestion-sinistres`,
      `${SITE_URL_FIXTURE}/en/projets/webapp-gestion-sinistres`,
    ])
  })

  it("shares the same alternates between the locales of a path", () => {
    const entries = buildEntries({ staticPaths: ["/services"] })

    expect(entries[0]?.alternates?.languages).toEqual(entries[1]?.alternates?.languages)
  })

  it("does not produce a double slash when siteUrl ends with a slash", () => {
    const entries = buildEntries({ staticPaths: ["/services"], siteUrl: `${SITE_URL_FIXTURE}/` })

    expect(entries[0]?.url).toBe(`${SITE_URL_FIXTURE}/fr/services`)
  })
})
