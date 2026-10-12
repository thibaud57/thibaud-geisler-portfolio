"use client"

import { useCallback, useMemo, useState } from "react"
import { CalendarClock } from "lucide-react"

import { DataTable, type Column, type Facet } from "@/components/features/admin/table/DataTable"
import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import { textSection } from "@/components/features/admin/detail/detail-sections"
import { PeriodSelect } from "@/components/features/admin/PeriodSelect"
import { DeleteReviewDialog } from "@/components/features/admin/weekly-reviews/DeleteReviewDialog"
import { ReviewFormDialog } from "@/components/features/admin/weekly-reviews/ReviewFormDialog"
import { ReviewRates } from "@/components/features/admin/weekly-reviews/ReviewRates"
import { ReviewsCalendar } from "@/components/features/admin/weekly-reviews/ReviewsCalendar"
import {
  actionsColumn,
  enumBadge,
  enumFacet,
  hideableColumn,
} from "@/components/features/admin/table/table-cells"
import {
  REVIEW_COLUMN_WIDTHS,
  REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type ReviewColumnKey,
} from "@/lib/admin/table-widths"
import { useRowDetail } from "@/hooks/use-row-detail"
import { formatDateOnly } from "@/lib/date-time"
import {
  REVIEW_PERIOD_LABELS,
  REVIEW_PERIOD_VALUES,
  reviewsByRecency,
  reviewsForPeriod,
  type ReviewPeriod,
  type ReviewView,
} from "@/lib/crm/review-views"
import { REVIEW_STATUSES } from "@/lib/schemas/weekly-review"
import {
  formatRate,
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
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

type Rates = ReturnType<typeof reviewRates>

function counterColumn(
  visibleByDefault: readonly ReviewColumnKey[],
  key: keyof ReviewCounts,
): Column<AdminWeeklyReview> {
  return {
    key,
    header: LABELS[key],
    width: REVIEW_COLUMN_WIDTHS[key],
    wrapHeader: true,
    align: "right",
    className: "tabular-nums",
    ...hideableColumn(visibleByDefault, key),
    sortValue: (review) => review[key],
    cell: (review) => review[key],
  }
}

function rateColumn(
  visibleByDefault: readonly ReviewColumnKey[],
  key: "acceptanceRate" | "responseRate" | "meetingConversion",
  pick: (rates: Rates) => number | null,
): Column<AdminWeeklyReview> {
  return {
    key,
    header: LABELS[key],
    width: REVIEW_COLUMN_WIDTHS[key],
    wrapHeader: true,
    align: "right",
    className: "tabular-nums text-muted-foreground",
    ...hideableColumn(visibleByDefault, key),
    sortValue: (review) => pick(reviewRates(review)) ?? -1,
    cell: (review) => formatRate(pick(reviewRates(review))),
  }
}

function buildDataColumns(view: ReviewView): readonly Column<AdminWeeklyReview>[] {
  const visibleByDefault = REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "week",
      header: LABELS.week,
      width: REVIEW_COLUMN_WIDTHS.week,
      sortValue: (review) => review.closingFriday.getTime(),
      searchValue: (review) => weekLabel(review.closingFriday),
      cell: (review) => <span className="font-medium">{weekLabel(review.closingFriday)}</span>,
    },
    {
      key: "friday",
      header: LABELS.friday,
      width: REVIEW_COLUMN_WIDTHS.friday,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "friday"),
      sortValue: (review) => review.closingFriday.getTime(),
      cell: (review) => formatDateOnly(review.closingFriday),
    },
    counterColumn(visibleByDefault, "connectionsSent"),
    counterColumn(visibleByDefault, "connectionsAccepted"),
    rateColumn(visibleByDefault, "acceptanceRate", (rates) => rates.acceptance),
    counterColumn(visibleByDefault, "messagesSent"),
    counterColumn(visibleByDefault, "conversationsEngaged"),
    rateColumn(visibleByDefault, "responseRate", (rates) => rates.response),
    counterColumn(visibleByDefault, "meetingsBooked"),
    rateColumn(visibleByDefault, "meetingConversion", (rates) => rates.meetingConversion),
    counterColumn(visibleByDefault, "interviewsHeld"),
    counterColumn(visibleByDefault, "activeLeads"),
    {
      key: "status",
      header: LABELS.status,
      width: REVIEW_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: (review) => enumBadge(review.status, REVIEW_STATUS_LABELS, REVIEW_STATUS_ICONS),
    },
    {
      key: "motivation",
      header: LABELS.motivation,
      width: REVIEW_COLUMN_WIDTHS.motivation,
      ...hideableColumn(visibleByDefault, "motivation"),
      cell: (review) =>
        enumBadge(review.motivation, REVIEW_MOTIVATION_LABELS, REVIEW_MOTIVATION_ICONS),
    },
  ]
}

