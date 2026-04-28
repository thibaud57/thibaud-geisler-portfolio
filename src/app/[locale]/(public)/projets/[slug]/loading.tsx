import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@/components/ui/skeleton'

export default async function CaseStudyLoading() {
  const tCommon = await getTranslations('Common')

  return (
    <main
      role="status"
      aria-busy="true"
      aria-label={tCommon('loading')}
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14"
    >
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      <Skeleton className="mt-10 aspect-[16/7] w-full rounded-2xl" />
      <div className="mt-10 flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </main>
  )
}
