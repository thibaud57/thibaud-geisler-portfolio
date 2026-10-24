"use client"

import { useState } from "react"
import type { Month } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function monthNames(width: "wide" | "abbreviated"): string[] {
  return Array.from({ length: 12 }, (_, index) => fr.localize.month(index as Month, { width }))
}

const MONTHS = monthNames("wide")
const MONTHS_SHORT = monthNames("abbreviated")

interface Picked {
  year: number
  month: number
}

function parseValue(value: string): Picked | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) }
}

interface Props {
  id: string
  name: string
  label: string
  errors: readonly string[] | undefined
  // « AAAA-MM », vide si aucun mois ; une valeur partielle (ex. "-04") passe telle quelle, la validation la refuse.
  defaultValue: string
}

export function MonthField({ id, name, label, errors, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [now] = useState(() => new Date())
  const picked = parseValue(value)
  const pickedOrCurrentYear = picked?.year ?? now.getFullYear()
  const [year, setYear] = useState(pickedOrCurrentYear)

  return (
    <FormField id={id} label={label} errors={errors}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setYear(pickedOrCurrentYear)
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-invalid={!!errors?.length}
            aria-describedby={`${id}-error`}
            className={cn("w-full justify-start font-normal", !picked && "text-muted-foreground")}
          >
            <CalendarIcon aria-hidden data-icon="inline-start" />
            {picked ? `${MONTHS[picked.month - 1]} ${picked.year}` : "Choisir un mois"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-63 p-3">
          <div className="flex items-center justify-between pb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Année précédente"
              onClick={() => {
                setYear((current) => current - 1)
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span aria-live="polite" className="text-sm font-medium tabular-nums">
              {year}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Année suivante"
              onClick={() => {
                setYear((current) => current + 1)
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div role="group" aria-label={`Mois de ${year}`} className="grid grid-cols-3 gap-1">
            {MONTHS_SHORT.map((short, index) => {
              const month = index + 1
              const selected = picked?.year === year && picked.month === month
              const current = year === now.getFullYear() && month === now.getMonth() + 1
              return (
                <button
                  type="button"
                  key={month}
                  aria-pressed={selected}
                  aria-label={`${MONTHS[index]} ${year}`}
                  className={cn(
                    "h-8 rounded-md border border-transparent px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    current && "border-border",
                    selected &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                  onClick={() => {
                    setValue(`${year}-${String(month).padStart(2, "0")}`)
                    setOpen(false)
                  }}
                >
                  {short}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-end border-t border-border pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue("")
                setOpen(false)
              }}
            >
              Effacer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={value} />
    </FormField>
  )
}
