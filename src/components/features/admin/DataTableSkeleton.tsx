import { StackedSkeleton } from "@/components/ui/stacked-skeleton"

interface Props {
  rows?: number
}

export function DataTableSkeleton({ rows = 5 }: Props) {
  return (
    <StackedSkeleton
      heights={["h-10", ...Array.from({ length: rows }, () => "h-10"), "h-9"]}
      className="space-y-2"
    />
  )
}
