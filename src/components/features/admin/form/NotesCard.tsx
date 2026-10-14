import { FormCard } from "@/components/features/admin/form/FormCard"
import { NotesField } from "@/components/features/admin/form/NotesField"

interface Props {
  formId: string
  title: string
  errors: string[] | undefined
  defaultValue: string | null | undefined
  placeholder?: string
  mirror?: { value: string; loading: boolean }
}

export function NotesCard({ formId, title, errors, defaultValue, placeholder, mirror }: Props) {
  const titleId = `${formId}-notes-title`

  return (
    <FormCard title={title} titleId={titleId}>
      <div hidden={mirror !== undefined}>
        <NotesField
          id={`${formId}-notes`}
          labelledBy={titleId}
          defaultValue={defaultValue}
          placeholder={placeholder}
          errors={errors}
        />
      </div>
      {mirror ? (
        <NotesField
          readOnly
          id={`${formId}-mirror-notes`}
          labelledBy={titleId}
          value={mirror.value}
          loading={mirror.loading}
        />
      ) : null}
    </FormCard>
  )
}
