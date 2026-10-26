"use client"

import type { ReactNode } from "react"

import { describedBy } from "@/components/features/admin/form/field-aria"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"

interface BaseProps {
  id: string
  labelledBy?: string
  value: string
}

interface EditableProps extends BaseProps {
  readOnly?: false
  name: string
  label?: ReactNode
  onChange: (value: string) => void
  errors: readonly string[] | undefined
  help?: ReactNode
  // Rien ne garantit que l'éditeur relise `value` après son montage : une nouvelle clé le remonte sur un texte remplacé de l'extérieur.
  editorKey?: string | number
}

interface ReadOnlyProps extends BaseProps {
  readOnly: true
  loading?: boolean
}

export function MarkdownEditorField(props: EditableProps | ReadOnlyProps) {
  if (props.readOnly) {
    return (
      <div
        id={props.id}
        role="group"
        aria-labelledby={props.labelledBy}
        aria-busy={props.loading}
        className="rounded-md border border-input bg-muted p-3"
      >
        <MarkdownContent markdown={props.value} variant="admin" />
      </div>
    )
  }

  const { id, name, label, labelledBy, value, onChange, errors, help, editorKey } = props
  return (
    <FormField id={id} label={label} errors={errors} help={help}>
      <Editor
        key={editorKey}
        id={id}
        aria-labelledby={labelledBy}
        format="markdown"
        enableImages={false}
        editorClassName="min-h-32 max-h-[60vh] overflow-y-auto"
        value={value}
        onChange={onChange}
        aria-invalid={!!errors?.length}
        aria-describedby={describedBy(id, help)}
      />
      <input type="hidden" name={name} value={value} />
    </FormField>
  )
}
