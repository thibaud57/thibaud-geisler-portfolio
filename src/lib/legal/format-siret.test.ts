import { describe, expect, it } from 'vitest'

import { formatSiret } from './format-siret'

describe('formatSiret', () => {
  it('formate un SIRET valide 14 chiffres avec espaces aux bons emplacements', () => {
    expect(formatSiret('88041912200036')).toBe('880 419 122 00036')
  })

  it('retourne un SIREN 9 chiffres tel quel (pas de match du regex 14 chiffres)', () => {
    expect(formatSiret('880419122')).toBe('880419122')
  })

  it('retourne une chaîne vide telle quelle', () => {
    expect(formatSiret('')).toBe('')
  })

  it('retourne une chaîne non numérique telle quelle (graceful fallback)', () => {
    expect(formatSiret('abc')).toBe('abc')
  })

  it('retourne un SIRET déjà formatté tel quel (idempotence regex stricte sur 14 chiffres consécutifs)', () => {
    expect(formatSiret('880 419 122 00036')).toBe('880 419 122 00036')
  })
})
