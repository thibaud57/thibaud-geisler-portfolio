"use client"

import { FormCard } from "@/components/features/admin/form/FormCard"
import { MarkdownEditorField } from "@/components/features/admin/form/MarkdownEditorField"
import { DETAILS_EDITOR_HELP } from "@/lib/crm/details-templates"

interface Props {
  formId: string
  title: string
  value: string
  onChange: (value: string) => void
  errors: string[] | undefined
  editorKey?: string | number
  mirror?: { value: string; loading: boolean }
}

export function DetailsCard({ formId, title, value, onChange, errors, editorKey, mirror }: Props) {
  const titleId = `${formId}-details-title`

  return (
    <FormCard
      title={title}
      titleId={titleId}
      description={mirror ? undefined : DETAILS_EDITOR_HELP}
    >
      <div hidden={mirror !== undefined}>
        <MarkdownEditorField
          id={`${formId}-details`}
          name="details"
          labelledBy={titleId}
          value={value}
          onChange={onChange}
          errors={errors}
          editorKey={editorKey}
        />
      </div>
      {mirror ? (
        <MarkdownEditorField
          readOnly
          id={`${formId}-mirror-details`}
          labelledBy={titleId}
          value={mirror.value}
          loading={mirror.loading}
        />
      ) : null}
    </FormCard>
  )
}
