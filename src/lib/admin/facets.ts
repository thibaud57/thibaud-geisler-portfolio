// Types sans React : `lib/` et les composants les partagent sans que `lib/` dépende d'un composant.

export interface FacetOption {
  value: string
  label: string
}

export interface Facet<T, K extends string = string> {
  key: string
  label: string
  options: readonly FacetOption[]
  // Scalaire ou tableau : la plupart des facettes portent une valeur unique par ligne, certaines
  // (ex. formats d'un projet) en portent plusieurs ; la ligne matche si l'une d'elles est sélectionnée.
  value: (row: T) => K | readonly K[]
}

export interface FacetFilterOption {
  value: string
  label: string
  count: number
}

export interface FacetFilterGroup {
  key: string
  label: string
  options: readonly FacetFilterOption[]
}
