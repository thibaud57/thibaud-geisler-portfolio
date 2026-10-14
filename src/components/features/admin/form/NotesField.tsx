import type { ReactNode } from "react"

import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { ReadOnlyField } from "@/components/features/admin/form/ReadOnlyField"
import { NOTES_MAX_LENGTH } from "@/lib/schemas/fields"

const NOTES_HELP = "Une ligne de marqueurs, séparés par |"

interface BaseProps {
  id: string
  labelledBy?: string
}

interface EditableProps extends BaseProps {
  readOnly?: false
  label?: ReactNode
  errors: string[] | undefined
  defaultValue: string | null | undefined
  placeholder?: string
}

interface ReadOnlyProps extends BaseProps {
  readOnly: true
  value: string
  loading?: boolean
}

export function NotesField(props: EditableProps | ReadOnlyProps) {
  if (props.readOnly) {
    return (
      <ReadOnlyField
        id={props.id}
        labelledBy={props.labelledBy}
        value={props.value}
        loading={props.loading}
      />
    )
  }

  return (
    <FieldInput
      id={props.id}
      name="notes"
      label={props.label}
      aria-labelledby={props.labelledBy}
      maxLength={NOTES_MAX_LENGTH}
      defaultValue={props.defaultValue ?? ""}
      placeholder={props.placeholder}
      errors={props.errors}
      help={NOTES_HELP}
    />
  )
}
