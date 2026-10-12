import type { InterviewStatus } from "@/generated/prisma/client"

export type InterviewView = "a-venir" | "journal"

export interface InterviewViewRow {
  status: InterviewStatus
  scheduledAt: Date
}

// L'ordre rendu est l'ordre d'affichage par défaut : DataTable le garde tant qu'aucune colonne n'est triée.
export function interviewsForView<T extends InterviewViewRow>(
  interviews: readonly T[],
  view: InterviewView,
): T[] {
  if (view === "journal") {
    return [...interviews].sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
  }
  return interviews
    .filter((interview) => interview.status === "PLANIFIE")
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}

export const INTERVIEW_VIEW_LOCKED_FACETS: Partial<Record<InterviewView, readonly string[]>> = {
  "a-venir": ["status", "outcome"],
}

export const INTERVIEW_VIEW_PAGES: Record<InterviewView, { title: string; subtitle: string }> = {
  "a-venir": {
    title: "Entretiens à venir",
    subtitle: "Ceux qui restent à tenir, les retards d'abord puis le prochain.",
  },
  journal: {
    title: "Journal des entretiens",
    subtitle: "Toutes les fiches, passées et à venir, la plus récente en premier.",
  },
}
