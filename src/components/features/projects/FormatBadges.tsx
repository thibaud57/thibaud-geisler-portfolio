import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { LocalizedProjectWithRelations } from '@/types/project'

type Props = {
  formats: LocalizedProjectWithRelations['formats']
  className?: string
}

export function FormatBadges({ formats, className }: Props) {
  const tFormats = useTranslations('Projects.formats')

  if (formats.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {formats.map((format) => (
        <Badge key={format} variant="outline" meta>
          {tFormats(format)}
        </Badge>
      ))}
    </div>
  )
}
