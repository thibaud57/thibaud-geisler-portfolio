"use client"

import { useActionState, useId, useState, useTransition } from "react"
import { Calculator, Plus } from "lucide-react"
import { toast } from "sonner"

import { DateField } from "@/components/features/admin/form/DateField"
import { FormDialog, FormDialogForm } from "@/components/features/admin/form/FormDialog"
import { NotesField } from "@/components/features/admin/form/NotesField"
import { NumberField } from "@/components/features/admin/form/NumberField"
import { ReviewRates } from "@/components/features/admin/weekly-reviews/ReviewRates"
import { EditRowButton } from "@/components/features/admin/table/EditRowButton"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { TextareaField } from "@/components/features/admin/form/TextareaField"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { dateOnlyToLocal, toIsoDate } from "@/lib/date-time"
import { NONE_LABEL, NONE_LABEL_FEMININE, NONE_VALUE } from "@/lib/schemas/none-value"
import { REVIEW_MOTIVATIONS, REVIEW_STATUSES } from "@/lib/schemas/weekly-review"
import {
  defaultClosingFriday,
  isoDayToDate,
  parseCounterInputs,
  REVIEW_COUNTER_KEYS,
  REVIEW_FIELD_LABELS as LABELS,
  REVIEW_MOTIVATION_ICONS,
  REVIEW_MOTIVATION_LABELS,
  REVIEW_STATUS_ICONS,
  REVIEW_STATUS_LABELS,
  reviewRates,
  weekLabel,
  type ReviewCounts,
} from "@/lib/crm/weekly-reviews"
import {
  computeWeekCounters,
  createWeeklyReview,
  updateWeeklyReview,
} from "@/server/actions/weekly-reviews"
import { initialWeeklyReviewFormState } from "@/server/actions/weekly-reviews.types"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"
import { GENERIC_ERROR_TOAST } from "@/lib/admin/toasts"

const NOT_FRIDAY = { dayOfWeek: [0, 1, 2, 3, 4, 6] }

function fridayLabel(day: Date): string {
  return weekLabel(isoDayToDate(toIsoDate(day)))
}

type CounterValues = Record<keyof ReviewCounts, string>

function toCounterValues(counts: ReviewCounts | null): CounterValues {
  return Object.fromEntries(
    REVIEW_COUNTER_KEYS.map((key) => [key, String(counts?.[key] ?? 0)]),
  ) as CounterValues
}

const TEXT_FIELDS = [
  { key: "wins", placeholder: "Ce qui a avancé cette semaine" },
  { key: "blockers", placeholder: "Ce qui coince" },
  { key: "nextWeekPlan", placeholder: "Les actions de la semaine prochaine" },
] as const

interface Props {
  review: AdminWeeklyReview | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultFriday?: Date
}

export function ReviewFormDialog({ review, open, onOpenChange, defaultFriday }: Props) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        open === undefined ? (
          review ? (
            <EditRowButton label={`Modifier ${weekLabel(review.closingFriday)}`} />
          ) : (
            <Button type="button">
              <Plus aria-hidden data-icon="inline-start" />
              Clôturer la semaine
            </Button>
          )
        ) : undefined
      }
    >
      {(onDone) => <ReviewForm review={review} defaultFriday={defaultFriday} onDone={onDone} />}
    </FormDialog>
  )
}