function buildReviewDetail(review: AdminWeeklyReview, onEdit: () => void): DetailContent {
  return {
    title: weekLabel(review.closingFriday),
    subtitle: `${LABELS.friday} : ${formatDateOnly(review.closingFriday)}`,
    badges: [
      headerBadge(review.status, REVIEW_STATUS_LABELS, REVIEW_STATUS_ICONS),
      headerBadge(review.motivation, REVIEW_MOTIVATION_LABELS, REVIEW_MOTIVATION_ICONS),
    ],
    // Le formulaire n'a pas de section : le premier bloc reprend ses champs sans titre, dans l'ordre des compteurs.
    sections: [
      {
        rows: [
          ...REVIEW_COUNTER_KEYS.map((key) => ({ label: LABELS[key], value: review[key] })),
          { label: LABELS.computedRates, value: <ReviewRates rates={reviewRates(review)} /> },
        ],
      },
      textSection(LABELS.wins, review.wins, { preserveLines: true }),
      textSection(LABELS.blockers, review.blockers, { preserveLines: true }),
      textSection(LABELS.nextWeekPlan, review.nextWeekPlan, { preserveLines: true }),
      textSection(LABELS.notes, review.notes, { preserveLines: true }),
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminWeeklyReview>[] = [
  enumFacet(
    "status",
    LABELS.status,
    REVIEW_STATUSES,
    REVIEW_STATUS_LABELS,
    (review) => review.status,
  ),
]

interface Props {
  reviews: readonly AdminWeeklyReview[]
  view: ReviewView
}

export function ReviewsTable({ reviews, view }: Props) {
  const [editingReview, setEditingReview] = useState<AdminWeeklyReview | null>(null)
  const [creatingFriday, setCreatingFriday] = useState<Date | null>(null)
  const [period, setPeriod] = useState<ReviewPeriod>("30j")
  // Instant figé au montage : la période reste stable pendant la consultation.
  const [now] = useState(() => new Date())

  const rows = useMemo(
    () => (view === "revue" ? reviewsForPeriod(reviews, period, now) : reviewsByRecency(reviews)),
    [reviews, view, period, now],
  )

  const columns = useMemo<readonly Column<AdminWeeklyReview>[]>(
    () => [
      ...buildDataColumns(view),
      actionsColumn<AdminWeeklyReview>((review) => (
        <>
          <ReviewFormDialog review={review} />
          <DeleteReviewDialog review={review} />
        </>
      )),
    ],
    [view],
  )

  const buildDetail = useCallback(
    (review: AdminWeeklyReview) =>
      buildReviewDetail(review, () => {
        setEditingReview(review)
      }),
    [],
  )
  const { open: openDetail, dialog: detailDialog } = useRowDetail({
    rows: reviews,
    build: buildDetail,
  })

  return (
    <div className="flex flex-col gap-4">
      {view === "revue" ? (
        <PeriodSelect
          value={period}
          onChange={setPeriod}
          values={REVIEW_PERIOD_VALUES}
          labels={REVIEW_PERIOD_LABELS}
        />
      ) : null}

      {view === "calendrier" ? (
        <ReviewsCalendar
          reviews={reviews}
          onOpen={openDetail}
          onCreate={(friday) => {
            setCreatingFriday(friday)
          }}
        />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(review) => review.id}
          searchPlaceholder="Rechercher une semaine"
          noun="revue"
          onRowClick={openDetail}
          rowLabel={(review) => weekLabel(review.closingFriday)}
          facets={facets}
          empty={{
            icon: CalendarClock,
            title: "Aucune revue",
            description:
              "Aucune revue dans cette vue. Clôturez la semaine via le bouton ci-dessus.",
          }}
        />
      )}

      {detailDialog}
      {creatingFriday ? (
        <ReviewFormDialog
          review={null}
          defaultFriday={creatingFriday}
          open
          onOpenChange={(open) => {
            if (!open) setCreatingFriday(null)
          }}
        />
      ) : null}
      {editingReview ? (
        <ReviewFormDialog
          key={editingReview.id}
          review={editingReview}
          open
          onOpenChange={(open) => {
            if (!open) setEditingReview(null)
          }}
        />
      ) : null}
    </div>
  )
}
