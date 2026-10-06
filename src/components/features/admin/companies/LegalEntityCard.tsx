"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { EnumSelectItems } from "@/components/features/admin/EnumSelectItems"
import { OptionalDateField } from "@/components/features/admin/OptionalDateField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import type { Address, LegalEntity, LegalForm, Publisher } from "@/generated/prisma/client"
import { COMPANY_SECTION_TITLES } from "@/lib/companies"
import {
  CAPITAL_CURRENCIES,
  countryName,
  DEFAULT_CURRENCY,
  isFrenchCountry,
  LEGAL_ENTITY_FIELD_LABELS as LABELS,
  LEGAL_ENTITY_MORE_FIELDS,
  LEGAL_FORM_GROUPS,
  LEGAL_FORM_LABELS,
  REGISTERED_OFFICE_COUNTRIES,
  VAT_REGIME_LABELS,
  VAT_REGIMES,
} from "@/lib/legal-entities"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import { cn } from "@/lib/utils"
import type { CompanyFormState } from "@/server/actions/companies.types"

type Errors = CompanyFormState["errors"]

interface Props {
  formId: string
  errors: Errors
  legalEntity: (LegalEntity & { address: Address | null; publisher: Publisher | null }) | null
}

interface TextFieldProps extends Omit<React.ComponentProps<typeof Input>, "id" | "name"> {
  formId: string
  name: keyof Errors
  label: string
  errors: Errors
}

function TextField({ formId, name, label, errors, ...inputProps }: TextFieldProps) {
  const id = `${formId}-${name}`
  return (
    <FormField id={id} label={label} errors={errors[name]}>
      <Input
        id={id}
        name={name}
        aria-invalid={!!errors[name]?.length}
        aria-describedby={`${id}-error`}
        {...inputProps}
      />
    </FormField>
  )
}

const CURRENCY_LABELS = Object.fromEntries(
  CAPITAL_CURRENCIES.map((currency) => [currency, currency]),
) as Record<(typeof CAPITAL_CURRENCIES)[number], string>

