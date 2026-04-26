export const NAV_ITEMS = [
  { slug: 'services', href: '/services' },
  { slug: 'projects', href: '/projets' },
  { slug: 'about', href: '/a-propos' },
  { slug: 'contact', href: '/contact' },
] as const

export type NavSlug = (typeof NAV_ITEMS)[number]['slug']
