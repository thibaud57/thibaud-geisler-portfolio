import type { ComponentProps, ReactNode } from "react"

import { describedBy } from "@/components/features/admin/form/field-aria"
import { FormField } from "@/components/ui/form-field"
import { Textarea } from "@/components/ui/textarea"

interface Props extends Omit<ComponentProps<typeof Textarea>, "id"> {
  id: string
  label?: ReactNode
  errors: string[] | undefined
  help?: ReactNode
}

export function TextareaField({ id, label, errors, help, ...textareaProps }: Props) {
  return (
    <FormField id={id} label={label} errors={errors} help={help}>
      <Textarea
        id={id}
        aria-invalid={!!errors?.length}
        aria-describedby={describedBy(id, help)}
        {...textareaProps}
      />
    </FormField>
  )
}
