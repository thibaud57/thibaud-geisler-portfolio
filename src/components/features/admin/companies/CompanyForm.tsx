"use client"

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useState,
  type SubmitEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { MultiSelectCombobox } from "@/components/features/admin/MultiSelectCombobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { Company, LegalEntity } from "@/generated/prisma/client"
import { COMPANY_SECTOR_LABELS, COMPANY_SIZE_LABELS } from "@/lib/companies"
import { COMPANY_SECTORS, COMPANY_SIZES, NONE_VALUE } from "@/lib/schemas/company"
import { createCompany, updateCompany } from "@/server/actions/companies"
import { initialCompanyFormState } from "@/server/actions/companies.types"

const SECTOR_OPTIONS = COMPANY_SECTORS.map((value) => ({
  value,
  label: COMPANY_SECTOR_LABELS[value],
}))

interface Props {
  company: Company | null
  legalEntities: Pick<LegalEntity, "id" | "name">[]
}

export function CompanyForm({ company, legalEntities }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = company ? updateCompany.bind(null, company.id) : createCompany
  const [state, formAction, pending] = useActionState(action, initialCompanyFormState)
  const [sectors, setSectors] = useState<string[]>(company?.sectors ?? [])

  useEffect(() => {
    if (state.ok === true) {
      toast.success(company ? "Entreprise mise à jour" : "Entreprise créée")
      router.push("/admin/entreprises")
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, company, router])

  // onSubmit plutôt que <form action> : ce formulaire porte deux Select (Taille, Entité légale),
  // que React réinitialiserait à leur valeur du premier rendu à la première erreur de validation.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  const sectorsError = state.errors.sectors?.[0]

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {company ? company.name : "Nouvelle entreprise"}
        </h1>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href="/admin/entreprises">Annuler</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            <Save aria-hidden data-icon="inline-start" />
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id={`${formId}-slug`} label="Slug" errors={state.errors.slug}>
            <Input
              id={`${formId}-slug`}
              name="slug"
              defaultValue={company?.slug ?? ""}
              placeholder="axa"
              aria-invalid={!!state.errors.slug?.length}
              aria-describedby={`${formId}-slug-help ${formId}-slug-error`}
            />
            <p id={`${formId}-slug-help`} className="text-xs text-muted-foreground">
              Identifiant d&apos;URL, minuscules et tirets.
            </p>
          </FormField>
          <FormField id={`${formId}-name`} label="Nom" errors={state.errors.name}>
            <Input
              id={`${formId}-name`}
              name="name"
              defaultValue={company?.name ?? ""}
              placeholder="AXA Assistance"
              aria-invalid={!!state.errors.name?.length}
              aria-describedby={`${formId}-name-error`}
            />
          </FormField>
          <FormField id={`${formId}-websiteUrl`} label="Site web" errors={state.errors.websiteUrl}>
            <Input
              id={`${formId}-websiteUrl`}
              name="websiteUrl"
              type="url"
              defaultValue={company?.websiteUrl ?? ""}
              placeholder="https://"
              aria-invalid={!!state.errors.websiteUrl?.length}
              aria-describedby={`${formId}-websiteUrl-error`}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
          <CardDescription>
            Cherchez puis sélectionnez. Une valeur choisie s&apos;ajoute sous le champ.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id={`${formId}-sectors`} label="Secteurs" errors={state.errors.sectors}>
            <MultiSelectCombobox
              id={`${formId}-sectors`}
              name="sectors"
              options={SECTOR_OPTIONS}
              selected={sectors}
              onChange={setSectors}
              placeholder="Ajouter un secteur"
              searchPlaceholder="Chercher un secteur"
              emptyMessage="Aucun secteur ne correspond."
              ariaInvalid={!!sectorsError}
              ariaDescribedby={`${formId}-sectors-error`}
            />
            {sectors.length === 0 && !sectorsError ? (
              <p className="text-xs text-muted-foreground">Au moins un secteur est requis.</p>
            ) : null}
          </FormField>
          <FormField id={`${formId}-size`} label="Taille" errors={state.errors.size}>
            <Select name="size" defaultValue={company?.size ?? NONE_VALUE}>
              <SelectTrigger
                id={`${formId}-size`}
                className="w-full"
                aria-invalid={!!state.errors.size?.length}
                aria-describedby={`${formId}-size-error`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Non renseignée</SelectItem>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {COMPANY_SIZE_LABELS[size]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entité légale</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            id={`${formId}-legalEntityId`}
            label="Entité légale"
            errors={state.errors.legalEntityId}
          >
            <Select name="legalEntityId" defaultValue={company?.legalEntityId ?? NONE_VALUE}>
              <SelectTrigger
                id={`${formId}-legalEntityId`}
                className="w-full"
                aria-invalid={!!state.errors.legalEntityId?.length}
                aria-describedby={`${formId}-legalEntityId-error`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Aucune</SelectItem>
                {legalEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </CardContent>
      </Card>
    </form>
  )
}
