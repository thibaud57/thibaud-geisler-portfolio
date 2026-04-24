import { connection } from 'next/server'
import { getLocale } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'

export async function Footer() {
  await connection()
  const locale = await getLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {year} Thibaud Geisler
        </p>
        <DownloadCvButton locale={locale} variant="outline" size="sm" />
        {/* TODO: logo, nav secondaire, social icons */}
      </div>
    </footer>
  )
}
