export const SOCIAL_LINKS = [
  {
    slug: 'linkedin',
    url: 'https://www.linkedin.com/in/thibaud-geisler/',
  },
  {
    slug: 'github',
    url: 'https://github.com/thibaud57',
  },
  {
    slug: 'malt',
    url: 'https://www.malt.fr/profile/thibaudgeisler',
  },
  {
    slug: 'email',
    url: 'mailto:contact@thibaud-geisler.com',
  },
] as const

export type SocialSlug = (typeof SOCIAL_LINKS)[number]['slug']

export const socialSameAs = SOCIAL_LINKS.filter((link) => link.slug !== 'email').map(
  (link) => link.url,
)

export const contactEmail = SOCIAL_LINKS.find((link) => link.slug === 'email')!.url.replace(
  /^mailto:/,
  '',
)
