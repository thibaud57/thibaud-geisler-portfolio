// Diacritiques ignorés pour que la recherche cmdk matche indépendamment des accents
// (ex : "secteur" trouve "Secteur", "sante" trouve "Santé"), cf. fiche Combobox du design system.
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}
