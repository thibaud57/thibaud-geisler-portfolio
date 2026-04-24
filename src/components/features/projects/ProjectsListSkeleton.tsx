export function ProjectsListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-lg border border-border bg-muted"
          />
        ))}
      </div>
    </div>
  )
}
