import {
  Briefcase,
  Building,
  FilePenLine,
  GraduationCap,
  Repeat,
  Shuffle,
  Wifi,
} from "lucide-react"

import type { ContractStatus, WorkMode } from "@/generated/prisma/client"
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

export const CONTRACT_STATUSES = Object.keys(CONTRACT_STATUS_LABELS) as ContractStatus[]
export const WORK_MODES = Object.keys(WORK_MODE_LABELS) as WorkMode[]

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
