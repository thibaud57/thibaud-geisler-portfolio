import {
  SingleSelectCombobox,
  type SingleSelectOption,
} from "@/components/features/admin/form/SingleSelectCombobox"
import type { PersonOption } from "@/server/queries/persons"

interface Props {
  id: string
  label: string
  options: readonly PersonOption[]
  value: string
  onChange: (personId: string) => void
  errors?: string[]
  name?: string
  // Ajoute l'option « Aucun » : la valeur vide est alors NONE_VALUE. Sans elle, la valeur vide est "".
  nullable?: boolean
  modal?: boolean
  // La personne déjà choisie peut être sortie des options (opposition) : son nom reste affiché.
  selectedFallback?: { id: string; name: string } | null
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}

function toOption(person: PersonOption): SingleSelectOption {
  return {
    value: person.id,
    label: person.name,
    keywords: person.company ? [person.name, person.company.name] : [person.name],
    secondary: person.company?.name,
  }
}

export function PersonCombobox({
  options,
  nullable = false,
  selectedFallback,
  placeholder = "Choisir une personne",
  searchPlaceholder = "Chercher une personne",
  emptyMessage = "Aucune personne ne correspond.",
  ...rest
}: Props) {
  return (
    <SingleSelectCombobox
      {...rest}
      options={options.map(toOption)}
      noneLabel={nullable ? "Aucun" : undefined}
      selectedFallback={
        selectedFallback ? { value: selectedFallback.id, label: selectedFallback.name } : null
      }
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
    />
  )
}
