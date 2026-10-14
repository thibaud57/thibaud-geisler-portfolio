"use client"

import { useState } from "react"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatShortDate } from "@/lib/date-time"
import { cn } from "@/lib/utils"

interface Props {
  // Porte le `htmlFor` du FormField parent et son `${id}-error`.
  id: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  invalid: boolean
  placeholder?: string
  formatValue?: (date: Date) => string
  defaultMonth?: Date
  disabled?: Matcher | Matcher[]
  required?: boolean
  clearLabel?: string
  className?: string
}

export function DatePicker({
  id,
  value,
  onChange,
  invalid,
  placeholder = "Choisir une date",
  formatValue,
  defaultMonth,
  disabled,
  required = false,
  clearLabel,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const commit = (date: Date | undefined) => {
    onChange(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          aria-invalid={invalid}
          aria-describedby={`${id}-error`}
          className={cn(
            "w-full justify-start font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon aria-hidden data-icon="inline-start" />
          {value ? (formatValue?.(value) ?? formatShortDate(value)) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          locale={fr}
          mode="single"
          required={required}
          selected={value}
          defaultMonth={value ?? defaultMonth ?? new Date()}
          disabled={disabled}
          onSelect={(next: Date | undefined) => {
            commit(next)
          }}
        />
        {clearLabel ? (
          <div className="flex justify-end border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                commit(undefined)
              }}
            >
              {clearLabel}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
