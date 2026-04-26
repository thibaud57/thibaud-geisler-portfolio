import { SiGithub } from '@icons-pack/react-simple-icons'
import { Mail } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SOCIAL_LINKS, type SocialSlug } from '@/config/social-links'
import { LinkedinIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

const ICONS: Record<SocialSlug, React.ComponentType<{ className?: string }>> = {
  linkedin: LinkedinIcon,
  github: SiGithub,
  email: Mail,
}

type Props = {
  className?: string
}

export async function SocialLinks({ className }: Props) {
  const t = await getTranslations('ContactPage.social.ariaLabel')

  const ariaLabels: Record<SocialSlug, string> = {
    linkedin: t('linkedin'),
    github: t('github'),
    email: t('email'),
  }

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {SOCIAL_LINKS.map((link) => {
        const Icon = ICONS[link.slug]
        const isExternal = link.slug !== 'email'
        return (
          <a
            key={link.slug}
            href={link.url}
            {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
            aria-label={ariaLabels[link.slug]}
            className="flex size-9 items-center justify-center rounded-md border border-border bg-card transition hover:scale-105 hover:shadow-md"
          >
            <Icon className="size-4" />
          </a>
        )
      })}
    </div>
  )
}
