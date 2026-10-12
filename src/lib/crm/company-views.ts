export type CompanyView = "all" | "travaillees" | "recrutement" | "prospects"

export const COMPANY_VIEW_PAGES: Record<CompanyView, { title: string; subtitle: string }> = {
  all: {
    title: "Toutes les entreprises",
    subtitle: "Clients, intermédiaires et prospects.",
  },
  travaillees: {
    title: "Entreprises travaillées",
    subtitle: "Un projet client réalisé ou une opportunité acceptée, en direct ou via une ESN.",
  },
  recrutement: {
    title: "Entreprises de recrutement",
    subtitle: "ESN et cabinets, avec leur historique de propositions.",
  },
  prospects: {
    title: "Entreprises prospects",
    subtitle: "Non travaillées, avec un lead actif.",
  },
}
