"use client"

import { useActionState, useId, useState } from "react"
import { useRouter } from "next/navigation"

import { CheckboxGroupField } from "@/components/features/admin/form/CheckboxGroupField"
import { CompanyLogoCard } from "@/components/features/admin/companies/CompanyLogoCard"
import { CompanyRelationCard } from "@/components/features/admin/companies/CompanyRelationCard"
import { LegalEntityCard } from "@/components/features/admin/companies/LegalEntityCard"
import { DetailsCard } from "@/components/features/admin/form/DetailsCard"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormCard } from "@/components/features/admin/form/FormCard"
import { FormPage } from "@/components/features/admin/form/FormPage"
import { MultiSelectCombobox } from "@/components/features/admin/form/MultiSelectCombobox"
import { NotesCard } from "@/components/features/admin/form/NotesCard"
import { FormField } from "@/components/ui/form-field"

import type { Zone } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { ADMIN_COMPANIES_PATH } from "@/lib/admin/routes"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SECTOR_LABELS,
  COMPANY_TYPE_ICONS,
  COMPANY_TYPE_LABELS,
} from "@/lib/crm/companies"
import { COMPANY_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import { COMPANY_SECTORS, COMPANY_TYPES } from "@/lib/schemas/company"
import { sortZones, ZONE_OPTIONS } from "@/lib/crm/zones"
import { createCompany, updateCompany } from "@/server/actions/companies"
import { initialCompanyFormState } from "@/server/actions/companies.types"
import type { AssetEntry } from "@/server/queries/assets"
import type { AdminCompanyDetail } from "@/server/queries/companies"

const SECTOR_OPTIONS = COMPANY_SECTORS.map((value) => ({
  value,
  label: COMPANY_SECTOR_LABELS[value],
}))

interface Props {
  company: AdminCompanyDetail | null
  logoAssets: AssetEntry[]
  relatedCards?: React.ReactNode
}

export function CompanyForm({ company, logoAssets, relatedCards }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = company ? updateCompany.bind(null, company.id) : createCompany
  const [state, formAction, pending] = useActionState(action, initialCompanyFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const [sectors, setSectors] = useState<string[]>(company?.sectors ?? [])
  const [zones, setZones] = useState<string[]>(company?.zones ?? [])
  // Le gabarit ne s'applique qu'à la création : une fiche existante garde son contenu enregistré, vide ou non.
  const [details, setDetails] = useState(
    company ? (company.details ?? "") : COMPANY_DETAILS_TEMPLATE,
  )
  const [logoFilename, setLogoFilename] = useState<string | null>(company?.logoFilename ?? null)
  const [slug, setSlug] = useState(company?.slug ?? "")
  const [websiteUrl, setWebsiteUrl] = useState(company?.websiteUrl ?? "")

  useSaveFeedback(state, {
    saved: company ? "Entreprise mise à jour" : "Entreprise créée",
    onSaved: () => {
      router.push(ADMIN_COMPANIES_PATH)
    },
    gone: { code: "company_not_found", toast: "Cette entreprise a été supprimée" },
  })

  return (
    <FormPage
      title={company ? company.name : "Nouvelle entreprise"}
      cancelHref={ADMIN_COMPANIES_PATH}
      pending={pending}
      onSubmit={handleSubmit}
      main={
        <>
          <FormCard title={COMPANY_SECTION_TITLES.identity} columns={2}>
            <FieldInput
              id={`${formId}-name`}
              name="name"
              label={COMPANY_FIELD_LABELS.name}
              defaultValue={company?.name ?? ""}
              placeholder="Acme SAS"
              errors={state.errors.name}
            />

            <FieldInput
              id={`${formId}-slug`}
              name="slug"
              label={COMPANY_FIELD_LABELS.slug}
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value)
              }}
              placeholder="acme"
              errors={state.errors.slug}
            />

            <div className="sm:col-span-2">
              <FieldInput
                id={`${formId}-websiteUrl`}
                name="websiteUrl"
                label={COMPANY_FIELD_LABELS.websiteUrl}
                type="url"
                value={websiteUrl}
                onChange={(event) => {
                  setWebsiteUrl(event.target.value)
                }}
                placeholder="https://"
                errors={state.errors.websiteUrl}
              />
            </div>

            <div className="sm:col-span-2">
              <FormField
                id={`${formId}-zones`}
                label={COMPANY_FIELD_LABELS.zones}
                errors={state.errors.zones}
              >
                <MultiSelectCombobox
                  id={`${formId}-zones`}
                  name="zones"
                  options={ZONE_OPTIONS}
                  selected={zones}
                  onChange={(values) => {
                    setZones(sortZones(values as Zone[]))
                  }}
                  placeholder="Ajouter une localité"
                  searchPlaceholder="Chercher une localité"
                  emptyMessage="Aucune localité ne correspond."
                  ariaInvalid={!!state.errors.zones?.length}
                  ariaDescribedby={`${formId}-zones-error`}
                />
              </FormField>
            </div>
          </FormCard>

          <FormCard
            title={COMPANY_SECTION_TITLES.classification}
            description="Cochez les types, cherchez puis ajoutez les secteurs."
          >
            <CheckboxGroupField
              id={`${formId}-types`}
              name="types"
              label={COMPANY_FIELD_LABELS.types}
              options={COMPANY_TYPES}
              labels={COMPANY_TYPE_LABELS}
              icons={COMPANY_TYPE_ICONS}
              defaultValue={company?.types ?? []}
              errors={state.errors.types}
              help="Au moins un type est requis."
            />

            <FormField
              id={`${formId}-sectors`}
              label={COMPANY_FIELD_LABELS.sectors}
              errors={state.errors.sectors}
            >
              <MultiSelectCombobox
                id={`${formId}-sectors`}
                name="sectors"
                options={SECTOR_OPTIONS}
                selected={sectors}
                onChange={setSectors}
                placeholder="Ajouter un secteur"
                searchPlaceholder="Chercher un secteur"
                emptyMessage="Aucun secteur ne correspond."
                ariaInvalid={!!state.errors.sectors?.length}
                ariaDescribedby={`${formId}-sectors-error`}
              />
            </FormField>
          </FormCard>

          <DetailsCard
            formId={formId}
            title={COMPANY_SECTION_TITLES.details}
            value={details}
            onChange={setDetails}
            errors={state.errors.details}
          />

          {relatedCards}
        </>
      }
      aside={
        <>
          <CompanyRelationCard
            formId={formId}
            errors={state.errors}
            defaults={{
              relationStatus: company?.relationStatus ?? "ACTIVE",
              size: company?.size ?? null,
            }}
          />

          <CompanyLogoCard
            logoFilename={logoFilename}
            onLogoFilenameChange={setLogoFilename}
            logoAssets={logoAssets}
            websiteUrl={websiteUrl}
            slug={slug}
            error={state.errors.logoFilename?.[0]}
          />

          <LegalEntityCard
            formId={formId}
            errors={state.errors}
            legalEntity={company?.legalEntity ?? null}
          />

          <NotesCard
            formId={formId}
            title={COMPANY_SECTION_TITLES.notes}
            errors={state.errors.notes}
            defaultValue={company?.notes}
            placeholder="Éditeur de logiciels | TypeScript/React"
          />
        </>
      }
    />
  )
}
