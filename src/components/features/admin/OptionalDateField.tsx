"use client"

import { useState } from "react"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { FormField } from "@/components/ui/form-field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatShortDate, toIsoDate } from "@/lib/projects"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  name: string
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  errors: string[] | undefined
}

export function OptionalDateField({ id, name, label, value, onChange, errors }: Props) {
  const [open, setOpen] = useState(false)
  const commit = (date: Date | undefined) => {
    onChange(date)
    setOpen(false)
  }

  return (
    <FormField id={id} label={label} errors={errors}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-invalid={!!errors?.length}
            aria-describedby={`${id}-error`}
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon aria-hidden data-icon="inline-start" />
            {value ? formatShortDate(value) : "Choisir une date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            locale={fr}
            mode="single"
            selected={value}
            defaultMonth={value ?? new Date()}
            onSelect={commit}
          />
          <div className="flex justify-end border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                commit(undefined)
              }}
            >
              Effacer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={value ? toIsoDate(value) : ""} />
    </FormField>
  )
}
