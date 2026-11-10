"use client"

import { useActionState, useId, useState } from "react"
import { KeyRound, Plus } from "lucide-react"

import { ApiKeyCreatedView } from "@/components/features/admin/api-keys/ApiKeyCreatedView"
import {
  API_KEY_EXPIRY_LABELS,
  API_KEY_FIELD_LABELS,
} from "@/components/features/admin/api-keys/api-key-labels"
import { describedBy } from "@/components/features/admin/form/field-aria"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormDialog, FormDialogForm } from "@/components/features/admin/form/FormDialog"
import { MultiSelectCombobox } from "@/components/features/admin/form/MultiSelectCombobox"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { MCP_DOMAIN_OPTIONS, type McpDomain } from "@/lib/mcp-domains"
import { API_KEY_EXPIRIES, type ApiKeyExpiry } from "@/lib/schemas/api-key"
import { createApiKey } from "@/server/actions/api-keys"
import { initialApiKeyFormState } from "@/server/actions/api-keys.types"

const DEFAULT_EXPIRY: ApiKeyExpiry = "90"
const DOMAINS_HELP = "Chaque domaine sert ses outils à sa propre adresse, /api/mcp/<domaine>."

// Le toast part au succès (useSaveFeedback) mais la modale reste ouverte : la vue de la clé prend le relais.
const keepOpen = (): void => undefined

export function ApiKeyFormDialog() {
  return (
    <FormDialog
      trigger={
        <Button>
          <Plus aria-hidden data-icon="inline-start" />
          Nouvelle clé
        </Button>
      }
    >
      {(onDone) => <ApiKeyForm onDone={onDone} />}
    </FormDialog>
  )
}

function ApiKeyForm({ onDone }: { onDone: () => void }) {
  const formId = useId()
  const domainsId = `${formId}-domains`
  const [state, formAction, pending] = useActionState(createApiKey, initialApiKeyFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const [expiry, setExpiry] = useState<ApiKeyExpiry>(DEFAULT_EXPIRY)
  const [domains, setDomains] = useState<readonly McpDomain[]>(["crm"])

  useSaveFeedback(state, { saved: "Clé créée", onSaved: keepOpen })

  if (state.ok) {
    return <ApiKeyCreatedView name={state.created.name} value={state.created.key} onDone={onDone} />
  }

  return (
    <FormDialogForm
      title="Nouvelle clé d'API"
      description="Une clé par usage (le poste, agent-os). Elle n'ouvre que les domaines choisis."
      pending={pending}
      onSubmit={handleSubmit}
      submit={{ label: "Créer la clé", pendingLabel: "Création...", icon: KeyRound }}
    >
      <FieldInput
        id={`${formId}-name`}
        name="name"
        label={API_KEY_FIELD_LABELS.name}
        placeholder="Poste"
        errors={state.errors.name}
      />

      <SelectField
        id={`${formId}-expiry`}
        name="expiry"
        label={API_KEY_FIELD_LABELS.expiry}
        options={API_KEY_EXPIRIES}
        labels={API_KEY_EXPIRY_LABELS}
        value={expiry}
        onValueChange={setExpiry}
        errors={state.errors.expiry}
      />

      <div className="sm:col-span-2">
        <FormField
          id={domainsId}
          label={API_KEY_FIELD_LABELS.domains}
          errors={state.errors.domains}
          help={DOMAINS_HELP}
        >
          <MultiSelectCombobox
            id={domainsId}
            name="domains"
            options={MCP_DOMAIN_OPTIONS}
            selected={domains}
            onChange={setDomains}
            placeholder="Choisir les domaines"
            searchPlaceholder="Chercher un domaine"
            emptyMessage="Aucun domaine ne correspond."
            ariaInvalid={!!state.errors.domains?.length}
            ariaDescribedby={describedBy(domainsId, DOMAINS_HELP)}
          />
        </FormField>
      </div>
    </FormDialogForm>
  )
}
