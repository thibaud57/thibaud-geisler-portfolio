import { FileDown } from 'lucide-react'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { buildCvUrl, CV_DOWNLOAD_FILENAME } from '@/lib/assets'
import { cn } from '@/lib/utils'

type ButtonProps = ComponentProps<typeof Button>

type Props = {
  locale: Locale
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
}

export async function DownloadCvButton({
  locale,
  variant = 'default',
  size = 'default',
  className,
}: Props) {
  const t = await getTranslations('Common.cv')

  return (
    <Button asChild variant={variant} size={size} className={cn(className)}>
      <a
        href={buildCvUrl(locale)}
        download={CV_DOWNLOAD_FILENAME}
        aria-label={t('downloadAriaLabel')}
      >
        <FileDown className="mr-2 h-4 w-4" />
        {t('download')}
      </a>
    </Button>
  )
}
