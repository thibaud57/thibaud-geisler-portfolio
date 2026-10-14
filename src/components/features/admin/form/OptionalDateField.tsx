"use client"

import type { ComponentProps } from "react"

import { DateField } from "@/components/features/admin/form/DateField"

export function OptionalDateField(props: Omit<ComponentProps<typeof DateField>, "clearLabel">) {
  return <DateField {...props} clearLabel="Effacer" />
}
