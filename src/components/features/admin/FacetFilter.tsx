"use client"

import { Funnel } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { COUNTER_BADGE_CLASS, LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

export interface FacetFilterOption {
  value: string
  label: string
  count: number
}

export interface FacetFilterGroup {
  key: string
  label: string
  options: readonly FacetFilterOption[]
}

interface Props {
  groups: readonly FacetFilterGroup[]
  selected: Record<string, ReadonlySet<string>>
  onToggle: (groupKey: string, value: string) => void
  onReset: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FacetFilter({ groups, selected, onToggle, onReset, open, onOpenChange }: Props) {
  const activeCount = Object.values(selected).reduce((sum, values) => sum + values.size, 0)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(activeCount > 0 && "pr-1.5")}
        >
          <Funnel aria-hidden data-icon="inline-start" />
          Filtres
          {activeCount > 0 ? (
            <Badge variant="default" className={COUNTER_BADGE_CLASS}>
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="gap-0">
        {groups.map((group) => (
          <div key={group.key}>
            <div className={cn(LABEL_CLASS, "mb-2")}>{group.label}</div>
            <div className="grid gap-[2px]">
              {group.options.map((option) => {
                const checked = selected[group.key]?.has(option.value) ?? false
                return (
                  <label
                    key={option.value}
                    className="-mx-2 flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => {
                        onToggle(group.key, option.value)
                      }}
                    />
                    <span>{option.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {option.count}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
        <Separator className="mt-3 mb-2" />
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={activeCount === 0}
            onClick={onReset}
          >
            Réinitialiser
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
