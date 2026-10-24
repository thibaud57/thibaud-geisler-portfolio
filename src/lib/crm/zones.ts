import { Zone } from "@/generated/prisma/browser"

export const ZONES = Object.values(Zone)

export const ZONE_LABELS: Record<Zone, string> = {
  GRAND_EST: "Grand Est",
  PARIS: "Paris",
  FRANCE: "France",
  LUXEMBOURG: "Luxembourg",
  BELGIQUE: "Belgique",
  SUISSE: "Suisse",
  ALLEMAGNE: "Allemagne",
  EUROPE: "Europe",
  MONDE: "Monde",
}

export const ZONE_OPTIONS = ZONES.map((value) => ({ value, label: ZONE_LABELS[value] }))

export function sortZones(zones: readonly Zone[]): Zone[] {
  return [...zones].sort((a, b) => ZONES.indexOf(a) - ZONES.indexOf(b))
}
