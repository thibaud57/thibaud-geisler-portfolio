// Types sans React : `lib/` et les composants les partagent sans que `lib/` dépende d'un composant.

export interface FacetOption {
  readonly value: string
  readonly label: string
}

export interface Facet<T, FacetKey extends string = string> {
  key: FacetKey
  label: string
  options: readonly FacetOption[]
  // Une ligne porte zéro, une ou plusieurs valeurs (ex. formats d'un projet) et matche si l'une
  // d'elles est sélectionnée.
  values: (row: T) => readonly string[]
}

export interface FacetFilterOption {
  readonly value: string
  readonly label: string
  readonly count: number
}

export interface FacetFilterGroup {
  readonly key: string
  readonly label: string
  readonly options: readonly FacetFilterOption[]
}
