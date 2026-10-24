import { describe, expect, it } from "vitest"

import {
  buildBreadcrumbList,
  buildContactPage,
  buildOfferCatalog,
  buildPersonId,
  buildPostalAddress,
  buildProfilePagePerson,
  buildProjectCreativeWork,
  buildWebSiteGraph,
  type ProfilePagePersonInput,
  type BreadcrumbListInput,
  type ProjectCreativeWorkInput,
} from "./json-ld"

const SITE_URL_FIXTURE = "https://thibaud-geisler.com"

function buildProfileInput(overrides?: Partial<ProfilePagePersonInput>): ProfilePagePersonInput {
  return {
    locale: "fr",
    siteUrl: SITE_URL_FIXTURE,
    name: "Jane Doe",
    jobTitle: "IA & développement full-stack",
    description: "Description courte test",
    email: "contact@example.com",
    image: "https://thibaud-geisler.com/api/assets/branding/portrait.jpg",
    dateModified: new Date("2026-05-01T10:00:00.000Z"),
    sameAs: ["https://social.example/jane-doe", "https://code.example/jane-doe"],
    expertise: [
      {
        name: "Artificial Intelligence",
        wikidataId: "Q11660",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Artificial_intelligence",
      },
      { name: "AI Training" },
    ],
    ...overrides,
  }
}

describe("buildProfilePagePerson", () => {
  it("builds a schema.org ProfilePage whose mainEntity is a Person with its core properties", () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        name: "Jane Doe",
        jobTitle: "IA & développement full-stack",
        description: "desc",
        email: "a@b.c",
      }),
    )

    expect(result["@context"]).toBe("https://schema.org")
    expect(result["@type"]).toBe("ProfilePage")
    expect(result.mainEntity["@type"]).toBe("Person")
    expect(result.mainEntity["@id"]).toBeDefined()
    expect(result.mainEntity.name).toBe("Jane Doe")
    expect(result.mainEntity.jobTitle).toBe("IA & développement full-stack")
    expect(result.mainEntity.description).toBe("desc")
    expect(result.mainEntity.email).toBe("a@b.c")
    expect(result.mainEntity.image).toBe(
      "https://thibaud-geisler.com/api/assets/branding/portrait.jpg",
    )
    expect(result.mainEntity.sameAs).toEqual([
      "https://social.example/jane-doe",
      "https://code.example/jane-doe",
    ])
  })

  it("keeps the Person @id identical across locales (siteUrl + /#person)", () => {
    const fr = buildProfilePagePerson(buildProfileInput({ locale: "fr" }))
    const en = buildProfilePagePerson(buildProfileInput({ locale: "en" }))

    expect(fr.mainEntity["@id"]).toBe("https://thibaud-geisler.com/#person")
    expect(en.mainEntity["@id"]).toBe(fr.mainEntity["@id"])
  })

  it.each(["fr", "en"] as const)("points Person.url to /%s/a-propos", (locale) => {
    const result = buildProfilePagePerson(buildProfileInput({ locale }))

    expect(result.mainEntity.url).toBe(`https://thibaud-geisler.com/${locale}/a-propos`)
  })

  it("maps expertise with a wikidataId to a full Thing (@type, name, Wikidata @id, Wikipedia sameAs)", () => {
    const result = buildProfilePagePerson(buildProfileInput())

    expect(result.mainEntity.knowsAbout[0]).toEqual({
      "@type": "Thing",
      name: "Artificial Intelligence",
      "@id": "https://www.wikidata.org/wiki/Q11660",
      sameAs: "https://en.wikipedia.org/wiki/Artificial_intelligence",
    })
  })

  it("maps expertise without a wikidataId to a plain string, in input order", () => {
    const result = buildProfilePagePerson(buildProfileInput())

    expect(result.mainEntity.knowsAbout[1]).toBe("AI Training")
  })

  it("exposes the given modification date as an ISO 8601 string on the ProfilePage", () => {
    const result = buildProfilePagePerson(buildProfileInput())

    expect(result.dateModified).toBe("2026-05-01T10:00:00.000Z")
  })

  const LEGAL_FIXTURE = {
    siret: "11122233300044",
    address: {
      street: "1 rue de l'Exemple",
      postalCode: "75000",
      city: "Paris",
      country: "France",
    },
  } as const

  it("adds the PostalAddress, taxID and SIRET identifier to mainEntity when legal is provided", () => {
    const result = buildProfilePagePerson(buildProfileInput({ legal: LEGAL_FIXTURE }))

    expect(result.mainEntity.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "1 rue de l'Exemple",
      postalCode: "75000",
      addressLocality: "Paris",
      addressCountry: "France",
    })
    expect(result.mainEntity.taxID).toBe("11122233300044")
    expect(result.mainEntity.identifier).toEqual({
      "@type": "PropertyValue",
      propertyID: "SIRET",
      value: "11122233300044",
    })
  })

  it("adds vatID when the publisher is VAT liable", () => {
    const result = buildProfilePagePerson(
      buildProfileInput({ legal: { ...LEGAL_FIXTURE, vatId: "FR00000000000" } }),
    )

    expect(result.mainEntity.vatID).toBe("FR00000000000")
  })

  it("leaves vatID out without a VAT number", () => {
    const result = buildProfilePagePerson(buildProfileInput({ legal: LEGAL_FIXTURE }))

    expect(result.mainEntity.vatID).toBeUndefined()
  })

  it("leaves address, taxID and identifier out when legal is absent", () => {
    const result = buildProfilePagePerson(buildProfileInput())

    expect(result.mainEntity.address).toBeUndefined()
    expect(result.mainEntity.taxID).toBeUndefined()
    expect(result.mainEntity.identifier).toBeUndefined()
  })
})

