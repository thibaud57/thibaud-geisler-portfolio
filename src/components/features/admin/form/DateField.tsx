"use client"

import type { ComponentProps, ReactNode } from "react"

import { DatePicker } from "@/components/features/admin/form/DatePicker"
import { FormField } from "@/components/ui/form-field"
import { toIsoDate } from "@/lib/date-time"
import { cn } from "@/lib/utils"

type PickerProps = Pick<
  ComponentProps<typeof DatePicker>,
  | "placeholder"
  | "formatValue"
  | "defaultMonth"
  | "disabled"
  | "required"
  | "clearLabel"
  | "className"
>

interface Props extends PickerProps {
  id: string
  name: string
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  errors: readonly string[] | undefined
  action?: ReactNode
}

export function DateField({
  id,
  name,
  label,
  value,
  onChange,
  errors,
  action,
  className,
  ...pickerProps
}: Props) {
  const picker = (
    <DatePicker
      id={id}
      value={value}
      onChange={onChange}
      invalid={!!errors?.length}
      className={cn(action && "sm:flex-1", className)}
      {...pickerProps}
    />
  )

  return (
    <FormField id={id} label={label} errors={errors}>
      {action ? (
        <div className="flex flex-col gap-4 sm:flex-row">
          {picker}
          {action}
        </div>
      ) : (
        picker
      )}
      <input type="hidden" name={name} value={value ? toIsoDate(value) : ""} />
    </FormField>
  )
}
