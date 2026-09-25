// Diacritiques ignorés pour que la recherche cmdk matche indépendamment des accents
// (ex : "secteur" trouve "Secteur", "sante" trouve "Santé"), cf. fiche Combobox du design system.
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

// cmdk ne matche par défaut que value + keywords en minuscules : passer par normalizeForSearch
// garde la recherche accent-insensitive sur les deux.
export function filterCommandOption(value: string, search: string, keywords?: string[]): number {
  const needle = normalizeForSearch(search)
  const haystack = [value, ...(keywords ?? [])]
  return haystack.some((entry) => normalizeForSearch(entry).includes(needle)) ? 1 : 0
}
