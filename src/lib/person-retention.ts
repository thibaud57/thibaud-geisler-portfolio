// Délibération CNIL n° 2021-131 (prospects) et page CNIL « liste repoussoir » (oppositions), reprises au registre, Traitement 7.
export const RETENTION_YEARS = 3

// Rappel métier pour reprendre contact avec le réseau, distinct du délai légal des prospects (`RETENTION_YEARS`) : une personne du réseau n'est soumise à aucune obligation de purge.
export const CONTACT_REVIEW_YEARS = 3

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

export function activityEndOf(createdAt: Date, lastActivityAt: Date | null, years: number): Date {
  // Une activité antérieure à la création vient d'une reprise : seule la plus tardive compte.
  const start = lastActivityAt && lastActivityAt > createdAt ? lastActivityAt : createdAt
  return addYears(start, years)
}

// `years` ne s'applique qu'à une personne active : une fois opposée, le délai légal de 3 ans s'impose quel que soit `years`.
export function retentionEndOf(person: RetentionPerson, years = RETENTION_YEARS): Date {
  if (person.optedOutAt) return addYears(person.optedOutAt, RETENTION_YEARS)
  return activityEndOf(person.createdAt, person.lastReplyAt, years)
}

export function isRetentionOver(person: RetentionPerson, now: Date): boolean {
  return retentionEndOf(person) < now
}
