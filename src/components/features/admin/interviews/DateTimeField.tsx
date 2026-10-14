"use client"

import { DatePicker } from "@/components/features/admin/form/DatePicker"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { timeOf, toInstant } from "@/lib/date-time"

interface DateTimeFieldProps {
  id: string
  label: string
  errors: string[] | undefined
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  time: string
  onTimeChange: (time: string) => void
  required?: boolean
  name?: string
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
  name,
}: DateTimeFieldProps) {
  return (
    <FormField id={id} label={label} errors={errors}>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <DatePicker
          id={id}
          value={date}
          invalid={!!errors?.length}
          required={required}
          onChange={(next) => {
            onDateChange(next)
            // Une date sans heure donnerait une valeur vide, que le serveur remplacerait par l'instant courant.
            if (next && !time) onTimeChange(timeOf(new Date()))
          }}
        />
        <Input
          type="time"
          aria-label={`${label}, heure`}
          value={time}
          onChange={(event) => {
            onTimeChange(event.target.value)
          }}
        />
      </div>
      {name ? <input type="hidden" name={name} value={toInstant(date, time)} /> : null}
    </FormField>
  )
}
