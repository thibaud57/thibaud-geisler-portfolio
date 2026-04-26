import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'

import { CalendlyWidget } from '@/components/features/contact/CalendlyWidget'
import { ContactForm } from '@/components/features/contact/ContactForm'
import { LocationLine } from '@/components/features/contact/LocationLine'
import { SocialLinks } from '@/components/features/contact/SocialLinks'
import { PageShell } from '@/components/layout/PageShell'

const PREFILL_SLUGS = ['ia', 'fullstack', 'formation'] as const
type PrefillSlug = (typeof PREFILL_SLUGS)[number]

function isPrefillSlug(value: string | undefined): value is PrefillSlug {
  return typeof value === 'string' && (PREFILL_SLUGS as readonly string[]).includes(value)
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    title: t('contactTitle'),
    description: t('contactDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('/contact') },
  }
}

export default async function ContactPage({
  params,
  searchParams,
}: PageProps<'/[locale]/contact'>) {
  await setupLocalePage(params)
  const resolvedSearchParams = await searchParams
  const rawService = resolvedSearchParams?.service
  const serviceParam = Array.isArray(rawService) ? rawService[0] : rawService

  const tHeader = await getTranslations('ContactPage.header')
  const tCalendly = await getTranslations('ContactPage.calendly')
  const tForm = await getTranslations('ContactPage.form')
  const tPrefill = await getTranslations('ContactPage.form.subjectPrefill')

  const defaultSubject = isPrefillSlug(serviceParam) ? tPrefill(serviceParam) : ''

  const formLabels = {
    name: tForm('fields.name'),
    company: tForm('fields.company'),
    companyOptional: tForm('fields.companyOptional'),
    email: tForm('fields.email'),
    subject: tForm('fields.subject'),
    message: tForm('fields.message'),
    namePlaceholder: tForm('placeholders.name'),
    companyPlaceholder: tForm('placeholders.company'),
    emailPlaceholder: tForm('placeholders.email'),
    subjectPlaceholder: tForm('placeholders.subject'),
    messagePlaceholder: tForm('placeholders.message'),
    submit: tForm('submit'),
    submitting: tForm('submitting'),
    stubToast: tForm('stubToast'),
  }

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''

  return (
    <PageShell title={tHeader('h1')} subtitle={tHeader('tagline')}>
      <LocationLine className="mb-10 -mt-2" />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <section className="flex flex-col gap-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {tCalendly('title')}
          </h2>
          <CalendlyWidget url={calendlyUrl} placeholderLabel={tCalendly('placeholder')} />
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {tForm('title')}
          </h2>
          <SocialLinks />
          <ContactForm labels={formLabels} defaultSubject={defaultSubject} />
        </section>
      </div>
    </PageShell>
  )
}
