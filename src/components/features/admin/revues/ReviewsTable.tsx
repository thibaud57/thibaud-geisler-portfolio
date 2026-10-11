"use client"

import { useMemo, useState } from "react"
import { CalendarClock } from "lucide-react"

import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  type DetailSection,
  DetailDialog,
} from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { EnumSelectItems } from "@/components/features/admin/EnumSelectItems"
import { DeleteReviewDialog } from "@/components/features/admin/revues/DeleteReviewDialog"
import { ReviewFormDialog } from "@/components/features/admin/revues/ReviewFormDialog"
import { ReviewsCalendar } from "@/components/features/admin/revues/ReviewsCalendar"
import { actionsColumn, enumBadge, hideableColumn } from "@/components/features/admin/table-cells"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  REVIEW_COLUMN_WIDTHS,
  REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type ReviewColumnKey,
} from "@/lib/admin-table-widths"
import { formatDateOnly } from "@/lib/date-time"
import {
  isReviewPeriod,
  REVIEW_PERIOD_LABELS,
  REVIEW_PERIOD_VALUES,
  reviewsByRecency,
  reviewsForPeriod,
  type ReviewPeriod,
  type ReviewView,
} from "@/lib/review-views"
import { REVIEW_STATUSES } from "@/lib/schemas/weekly-review"
import {
  formatRate,
  REVIEW_FIELD_LABELS as LABELS,
  REVIEW_MOTIVATION_ICONS,
  REVIEW_MOTIVATION_LABELS,
  REVIEW_STATUS_ICONS,
  REVIEW_STATUS_LABELS,
  reviewRates,
  weekLabel,
  type ReviewCounts,
} from "@/lib/weekly-reviews"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

type Rates = ReturnType<typeof reviewRates>

function counterColumn(
  visibleByDefault: readonly ReviewColumnKey[],
  key: keyof ReviewCounts,
  header: string = LABELS[key],
): Column<AdminWeeklyReview> {
  return {
    key,
    header,
    width: REVIEW_COLUMN_WIDTHS[key],
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
    counterColumn(visibleByDefault, "conversationsEngaged", LABELS.conversations),
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

function textSection(title: string, text: string | null): DetailSection {
  return {
    title,
    rows: [
      {
        value: text ? <span className="whitespace-pre-line">{text}</span> : null,
        fullWidth: true,
      },
    ],
  }
}

function buildReviewDetail(review: AdminWeeklyReview, onEdit: () => void): DetailContent {
  const rates = reviewRates(review)
  const closing = `clôture le ${formatDateOnly(review.closingFriday)}`

  return {
    title: weekLabel(review.closingFriday),
    subtitle: review.motivation
      ? `${closing} · motivation ${REVIEW_MOTIVATION_LABELS[review.motivation].toLowerCase()}`
      : closing,
    status: review.status ? (
      <EnumBadge
        label={REVIEW_STATUS_LABELS[review.status]}
        icon={REVIEW_STATUS_ICONS[review.status]}
        variant="outline"
        meta
      />
    ) : undefined,
    sections: [
      {
        title: "Prospection",
        rows: [
          { label: LABELS.connectionsSent, value: review.connectionsSent },
          { label: LABELS.connectionsAccepted, value: review.connectionsAccepted },
          { label: LABELS.acceptanceRate, value: formatRate(rates.acceptance) },
          { label: LABELS.messagesSent, value: review.messagesSent },
          { label: LABELS.conversations, value: review.conversationsEngaged },
          { label: LABELS.responseRate, value: formatRate(rates.response) },
          { label: LABELS.meetingsBooked, value: review.meetingsBooked },
          { label: LABELS.meetingConversion, value: formatRate(rates.meetingConversion) },
        ],
      },
      {
        title: "Pipeline",
        rows: [
          { label: LABELS.interviewsHeld, value: review.interviewsHeld },
          { label: LABELS.activeLeads, value: review.activeLeads },
        ],
      },
      textSection(LABELS.wins, review.wins),
      textSection(LABELS.blockers, review.blockers),
      textSection(LABELS.nextWeekPlan, review.nextWeekPlan),
      textSection(LABELS.notes, review.notes),
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminWeeklyReview>[] = [
  {
    key: "status",
    label: LABELS.status,
    options: REVIEW_STATUSES.map((status) => ({
      value: status,
      label: REVIEW_STATUS_LABELS[status],
    })),
    value: (review) => (review.status ? [review.status] : []),
  },
]

interface Props {
  reviews: readonly AdminWeeklyReview[]
  view: ReviewView
}

export function ReviewsTable({ reviews, view }: Props) {
  const [selectedReview, setSelectedReview] = useState<AdminWeeklyReview | null>(null)
  const [editingReview, setEditingReview] = useState<AdminWeeklyReview | null>(null)
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

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedReview
        ? buildReviewDetail(selectedReview, () => {
            setEditingReview(selectedReview)
          })
        : null,
    [selectedReview],
  )

  return (
    <div className="flex flex-col gap-4">
      {view === "revue" ? (
        <Select
          value={period}
          onValueChange={(value) => {
            if (isReviewPeriod(value)) setPeriod(value)
          }}
        >
          <SelectTrigger className="w-50" aria-label="Période">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <EnumSelectItems values={REVIEW_PERIOD_VALUES} labels={REVIEW_PERIOD_LABELS} />
          </SelectContent>
        </Select>
      ) : null}

      {view === "calendrier" ? (
        <ReviewsCalendar reviews={reviews} onOpen={setSelectedReview} />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(review) => review.id}
          searchPlaceholder="Rechercher une semaine"
          noun="revue"
          onRowClick={setSelectedReview}
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

      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedReview(null)
        }}
      />
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
