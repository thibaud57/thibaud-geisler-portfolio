"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { ComboboxPopover } from "@/components/features/admin/form/ComboboxPopover"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormCard } from "@/components/features/admin/form/FormCard"
import { OptionalDateField } from "@/components/features/admin/form/OptionalDateField"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { Button } from "@/components/ui/button"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { FormField } from "@/components/ui/form-field"
import { Separator } from "@/components/ui/separator"

import type { Address, LegalEntity, LegalForm, Publisher } from "@/generated/prisma/client"
import { COMPANY_SECTION_TITLES } from "@/lib/crm/companies"
import {
  CAPITAL_CURRENCIES,
  countryName,
  DEFAULT_CURRENCY,
  isFrenchLayout,
  LEGAL_ENTITY_FIELD_LABELS as LABELS,
  LEGAL_ENTITY_MORE_FIELDS,
  LEGAL_FORM_GROUPS,
  LEGAL_FORM_LABELS,
  REGISTERED_OFFICE_COUNTRIES,
  VAT_REGIME_LABELS,
  VAT_REGIMES,
} from "@/lib/crm/legal-entities"
import { NONE_LABEL, NONE_LABEL_FEMININE, NONE_VALUE } from "@/lib/schemas/none-value"
import { cn } from "@/lib/utils"
import type { CompanyFormState } from "@/server/actions/companies.types"

type Errors = CompanyFormState["errors"]

interface Props {
  formId: string
  errors: Errors
  legalEntity: (LegalEntity & { address: Address | null; publisher: Publisher | null }) | null
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

  const french = isFrenchLayout(country === NONE_VALUE ? null : country)

  const field = (name: string) => `${formId}-${name}`

  return (
    <FormCard title={COMPANY_SECTION_TITLES.legalEntity}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          id={field("legalEntityName")}
          name="legalEntityName"
          label={LABELS.name}
          placeholder="Acme SAS"
          defaultValue={legalEntity?.name ?? ""}
          errors={errors.legalEntityName}
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
                value={NONE_VALUE}
                keywords={[NONE_LABEL_FEMININE]}
                data-checked={statusKey === ""}
                onSelect={() => {
                  setStatusKey("")
                  setStatusOpen(false)
                }}
              >
                {NONE_LABEL_FEMININE}
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

        <FieldInput
          id={field("legalEntitySiret")}
          name="legalEntitySiret"
          label={LABELS.siret}
          inputMode="numeric"
          placeholder="14 chiffres"
          defaultValue={legalEntity?.siret ?? ""}
          errors={errors.legalEntitySiret}
        />

        <FieldInput
          id={field("legalEntityVatNumber")}
          name="legalEntityVatNumber"
          label={LABELS.vatNumber}
          defaultValue={legalEntity?.vatNumber ?? ""}
          errors={errors.legalEntityVatNumber}
        />
      </div>

      <Separator />
      <span className="text-sm font-medium">{LABELS.registeredOffice}</span>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          id={field("legalEntityStreet")}
          name="legalEntityStreet"
          label={LABELS.street}
          defaultValue={legalEntity?.address?.street ?? ""}
          errors={errors.legalEntityStreet}
        />
        <FieldInput
          id={field("legalEntityPostalCode")}
          name="legalEntityPostalCode"
          label={LABELS.postalCode}
          defaultValue={legalEntity?.address?.postalCode ?? ""}
          errors={errors.legalEntityPostalCode}
        />
        <FieldInput
          id={field("legalEntityCity")}
          name="legalEntityCity"
          label={LABELS.city}
          defaultValue={legalEntity?.address?.city ?? ""}
          errors={errors.legalEntityCity}
        />
        <SelectField
          id={field("legalEntityCountry")}
          name="legalEntityCountry"
          label={LABELS.country}
          options={countries}
          labels={countryLabels}
          value={country}
          onValueChange={setCountry}
          errors={errors.legalEntityCountry}
          noneLabel={NONE_LABEL}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start"
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
        <FieldInput
          id={field("legalEntityRcsCity")}
          name="legalEntityRcsCity"
          label={LABELS.rcsCity}
          placeholder="Paris"
          defaultValue={legalEntity?.rcsCity ?? ""}
          errors={errors.legalEntityRcsCity}
        />
        {/* En France, le SIREN tiré du SIRET tient lieu de numéro RCS : la ville du RCS s'apparie avec le téléphone. */}
        {!french && (
          <FieldInput
            id={field("legalEntityRcsNumber")}
            name="legalEntityRcsNumber"
            label={LABELS.rcsNumber}
            defaultValue={legalEntity?.rcsNumber ?? ""}
            errors={errors.legalEntityRcsNumber}
          />
        )}
        <div className={cn(!french && "sm:col-span-2")}>
          <FieldInput
            id={field("legalEntityPhone")}
            name="legalEntityPhone"
            label={LABELS.phone}
            type="tel"
            defaultValue={legalEntity?.phone ?? ""}
            errors={errors.legalEntityPhone}
          />
        </div>

        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <FieldInput
            id={field("legalEntityCapitalAmount")}
            name="legalEntityCapitalAmount"
            label={LABELS.capitalAmount}
            inputMode="numeric"
            className="text-right tabular-nums"
            defaultValue={legalEntity?.capitalAmount?.toString() ?? ""}
            errors={errors.legalEntityCapitalAmount}
          />
          <SelectField
            id={field("legalEntityCapitalCurrency")}
            name="legalEntityCapitalCurrency"
            label={LABELS.capitalCurrency}
            options={CAPITAL_CURRENCIES}
            labels={CURRENCY_LABELS}
            defaultValue={legalEntity?.capitalCurrency ?? DEFAULT_CURRENCY}
            errors={errors.legalEntityCapitalCurrency}
          />
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

            <SelectField
              id={field("legalEntityVatRegime")}
              name="legalEntityVatRegime"
              label={LABELS.vatRegime}
              options={VAT_REGIMES}
              labels={VAT_REGIME_LABELS}
              defaultValue={legalEntity.publisher.vatRegime ?? NONE_VALUE}
              errors={errors.legalEntityVatRegime}
              noneLabel={NONE_LABEL}
            />
          </div>
        </>
      ) : null}
    </FormCard>
  )
}
