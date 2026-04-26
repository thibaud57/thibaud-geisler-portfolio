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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  const [tHeader, tCalendly, tForm, tPrefill, tTabs] = await Promise.all([
    getTranslations('ContactPage.header'),
    getTranslations('ContactPage.calendly'),
    getTranslations('ContactPage.form'),
    getTranslations('ContactPage.form.subjectPrefill'),
    getTranslations('ContactPage.tabs'),
  ])

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
      <div className="mb-10 -mt-2 flex flex-wrap items-center justify-between gap-4">
        <LocationLine />
        <SocialLinks className="justify-end" />
      </div>

      <Tabs defaultValue="form" className="mx-auto w-full max-w-4xl">
        <TabsList className="mx-auto grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="form">{tTabs('form')}</TabsTrigger>
          <TabsTrigger value="calendly">{tTabs('calendly')}</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="mt-8 flex flex-col gap-6">
          <ContactForm labels={formLabels} defaultSubject={defaultSubject} />
        </TabsContent>

        <TabsContent value="calendly" className="mt-8 flex flex-col gap-6">
          <CalendlyWidget url={calendlyUrl} placeholderLabel={tCalendly('placeholder')} />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