function ReviewForm({
  review,
  defaultFriday,
  onDone,
}: {
  review: AdminWeeklyReview | null
  defaultFriday: Date | undefined
  onDone: () => void
}) {
  const formId = useId()
  const formAction = review ? updateWeeklyReview.bind(null, review.id) : createWeeklyReview
  const [state, submitAction, pending] = useActionState(formAction, initialWeeklyReviewFormState)
  const handleSubmit = useFormActionSubmit(submitAction)
  const [counting, startCounting] = useTransition()

  const [day, setDay] = useState<Date | undefined>(
    review
      ? dateOnlyToLocal(review.closingFriday)
      : (defaultFriday ?? defaultClosingFriday(new Date())),
  )
  const [counters, setCounters] = useState(() => toCounterValues(review))

  function handleCompute() {
    if (!day) return
    startCounting(async () => {
      const result = await computeWeekCounters(toIsoDate(day))
      if (result.ok) {
        setCounters(toCounterValues(result.counts))
        toast.success("Compteurs calculés depuis le CRM")
      } else {
        toast.error(GENERIC_ERROR_TOAST)
      }
    })
  }

  useSaveFeedback(state, {
    saved: review ? "Revue mise à jour" : "Revue créée",
    onSaved: onDone,
    gone: { code: "weekly_review_not_found", toast: "Cette revue a été supprimée" },
  })

  return (
    <FormDialogForm
      title={review ? `Modifier ${weekLabel(review.closingFriday)}` : "Clôturer la semaine"}
      description={
        review
          ? "Modifier les informations de cette revue."
          : "Créer le bilan de la semaine écoulée."
      }
      pending={pending}
      onSubmit={handleSubmit}
    >
      <div className="sm:col-span-2">
        <DateField
          id={`${formId}-closingFriday`}
          name="closingFriday"
          label={LABELS.friday}
          value={day}
          onChange={setDay}
          errors={state.errors.closingFriday}
          placeholder="Choisir un vendredi"
          formatValue={fridayLabel}
          disabled={NOT_FRIDAY}
          required
          action={
            <Button
              type="button"
              variant="outline"
              disabled={!day || counting}
              onClick={handleCompute}
              className="w-full sm:flex-1"
            >
              <Calculator aria-hidden data-icon="inline-start" />
              {counting ? "Calcul..." : "Calculer depuis le CRM"}
            </Button>
          }
        />
      </div>

      <SelectField
        id={`${formId}-status`}
        name="status"
        label={LABELS.status}
        options={REVIEW_STATUSES}
        labels={REVIEW_STATUS_LABELS}
        icons={REVIEW_STATUS_ICONS}
        defaultValue={review?.status ?? NONE_VALUE}
        errors={state.errors.status}
        noneLabel={NONE_LABEL}
      />

      <SelectField
        id={`${formId}-motivation`}
        name="motivation"
        label={LABELS.motivation}
        options={REVIEW_MOTIVATIONS}
        labels={REVIEW_MOTIVATION_LABELS}
        icons={REVIEW_MOTIVATION_ICONS}
        defaultValue={review?.motivation ?? NONE_VALUE}
        errors={state.errors.motivation}
        noneLabel={NONE_LABEL_FEMININE}
      />

      {REVIEW_COUNTER_KEYS.map((key) => (
        <NumberField
          key={key}
          id={`${formId}-${key}`}
          name={key}
          label={LABELS[key]}
          min={0}
          max={999}
          step={1}
          value={counters[key]}
          onChange={(event) => {
            setCounters((previous) => ({ ...previous, [key]: event.target.value }))
          }}
          errors={state.errors[key]}
        />
      ))}

      <FormField id={`${formId}-computedRates`} label={LABELS.computedRates}>
        <output
          id={`${formId}-computedRates`}
          className="flex h-8 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground tabular-nums"
        >
          <ReviewRates rates={reviewRates(parseCounterInputs(counters))} />
        </output>
      </FormField>

      {TEXT_FIELDS.map(({ key, placeholder }) => (
        <div key={key} className="sm:col-span-2">
          <TextareaField
            id={`${formId}-${key}`}
            name={key}
            label={LABELS[key]}
            // field-sizing-content ignore `rows` : la hauteur de trois lignes au repos passe par min-h.
            className="min-h-20"
            defaultValue={review?.[key] ?? ""}
            placeholder={placeholder}
            errors={state.errors[key]}
          />
        </div>
      ))}

      <div className="sm:col-span-2">
        <NotesField
          id={`${formId}-notes`}
          label={LABELS.notes}
          defaultValue={review?.notes ?? ""}
          placeholder="Bonne semaine | relances à reprendre"
          errors={state.errors.notes}
        />
      </div>
    </FormDialogForm>
  )
}
