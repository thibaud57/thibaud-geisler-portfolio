import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Loader2 aria-hidden className="size-8 animate-spin text-muted-foreground" />
    </main>
  )
}
