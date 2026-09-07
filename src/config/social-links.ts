export const SOCIAL_LINKS = [
  {
    slug: "linkedin",
    url: "https://www.linkedin.com/in/thibaud-geisler/",
  },
  {
    slug: "github",
    url: "https://github.com/thibaud57",
  },
  {
    slug: "malt",
    url: "https://www.malt.fr/profile/thibaudgeisler",
  },
  {
    slug: "email",
    url: "mailto:contact@thibaud-geisler.com",
  },
] as const

export type SocialSlug = (typeof SOCIAL_LINKS)[number]["slug"]

export const socialSameAs = SOCIAL_LINKS.filter((link) => link.slug !== "email").map(
  (link) => link.url,
)

export function requireSocialUrl(slug: SocialSlug): string {
  const link = SOCIAL_LINKS.find((l) => l.slug === slug)
  if (!link) throw new Error(`Social link introuvable pour le slug "${slug}"`)
  return link.url
}

export const contactEmail = requireSocialUrl("email").replace(/^mailto:/, "")
