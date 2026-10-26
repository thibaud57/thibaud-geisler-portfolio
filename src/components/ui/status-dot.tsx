import { cn } from "@/lib/utils"

export type StatusDotTone = "success" | "warning" | "muted"

const TONE_CLASS: Record<StatusDotTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  muted: "bg-muted-foreground",
}

export function StatusDot({ tone }: { tone: StatusDotTone }) {
  return (
    <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", TONE_CLASS[tone])} />
  )
}
