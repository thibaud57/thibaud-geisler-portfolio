"use client"

import { Funnel } from "lucide-react"

import { OptionsPopover } from "@/components/features/admin/table/OptionsPopover"
import type { FacetFilterGroup } from "@/lib/admin/facets"

interface Props {
  groups: readonly FacetFilterGroup[]
  selected: Readonly<Record<string, ReadonlySet<string>>>
  onToggle: (groupKey: string, value: string) => void
  onReset: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FacetFilter({ groups, selected, onToggle, onReset, open, onOpenChange }: Props) {
  const activeCount = Object.values(selected).reduce((sum, values) => sum + values.size, 0)

  return (
    <OptionsPopover
      icon={Funnel}
      label="Filtres"
      groups={groups.map((group) => ({
        key: group.key,
        title: group.label,
        options: group.options.map((option) => ({
          key: option.value,
          label: option.label,
          checked: selected[group.key]?.has(option.value) ?? false,
          count: option.count,
        })),
      }))}
      onToggle={onToggle}
      resetDisabled={activeCount === 0}
      onReset={onReset}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
