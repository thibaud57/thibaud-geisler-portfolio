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
    slug: 'email',
    url: 'mailto:contact@thibaud-geisler.com',
  },
] as const

export type SocialSlug = (typeof SOCIAL_LINKS)[number]['slug']
