"use client"

import {
  Fragment,
  useActionState,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  useTransition,
} from "react"
import { Calculator, Pencil, Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { DatePicker } from "@/components/features/admin/DatePicker"
import { EmptyValue } from "@/components/features/admin/EmptyValue"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { dateOnlyToLocal } from "@/lib/date-time"
import { toIsoDate } from "@/lib/projects"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import { REVIEW_MOTIVATIONS, REVIEW_STATUSES } from "@/lib/schemas/weekly-review"
import {
  defaultClosingFriday,
  formatRate,
  isoDayToDate,
  REVIEW_COUNTER_KEYS,
  REVIEW_FIELD_LABELS as LABELS,
  REVIEW_MOTIVATION_ICONS,
  REVIEW_MOTIVATION_LABELS,
  REVIEW_STATUS_ICONS,
  REVIEW_STATUS_LABELS,
  reviewRates,
  weekLabel,
  type ReviewCounts,
} from "@/lib/weekly-reviews"
import {
  computeWeekCounters,
  createWeeklyReview,
  updateWeeklyReview,
} from "@/server/actions/weekly-reviews"
import { initialWeeklyReviewFormState } from "@/server/actions/weekly-reviews.types"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

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
  // Mode contrôlé : le parent pilote l'ouverture, aucun déclencheur n'est rendu.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ReviewFormDialog({ review, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)
  const controlled = controlledOpen !== undefined
  const open = controlled ? controlledOpen : internalOpen

  function setOpen(next: boolean) {
    if (!controlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Nouvelle clé à chaque ouverture : le formulaire repart d'un état neuf (vendredi par défaut compris).
    if (next) setInstanceKey((key) => key + 1)
  }

  function handleDone() {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {controlled ? null : review ? (
        <DialogTrigger asChild>
          <RowActionButton aria-label={`Modifier ${weekLabel(review.closingFriday)}`}>
            <Pencil className="size-4" />
          </RowActionButton>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button type="button">
            <Plus aria-hidden data-icon="inline-start" />
            Clôturer la semaine
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-160">
        <ReviewForm key={instanceKey} review={review} onDone={handleDone} />
      </DialogContent>
    </Dialog>
  )
}

function ReviewForm({ review, onDone }: { review: AdminWeeklyReview | null; onDone: () => void }) {
  const formId = useId()
  const formAction = review ? updateWeeklyReview.bind(null, review.id) : createWeeklyReview
  const [state, submitAction, pending] = useActionState(formAction, initialWeeklyReviewFormState)
  const handleSubmit = useFormActionSubmit(submitAction)
  const [counting, startCounting] = useTransition()

  // Le Calendar attend une date locale.
  const [day, setDay] = useState<Date | undefined>(
    review ? dateOnlyToLocal(review.closingFriday) : defaultClosingFriday(new Date()),
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
        toast.error("Une erreur est survenue, réessayez")
      }
    })
  }

  // Effect Event : le formulaire reste monté pendant l'animation de fermeture, un `onDone` d'identité changeante relancerait l'effet de succès et doublerait le toast.
  const handleSaved = useEffectEvent(() => {
    onDone()
    toast.success(review ? "Revue mise à jour" : "Revue créée")
  })

  useEffect(() => {
    if (state.ok === true) {
      handleSaved()
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state])

  const rates = review ? reviewRates(review) : null

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col gap-4">
      <DialogHeader className="shrink-0">
        <DialogTitle>
          {review ? `Modifier ${weekLabel(review.closingFriday)}` : "Clôturer la semaine"}
        </DialogTitle>
        <DialogDescription>
          {review
            ? "Modifier les informations de cette revue."
            : "Créer le bilan de la semaine écoulée."}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField
            id={`${formId}-closingFriday`}
            label={LABELS.closingFriday}
            errors={state.errors.closingFriday}
          >
            {/* Séparées par l'écart de la grille, les deux moitiés tombent sur les colonnes des champs du dessous ; une erreur du champ passe sous la ligne sans désaligner le bouton. */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <DatePicker
                id={`${formId}-closingFriday`}
                value={day}
                onChange={setDay}
                invalid={!!state.errors.closingFriday?.length}
                placeholder="Choisir un vendredi"
                formatValue={fridayLabel}
                disabled={NOT_FRIDAY}
                required
                className="sm:flex-1"
              />
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
            </div>
            <input type="hidden" name="closingFriday" value={day ? toIsoDate(day) : ""} />
          </FormField>
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
          noneLabel="Non renseigné"
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
          noneLabel="Non renseignée"
        />

        {REVIEW_COUNTER_KEYS.map((key) => (
          <FormField
            key={key}
            id={`${formId}-${key}`}
            label={LABELS[key]}
            errors={state.errors[key]}
          >
            <Input
              id={`${formId}-${key}`}
              name={key}
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              step={1}
              value={counters[key]}
              onChange={(event) => {
                setCounters((previous) => ({ ...previous, [key]: event.target.value }))
              }}
              className="text-right tabular-nums"
              aria-invalid={!!state.errors[key]?.length}
              aria-describedby={`${formId}-${key}-error`}
            />
          </FormField>
        ))}

        <FormField id={`${formId}-computedRates`} label={LABELS.computedRates}>
          <output
            id={`${formId}-computedRates`}
            className="flex h-8 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground tabular-nums"
          >
            {/* Un seul item flex : sinon chaque morceau de texte devient un item anonyme dont les espaces de bord sont rognés. */}
            <span>
              {rates
                ? [rates.acceptance, rates.response, rates.meetingConversion].map((rate, index) => (
                    <Fragment key={index}>
                      {index > 0 ? " · " : null}
                      {formatRate(rate) ?? <EmptyValue />}
                    </Fragment>
                  ))
                : "Calculés à l'enregistrement"}
            </span>
          </output>
        </FormField>

        {TEXT_FIELDS.map(({ key, placeholder }) => (
          <div key={key} className="sm:col-span-2">
            <FormField id={`${formId}-${key}`} label={LABELS[key]} errors={state.errors[key]}>
              <Textarea
                id={`${formId}-${key}`}
                name={key}
                // field-sizing-content ignore `rows` : la hauteur de trois lignes au repos passe par min-h.
                className="min-h-20"
                defaultValue={review?.[key] ?? ""}
                placeholder={placeholder}
                aria-invalid={!!state.errors[key]?.length}
                aria-describedby={`${formId}-${key}-error`}
              />
            </FormField>
          </div>
        ))}

        <div className="sm:col-span-2">
          <FormField
            id={`${formId}-notes`}
            label={LABELS.notes}
            errors={state.errors.notes}
            help="Une ligne de marqueurs, séparés par |"
          >
            <Input
              id={`${formId}-notes`}
              name="notes"
              defaultValue={review?.notes ?? ""}
              placeholder="Bonne semaine | relances à reprendre"
              aria-invalid={!!state.errors.notes?.length}
              aria-describedby={`${formId}-notes-help ${formId}-notes-error`}
            />
          </FormField>
        </div>
      </DialogBody>

      <DialogFooter className="shrink-0">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Annuler
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          <Save aria-hidden data-icon="inline-start" />
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  )
}
