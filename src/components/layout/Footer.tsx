import { getLocale } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'

const BUILD_YEAR = new Date().getFullYear()

export async function Footer() {
  const locale = await getLocale()

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {BUILD_YEAR} Thibaud Geisler
        </p>
        <DownloadCvButton locale={locale} variant="outline" size="sm" />
        {/* TODO: logo, nav secondaire, social icons */}
      </div>
    </footer>
  )
}