function buildBreadcrumbInput(overrides?: Partial<BreadcrumbListInput>): BreadcrumbListInput {
  return {
    locale: "fr",
    siteUrl: SITE_URL_FIXTURE,
    items: [
      { name: "Accueil", path: "" },
      { name: "Services", path: "/services" },
    ],
    ...overrides,
  }
}

describe("buildBreadcrumbList", () => {
  it("produces a schema.org BreadcrumbList", () => {
    const result = buildBreadcrumbList(buildBreadcrumbInput())

    expect(result["@context"]).toBe("https://schema.org")
    expect(result["@type"]).toBe("BreadcrumbList")
  })

  it.each(["fr", "en"] as const)("builds 1-based ListItems with absolute %s urls", (locale) => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        locale,
        items: [
          { name: "Home", path: "" },
          { name: "Services", path: "/services" },
        ],
      }),
    )

    expect(result.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `https://thibaud-geisler.com/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Services",
        item: `https://thibaud-geisler.com/${locale}/services`,
      },
    ])
  })

  it("keeps the items order from parent to child", () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        items: [
          { name: "Home", path: "" },
          { name: "Projects", path: "/projets" },
          { name: "Webapp Gestion Sinistres", path: "/projets/webapp-gestion-sinistres" },
        ],
      }),
    )

    expect(result.itemListElement.map((e) => e.position)).toEqual([1, 2, 3])
    expect(result.itemListElement.map((e) => e.name)).toEqual([
      "Home",
      "Projects",
      "Webapp Gestion Sinistres",
    ])
  })
})

describe("buildPostalAddress", () => {
  it("maps the address fields to the Schema.org PostalAddress format", () => {
    const result = buildPostalAddress({
      street: "1 rue de l'Exemple",
      postalCode: "75000",
      city: "Paris",
      country: "France",
    })

    expect(result).toEqual({
      "@type": "PostalAddress",
      streetAddress: "1 rue de l'Exemple",
      postalCode: "75000",
      addressLocality: "Paris",
      addressCountry: "France",
    })
  })
})

describe("buildPersonId", () => {
  it("builds the Person @id as siteUrl + /#person, absorbing a trailing slash", () => {
    const personId = buildPersonId("https://thibaud-geisler.com/")

    expect(personId).toBe("https://thibaud-geisler.com/#person")
  })
})

describe("buildWebSiteGraph", () => {
  const input = {
    locale: "fr" as const,
    siteUrl: SITE_URL_FIXTURE,
    siteName: "Thibaud Geisler : IA & Développement",
    siteDescription: "Portfolio de Thibaud Geisler.",
    person: {
      name: "Jane Doe",
      jobTitle: "IA & développement full-stack",
      image: "https://thibaud-geisler.com/api/assets/branding/portrait.jpg",
      sameAs: ["https://social.example/jane-doe"],
    },
  }

  it("points WebSite.publisher at the @id of the Person node in the graph", () => {
    const graph = buildWebSiteGraph(input)

    const [webSite, person] = graph["@graph"]
    expect(webSite.publisher["@id"]).toBe(person["@id"])
    expect(person["@id"]).toBe(buildPersonId(SITE_URL_FIXTURE))
  })

  it("points Person.url at /a-propos in the current locale and follows it in inLanguage", () => {
    const graph = buildWebSiteGraph({ ...input, locale: "en" })

    const [webSite, person] = graph["@graph"]
    expect(person.url).toBe("https://thibaud-geisler.com/en/a-propos")
    expect(webSite.inLanguage).toBe("en-US")
  })
})

