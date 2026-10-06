"use client"

import { useActionState, useEffect, useId, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"

import { AssetImage } from "@/components/features/admin/assets/AssetImage"
import { AssetPicker } from "@/components/features/admin/assets/AssetPicker"
import { LegalEntityCard } from "@/components/features/admin/companies/LegalEntityCard"
import { CompanyRelationCard } from "@/components/features/admin/companies/CompanyRelationCard"
import { useImageFallback } from "@/components/features/projects/useImageFallback"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { MultiSelectCombobox } from "@/components/features/admin/MultiSelectCombobox"

import type { Zone } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { COMPANY_DETAILS_TEMPLATE } from "@/lib/details-templates"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SECTOR_LABELS,
  COMPANY_TYPE_ICONS,
  COMPANY_TYPE_LABELS,
} from "@/lib/companies"
import { COMPANY_SECTORS, COMPANY_TYPES } from "@/lib/schemas/company"
import { sortZones, ZONE_LABELS, ZONES } from "@/lib/zones"
import { createCompany, updateCompany } from "@/server/actions/companies"
import { initialCompanyFormState } from "@/server/actions/companies.types"
import type { AssetEntry } from "@/server/queries/assets"
import type { AdminCompanyDetail } from "@/server/queries/companies"

const SECTOR_OPTIONS = COMPANY_SECTORS.map((value) => ({
  value,
  label: COMPANY_SECTOR_LABELS[value],
}))
const ZONE_OPTIONS = ZONES.map((value) => ({ value, label: ZONE_LABELS[value] }))

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
  const [sectors, setSectors] = useState<string[]>(company?.sectors ?? [])
  const [types, setTypes] = useState<string[]>(company?.types ?? [])
  const [zones, setZones] = useState<string[]>(company?.zones ?? [])
  // Le gabarit ne s'applique qu'à la création : une fiche existante garde son contenu enregistré, vide ou non.
  const [details, setDetails] = useState(
    company ? (company.details ?? "") : COMPANY_DETAILS_TEMPLATE,
  )
  const [logoFilename, setLogoFilename] = useState<string | null>(company?.logoFilename ?? null)
  const { showImage: showLogo, onError: onLogoError } = useImageFallback(logoFilename)

  function toggleType(type: string, checked: boolean) {
    setTypes((current) =>
      checked ? [...current, type] : current.filter((value) => value !== type),
    )
  }

  useEffect(() => {
    if (state.ok === true) {
      toast.success(company ? "Entreprise mise à jour" : "Entreprise créée")
      router.push("/admin/entreprises")
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, company, router])

  const handleSubmit = useFormActionSubmit(formAction)

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

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{COMPANY_SECTION_TITLES.identity}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`${formId}-name`}
                label={COMPANY_FIELD_LABELS.name}
                errors={state.errors.name}
              >
                <Input
                  id={`${formId}-name`}
                  name="name"
                  defaultValue={company?.name ?? ""}
                  placeholder="Globex"
                  aria-invalid={!!state.errors.name?.length}
                  aria-describedby={`${formId}-name-error`}
                />
              </FormField>
              <FormField
                id={`${formId}-slug`}
                label={COMPANY_FIELD_LABELS.slug}
                errors={state.errors.slug}
              >
                <Input
                  id={`${formId}-slug`}
                  name="slug"
                  defaultValue={company?.slug ?? ""}
                  placeholder="globex"
                  aria-invalid={!!state.errors.slug?.length}
                  aria-describedby={`${formId}-slug-error`}
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField
                  id={`${formId}-websiteUrl`}
                  label={COMPANY_FIELD_LABELS.websiteUrl}
                  errors={state.errors.websiteUrl}
                >
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
                    placeholder="Ajouter une zone"
                    searchPlaceholder="Chercher une zone"
                    emptyMessage="Aucune zone ne correspond."
                    ariaInvalid={!!state.errors.zones?.length}
                    ariaDescribedby={`${formId}-zones-error`}
                  />
                  <input type="hidden" name="zones" value="" />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{COMPANY_SECTION_TITLES.classification}</CardTitle>
              <CardDescription>
                Cochez les types, cherchez puis ajoutez les secteurs.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span id={`${formId}-types-label`} className="text-sm font-medium">
                  {COMPANY_FIELD_LABELS.types}
                </span>
                <div
                  role="group"
                  aria-labelledby={`${formId}-types-label`}
                  aria-describedby={`${formId}-types-error ${formId}-types-help`}
                  className="grid grid-cols-2 gap-x-4 gap-y-2"
                >
                  {COMPANY_TYPES.map((type) => {
                    const Icon = COMPANY_TYPE_ICONS[type]
                    return (
                      <label key={type} className="flex min-w-0 items-center gap-2 text-sm">
                        <Checkbox
                          checked={types.includes(type)}
                          onCheckedChange={(checked) => {
                            toggleType(type, checked === true)
                          }}
                          aria-invalid={!!state.errors.types?.length}
                        />
                        {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}
                        {COMPANY_TYPE_LABELS[type]}
                      </label>
                    )
                  })}
                </div>
                {types.map((type) => (
                  <input key={type} type="hidden" name="types" value={type} />
                ))}
                <input type="hidden" name="types" value="" />
                <div id={`${formId}-types-error`} aria-live="polite">
                  {state.errors.types?.[0] ? (
                    <p className="text-sm text-destructive">{state.errors.types[0]}</p>
                  ) : null}
                </div>
                <p id={`${formId}-types-help`} className="text-xs text-muted-foreground">
                  Au moins un type est requis.
                </p>
              </div>
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
                  ariaInvalid={!!sectorsError}
                  ariaDescribedby={`${formId}-sectors-error`}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-details-title`}>{COMPANY_SECTION_TITLES.details}</CardTitle>
              <CardDescription>
                Corps de la fiche. Raccourcis : « # » un titre, « - » une liste, « &gt; » une
                citation, « / » le menu des blocs.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Editor
                id={`${formId}-details`}
                aria-labelledby={`${formId}-details-title`}
                format="markdown"
                enableImages={false}
                value={details}
                onChange={setDetails}
                aria-invalid={!!state.errors.details?.length}
                aria-describedby={`${formId}-details-error`}
              />
              <div id={`${formId}-details-error`} aria-live="polite">
                {state.errors.details?.[0] ? (
                  <p className="text-sm text-destructive">{state.errors.details[0]}</p>
                ) : null}
              </div>
              <input type="hidden" name="details" value={details} />
            </CardContent>
          </Card>

          {relatedCards}
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <CompanyRelationCard
            formId={formId}
            errors={state.errors}
            defaults={{
              relationStatus: company?.relationStatus ?? "ACTIVE",
              size: company?.size ?? null,
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>{COMPANY_SECTION_TITLES.logo}</CardTitle>
              <CardDescription>
                Choisi parmi les logos déposés dans l&apos;espace Assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-linear-to-br from-primary/20 to-accent/20">
                {showLogo && logoFilename ? (
                  <AssetImage
                    assetKey={logoFilename}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 35vw, 100vw"
                    className="object-cover"
                    onError={onLogoError}
                  />
                ) : null}
              </div>
              <AssetPicker
                value={logoFilename}
                onChange={setLogoFilename}
                assets={logoAssets}
                title="Choisir un logo"
                description="Une image du dossier entreprises. Le dépôt se fait depuis Assets."
                triggerLabel="Choisir un logo"
              />
              {state.errors.logoFilename?.[0] ? (
                <p className="text-sm text-destructive">{state.errors.logoFilename[0]}</p>
              ) : null}
              <input type="hidden" name="logoFilename" value={logoFilename ?? ""} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-notes-title`}>{COMPANY_SECTION_TITLES.notes}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Input
                id={`${formId}-notes`}
                name="notes"
                aria-labelledby={`${formId}-notes-title`}
                defaultValue={company?.notes ?? ""}
                placeholder="Leader assurance Luxembourg | Scala/Angular"
                aria-invalid={!!state.errors.notes?.length}
                aria-describedby={`${formId}-notes-error ${formId}-notes-help`}
              />
              <div id={`${formId}-notes-error`} aria-live="polite">
                {state.errors.notes?.[0] ? (
                  <p className="text-sm text-destructive">{state.errors.notes[0]}</p>
                ) : null}
              </div>
              <p id={`${formId}-notes-help`} className="text-xs text-muted-foreground">
                Une ligne de marqueurs, séparés par |
              </p>
            </CardContent>
          </Card>

          <LegalEntityCard
            formId={formId}
            errors={state.errors}
            legalEntity={company?.legalEntity ?? null}
          />
        </div>
      </div>
    </form>
  )
}
