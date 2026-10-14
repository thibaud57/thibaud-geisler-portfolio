export type ProjectView = "all" | "client" | "perso"

export const PROJECT_VIEW_LOCKED_FACETS: Partial<Record<ProjectView, readonly string[]>> = {
  client: ["nature"],
  perso: ["nature"],
}

export const PROJECT_VIEW_PAGES: Record<ProjectView, { title: string; subtitle: string }> = {
  all: {
    title: "Tous les projets",
    subtitle: "Clients et perso confondus. Glissez une ligne pour régler l'ordre sur le site.",
  },
  client: {
    title: "Projets clients",
    subtitle: "Missions et emplois. L'ordre se règle depuis la vue Tous.",
  },
  perso: {
    title: "Projets perso",
    subtitle: "Side projects et démos. L'ordre se règle depuis la vue Tous.",
  },
}
