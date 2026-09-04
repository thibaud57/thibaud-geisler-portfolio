import { SiGithub } from '@icons-pack/react-simple-icons'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { BorderBeam } from '@/components/magicui/border-beam'
import { safeExternalUrl } from '@/lib/url'
import type { LocalizedProjectWithRelations } from '@/types/project'

type Props = {
  project: LocalizedProjectWithRelations
}

export function CaseStudyFooter({ project }: Props) {
  const t = useTranslations('Projects.caseStudy')
  const demoUrl = safeExternalUrl(project.demoUrl)
  const githubUrl = safeExternalUrl(project.githubUrl)

  return (
    <footer className="flex flex-col gap-6 border-t border-border pt-8">
      {demoUrl || githubUrl ? (
        <div className="flex flex-wrap gap-3">
          {demoUrl ? (
            <Button asChild variant="default" className="relative">
              <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('links.demo')}
                <BorderBeam
                  size={40}
                  duration={7}
                  borderWidth={2}
                  colorFrom="var(--shine)"
                  colorTo="transparent"
                />
              </a>
            </Button>
          ) : null}
          {githubUrl ? (
            <Button asChild variant="outline">
              <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                <SiGithub className="mr-2 size-4" />
                {t('links.github')}
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}

      <Link
        href="/projets"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToList')}
      </Link>
    </footer>
  )
}
