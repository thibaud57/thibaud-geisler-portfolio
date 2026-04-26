import { getTranslations } from 'next-intl/server'

import { ServiceCard } from '@/components/features/services/ServiceCard'
import { SERVICE_SLUGS } from '@/components/features/services/service-slugs'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function ServicesTeaserSection() {
  const [tHome, tServices] = await Promise.all([
    getTranslations('HomePage.servicesTeaser'),
    getTranslations('ServicesPage.offers'),
  ])

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {tHome('title')}
        </h2>
        <p className="max-w-2xl text-base text-muted-foreground">
          {tHome('subtitle')}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SERVICE_SLUGS.map((slug) => (
          <ServiceCard
            key={slug}
            slug={slug}
            title={tServices(`${slug}.title`)}
            description={tServices(`${slug}.description`)}
            variant="teaser"
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button asChild variant="ghost" size="lg">
          <Link href="/services">{tHome('seeAll')}</Link>
        </Button>
      </div>
    </section>
  )
}
