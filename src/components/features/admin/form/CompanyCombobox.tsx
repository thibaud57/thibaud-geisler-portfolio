import { SingleSelectCombobox } from "@/components/features/admin/form/SingleSelectCombobox"
import { PERSON_FIELD_LABELS } from "@/lib/crm/persons"
import type { CompanyOption } from "@/server/queries/companies"

interface Props {
  id: string
  options: readonly CompanyOption[]
  value: string | null
  onChange: (companyId: string | null) => void
  errors?: readonly string[]
  label?: string
  name?: string
  nullable?: boolean
}

export function CompanyCombobox({
  options,
  label = PERSON_FIELD_LABELS.companyId,
  name = "companyId",
  nullable = true,
  ...rest
}: Props) {
  return (
    <SingleSelectCombobox
      {...rest}
      label={label}
      name={name}
      options={options.map((company) => ({ value: company.id, label: company.name }))}
      noneLabel={nullable ? "Aucune" : undefined}
      placeholder="Choisir une entreprise"
      searchPlaceholder="Chercher une entreprise"
      emptyMessage="Aucune entreprise ne correspond."
    />
  )
}
