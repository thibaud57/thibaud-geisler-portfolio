import { keysOf } from "@/lib/keys-of"

const SOCIAL_URL_BY_SLUG = {
  linkedin: "https://www.linkedin.com/in/thibaud-geisler/",
  github: "https://github.com/thibaud57",
  malt: "https://www.malt.fr/profile/thibaudgeisler",
  email: "mailto:contact@thibaud-geisler.com",
} as const

export type SocialSlug = keyof typeof SOCIAL_URL_BY_SLUG

const SOCIAL_SLUGS = keysOf(SOCIAL_URL_BY_SLUG)

export const SOCIAL_LINKS = SOCIAL_SLUGS.map((slug) => ({
  slug,
  url: SOCIAL_URL_BY_SLUG[slug],
}))

export const socialSameAs = SOCIAL_LINKS.filter((link) => link.slug !== "email").map(
  (link) => link.url,
)

export function requireSocialUrl<S extends SocialSlug>(slug: S): (typeof SOCIAL_URL_BY_SLUG)[S] {
  return SOCIAL_URL_BY_SLUG[slug]
}

export const contactEmail = requireSocialUrl("email").replace(/^mailto:/, "")