export function LegalEntityCard({ formId, errors, legalEntity }: Props) {
  const [statusKey, setStatusKey] = useState<LegalForm | "">(legalEntity?.legalForm ?? "")
  const [statusOpen, setStatusOpen] = useState(false)
  const [country, setCountry] = useState(legalEntity?.address?.country ?? NONE_VALUE)
  const [vatLiableSince, setVatLiableSince] = useState<Date | undefined>(
    legalEntity?.publisher?.vatLiableSince ?? undefined,
  )
  const hasStoredMore =
    legalEntity !== null &&
    [legalEntity.rcsCity, legalEntity.rcsNumber, legalEntity.phone, legalEntity.capitalAmount].some(
      (value) => value !== null,
    )
  // Une erreur sur un champ replié resterait invisible après soumission.
  const hasMoreErrors = LEGAL_ENTITY_MORE_FIELDS.some((name) => !!errors[name]?.length)
  const [moreOpen, setMoreOpen] = useState(hasStoredMore || hasMoreErrors)

  const storedCountry = legalEntity?.address?.country
  const countries =
    storedCountry && !REGISTERED_OFFICE_COUNTRIES.some((code) => code === storedCountry)
      ? [...REGISTERED_OFFICE_COUNTRIES, storedCountry]
      : [...REGISTERED_OFFICE_COUNTRIES]
  const countryLabels = Object.fromEntries(countries.map((code) => [code, countryName(code)]))

  // Pays non renseigné : disposition française, le cas courant.
  const isFrenchLayout = country === NONE_VALUE || isFrenchCountry(country)

  const field = (name: string) => `${formId}-${name}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COMPANY_SECTION_TITLES.legalEntity}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            formId={formId}
            name="legalEntityName"
            label={LABELS.name}
            errors={errors}
            placeholder="Acme SAS"
            defaultValue={legalEntity?.name ?? ""}
          />

          <FormField
            id={field("legalEntityStatusKey")}
            label={LABELS.legalForm}
            errors={errors.legalEntityStatusKey}
          >
            <ComboboxPopover
              id={field("legalEntityStatusKey")}
              open={statusOpen}
              onOpenChange={setStatusOpen}
              triggerContent={
                <span className={cn(!statusKey && "text-muted-foreground")}>
                  {statusKey ? LEGAL_FORM_LABELS[statusKey] : "Choisir une forme"}
                </span>
              }
              ariaInvalid={!!errors.legalEntityStatusKey?.length}
              ariaDescribedby={`${field("legalEntityStatusKey")}-error`}
              searchPlaceholder="Chercher une forme"
              emptyMessage="Aucune forme ne correspond."
            >
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  keywords={["Aucune"]}
                  data-checked={statusKey === ""}
                  onSelect={() => {
                    setStatusKey("")
                    setStatusOpen(false)
                  }}
                >
                  Aucune
                </CommandItem>
              </CommandGroup>
              {LEGAL_FORM_GROUPS.map((group) => (
                <CommandGroup key={group.country} heading={group.country}>
                  {group.forms.map((form) => (
                    <CommandItem
                      key={form}
                      value={form}
                      keywords={[LEGAL_FORM_LABELS[form], group.country]}
                      data-checked={statusKey === form}
                      onSelect={() => {
                        setStatusKey(form)
                        setStatusOpen(false)
                      }}
                    >
                      {LEGAL_FORM_LABELS[form]}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </ComboboxPopover>
            <input type="hidden" name="legalEntityStatusKey" value={statusKey} />
          </FormField>

          <TextField
            formId={formId}
            name="legalEntitySiret"
            label={LABELS.siret}
            errors={errors}
            inputMode="numeric"
            placeholder="14 chiffres"
            defaultValue={legalEntity?.siret ?? ""}
          />

          <TextField
            formId={formId}
            name="legalEntityVatNumber"
            label={LABELS.vatNumber}
            errors={errors}
            defaultValue={legalEntity?.vatNumber ?? ""}
          />
        </div>

        <Separator />
        <span className="text-sm font-medium">{LABELS.registeredOffice}</span>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            formId={formId}
            name="legalEntityStreet"
            label={LABELS.street}
            errors={errors}
            defaultValue={legalEntity?.address?.street ?? ""}
          />
          <TextField
            formId={formId}
            name="legalEntityPostalCode"
            label={LABELS.postalCode}
            errors={errors}
            defaultValue={legalEntity?.address?.postalCode ?? ""}
          />
          <TextField
            formId={formId}
            name="legalEntityCity"
            label={LABELS.city}
            errors={errors}
            defaultValue={legalEntity?.address?.city ?? ""}
          />
          <FormField
            id={field("legalEntityCountry")}
            label={LABELS.country}
            errors={errors.legalEntityCountry}
          >
            <Select name="legalEntityCountry" value={country} onValueChange={setCountry}>
              <SelectTrigger
                id={field("legalEntityCountry")}
                className="w-full"
                aria-invalid={!!errors.legalEntityCountry?.length}
                aria-describedby={`${field("legalEntityCountry")}-error`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Non renseigné</SelectItem>
                <EnumSelectItems values={countries} labels={countryLabels} />
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={moreOpen}
          aria-controls={field("legalEntityMore")}
          onClick={() => {
            setMoreOpen((open) => !open)
          }}
        >
          <ChevronDown
            aria-hidden
            data-icon="inline-start"
            className={cn("transition-transform", !moreOpen && "-rotate-90")}
          />
          Autres informations
        </Button>

        {/* Reste dans le DOM sous hidden : replié, l'action lirait sinon ces champs vides et effacerait capital, RCS et téléphone. */}
        <div id={field("legalEntityMore")} hidden={!moreOpen} className="grid gap-4 sm:grid-cols-2">
          <TextField
            formId={formId}
            name="legalEntityRcsCity"
            label={LABELS.rcsCity}
            errors={errors}
            placeholder="Paris"
            defaultValue={legalEntity?.rcsCity ?? ""}
          />
          {/* En France, le SIREN tiré du SIRET tient lieu de numéro RCS : la ville du RCS s'apparie avec le téléphone. */}
          {!isFrenchLayout && (
            <TextField
              formId={formId}
              name="legalEntityRcsNumber"
              label={LABELS.rcsNumber}
              errors={errors}
              defaultValue={legalEntity?.rcsNumber ?? ""}
            />
          )}
          <div className={cn(!isFrenchLayout && "sm:col-span-2")}>
            <TextField
              formId={formId}
              name="legalEntityPhone"
              label={LABELS.phone}
              errors={errors}
              type="tel"
              defaultValue={legalEntity?.phone ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <TextField
              formId={formId}
              name="legalEntityCapitalAmount"
              label={LABELS.capitalAmount}
              errors={errors}
              inputMode="numeric"
              className="text-right tabular-nums"
              defaultValue={legalEntity?.capitalAmount?.toString() ?? ""}
            />
            <FormField
              id={field("legalEntityCapitalCurrency")}
              label={LABELS.capitalCurrency}
              errors={errors.legalEntityCapitalCurrency}
            >
              <Select
                name="legalEntityCapitalCurrency"
                defaultValue={legalEntity?.capitalCurrency ?? DEFAULT_CURRENCY}
              >
                <SelectTrigger
                  id={field("legalEntityCapitalCurrency")}
                  className="w-full"
                  aria-invalid={!!errors.legalEntityCapitalCurrency?.length}
                  aria-describedby={`${field("legalEntityCapitalCurrency")}-error`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <EnumSelectItems values={CAPITAL_CURRENCIES} labels={CURRENCY_LABELS} />
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>

        {legalEntity?.publisher ? (
          <>
            <Separator />
            <span className="text-sm font-medium">{LABELS.vatSectionTitle}</span>
            <div className="grid gap-4 sm:grid-cols-2">
              <OptionalDateField
                id={field("legalEntityVatLiableSince")}
                name="legalEntityVatLiableSince"
                label={LABELS.vatLiableSince}
                value={vatLiableSince}
                onChange={setVatLiableSince}
                errors={errors.legalEntityVatLiableSince}
              />

              <FormField
                id={field("legalEntityVatRegime")}
                label={LABELS.vatRegime}
                errors={errors.legalEntityVatRegime}
              >
                <Select
                  name="legalEntityVatRegime"
                  defaultValue={legalEntity.publisher.vatRegime ?? NONE_VALUE}
                >
                  <SelectTrigger
                    id={field("legalEntityVatRegime")}
                    className="w-full"
                    aria-invalid={!!errors.legalEntityVatRegime?.length}
                    aria-describedby={`${field("legalEntityVatRegime")}-error`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Non renseigné</SelectItem>
                    <EnumSelectItems values={VAT_REGIMES} labels={VAT_REGIME_LABELS} />
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
