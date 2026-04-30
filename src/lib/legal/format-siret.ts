export function formatSiret(siret: string): string {
  return siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, '$1 $2 $3 $4')
}
