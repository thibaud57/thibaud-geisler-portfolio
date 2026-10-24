import {
  Briefcase,
  Building,
  FilePenLine,
  GraduationCap,
  Repeat,
  Shuffle,
  Wifi,
} from "lucide-react"

import { ContractStatus, WorkMode } from "@/generated/prisma/browser"
import type { IconComponent } from "@/lib/icons"

// Conditions d'une mission, communes au projet client du portfolio et à l'opportunité du CRM.
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  FREELANCE: "Freelance",
  CDI: "CDI",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
}

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: "Remote",
  HYBRIDE: "Hybride",
  PRESENTIEL: "Sur site",
}

// L'enum Prisma déclare PRESENTIEL en premier : le rang fixe l'ordre d'affichage des options.
const WORK_MODE_RANK = { REMOTE: 0, HYBRIDE: 1, PRESENTIEL: 2 } satisfies Record<WorkMode, number>

export const CONTRACT_STATUSES = Object.values(ContractStatus)
export const WORK_MODES = Object.values(WorkMode).toSorted(
  (a, b) => WORK_MODE_RANK[a] - WORK_MODE_RANK[b],
)

export const CONTRACT_STATUS_ICONS: Record<ContractStatus, IconComponent | null> = {
  FREELANCE: Briefcase,
  CDI: FilePenLine,
  STAGE: GraduationCap,
  ALTERNANCE: Repeat,
}

export const WORK_MODE_ICONS: Record<WorkMode, IconComponent | null> = {
  REMOTE: Wifi,
  HYBRIDE: Shuffle,
  PRESENTIEL: Building,
}
