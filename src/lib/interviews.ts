import {
  Ban,
  BadgeEuro,
  CalendarClock,
  CircleCheck,
  CircleMinus,
  CircleX,
  Code,
  Coffee,
  Rocket,
  Scale,
  ThumbsDown,
  ThumbsUp,
  UserSearch,
  Users,
} from "lucide-react"

import type {
  Interview,
  InterviewDecision,
  InterviewOutcome,
  InterviewSide,
  InterviewStatus,
  InterviewType,
} from "@/generated/prisma/client"
import { formatShortDateTime } from "@/lib/date-time"
import type { IconComponent } from "@/lib/icons"

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  PREMIER_CONTACT: "Premier contact",
  RECRUTEUR_RH: "Recruteur/RH",
  TECHNIQUE: "Technique",
  MANAGER_EQUIPE: "Manager/Équipe",
  NEGOCIATION: "Négociation",
}

export const INTERVIEW_TYPE_ICONS: Record<InterviewType, IconComponent | null> = {
  PREMIER_CONTACT: Coffee,
  RECRUTEUR_RH: UserSearch,
  TECHNIQUE: Code,
  MANAGER_EQUIPE: Users,
  NEGOCIATION: BadgeEuro,
}

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  PLANIFIE: "Planifié",
  FAIT: "Fait",
  ANNULE: "Annulé",
}

export const INTERVIEW_STATUS_ICONS: Record<InterviewStatus, IconComponent | null> = {
  PLANIFIE: CalendarClock,
  FAIT: CircleCheck,
  ANNULE: CircleX,
}

export const INTERVIEW_OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  POSITIF: "Positif",
  NEGATIF: "Négatif",
  SANS_SUITE: "Sans suite",
}

export const INTERVIEW_OUTCOME_ICONS: Record<InterviewOutcome, IconComponent | null> = {
  POSITIF: ThumbsUp,
  NEGATIF: ThumbsDown,
  SANS_SUITE: CircleMinus,
}

export const INTERVIEW_DECISION_LABELS: Record<InterviewDecision, string> = {
  OUI_TRES_INTERESSE: "Oui, très intéressé",
  OUI_SOUS_CONDITIONS: "Oui, sous conditions",
  NON: "Non, pas pour moi",
}

export const INTERVIEW_DECISION_ICONS: Record<InterviewDecision, IconComponent | null> = {
  OUI_TRES_INTERESSE: Rocket,
  OUI_SOUS_CONDITIONS: Scale,
  NON: Ban,
}

export const INTERVIEW_SIDE_LABELS: Record<InterviewSide, string> = {
  ESN: "ESN",
  CLIENT_FINAL: "Client final",
}

export const INTERVIEW_FIELD_LABELS = {
  opportunityId: "Opportunité",
  side: "Mené par",
  correspondentIds: "Correspondants",
  type: "Type",
  status: "Statut",
  outcome: "Issue",
  scheduledAt: "Date et heure",
  score: "Score",
  decision: "Je continue le process ?",
  notes: "Notes",
  details: "Détails",
} as const

export type OrderedInterview = Pick<
  Interview,
  "id" | "opportunityId" | "type" | "scheduledAt" | "createdAt"
>

export interface InterviewPlace {
  number: number | null
  previousId: string | null
}

function byDateThenCreation(a: OrderedInterview, b: OrderedInterview): number {
  return (
    a.scheduledAt.getTime() - b.scheduledAt.getTime() ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id)
  )
}

// Numéro et entretien précédent se déduisent de l'ordre dans l'opportunité, la création départageant une même heure, puis l'id (des lignes importées peuvent partager les deux instants ; les ids uuid7 suivent le temps).
export function interviewPlaces(
  interviews: readonly OrderedInterview[],
): Map<string, InterviewPlace> {
  const places = new Map<string, InterviewPlace>()
  for (const list of Map.groupBy(interviews, (interview) => interview.opportunityId).values()) {
    list.sort(byDateThenCreation)
    let count = 0
    list.forEach((interview, index) => {
      const isFirstContact = interview.type === "PREMIER_CONTACT"
      if (!isFirstContact) count += 1
      places.set(interview.id, {
        number: isFirstContact ? null : count,
        previousId: list[index - 1]?.id ?? null,
      })
    })
  }
  return places
}

export function interviewTitle(type: InterviewType, number: number | null): string {
  return number === null
    ? INTERVIEW_TYPE_LABELS[type]
    : `Entretien ${number} · ${INTERVIEW_TYPE_LABELS[type]}`
}

type LinkedInterview = Pick<Interview, "id" | "type" | "status" | "scheduledAt">

export function toInterviewLink(
  interview: LinkedInterview,
  places: ReadonlyMap<string, InterviewPlace>,
  href: string,
  metaPrefix?: string,
) {
  const status = INTERVIEW_STATUS_LABELS[interview.status]
  return {
    id: interview.id,
    href,
    label: interviewTitle(interview.type, places.get(interview.id)?.number ?? null),
    meta: metaPrefix ? `${metaPrefix} · ${status}` : status,
    trailing: formatShortDateTime(interview.scheduledAt),
  }
}

export function toOpportunityInterviewLinks(
  interviews: readonly (LinkedInterview & OrderedInterview)[],
  hrefOf: (interviewId: string) => string,
) {
  const places = interviewPlaces(interviews)
  return interviews.map((interview) => toInterviewLink(interview, places, hrefOf(interview.id)))
}

// Le numéro se calcule sur tous les entretiens de l'opportunité, pas seulement sur ceux du lead.
export function toLeadInterviewLinks(
  interviews: readonly (LinkedInterview & {
    opportunity: { id: string; title: string; interviews: readonly OrderedInterview[] }
  })[],
  hrefOf: (interviewId: string) => string,
) {
  const placesByOpportunity = new Map<string, Map<string, InterviewPlace>>()
  return interviews.map((interview) => {
    const { opportunity } = interview
    let places = placesByOpportunity.get(opportunity.id)
    if (!places) {
      places = interviewPlaces(opportunity.interviews)
      placesByOpportunity.set(opportunity.id, places)
    }
    return toInterviewLink(interview, places, hrefOf(interview.id), opportunity.title)
  })
}
