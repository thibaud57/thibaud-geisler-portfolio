export type ProjectTimeline = {
  startYear: number | null
  endYear: number | null
  inProgress: boolean
}

export function getProjectTimeline(
  startedAt: Date | null,
  endedAt: Date | null,
): ProjectTimeline {
  return {
    startYear: startedAt?.getFullYear() ?? null,
    endYear: endedAt?.getFullYear() ?? null,
    inProgress: startedAt !== null && endedAt === null,
  }
}

export function formatDurationRange(
  timeline: ProjectTimeline,
  inProgressLabel: string,
): string | null {
  const { startYear, endYear, inProgress } = timeline
  if (startYear === null) return null
  if (endYear && endYear !== startYear) return `${startYear} → ${endYear}`
  if (inProgress) return `${startYear} → ${inProgressLabel}`
  return String(startYear)
}
