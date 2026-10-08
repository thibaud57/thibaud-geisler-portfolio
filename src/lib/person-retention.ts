// Délibération CNIL n° 2021-131 (prospects) et page CNIL « liste repoussoir » (oppositions), reprises au registre, Traitement 7.
export const RETENTION_YEARS = 3

interface RetentionPerson {
  createdAt: Date
  lastReplyAt: Date | null
  optedOutAt: Date | null
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

// `years` ne s'applique qu'à une personne active : une fois opposée, le délai légal de 3 ans s'impose quel que soit `years`.
export function retentionEndOf(person: RetentionPerson, years = RETENTION_YEARS): Date {
  if (person.optedOutAt) return addYears(person.optedOutAt, RETENTION_YEARS)
  // Une réponse antérieure à la création vient d'une reprise : seule la plus tardive compte.
  const start =
    person.lastReplyAt && person.lastReplyAt > person.createdAt
      ? person.lastReplyAt
      : person.createdAt
  return addYears(start, years)
}

export function isRetentionOver(person: RetentionPerson, now: Date): boolean {
  return retentionEndOf(person) < now
}
