"use client"

import { useState } from "react"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { timeOf } from "@/lib/date-time"
import { formatShortDate } from "@/lib/projects"
import { cn } from "@/lib/utils"

interface DateTimeFieldProps {
  id: string
  label: string
  errors: string[] | undefined
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  time: string
  onTimeChange: (time: string) => void
  required?: boolean
}

export function DateTimeField({
  id,
  label,
  errors,
  date,
  onDateChange,
  time,
  onTimeChange,
  required = false,
}: DateTimeFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <FormField id={id} label={label} errors={errors}>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              id={id}
              aria-invalid={!!errors?.length}
              aria-describedby={`${id}-error`}
              className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon aria-hidden data-icon="inline-start" />
              {date ? formatShortDate(date) : "Choisir une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              locale={fr}
              mode="single"
              required={required}
              selected={date}
              defaultMonth={date ?? new Date()}
              onSelect={(next: Date | undefined) => {
                onDateChange(next)
                // Une date sans heure donnerait une valeur vide, que le serveur remplacerait par l'instant courant.
                if (next && !time) onTimeChange(timeOf(new Date()))
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          aria-label={`${label}, heure`}
          value={time}
          onChange={(event) => {
            onTimeChange(event.target.value)
          }}
        />
      </div>
    </FormField>
  )
}
