'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export type ProjectsFilter = 'ALL' | 'CLIENT' | 'PERSONAL'

type Props = {
  value: ProjectsFilter
  onChange: (next: ProjectsFilter) => void
}

export function ProjectFilters({ value, onChange }: Props) {
  const t = useTranslations('Projects.filters')

  const tabs = [
    { value: 'ALL' as const, label: t('all') },
    { value: 'CLIENT' as const, label: t('client') },
    { value: 'PERSONAL' as const, label: t('personal') },
  ]

  return (
    <div className="flex justify-center" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'px-4 py-2 transition-colors',
            value === tab.value
              ? 'border-b-2 border-primary font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
