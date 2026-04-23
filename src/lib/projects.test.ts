import { describe, expect, it } from 'vitest'
import { formatDurationRange, getProjectTimeline } from './projects'

describe('getProjectTimeline', () => {
  it('détecte un projet en cours (startedAt défini, endedAt null)', () => {
    const timeline = getProjectTimeline(new Date('2023-06-01'), null)
    expect(timeline).toEqual({ startYear: 2023, endYear: null, inProgress: true })
  })

  it('détecte un projet terminé (startedAt + endedAt définis)', () => {
    const timeline = getProjectTimeline(new Date('2022-03-01'), new Date('2024-11-15'))
    expect(timeline).toEqual({ startYear: 2022, endYear: 2024, inProgress: false })
  })

  it("ne considère pas un projet sans startedAt comme en cours même si endedAt est null", () => {
    const timeline = getProjectTimeline(null, null)
    expect(timeline.inProgress).toBe(false)
  })

  it('expose startYear et endYear null quand les dates sont absentes', () => {
    const timeline = getProjectTimeline(null, null)
    expect(timeline).toEqual({ startYear: null, endYear: null, inProgress: false })
  })
})

describe('formatDurationRange', () => {
  const inProgressLabel = 'En cours'

  it("retourne null quand aucune startYear (pas de timeline affichable)", () => {
    expect(
      formatDurationRange({ startYear: null, endYear: null, inProgress: false }, inProgressLabel),
    ).toBeNull()
  })

  it("formate la plage pluri-années avec la flèche", () => {
    expect(
      formatDurationRange({ startYear: 2022, endYear: 2024, inProgress: false }, inProgressLabel),
    ).toBe('2022 → 2024')
  })

  it("remplace endYear par le label 'En cours' quand le projet est en cours", () => {
    expect(
      formatDurationRange({ startYear: 2023, endYear: null, inProgress: true }, inProgressLabel),
    ).toBe('2023 → En cours')
  })

  it("collapse en une seule année quand start = end et pas en cours", () => {
    expect(
      formatDurationRange({ startYear: 2022, endYear: 2022, inProgress: false }, inProgressLabel),
    ).toBe('2022')
  })

  it("affiche juste l'année quand endYear absent et pas en cours", () => {
    expect(
      formatDurationRange({ startYear: 2021, endYear: null, inProgress: false }, inProgressLabel),
    ).toBe('2021')
  })
})
