import { TZDate } from "@date-fns/tz"

import { DAY_MS, TIME_ZONE } from "@/lib/date-time"

export type ReviewView = "revue" | "calendrier" | "journal"

export const REVIEW_PERIOD_VALUES = ["30j", "mois", "annee"] as const

export type ReviewPeriod = (typeof REVIEW_PERIOD_VALUES)[number]

export const REVIEW_PERIOD_LABELS: Record<ReviewPeriod, string> = {
  "30j": "30 derniers jours",
  mois: "Mois en cours",
  annee: "Année en cours",
}

export function reviewsByRecency<T extends { closingFriday: Date }>(reviews: readonly T[]): T[] {
  return [...reviews].sort((a, b) => b.closingFriday.getTime() - a.closingFriday.getTime())
}

// Colonne date : le vendredi arrive à minuit UTC, son mois et son année se lisent en UTC. « Maintenant »
// se lit en Europe/Paris, pour que le 1er du mois à 00 h 30 Paris ne bascule pas sur le mois précédent.
export function reviewsForPeriod<T extends { closingFriday: Date }>(
  reviews: readonly T[],
  period: ReviewPeriod,
  now: Date,
): T[] {
  const today = new TZDate(now, TIME_ZONE)
  const keep = (review: T) => {
    const friday = review.closingFriday
    if (period === "30j") return friday.getTime() >= now.getTime() - 30 * DAY_MS
    if (period === "annee") return friday.getUTCFullYear() === today.getFullYear()
    return (
      friday.getUTCFullYear() === today.getFullYear() && friday.getUTCMonth() === today.getMonth()
    )
  }
  return reviewsByRecency(reviews.filter(keep))
}

export const REVIEW_VIEW_PAGES: Record<ReviewView, { title: string; subtitle: string }> = {
  revue: {
    title: "Revue hebdo",
    subtitle:
      "Les dernières semaines pour lire la tendance. Rituel du vendredi 17 h. Les taux se calculent.",
  },
  calendrier: {
    title: "Calendrier des revues",
    subtitle: "Une revue par semaine, posée sur son vendredi de clôture.",
  },
  journal: {
    title: "Journal des revues",
    subtitle: "Toutes les revues, la plus récente en premier.",
  },
}
