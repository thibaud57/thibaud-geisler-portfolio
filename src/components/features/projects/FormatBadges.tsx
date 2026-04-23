import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { LocalizedProjectWithRelations } from '@/types/project'

type Props = {
  formats: LocalizedProjectWithRelations['formats']
  size?: 'sm' | 'md'
  className?: string
}

export function FormatBadges({ formats, size = 'md', className }: Props) {
  const tFormats = useTranslations('Projects.formats')

  if (formats.length === 0) return null

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {formats.map((format) => (
        <Badge
          key={format}
          variant="outline"
          className={cn(textSize, 'font-medium uppercase tracking-wider')}
        >
          {tFormats(format)}
        </Badge>
      ))}
    </div>
  )
}
