import type { Metadata } from 'next'
import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: false },
}

export default async function NotFound() {
  const t = await getTranslations('NotFound')

  return (
    <PageShell title={t('title')} subtitle={t('message')}>
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <SearchX
          aria-hidden
          className="size-16 text-muted-foreground"
          strokeWidth={1.5}
        />
        <p className="text-base text-muted-foreground">{t('description')}</p>
        <Button asChild size="lg">
          <Link href="/">{t('ctaLabel')}</Link>
        </Button>
      </section>
    </PageShell>
  )
}
