"use client"

import { Fragment } from "react"
import type { LucideIcon } from "lucide-react"

import { TitledBlock } from "@/components/features/admin/TitledBlock"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { COUNTER_BADGE_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

export interface PanelOption {
  key: string
  label: string
  checked: boolean
  // Compteur facetté d'une valeur de filtre ; une colonne masquable n'en a pas.
  count?: number
}

export interface PanelGroup {
  key: string
  title: string
  options: readonly PanelOption[]
}

interface Props {
  icon: LucideIcon
  label: string
  groups: readonly PanelGroup[]
  onToggle: (groupKey: string, optionKey: string) => void
  resetDisabled: boolean
  onReset: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OptionsPopover({
  icon: Icon,
  label,
  groups,
  onToggle,
  resetDisabled,
  onReset,
  open,
  onOpenChange,
}: Props) {
  const visibleGroups = groups.filter((group) => group.options.length > 0)
  const count = groups.reduce(
    (sum, group) => sum + group.options.filter((option) => option.checked).length,
    0,
  )

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {/* La pastille finit le bouton : son padding droit plein la décollerait du bord deux fois
            plus que le gap qui la précède. */}
        <Button type="button" variant="outline" size="sm" className={cn(count > 0 && "pr-1.5")}>
          <Icon aria-hidden data-icon="inline-start" />
          {label}
          {count > 0 ? (
            <Badge variant="default" className={COUNTER_BADGE_CLASS}>
              {count}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      {/* Largeur au contenu, plafonnée à l'écran : deux libellés longs côte à côte (un dossier
          d'assets) n'ont pas à se tronquer, un panneau court garde la largeur par défaut. */}
      <PopoverContent align="end" className="w-max max-w-[calc(100vw-2rem)] min-w-72">
        {visibleGroups.map((group, index) => (
          <Fragment key={group.key}>
            {index > 0 ? <Separator /> : null}
            {/* Écarts resserrés par rapport à la vue détail : une ligne d'option est un bloc de
                32px qui centre un texte de 20px, elle apporte déjà 6px de vide de chaque côté. */}
            <TitledBlock
              title={group.title}
              count={group.options.length}
              className="gap-1.5"
              gridClassName="gap-x-3 gap-y-0.5"
            >
              {group.options.map((option) => (
                <label
                  key={option.key}
                  className="-mx-2 flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Checkbox
                    checked={option.checked}
                    onCheckedChange={() => {
                      onToggle(group.key, option.key)
                    }}
                  />
                  <span className="min-w-0 truncate">{option.label}</span>
                  {option.count !== undefined ? (
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {option.count}
                    </span>
                  ) : null}
                </label>
              ))}
            </TitledBlock>
          </Fragment>
        ))}
        <Separator />
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resetDisabled}
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
