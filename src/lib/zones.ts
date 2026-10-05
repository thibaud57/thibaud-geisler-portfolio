import { Zone } from "@/generated/prisma/browser"

// Déclaration de l'enum Zone dans l'ordre canonique : ZONES le reprend tel quel.
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

export function sortZones(zones: Zone[]): Zone[] {
  return [...zones].sort((a, b) => ZONES.indexOf(a) - ZONES.indexOf(b))
}
