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

// La rencontre prime même antérieure à la fiche : une personne rencontrée de longue date n'attend pas trois ans de plus parce qu'on vient de la saisir.
export function contactReviewEndOf(metAt: Date | null, createdAt: Date): Date {
  return addYears(metAt ?? createdAt, CONTACT_REVIEW_YEARS)
}

function activityEndOf(createdAt: Date, lastActivityAt: Date | null, years: number): Date {
  // Une activité antérieure à la création vient d'une reprise : seule la plus tardive compte.
  const start = lastActivityAt && lastActivityAt > createdAt ? lastActivityAt : createdAt
  return addYears(start, years)
}

export function retentionEndOf(person: RetentionPerson): Date {
  if (person.optedOutAt) return addYears(person.optedOutAt, RETENTION_YEARS)
  return activityEndOf(person.createdAt, person.lastReplyAt, RETENTION_YEARS)
}

export function isRetentionOver(person: RetentionPerson, now: Date): boolean {
  return retentionEndOf(person) < now
}
