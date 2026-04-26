import { TEASER_LIMIT } from '@/components/features/home/constants'

export function ProjectsTeaserSkeleton() {
  return (
    <div
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: TEASER_LIMIT }).map((_, i) => (
        <div
          key={i}
          className="flex h-full flex-col overflow-hidden rounded-lg border bg-card"
        >
          <div className="h-56 w-full bg-muted" />
          <div className="flex flex-1 flex-col gap-3 p-6">
            <div className="h-7 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
