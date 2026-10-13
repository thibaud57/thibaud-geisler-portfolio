import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import { textSection } from "@/components/features/admin/detail/detail-sections"
import { ReviewRates } from "@/components/features/admin/weekly-reviews/ReviewRates"
import { formatDateOnly } from "@/lib/date-time"
import {
  REVIEW_COUNTER_KEYS,
  REVIEW_FIELD_LABELS as LABELS,
  REVIEW_MOTIVATION_ICONS,
  REVIEW_MOTIVATION_LABELS,
  REVIEW_STATUS_ICONS,
  REVIEW_STATUS_LABELS,
  reviewRates,
  weekLabel,
} from "@/lib/crm/weekly-reviews"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

export function buildReviewDetail(review: AdminWeeklyReview, onEdit: () => void): DetailContent {
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
