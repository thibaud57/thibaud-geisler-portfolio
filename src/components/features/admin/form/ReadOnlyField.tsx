import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

interface Props {
  id: string
  label?: string
  labelledBy?: string
  value: string
  loading?: boolean
}

// Un Input en lecture seule plutôt qu'un <p> : seul un champ est labelable.
export function ReadOnlyField({ id, label, labelledBy, value, loading = false }: Props) {
  return (
    <FormField id={id} label={label}>
      <Input
        id={id}
        readOnly
        disabled={loading}
        aria-busy={loading}
        aria-labelledby={labelledBy}
        value={value}
        className="truncate bg-muted text-muted-foreground dark:bg-muted"
      />
    </FormField>
  )
}
