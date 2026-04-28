import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@/components/ui/skeleton'

export default async function Loading() {
  const tCommon = await getTranslations('Common')

  return (
    <main
      role="status"
      aria-busy="true"
      aria-label={tCommon('loading')}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14"
    >
      <header className="mb-8 flex flex-col items-center gap-2 lg:mb-10">
        <Skeleton className="h-12 w-2/3 sm:w-1/2" />
        <Skeleton className="h-6 w-1/2 sm:w-1/3" />
      </header>
      <Skeleton className="h-96 w-full" />
    </main>
  )
}
