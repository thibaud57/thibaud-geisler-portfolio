// Délibération CNIL n° 2021-131 (prospects) et page CNIL « liste repoussoir » (oppositions), reprises au registre, Traitement 7.
export const RETENTION_YEARS = 3

interface RetentionPerson {
  createdAt: Date
  lastReplyAt: Date | null
  optedOutAt: Date | null
}

// En UTC : le navigateur (bouton) et le serveur (garde) doivent tomber sur le même instant, quel que soit leur fuseau.
function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setUTCFullYear(result.getUTCFullYear() + years)
  return result
}

function activityEndOf(createdAt: Date, lastActivityAt: Date | null, years: number): Date {
  // Une activité antérieure à la création vient d'une reprise : seule la plus tardive compte.
  const start = lastActivityAt && lastActivityAt > createdAt ? lastActivityAt : createdAt
  return addYears(start, years)
}

// TODO: purge automatique des fiches échues, reportée post-MVP (BRAINSTORM, Feature 2, décision du 2026-10-13) ; d'ici là, suppression depuis la liste des leads.
export function optOutEndOf(optedOutAt: Date): Date {
  return addYears(optedOutAt, RETENTION_YEARS)
}

export function isOptOutOver(optedOutAt: Date, now: Date): boolean {
  return optOutEndOf(optedOutAt) < now
}

export function retentionEndOf(person: RetentionPerson): Date {
  if (person.optedOutAt) return optOutEndOf(person.optedOutAt)
  return activityEndOf(person.createdAt, person.lastReplyAt, RETENTION_YEARS)
}

export function isRetentionOver(person: RetentionPerson, now: Date): boolean {
  return retentionEndOf(person) < now
}
