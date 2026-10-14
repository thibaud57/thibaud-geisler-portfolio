import type { ComponentProps, ReactNode } from "react"

import { describedBy } from "@/components/features/admin/form/field-aria"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

interface Props extends Omit<ComponentProps<typeof Input>, "id"> {
  id: string
  label?: ReactNode
  errors: string[] | undefined
  help?: ReactNode
}

export function FieldInput({ id, label, errors, help, ...inputProps }: Props) {
  return (
    <FormField id={id} label={label} errors={errors} help={help}>
      <Input
        id={id}
        aria-invalid={!!errors?.length}
        aria-describedby={describedBy(id, help)}
        {...inputProps}
      />
    </FormField>
  )
}
