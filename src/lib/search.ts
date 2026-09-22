// Diacritiques ignorés pour que la recherche cmdk matche indépendamment des accents
// (ex : "secteur" trouve "Secteur", "sante" trouve "Santé"), cf. fiche Combobox du design system.
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

// cmdk ne matche par défaut que value + keywords en minuscules : les diacritiques passent par
// normalizeForSearch pour que la recherche reste accent-insensitive sur les deux. Prop `filter`
// de Command (MultiSelectCombobox, ClientMetaFields, ProjectTagsField).
export function filterCommandOption(value: string, search: string, keywords?: string[]): number {
  const needle = normalizeForSearch(search)
  const haystack = [value, ...(keywords ?? [])]
  return haystack.some((entry) => normalizeForSearch(entry).includes(needle)) ? 1 : 0
}