describe("buildOfferCatalog", () => {
  const input = {
    locale: "fr" as const,
    siteUrl: SITE_URL_FIXTURE,
    name: "Services",
    services: [
      { slug: "ia", name: "IA & Automatisation", description: "Desc IA" },
      { slug: "formation", name: "Formation IA", description: "Desc formation" },
    ],
    areaServed: ["France", "Luxembourg"],
  }

  it("builds one Offer per service, anchored on /services#<slug> with the Person as provider", () => {
    const catalog = buildOfferCatalog(input)

    expect(catalog.itemListElement).toHaveLength(2)
    const service = catalog.itemListElement[1]?.itemOffered
    expect(service?.["@id"]).toBe("https://thibaud-geisler.com/fr/services#formation")
    expect(service?.provider["@id"]).toBe(buildPersonId(SITE_URL_FIXTURE))
    expect(catalog.provider["@id"]).toBe(buildPersonId(SITE_URL_FIXTURE))
  })

  it("builds serviceUrl from the contact page ?service=<slug> prefill, in the current locale", () => {
    const catalog = buildOfferCatalog({ ...input, locale: "en" })

    expect(catalog.itemListElement[0]?.itemOffered.availableChannel.serviceUrl).toBe(
      "https://thibaud-geisler.com/en/contact?service=ia",
    )
  })
})

describe("buildContactPage", () => {
  it("makes the canonical Person the mainEntity, with an email ContactPoint", () => {
    const page = buildContactPage({
      locale: "fr",
      siteUrl: SITE_URL_FIXTURE,
      name: "Contact",
      description: "Desc contact",
      personName: "Jane Doe",
      email: "contact@example.com",
    })

    expect(page.url).toBe("https://thibaud-geisler.com/fr/contact")
    expect(page.mainEntity["@id"]).toBe(buildPersonId(SITE_URL_FIXTURE))
    expect(page.mainEntity.contactPoint.email).toBe("contact@example.com")
  })
})

describe("buildProjectCreativeWork", () => {
  function buildInput(overrides?: Partial<ProjectCreativeWorkInput>): ProjectCreativeWorkInput {
    return {
      locale: "fr",
      siteUrl: SITE_URL_FIXTURE,
      slug: "webapp-gestion-sinistres",
      title: "Webapp Gestion Sinistres",
      description: "Desc",
      keywords: ["Scala", "Angular"],
      startedAt: new Date("2022-05-01T00:00:00Z"),
      endedAt: new Date("2025-10-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
      githubUrl: null,
      ...overrides,
    }
  }

  it("builds a client project without a repository as a CreativeWork authored by the canonical Person, with dateModified = updatedAt like the sitemap", () => {
    const work = buildProjectCreativeWork(buildInput())

    expect(work["@type"]).toBe("CreativeWork")
    expect(work.url).toBe("https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres")
    expect(work.author["@id"]).toBe(buildPersonId(SITE_URL_FIXTURE))
    expect(work.dateCreated).toBe("2022-05-01")
    expect(work.temporalCoverage).toBe("2022-05-01/2025-10-01")
    expect(work.dateModified).toBe("2026-09-01")
    expect(work.codeRepository).toBeUndefined()
  })

  it("leaves the temporalCoverage interval open for an ongoing mission", () => {
    const work = buildProjectCreativeWork(buildInput({ endedAt: null }))

    expect(work.temporalCoverage).toBe("2022-05-01/..")
  })

  it("builds a project with a public repository as SoftwareSourceCode with its codeRepository", () => {
    const work = buildProjectCreativeWork(
      buildInput({ githubUrl: "https://code.example/jane-doe/portfolio" }),
    )

    expect(work["@type"]).toBe("SoftwareSourceCode")
    expect(work.codeRepository).toBe("https://code.example/jane-doe/portfolio")
  })

  it("leaves dateCreated and temporalCoverage out without startedAt", () => {
    const work = buildProjectCreativeWork(buildInput({ startedAt: null, endedAt: null }))

    expect(work.dateCreated).toBeUndefined()
    expect(work.temporalCoverage).toBeUndefined()
  })
})
