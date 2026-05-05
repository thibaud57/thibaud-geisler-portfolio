import { Skeleton } from '@/components/ui/skeleton'

export function ContactTabsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl flex flex-col gap-8">
      <Skeleton className="mx-auto h-10 w-full max-w-md rounded-md" />
      <Skeleton className="h-[500px] w-full rounded-lg" />
    </div>
  )
}
