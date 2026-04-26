import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function FinalCtaSection() {
  const t = await getTranslations('HomePage.finalCta')

  return (
    <section className="flex flex-col items-center gap-6 rounded-xl border bg-card px-6 py-12 text-center sm:py-16">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h2>
      <p className="max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
      <Button asChild size="lg">
        <Link href="/contact">{t('ctaLabel')}</Link>
      </Button>
    </section>
  )
}
