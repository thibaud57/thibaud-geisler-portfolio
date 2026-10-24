import type { RelatedHref } from "@/lib/admin/related-links"
import {
  Ban,
  BadgeEuro,
  CalendarClock,
  CircleCheck,
  CircleMinus,
  CircleX,
  Code,
  Coffee,
  MapPin,
  Phone,
  Rocket,
  Scale,
  ThumbsDown,
  ThumbsUp,
  UserSearch,
  Users,
  Video,
} from "lucide-react"

import type {
  Interview,
  InterviewDecision,
  InterviewFormat,
  InterviewOutcome,
  InterviewSide,
  InterviewStatus,
  InterviewType,
} from "@/generated/prisma/client"
import { toLinkMarker } from "@/lib/crm/link-marker"
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

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  PRESENTIEL: "Présentiel",
  VISIO: "Visio",
  TELEPHONE: "Téléphone",
}

export const INTERVIEW_FORMAT_ICONS: Record<InterviewFormat, IconComponent | null> = {
  PRESENTIEL: MapPin,
  VISIO: Video,
  TELEPHONE: Phone,
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
  format: "Format",
  status: "Statut",
  outcome: "Issue",
  scheduledAt: "Date et heure",
  score: "Score",
  decision: "Je continue le process ?",
  notes: "Notes",
  details: "Détails",
} as const

export const INTERVIEW_SECTION_TITLES = {
  exchange: "Échange",
  evaluation: "Évaluation",
  previous: "Entretien précédent",
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
  const entries = [...Map.groupBy(interviews, (interview) => interview.opportunityId).values()]
    .map((list) => list.toSorted(byDateThenCreation))
    .flatMap((list) =>
      list.map((interview, index) => {
        const isFirstContact = interview.type === "PREMIER_CONTACT"
        const place: InterviewPlace = {
          number: isFirstContact
            ? null
            : list.slice(0, index + 1).filter((other) => other.type !== "PREMIER_CONTACT").length,
          previousId: list[index - 1]?.id ?? null,
        }
        return [interview.id, place] as const
      }),
    )
  return new Map(entries)
}

export function interviewTitle(type: InterviewType, number: number | null): string {
  return number === null
    ? INTERVIEW_TYPE_LABELS[type]
    : `Entretien ${number} · ${INTERVIEW_TYPE_LABELS[type]}`
}

// Titre court là où l'opportunité figure déjà (colonne, vue détail).
export function interviewTitleOf(
  interview: Pick<Interview, "id" | "type"> & { opportunity: { title: string } },
  places: ReadonlyMap<string, InterviewPlace>,
  { withOpportunity = false }: { withOpportunity?: boolean } = {},
): string {
  const title = interviewTitle(interview.type, places.get(interview.id)?.number ?? null)
  return withOpportunity ? `${title} · ${interview.opportunity.title}` : title
}

type LinkedInterview = Pick<Interview, "id" | "type" | "status" | "scheduledAt">

export function toInterviewLink(
  interview: LinkedInterview,
  places: ReadonlyMap<string, InterviewPlace>,
  href: RelatedHref,
  metaPrefix?: string,
) {
  const status = INTERVIEW_STATUS_LABELS[interview.status]
  return {
    id: interview.id,
    href,
    label: interviewTitle(interview.type, places.get(interview.id)?.number ?? null),
    meta: metaPrefix ? `${metaPrefix} · ${status}` : status,
    trailing: formatShortDateTime(interview.scheduledAt),
    at: interview.scheduledAt,
    marker: toLinkMarker(INTERVIEW_TYPE_ICONS[interview.type]),
  }
}

export function toOpportunityInterviewLinks(
  interviews: readonly (LinkedInterview & OrderedInterview)[],
  hrefOf: (interviewId: string) => RelatedHref,
) {
  const places = interviewPlaces(interviews)
  return interviews.map((interview) => toInterviewLink(interview, places, hrefOf(interview.id)))
}

// Le numéro se calcule sur tous les entretiens de l'opportunité, pas seulement sur ceux du lead.
export function toLeadInterviewLinks(
  interviews: readonly (LinkedInterview & {
    opportunity: { id: string; title: string; interviews: readonly OrderedInterview[] }
  })[],
  hrefOf: (interviewId: string) => RelatedHref,
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

// Seul le choix explicite est stocké : la valeur effective se déduit de l'opportunité,
// donc elle suit son intermédiaire sans écriture dans un handler.
export function resolveInterviewSide({
  choice,
  stored,
  hasIntermediary,
}: {
  choice: InterviewSide | null
  stored: InterviewSide | undefined
  hasIntermediary: boolean
}): InterviewSide {
  const wanted = choice ?? stored ?? (hasIntermediary ? "ESN" : "CLIENT_FINAL")
  return wanted === "ESN" && !hasIntermediary ? "CLIENT_FINAL" : wanted
}
