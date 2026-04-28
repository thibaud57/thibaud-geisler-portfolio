import { SOCIAL_LINKS } from '@/config/social-links'
import { siteUrl } from '@/lib/seo'

const linkedinUrl = SOCIAL_LINKS.find((link) => link.slug === 'linkedin')!.url
const githubUrl = SOCIAL_LINKS.find((link) => link.slug === 'github')!.url

export async function GET(): Promise<Response> {
  const body = `# Thibaud Geisler

> Freelance AI engineer & full-stack developer. Portfolio with services, case studies, and AI training offerings.

## Pages
- [Home](${siteUrl}/fr): positioning and services overview
- [Services](${siteUrl}/fr/services): AI & automation, full-stack development, corporate AI training
- [Projects](${siteUrl}/fr/projets): case studies (client and personal)
- [About](${siteUrl}/fr/a-propos): background, expertise, work approach
- [Contact](${siteUrl}/fr/contact): scheduling and contact form

## Optional
- [Sitemap](${siteUrl}/sitemap.xml)
- [LinkedIn](${linkedinUrl})
- [GitHub](${githubUrl})
`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
