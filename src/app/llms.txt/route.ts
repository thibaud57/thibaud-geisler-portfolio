import { SOCIAL_LINKS } from '@/config/social-links'
import { siteUrl } from '@/lib/seo'
import { findManyPublished } from '@/server/queries/projects'

const linkedinUrl = SOCIAL_LINKS.find((link) => link.slug === 'linkedin')!.url
const githubUrl = SOCIAL_LINKS.find((link) => link.slug === 'github')!.url

// Anglais comme langue de référence pour l'ingestion par les LLM, la version FR est liée en bas.
// Les études de cas viennent de la même query que le sitemap : rien à maintenir à la main.
function escapeLinkText(text: string): string {
  return text.replace(/[[\]]/g, '\\$&')
}

export async function GET(): Promise<Response> {
  const projects = await findManyPublished({ locale: 'en' })
  const caseStudies = projects
    .map(
      (project) =>
        `- [${escapeLinkText(project.title)}](${siteUrl}/en/projets/${project.slug}): ${project.description}`,
    )
    .join('\n')

  const body = `# Thibaud Geisler

> Freelance GenAI & full-stack tech lead based in Metz, France. Portfolio with services, in-depth case studies, and AI training for companies. Bilingual site, French by default, English on every page.

## Pages
- [Home](${siteUrl}/en): positioning and services overview
- [Services](${siteUrl}/en/services): AI & automation, full-stack development, corporate AI training
- [Projects](${siteUrl}/en/projets): index of all case studies below
- [About](${siteUrl}/en/a-propos): background, expertise, work approach
- [Contact](${siteUrl}/en/contact): scheduling and contact form

## Case studies
${caseStudies}

## Optional
- [French version](${siteUrl}/fr): same content, default locale
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
